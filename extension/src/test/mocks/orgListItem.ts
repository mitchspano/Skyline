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

  dispatchEvent = jest.fn();

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
}
