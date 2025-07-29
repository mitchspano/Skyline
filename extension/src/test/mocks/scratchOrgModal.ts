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
import { OrgInfo } from "../../modules/s/orgManager/orgManager";

export default class ScratchOrgModal extends LightningElement {
  devHubs: OrgInfo[] = [];
  definitionFileOptions: string[] = [];
  selectedDevHub: string = "";
  orgAlias: string = "";
  definitionFile: string = "";
  days: number = 7;
  isLoading = false;
  error: string | null = null;

  get hasDevHubs() {
    return this.devHubs.length > 0;
  }

  get devHubOptions() {
    return this.devHubs.map((hub) => ({
      label: `${hub.alias} (${hub.username})`,
      value: hub.alias
    }));
  }

  get hasDefinitionFileOptions() {
    return !!(this.definitionFileOptions && this.definitionFileOptions.length > 0);
  }

  handleDevHubChange(event: Event) {
    this.selectedDevHub = (event.target as HTMLSelectElement).value;
  }

  handleAliasChange(event: Event) {
    this.orgAlias = (event.target as HTMLInputElement).value;
  }

  handleDefinitionFileChange(event: Event) {
    this.definitionFile = (event.target as HTMLSelectElement).value;
  }

  handleDaysChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      this.days = value;
      this.error = null;
    } else {
      this.error = "Days must be between 1 and 30";
    }
  }

  handleCancel() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  handleSubmit() {
    if (!this.selectedDevHub) {
      this.error = "Please select a Dev Hub";
      return;
    }

    if (!this.orgAlias) {
      this.error = "Please enter an org alias";
      return;
    }

    if (!this.definitionFile) {
      this.error = "Please select a definition file";
      return;
    }

    if (!this.days || this.days < 1 || this.days > 30) {
      this.error = "Days must be between 1 and 30";
      return;
    }

    this.dispatchEvent(
      new CustomEvent("create", {
        detail: {
          devHub: this.selectedDevHub,
          alias: this.orgAlias,
          definitionFile: this.definitionFile,
          days: this.days
        }
      })
    );
  }

  connectedCallback() {
    // Set default definition file if options exist
    if (this.hasDefinitionFileOptions && !this.definitionFile) {
      this.definitionFile = this.definitionFileOptions[0];
    }
  }

  get isCreateDisabled() {
    return !(
      this.selectedDevHub &&
      this.orgAlias &&
      this.definitionFile &&
      this.days &&
      this.days >= 1 &&
      this.days <= 30 &&
      !this.error
    );
  }
} 