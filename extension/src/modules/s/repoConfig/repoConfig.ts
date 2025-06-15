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
import { ExecuteResult } from "../app/app";
import Toast from "lightning-base-components/src/lightning/toast/toast.js";
import CliElement from "../cliElement/cliElement";
import type {
  SkylineConfig,
  SalesforceEnvironmentConfig,
  TicketingSystemConfig
} from "../../../types/config";

const CONFIGURATION_FILE_NAME = "skyline.config.json";
const TEMPLATE_PATH = "templates/skyline.config.json";

declare global {
  interface Window {
    extensionPath: string;
  }
}

export default class RepoConfig extends CliElement {
  @track configurationFileContents?: SkylineConfig;
  @track currentBranch?: string;
  @track availableBranches: string[] = [];
  @track selectedBranch?: string;
  @track error?: string;
  @track isLoading = false;
  @track isEditing = false;
  @track editedConfig?: SalesforceEnvironmentConfig;
  @track showNewBranchModal = false;
  @track showInfoPanel = false;
  @track isEditingTicketing = false;
  @track editedTicketingConfig?: TicketingSystemConfig;
  @track showTicketingInfoPanel = false;

  private get commands() {
    // Normalize path separators for the current OS
    const templatePath =
      `${window.extensionPath}/dist/${TEMPLATE_PATH}`.replace(/\\/g, "/");
    return {
      findConfigurationFile: `test -f ${CONFIGURATION_FILE_NAME}`,
      openConfigurationFile: `cat ${CONFIGURATION_FILE_NAME}`,
      getCurrentBranch: "git rev-parse --abbrev-ref HEAD",
      createConfigFile: `cp "${templatePath}" ${CONFIGURATION_FILE_NAME}`,
      saveConfigFile: (content: string) =>
        `echo '${content}' > ${CONFIGURATION_FILE_NAME}`,
      getAllBranches:
        "git branch -a | grep -v HEAD | sed -e 's/^[ *]*//' -e 's#remotes/origin/##'",
      deleteBranchConfig: (branch: string, content: string) =>
        `echo '${content}' > ${CONFIGURATION_FILE_NAME}`
    };
  }

  connectedCallback(): void {
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    try {
      this.isLoading = true;
      const [findResult, branchResult, branchesResult] = await Promise.all([
        this.executeCommand(this.commands.findConfigurationFile),
        this.executeCommand(this.commands.getCurrentBranch),
        this.executeCommand(this.commands.getAllBranches)
      ]);

      this.handleFindConfigurationFile(findResult);
      this.handleGetCurrentBranch(branchResult);
      this.handleGetAllBranches(branchesResult);
    } catch (error) {
      this.handleError(
        "Failed to initialize configuration",
        "Initialization Error"
      );
    } finally {
      this.isLoading = false;
    }
  }

  //  ▂▃▄▅▆▇█▓▒░ Public Methods ░▒▓█▇▆▅▄▃▂

  //  ▂▃▄▅▆▇█▓▒░ Event Handlers ░▒▓█▇▆▅▄▃▂

  handleFindConfigurationFile(result: ExecuteResult) {
    this.isLoading = true;
    if (result.errorCode) {
      // File doesn't exist, create it from template
      this.executeCommand(this.commands.createConfigFile)
        .then(this.handleCreateConfigFile.bind(this))
        .catch((error) =>
          this.handleError(error, "Error creating config file")
        );
    } else {
      this.executeCommand(this.commands.openConfigurationFile)
        .then(this.handleOpenConfigurationFile.bind(this))
        .catch((error) => this.handleError(error, "Error opening config file"));
    }
    this.isLoading = false;
  }

  handleOpenConfigurationFile(result: ExecuteResult) {
    if (result.stdout) {
      try {
        const config = JSON.parse(result.stdout);
        this.configurationFileContents = config;
      } catch (error) {
        this.handleError(
          "Invalid JSON in configuration file",
          "Configuration Error"
        );
      }
    } else if (result.stderr) {
      this.handleError(result.stderr, "Error reading configuration file");
    }
  }

  handleGetCurrentBranch(result: ExecuteResult) {
    if (result.stdout) {
      this.currentBranch = result.stdout.trim();
    }
  }

  handleCreateConfigFile(result: ExecuteResult) {
    if (result.stderr) {
      this.handleError(result.stderr, "Error creating configuration file");
    } else {
      this.isLoading = true;
      this.executeCommand(this.commands.openConfigurationFile)
        .then(this.handleOpenConfigurationFile.bind(this))
        .catch((error) => this.handleError(error, "Error opening config file"));
      this.isLoading = false;
    }
  }

  handleGetAllBranches(result: ExecuteResult) {
    if (result.stdout) {
      this.availableBranches = [
        ...new Set(
          result.stdout
            .split("\n")
            .map((b) => b.trim())
            .filter((b) => b)
        )
      ];
    }
  }

  handleBranchSelect(event: CustomEvent) {
    const target = event.target as HTMLElement;
    const branch = target.dataset.branch;
    this.selectedBranch = branch;
  }

  handleInputChange(event: CustomEvent) {
    const target = event.target as HTMLInputElement;
    if (!target?.dataset.field || !this.editedConfig) {
      return;
    }

    const field = target.dataset.field;
    const value =
      target.type === "number" ? Number(target.value) : target.value;

    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      if (parent === "testLevels") {
        this.editedConfig = {
          ...this.editedConfig,
          testLevels: {
            ...this.editedConfig.testLevels,
            [child]: value
          }
        };
      }
    } else {
      this.editedConfig = {
        ...this.editedConfig,
        [field]: value
      };
    }
  }

  handleMoveUp(event: CustomEvent) {
    const target = event.target as HTMLElement;
    const branch = target.dataset.branch;
    if (!branch || !this.configurationFileContents) {
      return;
    }

    const currentIndex =
      this.configurationFileContents.pipelineOrder.indexOf(branch);
    if (currentIndex <= 0) {
      return;
    }

    // Swap positions in the array
    const newOrder = [...this.configurationFileContents.pipelineOrder];
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
      newOrder[currentIndex],
      newOrder[currentIndex - 1]
    ];

    this.configurationFileContents = {
      ...this.configurationFileContents,
      pipelineOrder: newOrder
    };

    this.saveConfig();
  }

  handleMoveDown(event: CustomEvent) {
    const target = event.target as HTMLElement;
    const branch = target.dataset.branch;
    if (!branch || !this.configurationFileContents) {
      return;
    }

    const currentIndex =
      this.configurationFileContents.pipelineOrder.indexOf(branch);
    if (
      currentIndex >=
      this.configurationFileContents.pipelineOrder.length - 1
    ) {
      return;
    }

    // Swap positions in the array
    const newOrder = [...this.configurationFileContents.pipelineOrder];
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
      newOrder[currentIndex + 1],
      newOrder[currentIndex]
    ];

    this.configurationFileContents = {
      ...this.configurationFileContents,
      pipelineOrder: newOrder
    };

    this.saveConfig();
  }

  handleNewBranchClick() {
    this.showNewBranchModal = true;
  }

  handleDeleteBranchConfig() {
    if (!this.selectedBranch || !this.configurationFileContents) {
      return;
    }

    const updatedConfig = {
      ...this.configurationFileContents,
      pipelineOrder: this.configurationFileContents.pipelineOrder.filter(
        (b) => b !== this.selectedBranch
      ),
      branches: { ...this.configurationFileContents.branches }
    };
    delete updatedConfig.branches[this.selectedBranch];

    // Use the same save method to ensure consistent handling
    this.saveConfig(updatedConfig);
    this.selectedBranch = undefined;
  }

  handleAddNewBranch(event: CustomEvent) {
    const branch = event.detail.branch;
    if (!branch || !this.configurationFileContents) {
      return;
    }

    const templateConfig = {
      label: branch,
      instanceUrl: "https://test.salesforce.com",
      consumerKey: "YOUR_CONSUMER_KEY",
      username: "user@example.com",
      secretNames: {
        keySecret: "KEY_SECRET",
        certificatePath: "CERT_PATH"
      },
      testLevels: {
        presubmit: "RunLocalTests",
        deployment: "RunLocalTests"
      }
    };

    // Add branch to the end of the pipeline
    const updatedConfig = {
      ...this.configurationFileContents,
      pipelineOrder: [...this.configurationFileContents.pipelineOrder, branch],
      branches: {
        ...this.configurationFileContents.branches,
        [branch]: templateConfig
      }
    };

    this.saveConfig(updatedConfig);
    this.selectedBranch = branch;
    this.showNewBranchModal = false;
  }

  handleEditClick() {
    this.isEditing = true;
    this.editedConfig = { ...this.currentEnvironmentConfig! };
  }

  handleSaveEdit() {
    if (!this.selectedBranch || !this.editedConfig) {
      return;
    }

    const updatedConfig = {
      ...this.configurationFileContents!,
      branches: {
        ...this.configurationFileContents!.branches,
        [this.selectedBranch]: this.editedConfig
      }
    };

    this.saveConfig(updatedConfig);
    this.isEditing = false;
    this.editedConfig = undefined;
  }

  handleCancelEdit() {
    this.isEditing = false;
    this.editedConfig = undefined;
  }

  handleModalCancel() {
    this.showNewBranchModal = false;
  }

  toggleInfoPanel() {
    this.showInfoPanel = !this.showInfoPanel;
  }

  toggleTicketingInfoPanel() {
    this.showTicketingInfoPanel = !this.showTicketingInfoPanel;
  }

  handleTicketingSystemChange(event: CustomEvent) {
    const system = event.detail.value;

    if (!this.editedTicketingConfig) {
      this.editedTicketingConfig = {
        system,
        ticketIdRegex: this.getDefaultRegexForSystem(system)
      };
    } else {
      this.editedTicketingConfig = {
        ...this.editedTicketingConfig,
        system,
        ticketIdRegex: this.getDefaultRegexForSystem(system)
      };
    }

    // Clear custom label if not "Other"
    if (system !== "Other") {
      this.editedTicketingConfig.customLabel = undefined;
    }
  }

  // Add method to handle custom regex input
  handleTicketingRegexChange(event: CustomEvent) {
    if (!this.editedTicketingConfig) {
      return;
    }

    const regexPattern = event.detail.value;

    // Validate the regex pattern
    if (regexPattern) {
      try {
        // Test if the regex is valid by creating a RegExp object
        new RegExp(regexPattern);

        // If valid, update the config
        this.editedTicketingConfig = {
          ...this.editedTicketingConfig,
          ticketIdRegex: regexPattern
        };
      } catch (error) {
        // If invalid, show an error message
        Toast.show(
          {
            label: "Invalid Regex Pattern",
            message:
              "The regular expression pattern is invalid. Please check your syntax.",
            variant: "error"
          },
          this
        );

        // Don't update the config with invalid regex
        return;
      }
    } else {
      // Empty value is allowed
      this.editedTicketingConfig = {
        ...this.editedTicketingConfig,
        ticketIdRegex: regexPattern
      };
    }
  }

  handleTicketingLabelChange(event: CustomEvent) {
    if (!this.editedTicketingConfig) {
      return;
    }

    this.editedTicketingConfig = {
      ...this.editedTicketingConfig,
      customLabel: event.detail.value
    };
  }

  handleEditTicketingClick() {
    this.isEditingTicketing = true;
    this.editedTicketingConfig = this.configurationFileContents?.ticketing
      ? { ...this.configurationFileContents.ticketing }
      : {
          system: "Jira",
          ticketIdRegex: this.getDefaultRegexForSystem("Jira")
        };
  }

  handleSaveTicketingEdit() {
    if (!this.editedTicketingConfig) {
      return;
    }

    const updatedConfig = {
      ...this.configurationFileContents!,
      ticketing: this.editedTicketingConfig
    };

    this.saveConfig(updatedConfig);
    this.isEditingTicketing = false;
    this.editedTicketingConfig = undefined;
  }

  handleCancelTicketingEdit() {
    this.isEditingTicketing = false;
    this.editedTicketingConfig = undefined;
  }

  //  ▂▃▄▅▆▇█▓▒░ Private Methods ░▒▓█▇▆▅▄▃▂

  private getDefaultRegexForSystem(system: string): string {
    switch (system) {
      case "Jira":
        return "[A-Z]+-\\d+";
      case "Asana":
        return "\\d+";
      case "Trello":
        return "[a-zA-Z0-9]{8,}";
      case "GitHub":
        return "#\\d+";
      case "Other":
        return "";
      default:
        return "";
    }
  }

  private handleError(error: string, label: string) {
    this.error = error;
    Toast.show({ label, message: error, variant: "error" }, this);
  }

  private prepareConfigForSave(config: SkylineConfig): string {
    // Create a deep copy to avoid modifying the original
    const configForSave = JSON.parse(JSON.stringify(config));

    // Ensure proper escaping of regex patterns
    if (configForSave.ticketing?.ticketIdRegex) {
      configForSave.ticketing.ticketIdRegex =
        configForSave.ticketing.ticketIdRegex.replace(/\\/g, "\\\\");
    }

    return JSON.stringify(configForSave, null, 2).replace(/'/g, "'\\''");
  }

  private saveConfig(config = this.configurationFileContents) {
    if (!config) {
      return;
    }

    const allBranches = Object.keys(config.branches);
    const missingBranches = allBranches.filter(
      (b) => !config.pipelineOrder.includes(b)
    );

    // Create updated config with any missing branches added to pipeline order
    const updatedConfig = {
      ...config,
      pipelineOrder: [...config.pipelineOrder, ...missingBranches]
    };

    // Prepare config string with proper escaping
    const configString = this.prepareConfigForSave(updatedConfig);
    this.isLoading = true;
    this.executeCommand(this.commands.saveConfigFile(configString))
      .then(() => {
        // Keep the original config in memory (with proper JavaScript regex)
        this.configurationFileContents = updatedConfig;
      })
      .catch((error) => this.handleError(error, "Error saving configuration"));
    this.isLoading = false;
  }

  get orderedBranches() {
    if (!this.configurationFileContents) {
      return [];
    }

    return this.configurationFileContents.pipelineOrder
      .filter(
        (branchName) => this.configurationFileContents!.branches[branchName]
      )
      .map((branchName, index) => ({
        name: branchName,
        label: this.configurationFileContents!.branches[branchName].label,
        isFirst: index === 0,
        isLast:
          index === this.configurationFileContents!.pipelineOrder.length - 1,
        isSelected: branchName === this.selectedBranch,
        buttonVariant: branchName === this.selectedBranch ? "brand" : "neutral"
      }));
  }

  get currentEnvironmentConfig() {
    if (!this.selectedBranch || !this.configurationFileContents) {
      return undefined;
    }
    return this.configurationFileContents.branches[this.selectedBranch];
  }

  get testLevelOptions() {
    return [
      { label: "No Test Run", value: "NoTestRun" },
      { label: "Run Specified Tests", value: "RunSpecifiedTests" },
      { label: "Run Local Tests", value: "RunLocalTests" },
      { label: "Run All Tests in Org", value: "RunAllTestsInOrg" }
    ];
  }

  get isDeleteDisabled() {
    return !this.selectedBranch;
  }

  get existingBranches() {
    return this.configurationFileContents
      ? Object.keys(this.configurationFileContents.branches)
      : [];
  }

  get ticketingSystemOptions() {
    return [
      { label: "Jira", value: "Jira" },
      { label: "Asana", value: "Asana" },
      { label: "Trello", value: "Trello" },
      { label: "GitHub", value: "GitHub" },
      { label: "Other", value: "Other" }
    ];
  }

  get currentTicketingConfig() {
    return this.configurationFileContents?.ticketing;
  }

  get ticketingSystemLabel() {
    const config = this.currentTicketingConfig;
    if (!config) {
      return "Not configured";
    }

    return config.system === "Other" && config.customLabel
      ? config.customLabel
      : config.system;
  }

  get isOtherTicketingSystem() {
    return this.editedTicketingConfig?.system === "Other";
  }
}
