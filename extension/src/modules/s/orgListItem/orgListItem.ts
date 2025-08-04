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

import { LightningElement, api } from "lwc";
import type { OrgInfo } from "../orgManager/orgManager";

export default class OrgListItem extends LightningElement {
  @api org!: OrgInfo;
  @api isLoading = false;
  @api showExpiration = false;
  @api isDefaultOrg = false;
  @api isDefaultDevHub = false;
  @api devHubInfo?: OrgInfo;

  get devHubDisplayName() {
    if (this.devHubInfo) {
      return this.devHubInfo.alias || this.devHubInfo.username;
    }
    return this.org.devHubUsername || "Unknown Dev Hub";
  }

  get hasIndicators() {
    return this.isDefaultOrg || this.isDefaultDevHub;
  }

  get isDevHub() {
    return this.org.isDevHub || false;
  }

  get orgItemClass() {
    const classes = [];
    if (this.isDefaultOrg) {
      classes.push("default-org");
    }
    if (this.isDefaultDevHub) {
      classes.push("default-dev-hub");
    }
    return classes.join(" ");
  }

  handleRemoveOrg(event: CustomEvent) {
    const removeEvent = new CustomEvent("removeorg", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(removeEvent);
  }

  handleOpenOrg(event: CustomEvent) {
    const openEvent = new CustomEvent("openorg", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(openEvent);
  }

  handleSetDefaultOrg(event: CustomEvent) {
    const setDefaultEvent = new CustomEvent("setdefaultorg", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(setDefaultEvent);
  }

  handleSetDefaultDevHub(event: CustomEvent) {
    const setDefaultDevHubEvent = new CustomEvent("setdefaultdevhub", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(setDefaultDevHubEvent);
  }

  handleMenuSelect(event: CustomEvent) {
    const selectedValue = event.detail.value;

    switch (selectedValue) {
      case "open":
        this.handleOpenOrg(event);
        break;
      case "set-default":
        this.handleSetDefaultOrg(event);
        break;
      case "set-dev-hub":
        this.handleSetDefaultDevHub(event);
        break;
      case "remove":
        this.handleRemoveOrg(event);
        break;
      default:
        console.warn("Unknown menu selection:", selectedValue);
    }
  }
}
