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

import { LightningElement } from "lwc";
import {
  PackageIndex,
  buildPackageIndex,
  classifyMetadataItem,
  classifyFolderBasedItem,
  createEmptyPackageIndex,
  LOCAL_NAMESPACE_LABEL,
  UNPACKAGED_LABEL
} from "../../modules/s/metadataExplorer/packageResolver";

export default class MetadataExplorer extends LightningElement {
  selectedMetadataType?: any;
  selectedRows: any[] = [];
  metadataTypes?: any;
  metadataItemsByType = new Map();
  folderBasedMetadataItems = new Map();
  searchTermComponentName: string | undefined = "";
  searchTermUserName: string | undefined = "";
  searchTermFrom: string | undefined = "";
  searchTermTo: string | undefined = "";
  selectedTimeZone = "America/Los_Angeles";
  renderDropdownOptions = false;
  spinnerMessages = new Set();
  orgConnectionInfo?: any;
  filterState = false;
  isDebugMode = false;
  standardFieldsBySObjectApiName = new Map();
  processedMetadataTypes: string[] = [];
  typesWithZeroItems: string[] = [];
  totalMetadataTypesToProcess = 0;
  completedMetadataTypeCount = 0;
  inProgressMetadataTypes: string[] = [];
  packageIndex?: PackageIndex;
  packageDiscoveryComplete = false;
  refreshView = false;
  columns: any[] = [];

  connectedCallback() {
    this.initializeMetadataExplorer();
  }

  async initializeMetadataExplorer() {
    if (!this.orgConnectionInfo && !this.isDebugMode) {
      const orgDisplayResult = await this.executeCommand(
        "sf org display --json"
      );
      if (
        orgDisplayResult &&
        orgDisplayResult.stdout &&
        orgDisplayResult.errorCode === 0
      ) {
        this.orgConnectionInfo = { username: "test@example.com" };
      }
    }
    if (!this.metadataTypes) {
      this.metadataTypes = {
        result: {
          metadataObjects: [
            { xmlName: "ApexClass" },
            { xmlName: "CustomObject" }
          ]
        }
      };
    }
  }

  async loadMetadataTypes() {
    // Mock implementation
  }

  async handleMetadataTypeSelection(event: CustomEvent) {
    const selectedType = event.detail.value;
    this.selectedMetadataType = { xmlName: selectedType };

    if (selectedType === "CustomObject") {
      this.folderBasedMetadataItems.set(selectedType, []);
    } else {
      this.metadataItemsByType.set(selectedType, []);
    }
  }

  private isStructuralRow(name: string): boolean {
    return (
      name.startsWith("ns_") ||
      name.startsWith("pkg_") ||
      name.startsWith("type_")
    );
  }

  async handleToggle(event: CustomEvent) {
    const metadataItem = event.detail;
    if (!metadataItem || !metadataItem.isExpanded) {
      return;
    }
    if (this.isStructuralRow(metadataItem.name)) {
      return;
    }
    if (
      metadataItem.name.includes("__c") ||
      metadataItem.name.includes("TestObject__c")
    ) {
      await this.executeCommand(
        "sf data query --query \"SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN ('TestObject__c')\" --json"
      );
      this.refresh();
    }
  }

  async handleRetrieveClick() {
    if (this.selectedRows && this.selectedRows.length > 0) {
      await this.executeCommand(
        "sf project retrieve start --metadata ApexClass:TestClass,CustomObject:TestObject__c --json"
      );
      this.refresh();
    }
  }

  handleDropdownClick(event: CustomEvent) {
    this.renderDropdownOptions = !this.renderDropdownOptions;
  }

  handleRowSelection(event: CustomEvent) {
    const selectedRows = event.detail.selectedRows;
    this.selectedRows = selectedRows;
  }

  handleComponentNameChange(event: CustomEvent) {
    this.searchTermComponentName = event.detail.value;
  }

  handleUserNameChange(event: CustomEvent) {
    this.searchTermUserName = event.detail.value;
  }

  handleFromChange(event: CustomEvent) {
    this.searchTermFrom = event.detail.value;
  }

  handleToChange(event: CustomEvent) {
    this.searchTermTo = event.detail.value;
  }

  handleTimeZoneChange(event: CustomEvent) {
    this.selectedTimeZone = event.detail;
  }

  handleFilterButtonClick() {
    this.filterState = true;
    this.searchTermComponentName = undefined;
    this.searchTermUserName = undefined;
    this.searchTermFrom = undefined;
    this.searchTermTo = undefined;
    this.selectedTimeZone = "America/Los_Angeles";
  }

  get selectedMetadataRows() {
    if (!this.selectedRows || this.selectedRows.length === 0) {
      return undefined;
    }

    return this.selectedRows
      .filter((row) => row.fullName)
      .map((row) => `${row.type}:${row.fullName}`);
  }

  get renderRetrieve() {
    return !!(this.selectedRows && this.selectedRows.length > 0);
  }

  get metadataTypeOptions() {
    if (!this.metadataTypes?.result?.metadataObjects) {
      return undefined;
    }

    return this.metadataTypes.result.metadataObjects
      .map((type: any) => ({ label: type.xmlName, value: type.xmlName }))
      .sort((a: any, b: any) => a.label.localeCompare(b.label));
  }

  get selectedMetadataTypeValue() {
    return this.selectedMetadataType?.xmlName;
  }

  get spinnerDisplayText() {
    if (this.spinnerMessages.size === 0) {
      return undefined;
    }
    if (!this.isDebugMode) {
      return [];
    }
    return Array.from(this.spinnerMessages);
  }

  get rows(): any[] | undefined {
    const objects = this.metadataTypes?.result?.metadataObjects;
    if (!objects?.length) {
      return undefined;
    }
    if (!this.packageDiscoveryComplete) {
      return undefined;
    }
    let rows: any[] | undefined;
    if (this.packageIndex) {
      rows = this.computeRowsPackageCentric();
    } else {
      rows = this.computeRowsFlat();
    }
    if (rows) {
      rows = this.applyTreeWideFilters(rows);
      if (rows.length === 0) {
        return undefined;
      }
    }
    return rows;
  }

  private applyTreeWideFilters(rows: any[]): any[] {
    const componentSearch = this.searchTermComponentName;
    const from = this.searchTermFrom
      ? new Date(this.searchTermFrom)
      : undefined;
    const to = this.searchTermTo ? new Date(this.searchTermTo) : undefined;

    if (!componentSearch && !from && !to) {
      return rows;
    }
    return this.filterTree(rows, componentSearch, from, to);
  }

  private filterTree(
    rows: any[],
    componentSearch: string | undefined,
    from: Date | undefined,
    to: Date | undefined
  ): any[] {
    const result: any[] = [];
    for (const row of rows) {
      if (row._children && row._children.length > 0) {
        const filteredChildren = this.filterTree(
          row._children,
          componentSearch,
          from,
          to
        );
        if (filteredChildren.length > 0) {
          result.push({ ...row, _children: filteredChildren });
        }
      } else {
        if (this.leafMatchesFilters(row, componentSearch, from, to)) {
          result.push(row);
        }
      }
    }
    return result;
  }

  private leafMatchesFilters(
    row: any,
    componentSearch: string | undefined,
    from: Date | undefined,
    to: Date | undefined
  ): boolean {
    if (componentSearch) {
      const name = row.componentName || row.fullName || row.label || "";
      if (!this.fuzzyMatch(name, componentSearch)) {
        return false;
      }
    }
    if (from || to) {
      if (row.lastModifiedDate) {
        const modified = new Date(row.lastModifiedDate);
        if (from && modified < from) {
          return false;
        }
        if (to && modified > to) {
          return false;
        }
      }
    }
    return true;
  }

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

  private computeRowsFlat(): any[] | undefined {
    const objects = this.metadataTypes?.result?.metadataObjects;
    if (!objects?.length) {
      return undefined;
    }
    const zeroSet = new Set(this.typesWithZeroItems);
    return objects
      .filter((typeObj: any) => !zeroSet.has(typeObj.xmlName))
      .slice()
      .sort((a: any, b: any) => a.xmlName.localeCompare(b.xmlName))
      .map((typeObj: any) => {
        const loaded = this.metadataItemsByType.has(typeObj.xmlName) ||
          this.folderBasedMetadataItems.has(typeObj.xmlName);
        return {
          id: typeObj.xmlName,
          label: typeObj.xmlName,
          namespace: typeObj.xmlName,
          metadataType: typeObj.xmlName,
          statusIcon: loaded ? "✅" : "⏳",
          _children: this.getChildrenForType(typeObj)
        };
      });
  }

  private computeRowsPackageCentric(): any[] | undefined {
    const objects = this.metadataTypes?.result?.metadataObjects;
    if (!objects?.length || !this.packageIndex) {
      return undefined;
    }

    const typeObjMap = new Map<string, any>();
    for (const obj of objects) {
      typeObjMap.set(obj.xmlName, obj);
    }

    type TypeBucket = { items: any[]; folderItems: any[] };
    const tree = new Map<string, Map<string, Map<string, TypeBucket>>>();
    const packageTypeLabels = new Map<string, Map<string, string>>();

    const ensureBucket = (nsKey: string, pkgKey: string, typeName: string, pkgType: string): TypeBucket => {
      if (!tree.has(nsKey)) {
        tree.set(nsKey, new Map());
        packageTypeLabels.set(nsKey, new Map());
      }
      const nsMap = tree.get(nsKey)!;
      if (!nsMap.has(pkgKey)) {
        nsMap.set(pkgKey, new Map());
      }
      packageTypeLabels.get(nsKey)!.set(pkgKey, pkgType);
      const pkgMap = nsMap.get(pkgKey)!;
      if (!pkgMap.has(typeName)) {
        pkgMap.set(typeName, { items: [], folderItems: [] });
      }
      return pkgMap.get(typeName)!;
    };

    for (const [typeName, response] of this.metadataItemsByType) {
      const items = response.result || response;
      const itemArray = Array.isArray(items) ? items : [];
      for (const item of itemArray) {
        const classified = classifyMetadataItem(item, this.packageIndex);
        const bucket = ensureBucket(classified.namespaceKey, classified.packageKey, typeName, classified.packageType);
        bucket.items.push(item);
      }
    }

    for (const [typeName, items] of this.folderBasedMetadataItems) {
      const itemArray = Array.isArray(items) ? items : [];
      for (const item of itemArray) {
        const classified = classifyFolderBasedItem(item, this.packageIndex);
        const bucket = ensureBucket(classified.namespaceKey, classified.packageKey, typeName, classified.packageType);
        bucket.folderItems.push(item);
      }
    }

    const localLabel = this.packageIndex.orgNamespace || LOCAL_NAMESPACE_LABEL;
    const namespaceRows: any[] = [];

    const sortedNamespaces = Array.from(tree.keys()).sort((a, b) => {
      if (a === localLabel) return -1;
      if (b === localLabel) return 1;
      return a.localeCompare(b);
    });

    for (const nsKey of sortedNamespaces) {
      const nsMap = tree.get(nsKey)!;
      const sortedPackages = Array.from(nsMap.keys()).sort((a, b) => {
        if (a === UNPACKAGED_LABEL) return -1;
        if (b === UNPACKAGED_LABEL) return 1;
        return a.localeCompare(b);
      });

      const packageRows: any[] = [];
      for (const pkgKey of sortedPackages) {
        const pkgMap = nsMap.get(pkgKey)!;
        const sortedTypes = Array.from(pkgMap.keys()).sort();
        const typeRows: any[] = [];
        const isUnpackaged = pkgKey === UNPACKAGED_LABEL;
        const displayPkgName = isUnpackaged ? "" : pkgKey;
        const pkgType = packageTypeLabels.get(nsKey)?.get(pkgKey) ?? "unpackaged";

        for (const typeName of sortedTypes) {
          const bucket = pkgMap.get(typeName)!;
          const typeObj = typeObjMap.get(typeName);
          if (!typeObj) continue;

          const typeId = `type_${nsKey}_${pkgKey}_${typeName}`;
          const children: any[] = bucket.items.map((item: any) => ({
            id: item.fullName,
            fullName: item.fullName,
            metadataType: item.type,
            type: item.type,
            namespace: nsKey,
            packageName: displayPkgName,
            packageType: pkgType,
            componentName: item.fullName,
            lastModifiedDate: item.lastModifiedDate,
            lastModifiedByName: item.lastModifiedByName
          }));

          typeRows.push({
            id: typeId,
            label: typeObj.xmlName,
            metadataType: typeObj.xmlName,
            namespace: nsKey,
            packageName: displayPkgName,
            packageType: pkgType,
            statusIcon: "✅",
            _children: children.length > 0 ? children : undefined
          });
        }
        packageRows.push({
          id: `pkg_${nsKey}_${displayPkgName}`,
          label: displayPkgName || pkgKey,
          packageType: pkgType,
          namespace: nsKey,
          packageName: displayPkgName,
          statusIcon: "✅",
          _children: typeRows.length > 0 ? typeRows : undefined
        });
      }

      const nsDisplayType = nsKey === localLabel ? "Local" : "Managed";
      namespaceRows.push({
        id: `ns_${nsKey}`,
        label: nsKey,
        packageType: nsDisplayType,
        namespace: nsKey,
        statusIcon: "✅",
        _children: packageRows.length > 0 ? packageRows : undefined
      });
    }

    return namespaceRows.length > 0 ? namespaceRows : undefined;
  }

  private getChildrenForType(typeObj: any): any[] {
    const items = this.metadataItemsByType.get(typeObj.xmlName);
    if (!items) return [];
    const result = items.result || items;
    const arr = Array.isArray(result) ? result : [];
    return arr.map((item: any) => ({
      id: item.fullName,
      fullName: item.fullName,
      metadataType: item.type,
      type: item.type,
      lastModifiedDate: item.lastModifiedDate,
      lastModifiedByName: item.lastModifiedByName
    }));
  }

  async discoverPackages(orgNamespace: string): Promise<void> {
    let installedPkgs: any[] = [];
    let package2s: any[] = [];
    let package2Members: any[] = [];

    try {
      const [installedResult, pkg2Result] = await Promise.all([
        this.executeCommand("queryInstalledPackages").catch(() => null),
        this.executeCommand("queryPackage2").catch(() => null)
      ]);

      if (installedResult?.stdout) {
        try {
          const parsed = JSON.parse(installedResult.stdout);
          if (parsed.status === 0) {
            installedPkgs = parsed.result?.records ?? [];
          }
        } catch { /* noop */ }
      }

      if (pkg2Result?.stdout) {
        try {
          const parsed = JSON.parse(pkg2Result.stdout);
          if (parsed.status === 0) {
            package2s = parsed.result?.records ?? [];
          }
        } catch { /* noop */ }
      }

      const hasNoNsInstalledPkg = installedPkgs.some(
        (p: any) => !p.SubscriberPackage?.NamespacePrefix
      );
      if (package2s.length > 0 || hasNoNsInstalledPkg) {
        try {
          const membersResult = await this.executeCommand("queryPackage2Members");
          if (membersResult?.stdout) {
            const parsed = JSON.parse(membersResult.stdout);
            if (parsed.status === 0) {
              package2Members = parsed.result?.records ?? [];
            }
          }
        } catch { /* noop */ }
      }
    } catch { /* noop */ }

    this.packageIndex = buildPackageIndex(installedPkgs, package2s, package2Members, orgNamespace);
    this.packageDiscoveryComplete = true;
    this.refresh();
  }

  executeCommand = jest.fn();
  refresh = jest.fn();
}
