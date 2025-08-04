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

export interface OrgInfo {
  accessToken: string;
  instanceUrl: string;
  orgId: string;
  username: string;
  loginUrl: string;
  clientId: string;
  isDevHub: boolean;
  instanceApiVersion: string;
  instanceApiVersionLastRetrieved: string;
  alias: string;
  isDefaultDevHubUsername: boolean;
  isDefaultUsername: boolean;
  lastUsed: string;
  connectedStatus: string;
  defaultMarker: string;
  devHubUsername?: string;
  created?: string;
  expirationDate?: string;
  createdOrgInstance?: string;
  isScratch?: boolean;
  isSandbox?: boolean;
  tracksSource?: boolean;
  signupUsername?: string;
  createdBy?: string;
  createdDate?: string;
  devHubOrgId?: string;
  devHubId?: string;
  attributes?: {
    type: string;
    url: string;
  };
  orgName?: string;
  edition?: string;
  status?: string;
  isExpired?: boolean;
  namespace?: string | null;
}

export default class OrgListItem {
  org!: OrgInfo;
  isLoading = false;
  showExpiration = false;
  isDefaultOrg = false;
  isDefaultDevHub = false;
  devHubInfo?: OrgInfo;

  dispatchEvent = jest.fn();

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
