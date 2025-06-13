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

import { track } from "lwc";
import CliElement from "../cliElement/cliElement";
import Toast from "lightning-base-components/src/lightning/toast/toast.js";

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

interface OrgListResult {
  status: number;
  result: {
    other: OrgInfo[];
    sandboxes: OrgInfo[];
    nonScratchOrgs: OrgInfo[];
    devHubs: OrgInfo[];
    scratchOrgs: OrgInfo[];
  };
  warnings: string[];
}

export default class OrgManager extends CliElement {
  @track devHubs: OrgInfo[] = [];
  @track scratchOrgs: OrgInfo[] = [];
  @track sandboxes: OrgInfo[] = [];
  @track nonScratchOrgs: OrgInfo[] = [];
  @track otherOrgs: OrgInfo[] = [];
  @track isLoading = false;
  @track error: string | null = null;
  @track showScratchOrgModal = false;
  @track definitionFileOptions: string[] = [];

  connectedCallback() {
    this.loadOrgs();
  }

  async loadOrgs() {
    try {
      this.isLoading = true;
      const result = await this.executeCommand("sf org list --json");
      if (result.errorCode) {
        throw new Error(result.stderr);
      }

      if (!result.stdout) {
        throw new Error("No output received from org list command");
      }

      const orgListResult: OrgListResult = JSON.parse(result.stdout);
      if (orgListResult.status !== 0) {
        throw new Error(
          orgListResult.warnings.join(", ") || "Failed to list orgs"
        );
      }

      // Update each org type separately
      this.devHubs = orgListResult.result.devHubs;
      this.scratchOrgs = orgListResult.result.scratchOrgs;
      this.sandboxes = orgListResult.result.sandboxes;
      // Collect all orgIds that are already shown in other sections
      const shownOrgIds = new Set([
        ...this.devHubs.map((org) => org.orgId),
        ...this.scratchOrgs.map((org) => org.orgId),
        ...this.sandboxes.map((org) => org.orgId)
      ]);
      // Only show nonScratchOrgs that are not already shown
      this.nonScratchOrgs = orgListResult.result.nonScratchOrgs.filter(
        (org) => !shownOrgIds.has(org.orgId)
      );
      this.otherOrgs = orgListResult.result.other;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error.message : "Failed to load orgs",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleAuthOrg() {
    try {
      this.isLoading = true;
      const result = await this.executeCommand("sf org login web");
      if (result.errorCode) {
        throw new Error(result.stderr);
      }
      await this.loadOrgs();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error.message : "Failed to authenticate org",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleRemoveOrg(event: CustomEvent) {
    const orgAlias = event.detail;
    try {
      this.isLoading = true;
      const result = await this.executeCommand(
        `sf org logout --target-org ${orgAlias}`
      );
      if (result.errorCode) {
        throw new Error(result.stderr);
      }
      await this.loadOrgs();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error.message : "Failed to remove org",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleOpenOrg(event: CustomEvent) {
    const orgAlias = event.detail;
    try {
      this.isLoading = true;
      const result = await this.executeCommand(
        `sf org open --target-org ${orgAlias}`
      );
      if (result.errorCode) {
        throw new Error(result.stderr);
      }
      // Optionally, you could show a toast or do nothing (browser should open)
    } catch (error) {
      this.handleError(
        error instanceof Error ? error.message : "Failed to open org",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleCreateScratchOrg() {
    if (this.devHubs.length === 0) {
      this.handleError("No Dev Hub found. Please authenticate a Dev Hub org first.", "Error");
      return;
    }
    this.isLoading = true;
    try {
      const result = await this.executeCommand(`grep -rl '"orgName"' . --include='*.json'`);
      if (result.errorCode) {
        throw new Error(result.stderr);
      }
      this.definitionFileOptions = result.stdout
        ? result.stdout.split('\n')
            .filter((f: string) => f.trim() !== "")
            .map((f: string) => f.replace(/^\.?\/?/, ""))
        : [];
    } catch (error) {
      this.definitionFileOptions = [];
    } finally {
      this.isLoading = false;
      this.showScratchOrgModal = true;
    }
  }

  handleScratchOrgModalClose() {
    this.showScratchOrgModal = false;
  }

  async handleScratchOrgCreate(event: CustomEvent) {
    const { devHub, alias, definitionFile } = event.detail;
    try {
      this.isLoading = true;
      this.showScratchOrgModal = false;

      const result = await this.executeCommand(
        `sf org create scratch --target-dev-hub ${devHub} --alias ${alias} --definition-file ${definitionFile} --json`
      );

      if (result.errorCode) {
        throw new Error(result.stderr);
      }

      if (!result.stdout) {
        throw new Error("No output received from scratch org creation");
      }

      const scratchOrgResult = JSON.parse(result.stdout);
      if (scratchOrgResult.status !== 0) {
        throw new Error(
          scratchOrgResult.warnings?.join(", ") || "Failed to create scratch org"
        );
      }

      Toast.show(
        { 
          label: "Success", 
          message: "Scratch org created successfully", 
          variant: "success" 
        }, 
        this
      );

      await this.loadOrgs();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error.message : "Failed to create scratch org",
        "Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  get hasOrgs() {
    return (
      this.devHubs.length > 0 ||
      this.scratchOrgs.length > 0 ||
      this.sandboxes.length > 0 ||
      this.nonScratchOrgs.length > 0 ||
      this.otherOrgs.length > 0
    );
  }

  private async handleError(error: string, label: string) {
    Toast.show({ label: label, message: error, variant: "error" }, this);
  }
}
