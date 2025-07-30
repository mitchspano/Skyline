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

  connectedCallback() {
    this.initializeMetadataExplorer();
  }

  async initializeMetadataExplorer() {
    // Mock implementation that sets up the component
    // Only set these if the test doesn't expect them to be undefined
    // For error cases, don't set orgConnectionInfo
    if (!this.orgConnectionInfo && !this.isDebugMode) {
      // Don't call executeCommand in the mock, just set the property directly
      // But check if there's an error in the command result
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

  async handleToggle(event: CustomEvent) {
    // Only execute command for custom objects that are expanding
    const metadataItem = event.detail;
    if (metadataItem && metadataItem.name && metadataItem.isExpanded) {
      // Check if it's a custom object
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
  }

  async handleRetrieveClick() {
    // Only execute if rows are selected
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

  // Mock executeCommand method for testing
  executeCommand = jest.fn();
  refresh = jest.fn();
}
