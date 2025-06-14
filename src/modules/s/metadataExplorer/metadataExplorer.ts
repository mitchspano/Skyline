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
  COMMAND_PREFIX,
  COMMANDS,
  FolderBasedMetadataResponse,
  FolderBasedMetadataItem
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
const STANDARD_FIELD = "StandardField";
const LAST_MODIFIED_DATE = "lastModifiedDate";

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
  @track selectedMetadataType?: MetadataObjectType;
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
   * Handles toggling the expansion of a custom object in the tree grid.
   * Queries and displays the standard fields for the selected custom object.
   * @param event The custom event containing the name of the custom object.
   */
  async handleToggle(event: CustomEvent) {
    const sObjectApiName = event.detail.name;
    if (
      this.selectedMetadataType?.xmlName !== CUSTOM_OBJECT ||
      !this.getSObjectApiNames().includes(sObjectApiName) ||
      !event.detail.isExpanded
    ) {
      return;
    }
    const command = COMMANDS.queryFieldDefinitions([`'${sObjectApiName}'`]);
    try {
      const result = await this.executeCommandWithSpinner(command);
      this.handleFieldQuery(result, sObjectApiName);
      this.refresh();
    } catch (error) {
      this.handleError(
        `Failed to query field definitions for ${sObjectApiName}`,
        "Error"
      );
    }
  }

  /**
   * Handles the selection of a metadata type from the dropdown.
   * Retrieves the metadata items for the selected type.
   * @param event The change event containing the selected metadata type value.
   */
  async handleMetadataTypeSelection(event: CustomEvent) {
    this.resetMetadataItems();
    this.processedMetadataTypes = [];
    const selectedType = event.detail.value;
    this.selectedMetadataType = this.metadataTypes?.result.metadataObjects.find(
      (type) => type.xmlName === selectedType
    );

    if (this.selectedMetadataType) {
      try {
        if (this.selectedMetadataType.inFolder) {
          await this.handleFolderBasedMetadata(selectedType);
        } else {
          await this.handleStandardMetadata(selectedType);
        }
      } catch (error) {
        this.spinnerMessages.clear();
        this.handleError(
          `Failed to retrieve metadata for type ${selectedType}`,
          "Error"
        );
      }
    }

    this.ensureStandardFieldInChildTypes();
  }

  private async handleFolderBasedMetadata(selectedType: string): Promise<void> {
    const command = COMMANDS.queryFolderBasedMetadata(selectedType);
    const result = await this.executeCommandWithSpinner(command);
    this.handleFolderBasedMetadataResponse(result);
  }

  private async handleStandardMetadata(selectedType: string): Promise<void> {
    const command = COMMANDS.listMetadataOfType(selectedType);
    const result = await this.executeCommandWithSpinner(command);
    this.handleMetadataOfType(result);

    if (this.selectedMetadataType?.childXmlNames) {
      await this.handleChildMetadataTypes();
    }
  }

  private async handleChildMetadataTypes(): Promise<void> {
    const commands = this.selectedMetadataType!.childXmlNames.map(
      (childMetadataType) => COMMANDS.listMetadataOfType(childMetadataType)
    );
    const results = await Promise.all(
      commands.map((command) => this.executeCommandWithSpinner(command))
    );
    results.forEach((result) => this.handleMetadataOfType(result));
  }

  private ensureStandardFieldInChildTypes(): void {
    if (
      this.selectedMetadataType?.xmlName === CUSTOM_OBJECT &&
      this.selectedMetadataType?.childXmlNames &&
      !this.selectedMetadataType.childXmlNames.includes(STANDARD_FIELD)
    ) {
      this.selectedMetadataType.childXmlNames.push(STANDARD_FIELD);
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
   * Stores the retrieved metadata types.
   * @param result The execution result.
   */
  private handleMetadataTypes(result: ExecuteResult) {
    if (result.stdout) {
      this.metadataTypes = JSON.parse(result.stdout);
    } else if (result.stderr) {
      this.handleError(
        result.stderr,
        "Something went wrong when fetching metadata types"
      );
    }
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
      this.processedMetadataTypes.push(selectedMetadataType);
      const metadataOfSelectedType = JSON.parse(result.stdout);
      this.metadataItemsByType.set(
        selectedMetadataType,
        metadataOfSelectedType
      );
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
      this.refresh();
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
    this.renderDropdownOptions = false;
    this.selectedRows = undefined;
    this.selectedMetadataType = undefined;
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
    const metadataPrefixRegex = new RegExp(
      COMMAND_PREFIX.sfOrgListMetadata + "\\s+(\\w+)"
    );
    const match = command.match(metadataPrefixRegex);

    if (match && match.length > 1) {
      return match[1];
    }

    return undefined;
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
   * @returns An array of child metadata table rows, or undefined if none exist.
   */
  private getChildMetadataTableRows(
    metadataItem: TableRow
  ): TableRow[] | undefined {
    if (!this.selectedMetadataType?.childXmlNames) {
      return undefined;
    }
    const result: TableRow[] = this.selectedMetadataType.childXmlNames.flatMap(
      (childType) => {
        const childTypeRow = this.createChildTypeRow(metadataItem, childType);
        const childMetadataItemRows = this.getChildMetadataItemRows(
          metadataItem,
          childType
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
   * @returns An array of TableRows representing the child metadata items, or undefined if none are found.
   */
  private getChildMetadataItemRows(
    metadataItem: TableRow,
    childType: string
  ): TableRow[] | undefined {
    if (childType === STANDARD_FIELD) {
      return this.getStandardFieldRows(metadataItem);
    } else {
      return this.getOtherChildMetadataRows(metadataItem, childType);
    }
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
   * @param metadataItem The parent metadata item.
   * @param childType The XML name of the child metadata type.
   * @returns An array of TableRows representing the child metadata items, or undefined if none are found.
   */
  private getOtherChildMetadataRows(
    metadataItem: TableRow,
    childType: string
  ): TableRow[] | undefined {
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
   * Creates child rows for the tree grid. Applies filters and sorts the rows.
   * @param metadataItems The metadata items to create rows for.
   * @returns An array of TableRows representing the child metadata items.
   */
  private createChildRows(
    metadataItems: ListMetadataOfTypeResponse
  ): TableRow[] {
    return this.applyTableRowFilters(
      metadataItems.result.map((item) => convertMetadataItemToTableRow(item))
    )
      .sort((a, b) => a.fullName!.localeCompare(b.fullName!))
      .map((child) => ({
        ...child,
        _children: this.getChildMetadataTableRows(child)
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
   * @returns An array of TableRows representing the root level of the metadata tree.
   */
  get rows(): TableRow[] | undefined {
    if (!this.selectedMetadataType) {
      return undefined;
    }

    if (this.selectedMetadataType.inFolder) {
      const items = this.folderBasedMetadataItems.get(
        this.selectedMetadataType.xmlName
      );
      if (!items) {
        return undefined;
      }

      // Create a map of folders and their items
      const folderMap = new Map<string, FolderBasedMetadataItem[]>();
      const unfiledItems: FolderBasedMetadataItem[] = [];

      // Group items by folder
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

      // Create the root metadata type row
      const rootRow: TableRow = {
        id: this.selectedMetadataType.xmlName,
        label: this.selectedMetadataType.xmlName,
        metadataType: this.selectedMetadataType.xmlName,
        type: this.selectedMetadataType.xmlName,
        statusIcon: ICONS.complete,
        _children: []
      };

      // Add folder rows with their items as children
      for (const [folderName, folderItems] of folderMap) {
        const folderRow: TableRow = {
          id: `folder_${folderName}`,
          label: folderName,
          metadataType: "Folder",
          type: this.selectedMetadataType.xmlName,
          statusIcon: ICONS.complete,
          _children: folderItems.map((item) =>
            this.convertFolderBasedMetadataItemToTableRow(
              item,
              this.selectedMetadataType!.xmlName
            )
          )
        };
        rootRow._children!.push(folderRow);
      }

      // Add unfiled items under a special folder
      if (unfiledItems.length > 0) {
        const unfiledFolderRow: TableRow = {
          id: "folder_unfiled",
          label: "Unfiled Public Classic Email Templates",
          metadataType: "Folder",
          type: this.selectedMetadataType.xmlName,
          statusIcon: ICONS.complete,
          _children: unfiledItems.map((item) =>
            this.convertFolderBasedMetadataItemToTableRow(
              item,
              this.selectedMetadataType!.xmlName
            )
          )
        };
        rootRow._children!.push(unfiledFolderRow);
      }

      // Sort folders alphabetically
      rootRow._children!.sort((a, b) => {
        // Put "Unfiled Public Classic Email Templates" at the end
        if (a.label === "Unfiled Public Classic Email Templates") return 1;
        if (b.label === "Unfiled Public Classic Email Templates") return -1;
        return a.label!.localeCompare(b.label!);
      });

      return [rootRow];
    }

    const metadataItems = this.metadataItemsByType.get(
      this.selectedMetadataType.xmlName
    );
    return [
      {
        ...convertMetadataObjectTypeToTableRow(this.selectedMetadataType),
        statusIcon: metadataItems ? ICONS.complete : ICONS.loading,
        _children: metadataItems ? this.createChildRows(metadataItems) : []
      }
    ];
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
   * Getter for the available metadata type options for the dropdown.
   * @returns An array of objects representing the metadata types, or undefined if none are available.
   */
  get metadataTypeOptions(): { label: string; value: string }[] | undefined {
    return this.metadataTypes?.result.metadataObjects
      .map((mType) => ({ label: mType.xmlName, value: mType.xmlName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Getter for the currently selected metadata type value.
   * @returns The value of the currently selected metadata type, or undefined if none is selected.
   */
  get selectedMetadataTypeValue(): string | undefined {
    return this.selectedMetadataType?.xmlName;
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

  private handleFolderBasedMetadataResponse(result: ExecuteResult) {
    if (!result.stdout) {
      this.handleError("No output received from the command", "Error");
      return;
    }

    try {
      const response = JSON.parse(result.stdout) as FolderBasedMetadataResponse;
      if (response.status === 0) {
        const metadataType = this.selectedMetadataType?.xmlName;
        if (metadataType) {
          this.folderBasedMetadataItems.set(
            metadataType,
            response.result.records
          );
          this.refresh();
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
