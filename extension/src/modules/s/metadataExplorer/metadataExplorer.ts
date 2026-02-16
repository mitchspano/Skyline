/**
 * Copyright 2025 Mitch Spano
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This component provides a user interface for exploring and retrieving Salesforce metadata.
 * It uses the Salesforce CLI to interact with the org and displays the metadata
 * in a hierarchical tree grid. Users can select specific metadata items or types
 * and retrieve them to their local project.  Filtering and sorting capabilities
 * are also provided.  It leverages the lightning-tree-grid component for display and
 * integrates with a terminal component for executing CLI commands.
 */
import { ExecuteResult } from "../app/app";
import { track } from "lwc";
import Toast from "lightning-base-components/src/lightning/toast/toast.js";
import {
  SalesforceConnectionInfo,
  ListMetadataTypesResponse,
  MetadataObjectType,
  ListMetadataOfTypeResponse,
  RetrieveMetadataResponse,
  FieldDefinitionResponse,
  COMMANDS,
  FolderBasedMetadataResponse,
  FolderBasedMetadataItem,
  ReportRecord,
  DashboardRecord,
  DocumentRecord
} from "./sfCli";
import {
  ICONS,
  COLUMNS,
  TableRow,
  convertMetadataObjectTypeToTableRow,
  convertMetadataItemToTableRow,
  convertFieldDefinitionRecordToTableRow
} from "./table";
import CliElement from "../cliElement/cliElement";
const DEFAULT_TIMEZONE = "America/Los_Angeles";
const CUSTOM_OBJECT = "CustomObject";
const UNFILED_FOLDER_LABEL = "Unfiled Public";
const STANDARD_FIELD = "StandardField";
const LAST_MODIFIED_DATE = "lastModifiedDate";

/** Matches the metadata type name in "sf org list metadata --metadata-type <TypeName> ..." */
const METADATA_TYPE_COMMAND_REGEX = /--metadata-type\s+(\w+)/;

const SYSTEM_FIELDS = [
  // SObject system fields
  "Id",
  "IsDeleted",
  "CreatedById",
  "CreatedDate",
  "LastModifiedById",
  "LastModifiedDate",
  "LastActivityDate",
  "LastViewedDate",
  "LastReferencedDate",
  "MasterRecordId",
  "UserRecordAccessId",
  "SystemModstamp",
  // Custom metadata type specific system fields:
  "DeveloperName",
  "MasterLabel",
  "Language",
  "NamespacePrefix",
  "Label",
  "QualifiedApiName"
];

export default class MetadataExplorer extends CliElement {
  renderDropdownOptions = false;
  columns = COLUMNS;
  sortedBy = LAST_MODIFIED_DATE;
  refreshView = false;

  @track filterState = false;
  @track searchTermComponentName?: string;
  @track searchTermUserName?: string;
  @track searchTermFrom?: string;
  @track searchTermTo?: string;
  @track selectedTimeZone?: string = DEFAULT_TIMEZONE;

  @track selectedRows?: TableRow[];
  @track error?: string;
  @track spinnerMessages = new Set<string>();
  @track orgConnectionInfo?: SalesforceConnectionInfo;
  @track metadataTypes?: ListMetadataTypesResponse;
  @track retrieveMetadataResult?: RetrieveMetadataResponse;
  @track metadataItemsByType = new Map<string, ListMetadataOfTypeResponse>();
  @track standardFieldsBySObjectApiName = new Map<
    string,
    FieldDefinitionResponse
  >();
  @track processedMetadataTypes: string[] = [];
  @track folderBasedMetadataItems = new Map<
    string,
    FolderBasedMetadataItem[]
  >();

  /** Types that returned 0 items from list metadata; excluded from the tree. */
  @track typesWithZeroItems: string[] = [];

  private _rowsCacheKey: string | null = null;
  private _rowsCacheValue: TableRow[] | undefined;

  /**
   * Called when the component is connected to the DOM.
   * Retrieves the org connection information.
   */
  connectedCallback(): void {
    this.initializeMetadataExplorer();
  }

  /**
   * Executes a command with spinner management.
   * @param command The command to execute.
   * @returns A promise that resolves with the command execution result.
   */
  private async executeCommandWithSpinner(
    command: string
  ): Promise<ExecuteResult> {
    this.spinnerMessages.add(command);
    this.refresh();
    try {
      return await this.executeCommand(command);
    } finally {
      this.spinnerMessages.delete(command);
      this.refresh();
    }
  }

  private async initializeMetadataExplorer(): Promise<void> {
    try {
      const result = await this.executeCommandWithSpinner(COMMANDS.orgDisplay);
      this.handleOrgDisplay(result);
    } catch (error) {
      this.handleError("Failed to initialize metadata explorer", "Error");
    }
  }

  //  ▂▃▄▅▆▇█▓▒░ Public Methods ░▒▓█▇▆▅▄▃▂

  //  ▂▃▄▅▆▇█▓▒░ Event Handlers ░▒▓█▇▆▅▄▃▂

  /**
   * Handles toggling a row in the tree grid.
   * When expanding a metadata type row, loads that type's metadata via list metadata.
   * When expanding a CustomObject item row, loads standard fields for that SObject.
   * @param event The custom event containing the row name and expansion state.
   */
  async handleToggle(event: CustomEvent) {
    const { name, isExpanded } = event.detail;
    if (!isExpanded) {
      return;
    }

    const typeObj = this.getMetadataObjectType(name);
    if (typeObj) {
      await this.loadMetadataForType(name);
      return;
    }

    if (this.getSObjectApiNames().includes(name)) {
      const command = COMMANDS.queryFieldDefinitions([`'${name}'`]);
      try {
        const result = await this.executeCommandWithSpinner(command);
        this.handleFieldQuery(result, name);
        this.refresh();
      } catch (error) {
        this.handleError(
          `Failed to query field definitions for ${name}`,
          "Error"
        );
      }
    }
  }

  /**
   * Returns the MetadataObjectType for a given xmlName, or undefined.
   */
  private getMetadataObjectType(
    xmlName: string
  ): MetadataObjectType | undefined {
    return this.metadataTypes?.result.metadataObjects.find(
      (t) => t.xmlName === xmlName
    );
  }

  /**
   * Loads metadata for a type when the user expands that type row.
   * Skips if the type is already loaded, but still loads child types (e.g. CustomField) if needed.
   */
  private async loadMetadataForType(typeName: string): Promise<void> {
    const typeObj = this.getMetadataObjectType(typeName);
    if (!typeObj) {
      return;
    }
    const alreadyLoaded = typeObj.inFolder
      ? this.folderBasedMetadataItems.has(typeName)
      : this.metadataItemsByType.has(typeName);
    if (alreadyLoaded) {
      if (typeObj.childXmlNames?.length) {
        try {
          await this.handleChildMetadataTypes(typeObj);
          this.refresh();
        } catch (error) {
          this.spinnerMessages.clear();
          this.handleError(
            `Failed to load child types for ${typeName}`,
            "Error"
          );
        }
      }
      return;
    }
    try {
      this.ensureStandardFieldInChildTypes(typeObj);
      if (typeObj.inFolder) {
        await this.handleFolderBasedMetadata(typeName);
      } else {
        await this.handleStandardMetadata(typeName, typeObj);
      }
      this.refresh();
    } catch (error) {
      this.spinnerMessages.clear();
      this.handleError(
        `Failed to retrieve metadata for type ${typeName}`,
        "Error"
      );
    }
  }

  private async handleFolderBasedMetadata(
    selectedType: string
  ): Promise<void> {
    const command = COMMANDS.queryFolderBasedMetadata(selectedType);
    const result = await this.executeCommandWithSpinner(command);
    this.handleFolderBasedMetadataResponse(result, selectedType);
  }

  private async handleStandardMetadata(
    selectedType: string,
    typeObj: MetadataObjectType
  ): Promise<void> {
    const command = COMMANDS.listMetadataOfType(selectedType);
    const result = await this.executeCommandWithSpinner(command);
    this.handleMetadataOfType(result);

    if (typeObj.childXmlNames?.length) {
      await this.handleChildMetadataTypes(typeObj);
    }
  }

  private async handleChildMetadataTypes(
    typeObj: MetadataObjectType
  ): Promise<void> {
    const commands = typeObj.childXmlNames.map((childMetadataType) =>
      COMMANDS.listMetadataOfType(childMetadataType)
    );
    const results = await Promise.all(
      commands.map((command) => this.executeCommandWithSpinner(command))
    );
    results.forEach((result) => this.handleMetadataOfType(result));
  }

  private ensureStandardFieldInChildTypes(
    typeObj: MetadataObjectType
  ): void {
    if (
      typeObj.xmlName === CUSTOM_OBJECT &&
      typeObj.childXmlNames &&
      !typeObj.childXmlNames.includes(STANDARD_FIELD)
    ) {
      typeObj.childXmlNames.push(STANDARD_FIELD);
    }
  }

  /**
   * Handles the click event on the dropdown button.
   * Toggles the visibility of the dropdown options.
   * @param event The click event.
   */
  handleDropdownClick(event: CustomEvent) {
    this.renderDropdownOptions = !this.renderDropdownOptions;
  }

  /**
   * Handles row selection in the lightning-tree-grid component.
   * Updates the selectedRows property.
   * @param event The row selection event.
   */
  handleRowSelection(event: CustomEvent) {
    const selectedRows = event.detail.selectedRows;
    this.selectedRows = selectedRows;
  }

  /**
   * Handles the click event on the retrieve button.
   * Initiates the retrieval of selected metadata items.
   */
  async handleRetrieveClick() {
    if (!this.selectedMetadataRows) {
      return;
    }
    const command = COMMANDS.retrieveMetadata(this.selectedMetadataRows);
    try {
      const result = await this.executeCommandWithSpinner(command);
      this.handleMetadataRetrieve(result);
    } catch (error) {
      this.handleError("Failed to retrieve metadata", "Error");
    }
  }

  /**
   * Handles changes to the component name search term.
   * @param event The change event.
   */
  handleComponentNameChange(event: CustomEvent) {
    this.searchTermComponentName = event.detail.value;
  }

  /**
   * Handles changes to the user name search term.
   * @param event The change event.
   */
  handleUserNameChange(event: CustomEvent) {
    this.searchTermUserName = event.detail.value;
  }

  /**
   * Handles changes to the "from" date search term.
   * @param event The change event.
   */
  handleFromChange(event: CustomEvent) {
    this.searchTermFrom = event.detail.value;
  }

  /**
   * Handles changes to the "to" date search term.
   * @param event The change event.
   */
  handleToChange(event: CustomEvent) {
    this.searchTermTo = event.detail.value;
  }

  /**
   * Handles changes to the selected time zone.
   * @param event The change event.
   */
  handleTimeZoneChange(event: CustomEvent) {
    this.selectedTimeZone = event.detail;
  }

  /**
   * Handles clicks on the filter button. Toggles the filter state and resets filter values.
   */
  handleFilterButtonClick() {
    this.filterState = !this.filterState;
    this.searchTermComponentName = undefined;
    this.searchTermUserName = undefined;
    this.searchTermFrom = undefined;
    this.searchTermTo = undefined;
    this.selectedTimeZone = DEFAULT_TIMEZONE;
  }

  //  ▂▃▄▅▆▇█▓▒░ Private Methods ░▒▓█▇▆▅▄▃▂

  /**
   * Handles the result of the `sf org display` command.
   * Stores the org connection information and retrieves metadata types.
   * @param result The execution result.
   */
  private async handleOrgDisplay(result: ExecuteResult) {
    if (result.stdout) {
      this.orgConnectionInfo = JSON.parse(result.stdout);
      const command = COMMANDS.listMetadataTypes;
      try {
        const metadataTypesResult =
          await this.executeCommandWithSpinner(command);
        this.handleMetadataTypes(metadataTypesResult);
      } catch (error) {
        this.handleError("Failed to fetch metadata types", "Error");
      }
    } else if (result.stderr) {
      this.handleError(
        result.stderr,
        "Something went wrong when fetching org details"
      );
    }
  }

  /**
   * Handles the result of the `sf org list metadata-types` command.
   * Stores the retrieved metadata types and kicks off parallel list metadata for each type.
   * @param result The execution result.
   */
  private handleMetadataTypes(result: ExecuteResult) {
    if (result.stdout) {
      const parsed = JSON.parse(
        result.stdout
      ) as ListMetadataTypesResponse;
      this.metadataTypes = parsed;
      this.loadAllMetadataTypesInParallel(parsed);
    } else if (result.stderr) {
      this.handleError(
        result.stderr,
        "Something went wrong when fetching metadata types"
      );
    }
  }

  private static readonly METADATA_LOAD_CONCURRENCY = 5;

  /**
   * Loads list metadata (or folder query) for every metadata type from a queue,
   * processing up to 5 types at a time (alphabetically) to avoid memory pressure.
   * Types that return 0 items are removed from the tree (typesWithZeroItems).
   * @param metadataTypesResponse Parsed list-metadata-types result (passed so the load does not depend on reactive state).
   */
  private async loadAllMetadataTypesInParallel(
    metadataTypesResponse: ListMetadataTypesResponse
  ): Promise<void> {
    const objects = metadataTypesResponse?.result?.metadataObjects;
    if (!objects?.length) {
      return;
    }
    this.typesWithZeroItems = [];
    this._rowsCacheKey = null;

    objects.forEach((typeObj) => this.ensureStandardFieldInChildTypes(typeObj));

    const queue = objects
      .slice()
      .sort((a, b) => a.xmlName.localeCompare(b.xmlName));
    const concurrency = MetadataExplorer.METADATA_LOAD_CONCURRENCY;

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const typeObj = queue.shift();
        if (!typeObj) {
          break;
        }
        try {
          await this.loadOneMetadataTypeForInitialLoad(typeObj);
        } catch (error) {
          if (this.isDebugMode) {
            console.warn(
              `Metadata load failed for ${typeObj.xmlName}:`,
              error
            );
          }
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    this.refresh();
  }

  /**
   * Loads a single metadata type (list metadata or folder query). If the type has 0 items,
   * adds it to typesWithZeroItems so it is removed from the tree.
   */
  private async loadOneMetadataTypeForInitialLoad(
    typeObj: MetadataObjectType
  ): Promise<void> {
    const typeName = typeObj.xmlName;
    if (typeObj.inFolder) {
      try {
        const command = COMMANDS.queryFolderBasedMetadata(typeName);
        const result = await this.executeCommand(command);
        if (result.stdout) {
          const response = JSON.parse(result.stdout);
          if (response.status === 0) {
            const rawRecords = response.result?.records ?? [];
            if (rawRecords.length === 0) {
              this.typesWithZeroItems = [...this.typesWithZeroItems, typeName];
            } else {
              const normalized = this.normalizeFolderBasedRecords(
                rawRecords,
                typeName
              );
              this.folderBasedMetadataItems.set(typeName, normalized);
            }
          }
        }
      } catch {
        // Leave type visible on error (unsupported folder type or parse error)
      }
    } else {
      const command = COMMANDS.listMetadataOfType(typeName);
      const result = await this.executeCommand(command);
      if (result.stdout) {
        try {
          const parsed = JSON.parse(result.stdout) as ListMetadataOfTypeResponse;
          const items = parsed.result ?? [];
          if (items.length === 0) {
            this.typesWithZeroItems = [...this.typesWithZeroItems, typeName];
          } else {
            this.processedMetadataTypes.push(typeName);
            this.metadataItemsByType.set(typeName, parsed);
          }
        } catch {
          // Leave type visible on parse error
        }
      }
    }
    this.refresh();
  }

  /**
   * Handles the result of the `sf org list metadata` command.
   * Stores the retrieved metadata items by type.
   * @param result The execution result.
   */
  private handleMetadataOfType(result: ExecuteResult) {
    const selectedMetadataType = this.extractMetadataType(result.command);
    if (result.stdout) {
      if (!selectedMetadataType) {
        return;
      }
      const metadataOfSelectedType = JSON.parse(
        result.stdout
      ) as ListMetadataOfTypeResponse;
      const items = metadataOfSelectedType.result ?? [];
      if (items.length === 0) {
        this.typesWithZeroItems = [
          ...this.typesWithZeroItems,
          selectedMetadataType
        ];
      } else {
        this.processedMetadataTypes.push(selectedMetadataType);
        this.metadataItemsByType.set(
          selectedMetadataType,
          metadataOfSelectedType
        );
      }
    } else if (result.stderr) {
      this.handleError(
        result.stderr,
        `Something went wrong when fetching ${selectedMetadataType}`
      );
    }
  }

  /**
   * Handles the result of the `sf project retrieve start` command.
   * Hides the spinner.
   * @param result The execution result.
   */
  private handleMetadataRetrieve(result: ExecuteResult) {
    const errorHeader = `Something went wrong when retrieving metadata`;
    if (result.stderr) {
      this.handleError(result.stderr, errorHeader);
    }
    if (result.stdout) {
      const response: RetrieveMetadataResponse = JSON.parse(result.stdout);
      const errorMessage = this.extractErrorMessages(response);
      if (errorMessage.length > 0) {
        this.handleError(errorMessage.join("\n"), errorHeader);
      }
    }
    this.refresh();
  }

  /**
   * Handles the result of the `sf data query` command for field definitions.
   * Stores the retrieved field definitions by SObject API name.
   * @param result The execution result.
   */
  private handleFieldQuery(result: ExecuteResult, sObjectApiName: string) {
    if (result.stdout) {
      const queryResult = JSON.parse(result.stdout);
      this.standardFieldsBySObjectApiName.set(sObjectApiName, queryResult);
      // Caller (handleToggle) already calls refresh()
    } else if (result.stderr) {
      this.handleError(
        result.stderr,
        `Something went wrong when querying FieldDefinition for ${sObjectApiName}`
      );
    }
  }

  /**
   * Resets the metadata items and related properties.
   * Clears selections, results, and collapses the tree grid.
   */
  private resetMetadataItems() {
    this._rowsCacheKey = null;
    this.renderDropdownOptions = false;
    this.selectedRows = undefined;
    this.retrieveMetadataResult = undefined;
    this.metadataItemsByType = new Map<string, ListMetadataOfTypeResponse>();
    this.standardFieldsBySObjectApiName = new Map<
      string,
      FieldDefinitionResponse
    >();
    const treeGrid = this.template!.querySelector("lightning-tree-grid");
    if (treeGrid) {
      (treeGrid as any).collapseAll();
    }
  }

  /**
   * Returns a list of SObject API names.
   * @returns An array of SObject API names.
   */
  private getSObjectApiNames(): string[] {
    return (
      this.metadataItemsByType
        .get(CUSTOM_OBJECT)
        ?.result.map((sObject) => sObject.fullName) ?? []
    );
  }

  /**
   * Extracts the metadata type from the command string.
   * @param command The command string.
   * @returns The extracted metadata type or undefined if not found.
   */
  private extractMetadataType(command: string): string | undefined {
    const match = command.match(METADATA_TYPE_COMMAND_REGEX);
    return match?.[1];
  }

  /**
   * Extracts error messages from a RetrieveMetadataResponse.
   * Filters for files with a 'Failed' state and returns their error messages.
   * @param result The RetrieveMetadataResponse object.
   * @returns An array of error messages, or an empty array if none are found.
   */
  private extractErrorMessages(result: RetrieveMetadataResponse): string[] {
    return result.result.files
      .filter((file) => file.state === "Failed")
      .map((file) => file.error?.toString() ?? "");
  }

  /**
   * Applies filters to the table rows.
   * Currently applies last modified date and component name filters.
   * @param rows The table rows to filter.
   * @returns The filtered table rows.
   */
  private applyTableRowFilters(rows: TableRow[]): TableRow[] {
    rows = this.applyLastModifiedDateRowFilter(rows);
    rows = this.applyComponentNameTableRowFilter(rows);
    return rows;
  }

  /**
   * Filters table rows based on the last modified date range.
   * @param rows The table rows to filter.
   * @returns The filtered table rows.
   */
  private applyLastModifiedDateRowFilter(rows: TableRow[]): TableRow[] {
    if (!this.searchTermFrom && !this.searchTermTo) {
      return rows;
    }

    const from = this.searchTermFrom
      ? new Date(this.searchTermFrom)
      : undefined;
    const to = this.searchTermTo ? new Date(this.searchTermTo) : undefined;

    return rows.filter((row) => {
      if (!row.lastModifiedDate) {
        return true;
      }
      const lastModifiedDate = new Date(row.lastModifiedDate);
      return (
        (!from || lastModifiedDate >= from) && (!to || lastModifiedDate <= to)
      );
    });
  }

  /**
   * Filters table rows based on the component name search term.
   * @param rows The table rows to filter.
   * @returns The filtered table rows.
   */
  private applyComponentNameTableRowFilter(rows: TableRow[]): TableRow[] {
    if (!this.searchTermComponentName) {
      return rows;
    }
    return rows.filter((row) =>
      this.fuzzyMatch(row.fullName!, this.searchTermComponentName!)
    );
  }

  /**
   * Performs a fuzzy match between a string and a pattern.
   * @param str The string to search within.
   * @param pattern The pattern to search for.
   * @returns True if a fuzzy match is found, false otherwise.
   */
  private fuzzyMatch(str: string, pattern: string): boolean {
    pattern = pattern.toLowerCase();
    str = str.toLowerCase();
    let patternIdx = 0;
    for (const char of str) {
      if (char === pattern[patternIdx]) {
        patternIdx++;
      }
      if (patternIdx === pattern.length) {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates child metadata table rows for the given metadata item.
   * @param metadataItem The parent metadata item.
   * @param childTypeToParentToRows Optional precomputed map of child type -> parent fullName -> rows.
   * @returns An array of child metadata table rows, or undefined if none exist.
   */
  private getChildMetadataTableRows(
    metadataItem: TableRow,
    childTypeToParentToRows: Map<string, Map<string, TableRow[]>> | undefined,
    typeObj: MetadataObjectType
  ): TableRow[] | undefined {
    if (!typeObj.childXmlNames?.length) {
      return undefined;
    }
    const result: TableRow[] = typeObj.childXmlNames.flatMap(
      (childType) => {
        const childTypeRow = this.createChildTypeRow(metadataItem, childType);
        const childMetadataItemRows = this.getChildMetadataItemRows(
          metadataItem,
          childType,
          childTypeToParentToRows
        );
        if (childMetadataItemRows && childMetadataItemRows.length > 0) {
          childTypeRow._children = childMetadataItemRows;
          childTypeRow.statusIcon = ICONS.complete;
          return childTypeRow;
        }
        return [];
      }
    );
    return result.length > 0 ? result : undefined;
  }

  /**
   * Creates a child row representing a specific child metadata type.
   * @param metadataItem The parent metadata item.
   * @param childType The XML name of the child metadata type.
   * @returns A TableRow representing the child type, initially in a loading state.
   */
  private createChildTypeRow(
    metadataItem: TableRow,
    childType: string
  ): TableRow {
    return {
      id: `${metadataItem.fullName}.${childType}`,
      metadataType: childType,
      statusIcon: ICONS.loading
    };
  }

  /**
   * Retrieves child metadata item rows for a given parent metadata item and child type.
   * @param metadataItem The parent metadata item.
   * @param childType The XML name of the child metadata type.
   * @param childTypeToParentToRows Optional precomputed map for non–standard-field child types.
   * @returns An array of TableRows representing the child metadata items, or undefined if none are found.
   */
  private getChildMetadataItemRows(
    metadataItem: TableRow,
    childType: string,
    childTypeToParentToRows?: Map<string, Map<string, TableRow[]>>
  ): TableRow[] | undefined {
    if (childType === STANDARD_FIELD) {
      return this.getStandardFieldRows(metadataItem);
    }
    return this.getOtherChildMetadataRows(
      metadataItem,
      childType,
      childTypeToParentToRows
    );
  }

  /**
   * Retrieves standard field rows for a given SObject.
   * @param metadataItem The parent metadata item representing the SObject.
   * @returns An array of TableRows representing the standard fields, or undefined if none are found.
   */
  private getStandardFieldRows(metadataItem: TableRow): TableRow[] | undefined {
    const standardFields = this.standardFieldsBySObjectApiName.get(
      metadataItem.fullName!
    );
    if (!standardFields) {
      return undefined;
    }

    return standardFields.result.records
      .map((field) =>
        convertFieldDefinitionRecordToTableRow(metadataItem.fullName!, field)
      )
      .filter(
        (record) =>
          record.label &&
          !SYSTEM_FIELDS.includes(record.label) &&
          !record.label.includes("__")
      )
      .sort((a, b) => a.label!.localeCompare(b.label!));
  }

  /**
   * Retrieves child metadata rows for types other than standard fields.
   * Uses precomputed map when provided to avoid filtering the full list per parent.
   * @param metadataItem The parent metadata item.
   * @param childType The XML name of the child metadata type.
   * @param childTypeToParentToRows Optional precomputed map from createChildRows.
   * @returns An array of TableRows representing the child metadata items, or undefined if none are found.
   */
  private getOtherChildMetadataRows(
    metadataItem: TableRow,
    childType: string,
    childTypeToParentToRows?: Map<string, Map<string, TableRow[]>>
  ): TableRow[] | undefined {
    const byParent = childTypeToParentToRows?.get(childType);
    if (byParent !== undefined) {
      return byParent.get(metadataItem.fullName ?? "") ?? undefined;
    }
    const childMetadataItems = this.metadataItemsByType.get(childType);
    if (!childMetadataItems) {
      return undefined;
    }
    return this.applyTableRowFilters(
      childMetadataItems.result.map((item) =>
        convertMetadataItemToTableRow(item)
      )
    )
      .filter((item) => item.sObjectApiName === metadataItem.fullName)
      .sort((a, b) => a.fullName!.localeCompare(b.fullName!));
  }

  /**
   * Precomputes child metadata rows grouped by parent sObjectApiName per child type.
   * Avoids filtering the full list per parent in getOtherChildMetadataRows.
   */
  private buildChildTypeToParentToRows(
    typeObj: MetadataObjectType
  ): Map<string, Map<string, TableRow[]>> {
    const childTypeToParentToRows = new Map<string, Map<string, TableRow[]>>();
    const childXmlNames = typeObj.childXmlNames;
    if (!childXmlNames?.length) {
      return childTypeToParentToRows;
    }
    for (const childType of childXmlNames) {
      if (childType === STANDARD_FIELD) continue;
      const childMetadataItems = this.metadataItemsByType.get(childType);
      if (!childMetadataItems) continue;
      const rows = this.applyTableRowFilters(
        childMetadataItems.result.map((item) => convertMetadataItemToTableRow(item))
      );
      const byParent = new Map<string, TableRow[]>();
      for (const row of rows) {
        const key = row.sObjectApiName ?? "";
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(row);
      }
      byParent.forEach((arr) =>
        arr.sort((a, b) => a.fullName!.localeCompare(b.fullName!))
      );
      childTypeToParentToRows.set(childType, byParent);
    }
    return childTypeToParentToRows;
  }

  /**
   * Creates child rows for the tree grid. Applies filters and sorts the rows.
   * @param metadataItems The metadata items to create rows for.
   * @param typeObj The metadata type (for child types and structure).
   * @returns An array of TableRows representing the child metadata items.
   */
  private createChildRows(
    metadataItems: ListMetadataOfTypeResponse,
    typeObj: MetadataObjectType
  ): TableRow[] {
    const childTypeToParentToRows = this.buildChildTypeToParentToRows(typeObj);
    return this.applyTableRowFilters(
      metadataItems.result.map((item) => convertMetadataItemToTableRow(item))
    )
      .sort((a, b) => a.fullName!.localeCompare(b.fullName!))
      .map((child) => ({
        ...child,
        _children: this.getChildMetadataTableRows(
          child,
          childTypeToParentToRows,
          typeObj
        )
      }));
  }

  /**
   * Displays an error toast message.
   * @param error The error message to display.
   * @param label The label for the toast.
   */
  private async handleError(error: string, label: string) {
    Toast.show({ label: label, message: error, variant: "error" }, this);
  }

  /**
   * Forces a rerender of the component.
   * This is useful for updating the UI after asynchronous operations
   * that change the underlying data, such as fetching standard fields.
   * It toggles the `refreshView` tracked property, triggering a rerender.
   */
  private refresh() {
    this.refreshView = !this.refreshView;
  }

  //  ▂▃▄▅▆▇█▓▒░ Getters ░▒▓█▇▆▅▄▃▂

  /**
   * Getter for the main table rows.  Constructs the hierarchical
   * data structure for the lightning-tree-grid component.
   * Result is cached and invalidated when filters, type, or underlying data change.
   * @returns An array of TableRows representing the root level of the metadata tree.
   */
  get rows(): TableRow[] | undefined {
    const cacheKey = this.buildRowsCacheKey();
    if (cacheKey !== null && cacheKey === this._rowsCacheKey) {
      return this._rowsCacheValue;
    }
    const value = this.computeRows();
    this._rowsCacheKey = cacheKey;
    this._rowsCacheValue = value;
    return value;
  }

  /**
   * Builds a cache key for the rows getter. Returns null when metadata types are not loaded.
   */
  private buildRowsCacheKey(): string | null {
    if (!this.metadataTypes?.result.metadataObjects?.length) {
      return null;
    }
    const parts = [
      this.refreshView,
      this.metadataTypes.result.metadataObjects.length,
      this.searchTermComponentName ?? "",
      this.searchTermFrom ?? "",
      this.searchTermTo ?? "",
      this.searchTermUserName ?? "",
      this.metadataItemsByType.size,
      this.standardFieldsBySObjectApiName.size,
      this.folderBasedMetadataItems.size,
      this.typesWithZeroItems.length,
      this.typesWithZeroItems.slice().sort().join(",")
    ];
    return parts.join("|");
  }

  /**
   * Returns true if the type's metadata has been loaded (list metadata or folder query).
   */
  private isTypeLoaded(typeObj: MetadataObjectType): boolean {
    return typeObj.inFolder
      ? this.folderBasedMetadataItems.has(typeObj.xmlName)
      : this.metadataItemsByType.has(typeObj.xmlName);
  }

  /**
   * Returns child rows for a metadata type row (folder structure or item list).
   */
  private getChildrenForType(typeObj: MetadataObjectType): TableRow[] {
    if (typeObj.inFolder) {
      const items = this.folderBasedMetadataItems.get(typeObj.xmlName);
      return items
        ? this.buildFolderChildrenForType(typeObj.xmlName, items)
        : [];
    }
    const metadataItems = this.metadataItemsByType.get(typeObj.xmlName);
    return metadataItems
      ? this.createChildRows(metadataItems, typeObj)
      : [];
  }

  /**
   * Builds the folder-based child rows for a type (folders and unfiled items).
   */
  private buildFolderChildrenForType(
    xmlName: string,
    items: FolderBasedMetadataItem[]
  ): TableRow[] {
    const folderMap = new Map<string, FolderBasedMetadataItem[]>();
    const unfiledItems: FolderBasedMetadataItem[] = [];

    items.forEach((item) => {
      if (item.Folder) {
        const folderName = item.Folder.DeveloperName;
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, []);
        }
        folderMap.get(folderName)!.push(item);
      } else {
        unfiledItems.push(item);
      }
    });

    const children: TableRow[] = [];

    for (const [folderName, folderItems] of folderMap) {
      children.push({
        id: `folder_${folderName}`,
        label: folderName,
        metadataType: "Folder",
        type: xmlName,
        statusIcon: ICONS.complete,
        _children: folderItems.map((item) =>
          this.convertFolderBasedMetadataItemToTableRow(item, xmlName)
        )
      });
    }

    if (unfiledItems.length > 0) {
      children.push({
        id: "folder_unfiled",
        label: UNFILED_FOLDER_LABEL,
        metadataType: "Folder",
        type: xmlName,
        statusIcon: ICONS.complete,
        _children: unfiledItems.map((item) =>
          this.convertFolderBasedMetadataItemToTableRow(item, xmlName)
        )
      });
    }

    children.sort((a, b) => {
      if (a.label === UNFILED_FOLDER_LABEL) {
        return 1;
      }
      if (b.label === UNFILED_FOLDER_LABEL) {
        return -1;
      }
      return a.label!.localeCompare(b.label!);
    });

    return children;
  }

  /**
   * Computes the full rows tree. Root rows are metadata types that have items (or are still loading).
   * Types that returned 0 items from list metadata are excluded.
   */
  private computeRows(): TableRow[] | undefined {
    const objects = this.metadataTypes?.result.metadataObjects;
    if (!objects?.length) {
      return undefined;
    }

    const zeroSet = new Set(this.typesWithZeroItems);
    const sorted = objects
      .filter((typeObj) => !zeroSet.has(typeObj.xmlName))
      .slice()
      .sort((a, b) => a.xmlName.localeCompare(b.xmlName));

    return sorted.map((typeObj) => {
      const loaded = this.isTypeLoaded(typeObj);
      return {
        ...convertMetadataObjectTypeToTableRow(typeObj),
        statusIcon: loaded ? ICONS.complete : ICONS.loading,
        _children: this.getChildrenForType(typeObj)
      };
    });
  }

  /**
   * Getter for the currently selected metadata rows, formatted for retrieval.
   * @returns An array of strings representing the selected metadata items, or undefined if none are selected.
   */
  get selectedMetadataRows(): string[] | undefined {
    return this.selectedRows
      ?.filter((metadataRow) => metadataRow.fullName)
      ?.map((metadataRow) => `${metadataRow.type}:${metadataRow.fullName}`);
  }

  /**
   * Getter to determine whether to render the retrieve button.
   * @returns True if rows are selected, false otherwise.
   */
  get renderRetrieve() {
    if (!this.selectedRows) {
      return false;
    }
    return this.selectedRows.length > 0;
  }

  /**
   * Formats the spinner display text by joining spinner messages with newlines.
   * Returns undefined if there are no spinner messages.
   */
  get spinnerDisplayText(): string[] | undefined {
    if (this.spinnerMessages.size === 0) {
      return undefined;
    }
    return this.isDebugMode ? Array.from(this.spinnerMessages) : [];
  }

  private handleFolderBasedMetadataResponse(
    result: ExecuteResult,
    metadataType: string
  ) {
    if (!result.stdout) {
      this.handleError("No output received from the command", "Error");
      return;
    }

    try {
      const response = JSON.parse(result.stdout);
      if (response.status === 0) {
        const rawRecords = response.result?.records ?? [];
        if (rawRecords.length === 0) {
          this.typesWithZeroItems = [...this.typesWithZeroItems, metadataType];
        } else {
          const normalized = this.normalizeFolderBasedRecords(
            rawRecords,
            metadataType
          );
          this.folderBasedMetadataItems.set(metadataType, normalized);
        }
      } else {
        this.handleError(
          `Failed to retrieve folder-based metadata: ${
            response.warnings?.join(", ") || "Unknown error"
          }`,
          "Error"
        );
      }
    } catch (error) {
      this.handleError(
        `Failed to parse folder-based metadata response: ${error}`,
        "Error"
      );
    }
  }

  /**
   * Normalizes raw SOQL records from different folder-based types into
   * the common FolderBasedMetadataItem shape.
   *
   * - EmailTemplate & Document: already have Folder.DeveloperName
   * - Report: has FolderName (label, used as folder dev name) and OwnerId
   * - Dashboard: has FolderName (label) and FolderId; uses Title for display name
   */
  private normalizeFolderBasedRecords(
    rawRecords: any[],
    metadataType: string
  ): FolderBasedMetadataItem[] {
    switch (metadataType) {
      case "Report":
        return rawRecords.map((r: ReportRecord) => ({
          Id: r.Id,
          Name: r.Name,
          DeveloperName: r.DeveloperName,
          NamespacePrefix: r.NamespacePrefix,
          LastModifiedDate: r.LastModifiedDate,
          LastModifiedBy: r.LastModifiedBy ?? null,
          Folder:
            r.FolderName && r.FolderName !== "null"
              ? { DeveloperName: r.FolderName }
              : null,
          FolderId: r.OwnerId
        }));
      case "Dashboard":
        return rawRecords.map((r: DashboardRecord) => ({
          Id: r.Id,
          Name: r.Title ?? r.DeveloperName,
          DeveloperName: r.DeveloperName,
          NamespacePrefix: r.NamespacePrefix,
          LastModifiedDate: r.LastModifiedDate,
          LastModifiedBy: null,
          Folder:
            r.FolderName && r.FolderName !== "null"
              ? { DeveloperName: r.FolderName }
              : null,
          FolderId: r.FolderId
        }));
      case "Document":
        return rawRecords.map((r: DocumentRecord) => ({
          Id: r.Id,
          Name: r.Name,
          DeveloperName: r.DeveloperName,
          NamespacePrefix: r.NamespacePrefix,
          LastModifiedDate: r.LastModifiedDate,
          LastModifiedBy: r.LastModifiedBy ?? null,
          Folder: r.Folder ?? null,
          FolderId: r.FolderId
        }));
      default:
        // EmailTemplate and any future types that already match the interface
        return rawRecords as FolderBasedMetadataItem[];
    }
  }

  private convertFolderBasedMetadataItemToTableRow(
    item: FolderBasedMetadataItem,
    metadataType: string
  ): TableRow {
    const fullName = item.Folder
      ? `${item.Folder.DeveloperName}/${item.DeveloperName}`
      : `unfiled\\$public/${item.DeveloperName}`;

    return {
      id: item.Id,
      label: item.Name,
      fullName: fullName,
      metadataType: metadataType,
      type: metadataType,
      lastModifiedByName: item.LastModifiedBy?.Name,
      lastModifiedDate: item.LastModifiedDate,
      statusIcon: ICONS.complete,
      _children: undefined
    };
  }
}
