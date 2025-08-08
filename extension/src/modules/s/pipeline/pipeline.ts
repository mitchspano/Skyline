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
import type { SkylineConfig } from "../../../types/config";
import CliElement from "../cliElement/cliElement";
import { ExecuteResult, Pages } from "../app/app";
import Toast from "lightning-base-components/src/lightning/toast/toast.js";
import { marked } from "marked";
import type { VersionControlSystem, PullRequest as VCSPullRequest } from "../../../types/version-control";
import { VersionControlSystemFactory } from "./vcs-factory";

const CONFIGURATION_FILE_NAME = "skyline.config.json";
const OPEN_PR_STATE = "OPEN";

const COMMANDS = {
  openConfigurationFile: `cat ${CONFIGURATION_FILE_NAME}`
};

// Use the PullRequest interface from version-control types
type PullRequest = VCSPullRequest;

interface GroupedPR {
  key: string; // branch name
  value: PullRequest[];
  isOrderedBranch: boolean;
  containerClass: string;
  label?: string; // org label from config
  branchIcon: string;
  orgIcon: string;
}

export default class Pipeline extends CliElement {
  @track searchTerm = "";
  @track configurationFileContents?: SkylineConfig = undefined;
  @track isLoading = true;
  @track searchMessage = "";
  @track pullRequests: PullRequest[] = [];
  @track activeSections: string[] = [];
  @track orderedBranches: string[] = [];
  @track validationError?: string = undefined;
  @track isValidationComplete = false;
  @track configurationError?: string = undefined;
  private versionControlSystem?: VersionControlSystem = undefined;

  connectedCallback() {
    this.loadConfiguration();
  }

  handleTicketIdChange(event: CustomEvent) {
    this.searchTerm = event.detail.value;
  }

  handleSearch() {
    this.executeSearch();
  }

  handleSectionToggle(event: CustomEvent) {
    this.activeSections = event.detail.openSections;
    this.renderMarkdownContent();
  }

  handleGoToConfiguration() {
    // Navigate to the Project Configuration page
    // This will be handled by the parent component or navigation system
    const event = new CustomEvent('pagenavigation', {
      detail: Pages.repoConfig,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private renderMarkdownContent() {
    // Use setTimeout to ensure DOM is updated after accordion toggle
    setTimeout(() => {
      if (this.template) {
        const markdownContainers =
          this.template.querySelectorAll(".markdown-content");
        markdownContainers.forEach((container) => {
          const prNumber = container.getAttribute("data-pr-number");
          if (prNumber) {
            const pr = this.pullRequests.find(
              (p) => p.number.toString() === prNumber
            );
            if (pr && pr.renderedBody) {
              container.innerHTML = pr.renderedBody;
            }
          }
        });
      }
    }, 0);
  }

  private async loadConfiguration(): Promise<void> {
    try {
      this.isLoading = true;
      const result = await this.executeCommand(COMMANDS.openConfigurationFile);
      this.handleOpenConfigurationFile(result);
      
      // Initialize version control system and validate after loading configuration
      if (this.configurationFileContents) {
        await this.initializeVersionControlSystem();
        await this.validateVersionControlSystem();
      }
    } catch (error) {
      this.handleError("Failed to load configuration", "Configuration Error");
    } finally {
      this.isLoading = false;
    }
  }

  handleOpenConfigurationFile(result: ExecuteResult) {
    if (result.errorCode) {
      // Configuration file doesn't exist
      this.configurationError = "Configuration file 'skyline.config.json' not found. Please configure your project in the Project Configuration page first.";
      this.configurationFileContents = undefined;
      return;
    }

    if (result.stdout) {
      try {
        this.configurationFileContents = JSON.parse(result.stdout);
        this.orderedBranches =
          this.configurationFileContents?.pipelineOrder || [];
        this.configurationError = undefined; // Clear any previous errors
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.configurationError = `Error parsing configuration file: ${errorMessage}`;
        this.configurationFileContents = undefined;
      }
    } else {
      // No stdout but no error code - this shouldn't happen, but handle it gracefully
      this.configurationError = "Configuration file 'skyline.config.json' not found. Please configure your project in the Project Configuration page first.";
      this.configurationFileContents = undefined;
    }
  }

  private async executeSearch(): Promise<void> {
    if (!this.versionControlSystem) {
      this.handleError("Version control system not initialized", "Search Error");
      return;
    }

    try {
      this.isLoading = true;
      const pullRequests = await this.versionControlSystem.searchPullRequests(this.searchTerm);
      await this.handleSearchResults(pullRequests);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.handleError(errorMessage, "Search Error");
    } finally {
      this.isLoading = false;
    }
  }



  private sanitizeHtml(html: string): string {
    // Basic HTML sanitization - only allow safe tags
    const allowedTags = {
      p: true,
      br: true,
      strong: true,
      b: true,
      em: true,
      i: true,
      u: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
      ul: true,
      ol: true,
      li: true,
      blockquote: true,
      code: true,
      pre: true,
      a: true,
      table: true,
      thead: true,
      tbody: true,
      tr: true,
      th: true,
      td: true,
      hr: true
    };

    // Simple regex-based sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
      .replace(/<input\b[^>]*>/gi, "")
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/data:/gi, ""); // Remove data: protocol
  }

  private async renderMarkdown(markdown: string): Promise<string> {
    if (!markdown) {
      return Promise.resolve("");
    }
    try {
      // Configure marked for safe HTML rendering
      const html = await marked.parse(markdown, {
        breaks: true, // Convert line breaks to <br>
        gfm: true // GitHub Flavored Markdown
      });
      return this.sanitizeHtml(html);
    } catch (error) {
      // If markdown rendering fails, return the original text
      return markdown;
    }
  }

  private async mapPullRequest(pr: PullRequest): Promise<PullRequest> {
    return {
      ...pr,
      bodySectionName: `${pr.number}_body`,
      filesSectionName: `${pr.number}_files`,
      renderedBody: await this.renderMarkdown(pr.body),
      stateBadgeClass:
        pr.state === OPEN_PR_STATE
          ? "slds-badge slds-theme_success"
          : "slds-badge"
    };
  }

  private groupPullRequestsByBranch(pullRequests: PullRequest[]): {
    [key: string]: PullRequest[];
  } {
    return pullRequests.reduce(
      (groups: { [key: string]: PullRequest[] }, pr) => {
        if (!groups[pr.baseRefName]) {
          groups[pr.baseRefName] = [];
        }
        groups[pr.baseRefName].push(pr);
        return groups;
      },
      {}
    );
  }

  private createOrderedGroup(
    branch: string,
    groups: { [key: string]: PullRequest[] }
  ): GroupedPR {
    const branchConfig = this.configurationFileContents?.branches?.[branch];
    return {
      key: branch,
      value: groups[branch] || [],
      isOrderedBranch: true,
      containerClass: "slds-box slds-box_x-small slds-m-bottom_medium",
      label: branchConfig?.label || "No Salesforce Org",
      branchIcon: "standard:environment_hub",
      orgIcon: "utility:salesforce1"
    };
  }

  private createUnorderedGroup(
    branch: string,
    groups: { [key: string]: PullRequest[] }
  ): GroupedPR {
    const branchConfig = this.configurationFileContents?.branches?.[branch];
    return {
      key: branch,
      value: groups[branch],
      isOrderedBranch: false,
      containerClass:
        "slds-box slds-box_x-small slds-m-bottom_medium slds-theme_shade slds-theme_alert-texture",
      label: branchConfig?.label || "No Salesforce Org",
      branchIcon: "standard:environment_hub",
      orgIcon: "utility:salesforce1"
    };
  }

  private async handleSearchResults(pullRequests: PullRequest[]) {
    try {
      if (pullRequests.length === 0) {
        this.searchMessage = `No changes found matching "${this.searchTerm}"`;
        this.pullRequests = [];
      } else {
        this.searchMessage = "";
        // Map pull requests asynchronously to add rendered body
        const mappedPullRequests = await Promise.all(
          pullRequests.map((pr) => this.mapPullRequest(pr))
        );
        this.pullRequests = mappedPullRequests;
        // Render markdown content after the DOM is updated
        setTimeout(() => {
          this.renderMarkdownContent();
        }, 0);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.handleError("Error processing search results:", errorMessage);
    }
  }

  private async handleError(error: string, label: string) {
    Toast.show({ label: label, message: error, variant: "error" }, this);
  }

  private async initializeVersionControlSystem(): Promise<void> {
    if (!this.configurationFileContents?.versionControlSystem) {
      this.validationError = "Version control system not configured. Please configure it in the Project Configuration page.";
      this.isValidationComplete = false;
      return;
    }

    const vcsType = this.configurationFileContents.versionControlSystem;
    
    try {
      // Check if the VCS type is supported
      if (!VersionControlSystemFactory.isSupported(vcsType)) {
        const supportedSystems = VersionControlSystemFactory.getSupportedSystems().join(", ");
        this.validationError = `Version control system '${vcsType}' is not supported. Supported systems are: ${supportedSystems}`;
        this.isValidationComplete = false;
        return;
      }

      // Check if the VCS type is implemented
      if (!VersionControlSystemFactory.isImplemented(vcsType)) {
        this.validationError = `Version control system '${vcsType}' support is not yet implemented. Coming soon!`;
        this.isValidationComplete = false;
        return;
      }

      // Create the VCS implementation
      this.versionControlSystem = VersionControlSystemFactory.create(
        vcsType,
        this.executeCommand.bind(this)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.validationError = `Failed to initialize version control system: ${errorMessage}`;
      this.isValidationComplete = false;
    }
  }

  async validateVersionControlSystem(): Promise<void> {
    if (!this.versionControlSystem) {
      this.validationError = "Version control system not initialized";
      this.isValidationComplete = false;
      return;
    }

    try {
      // Validate CLI installation
      const cliValidation = await this.versionControlSystem.validateCliInstallation();
      if (!cliValidation.isValid) {
        this.validationError = cliValidation.errorMessage;
        this.isValidationComplete = false;
        return;
      }

      // Validate authentication
      const authValidation = await this.versionControlSystem.validateAuthentication();
      if (!authValidation.isValid) {
        this.validationError = authValidation.errorMessage;
        this.isValidationComplete = false;
        return;
      }

      // Validation successful
      this.isValidationComplete = true;
      this.validationError = undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.validationError = `Failed to validate ${this.versionControlSystem.getName()}: ${errorMessage}`;
      this.isValidationComplete = false;
    }
  }

  get groupedPullRequests(): GroupedPR[] {
    const groups = this.groupPullRequestsByBranch(this.pullRequests);

    // Create ordered groups first
    const orderedGroups = this.orderedBranches.map((branch) =>
      this.createOrderedGroup(branch, groups)
    );

    // Find unordered branches and add them to the end
    const unorderedBranches = Object.keys(groups).filter(
      (branch) => !this.orderedBranches.includes(branch)
    );

    const unorderedGroups = unorderedBranches.map((branch) =>
      this.createUnorderedGroup(branch, groups)
    );

    return [...orderedGroups, ...unorderedGroups];
  }

  get hasResults(): boolean {
    return this.pullRequests.length > 0;
  }

  get searchIsDisabled() {
    return !this.searchTerm;
  }

  get hasValidationErrors(): boolean {
    return !!(this.configurationError || this.validationError);
  }
}
