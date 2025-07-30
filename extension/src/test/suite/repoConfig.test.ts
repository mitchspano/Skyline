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

import RepoConfig from "../../modules/s/repoConfig/repoConfig";
import { ExecuteResult } from "../../modules/s/app/app";

// Mock the Toast module
jest.mock("lightning-base-components/src/lightning/toast/toast.js", () => ({
  show: jest.fn()
}));

// Mock window.extensionPath
Object.defineProperty(window, "extensionPath", {
  value: "/test/extension/path",
  writable: true
});

describe("RepoConfig Component Tests", () => {
  let repoConfig: RepoConfig;
  let mockExecuteCommand: jest.MockedFunction<
    (command: string) => Promise<ExecuteResult>
  >;

  // Helper function to create test environment config
  const createTestEnvironmentConfig = (label: string) => ({
    label,
    instanceUrl: "https://test.salesforce.com",
    consumerKey: "test-key",
    username: "test@example.com",
    secretNames: {
      keySecret: "key-secret",
      certificatePath: "cert-path"
    },
    testLevels: {
      presubmit: "RunLocalTests" as const,
      deployment: "RunLocalTests" as const
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new instance of RepoConfig
    repoConfig = new RepoConfig();

    // Mock the executeCommand method
    mockExecuteCommand = jest.fn();
    (repoConfig as any).executeCommand = mockExecuteCommand;
  });

  describe("connectedCallback", () => {
    it("should call initializeConfig when connected", () => {
      // Arrange
      const initConfigSpy = jest.spyOn(repoConfig as any, "initializeConfig");

      // Act
      repoConfig.connectedCallback();

      // Assert
      expect(initConfigSpy).toHaveBeenCalled();
    });
  });

  describe("initializeConfig", () => {
    it("should initialize configuration successfully", async () => {
      // Arrange
      const findResult: ExecuteResult = {
        command: "test -f skyline.config.json",
        stdout: "",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const branchResult: ExecuteResult = {
        command: "git rev-parse --abbrev-ref HEAD",
        stdout: "main",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const branchesResult: ExecuteResult = {
        command:
          "git branch -a | grep -v HEAD | sed -e 's/^[ *]*//' -e 's#remotes/origin/##'",
        stdout: "main\ndevelop\nfeature",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(findResult)
        .mockResolvedValueOnce(branchResult)
        .mockResolvedValueOnce(branchesResult);

      // Act
      await (repoConfig as any).initializeConfig();

      // Assert
      expect(repoConfig.isLoading).toBe(false);
      expect(repoConfig.currentBranch).toBe("main");
      expect(repoConfig.availableBranches).toEqual([
        "main",
        "develop",
        "feature"
      ]);
    });

    it("should handle initialization errors", async () => {
      // Arrange
      const expectedError = new Error("Initialization failed");
      mockExecuteCommand.mockRejectedValue(expectedError);

      // Act
      await (repoConfig as any).initializeConfig();

      // Assert
      expect(repoConfig.isLoading).toBe(false);
    });
  });

  describe("handleFindConfigurationFile", () => {
    it("should open existing configuration file", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "test -f skyline.config.json",
        stdout: "",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const openConfigSpy = jest.spyOn(repoConfig as any, "executeCommand");

      // Act
      repoConfig.handleFindConfigurationFile(result);

      // Assert
      expect(openConfigSpy).toHaveBeenCalledWith("cat skyline.config.json");
    });

    it("should create configuration file when it doesn't exist", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "test -f skyline.config.json",
        stdout: "",
        stderr: "No such file",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      const createConfigSpy = jest.spyOn(repoConfig as any, "executeCommand");

      // Act
      repoConfig.handleFindConfigurationFile(result);

      // Assert
      expect(createConfigSpy).toHaveBeenCalledWith(
        expect.stringContaining("cp")
      );
    });
  });

  describe("handleOpenConfigurationFile", () => {
    it("should parse valid JSON configuration", () => {
      // Arrange
      const configData = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development")
        }
      };
      const result: ExecuteResult = {
        command: "cat skyline.config.json",
        stdout: JSON.stringify(configData),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      repoConfig.handleOpenConfigurationFile(result);

      // Assert
      expect(repoConfig.configurationFileContents).toEqual(configData);
    });

    it("should handle invalid JSON in configuration file", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "cat skyline.config.json",
        stdout: "invalid json",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      repoConfig.handleOpenConfigurationFile(result);

      // Assert
      expect(repoConfig.configurationFileContents).toBeUndefined();
    });

    it("should handle stderr in configuration file", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "cat skyline.config.json",
        stdout: "",
        stderr: "File not found",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      // Act
      repoConfig.handleOpenConfigurationFile(result);

      // Assert
      expect(repoConfig.configurationFileContents).toBeUndefined();
    });
  });

  describe("handleGetCurrentBranch", () => {
    it("should set current branch from stdout", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "git rev-parse --abbrev-ref HEAD",
        stdout: "develop",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      repoConfig.handleGetCurrentBranch(result);

      // Assert
      expect(repoConfig.currentBranch).toBe("develop");
    });
  });

  describe("handleGetAllBranches", () => {
    it("should parse and set available branches", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "git branch -a",
        stdout: "main\ndevelop\nfeature\n* current",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      repoConfig.handleGetAllBranches(result);

      // Assert
      expect(repoConfig.availableBranches).toEqual([
        "main",
        "develop",
        "feature",
        "current"
      ]);
    });

    it("should handle empty branch list", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "git branch -a",
        stdout: "",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      repoConfig.handleGetAllBranches(result);

      // Assert
      expect(repoConfig.availableBranches).toEqual([]);
    });
  });

  describe("handleBranchSelect", () => {
    it("should set selected branch from event", () => {
      // Arrange
      const event = {
        target: {
          dataset: { branch: "develop" }
        }
      } as unknown as CustomEvent;

      // Act
      repoConfig.handleBranchSelect(event);

      // Assert
      expect(repoConfig.selectedBranch).toBe("develop");
    });
  });

  describe("handleInputChange", () => {
    it("should update edited config with string value", () => {
      // Arrange
      repoConfig.editedConfig = createTestEnvironmentConfig("Test");

      const event = {
        target: {
          dataset: { field: "label" },
          value: "Updated Label"
        }
      } as unknown as CustomEvent;

      // Act
      repoConfig.handleInputChange(event);

      // Assert
      expect(repoConfig.editedConfig!.label).toBe("Updated Label");
    });

    it("should update edited config with number value", () => {
      // Arrange
      repoConfig.editedConfig = createTestEnvironmentConfig("Test");

      const event = {
        target: {
          dataset: { field: "testLevels.presubmit" },
          value: "RunAllTestsInOrg"
        }
      } as unknown as CustomEvent;

      // Act
      repoConfig.handleInputChange(event);

      // Assert
      expect(repoConfig.editedConfig!.testLevels.presubmit).toBe(
        "RunAllTestsInOrg"
      );
    });

    it("should not update if no field or edited config", () => {
      // Arrange
      const event = {
        target: {
          dataset: {},
          value: "test"
        }
      } as unknown as CustomEvent;

      // Act
      repoConfig.handleInputChange(event);

      // Assert
      expect(repoConfig.editedConfig).toBeUndefined();
    });
  });

  describe("handleMoveUp", () => {
    it("should move branch up in pipeline order", () => {
      // Arrange
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop", "feature"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development"),
          feature: createTestEnvironmentConfig("Feature")
        }
      };

      const event = {
        target: {
          dataset: { branch: "develop" }
        }
      } as unknown as CustomEvent;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleMoveUp(event);

      // Assert
      expect(repoConfig.configurationFileContents!.pipelineOrder).toEqual([
        "develop",
        "main",
        "feature"
      ]);
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it("should not move first branch up", () => {
      // Arrange
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development")
        }
      };

      const event = {
        target: {
          dataset: { branch: "main" }
        }
      } as unknown as CustomEvent;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleMoveUp(event);

      // Assert
      expect(repoConfig.configurationFileContents!.pipelineOrder).toEqual([
        "main",
        "develop"
      ]);
      expect(saveConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleMoveDown", () => {
    it("should move branch down in pipeline order", () => {
      // Arrange
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop", "feature"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development"),
          feature: createTestEnvironmentConfig("Feature")
        }
      };

      const event = {
        target: {
          dataset: { branch: "develop" }
        }
      } as unknown as CustomEvent;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleMoveDown(event);

      // Assert
      expect(repoConfig.configurationFileContents!.pipelineOrder).toEqual([
        "main",
        "feature",
        "develop"
      ]);
      expect(saveConfigSpy).toHaveBeenCalled();
    });

    it("should not move last branch down", () => {
      // Arrange
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development")
        }
      };

      const event = {
        target: {
          dataset: { branch: "develop" }
        }
      } as unknown as CustomEvent;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleMoveDown(event);

      // Assert
      expect(repoConfig.configurationFileContents!.pipelineOrder).toEqual([
        "main",
        "develop"
      ]);
      expect(saveConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleDeleteBranchConfig", () => {
    it("should delete branch configuration", () => {
      // Arrange
      repoConfig.selectedBranch = "develop";
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          develop: createTestEnvironmentConfig("Development")
        }
      };

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleDeleteBranchConfig();

      // Assert
      expect(saveConfigSpy).toHaveBeenCalledWith({
        version: "1.0.0",
        pipelineOrder: ["main"],
        branches: { main: createTestEnvironmentConfig("Production") }
      });
      expect(repoConfig.selectedBranch).toBeUndefined();
    });

    it("should not delete if no branch selected", () => {
      // Arrange
      repoConfig.selectedBranch = undefined;
      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleDeleteBranchConfig();

      // Assert
      expect(saveConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleAddNewBranch", () => {
    it("should add new branch to configuration", () => {
      // Arrange
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main"],
        branches: {
          main: createTestEnvironmentConfig("Production")
        }
      };

      const event = {
        detail: { branch: "feature" }
      } as CustomEvent;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleAddNewBranch(event);

      // Assert
      expect(saveConfigSpy).toHaveBeenCalledWith({
        version: "1.0.0",
        pipelineOrder: ["main", "feature"],
        branches: {
          main: createTestEnvironmentConfig("Production"),
          feature: {
            label: "feature",
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
          }
        }
      });
      expect(repoConfig.selectedBranch).toBe("feature");
      expect(repoConfig.showNewBranchModal).toBe(false);
    });
  });

  describe("handleEditClick", () => {
    it("should start editing mode with current config", () => {
      // Arrange
      repoConfig.selectedBranch = "main";
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main"],
        branches: {
          main: createTestEnvironmentConfig("Production")
        }
      } as any;

      // Act
      repoConfig.handleEditClick();

      // Assert
      expect(repoConfig.isEditing).toBe(true);
      expect(repoConfig.editedConfig).toEqual(
        createTestEnvironmentConfig("Production")
      );
    });
  });

  describe("handleSaveEdit", () => {
    it("should save edited configuration", () => {
      // Arrange
      repoConfig.selectedBranch = "main";
      repoConfig.editedConfig =
        createTestEnvironmentConfig("Updated Production");
      repoConfig.configurationFileContents = {
        version: "1.0.0",
        pipelineOrder: ["main"],
        branches: {
          main: createTestEnvironmentConfig("Production")
        }
      } as any;

      const saveConfigSpy = jest.spyOn(repoConfig as any, "saveConfig");

      // Act
      repoConfig.handleSaveEdit();

      // Assert
      expect(saveConfigSpy).toHaveBeenCalledWith({
        version: "1.0.0",
        pipelineOrder: ["main"],
        branches: {
          main: createTestEnvironmentConfig("Updated Production")
        }
      });
      expect(repoConfig.isEditing).toBe(false);
      expect(repoConfig.editedConfig).toBeUndefined();
    });
  });

  describe("handleCancelEdit", () => {
    it("should cancel editing mode", () => {
      // Arrange
      repoConfig.isEditing = true;
      repoConfig.editedConfig = createTestEnvironmentConfig("Test");

      // Act
      repoConfig.handleCancelEdit();

      // Assert
      expect(repoConfig.isEditing).toBe(false);
      expect(repoConfig.editedConfig).toBeUndefined();
    });
  });

  describe("handleTicketingSystemChange", () => {
    it("should update ticketing system and set default regex", () => {
      // Arrange
      const event = {
        detail: { value: "Jira" }
      } as CustomEvent;

      // Act
      repoConfig.handleTicketingSystemChange(event);

      // Assert
      expect(repoConfig.editedTicketingConfig!.system).toBe("Jira");
      expect(repoConfig.editedTicketingConfig!.ticketIdRegex).toBe(
        "[A-Z]+-\\d+"
      );
    });

    it("should clear custom label for non-Other systems", () => {
      // Arrange
      repoConfig.editedTicketingConfig = {
        system: "Other",
        ticketIdRegex: "",
        customLabel: "Custom Label"
      };

      const event = {
        detail: { value: "Jira" }
      } as CustomEvent;

      // Act
      repoConfig.handleTicketingSystemChange(event);

      // Assert
      expect(repoConfig.editedTicketingConfig!.customLabel).toBeUndefined();
    });
  });

  describe("handleTicketingRegexChange", () => {
    it("should update regex with valid pattern", () => {
      // Arrange
      repoConfig.editedTicketingConfig = {
        system: "Jira",
        ticketIdRegex: ""
      };

      const event = {
        detail: { value: "[A-Z]+-\\d+" }
      } as CustomEvent;

      // Act
      repoConfig.handleTicketingRegexChange(event);

      // Assert
      expect(repoConfig.editedTicketingConfig!.ticketIdRegex).toBe(
        "[A-Z]+-\\d+"
      );
    });

    it("should handle invalid regex pattern", () => {
      // Arrange
      repoConfig.editedTicketingConfig = {
        system: "Jira",
        ticketIdRegex: ""
      };

      const event = {
        detail: { value: "[invalid" }
      } as CustomEvent;

      // Act
      repoConfig.handleTicketingRegexChange(event);

      // Assert
      expect(repoConfig.editedTicketingConfig!.ticketIdRegex).toBe("");
    });
  });

  describe("getters", () => {
    describe("orderedBranches", () => {
      it("should return ordered branches with correct properties", () => {
        // Arrange
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main", "develop"],
          branches: {
            main: createTestEnvironmentConfig("Production"),
            develop: createTestEnvironmentConfig("Development")
          }
        };
        repoConfig.selectedBranch = "main";

        // Act
        const result = repoConfig.orderedBranches;

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          name: "main",
          label: "Production",
          isFirst: true,
          isLast: false,
          isSelected: true,
          buttonVariant: "brand"
        });
        expect(result[1]).toEqual({
          name: "develop",
          label: "Development",
          isFirst: false,
          isLast: true,
          isSelected: false,
          buttonVariant: "neutral"
        });
      });
    });

    describe("currentEnvironmentConfig", () => {
      it("should return current environment config", () => {
        // Arrange
        repoConfig.selectedBranch = "main";
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {
            main: createTestEnvironmentConfig("Production")
          }
        } as any;

        // Act & Assert
        expect(repoConfig.currentEnvironmentConfig).toEqual(
          createTestEnvironmentConfig("Production")
        );
      });

      it("should return undefined when no branch selected", () => {
        // Arrange
        repoConfig.selectedBranch = undefined;

        // Act & Assert
        expect(repoConfig.currentEnvironmentConfig).toBeUndefined();
      });
    });

    describe("testLevelOptions", () => {
      it("should return all test level options", () => {
        // Act
        const result = repoConfig.testLevelOptions;

        // Assert
        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({ label: "No Test Run", value: "NoTestRun" });
        expect(result[1]).toEqual({
          label: "Run Specified Tests",
          value: "RunSpecifiedTests"
        });
        expect(result[2]).toEqual({
          label: "Run Local Tests",
          value: "RunLocalTests"
        });
        expect(result[3]).toEqual({
          label: "Run All Tests in Org",
          value: "RunAllTestsInOrg"
        });
      });
    });

    describe("isDeleteDisabled", () => {
      it("should return true when no branch selected", () => {
        // Arrange
        repoConfig.selectedBranch = undefined;

        // Act & Assert
        expect(repoConfig.isDeleteDisabled).toBe(true);
      });

      it("should return false when branch is selected", () => {
        // Arrange
        repoConfig.selectedBranch = "main";

        // Act & Assert
        expect(repoConfig.isDeleteDisabled).toBe(false);
      });
    });

    describe("existingBranches", () => {
      it("should return existing branch names", () => {
        // Arrange
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main", "develop"],
          branches: {
            main: createTestEnvironmentConfig("Production"),
            develop: createTestEnvironmentConfig("Development")
          }
        } as any;

        // Act & Assert
        expect(repoConfig.existingBranches).toEqual(["main", "develop"]);
      });

      it("should return empty array when no configuration", () => {
        // Arrange
        repoConfig.configurationFileContents = undefined;

        // Act & Assert
        expect(repoConfig.existingBranches).toEqual([]);
      });
    });

    describe("ticketingSystemOptions", () => {
      it("should return all ticketing system options", () => {
        // Act
        const result = repoConfig.ticketingSystemOptions;

        // Assert
        expect(result).toHaveLength(5);
        expect(result[0]).toEqual({ label: "Jira", value: "Jira" });
        expect(result[1]).toEqual({ label: "Asana", value: "Asana" });
        expect(result[2]).toEqual({ label: "Trello", value: "Trello" });
        expect(result[3]).toEqual({ label: "GitHub", value: "GitHub" });
        expect(result[4]).toEqual({ label: "Other", value: "Other" });
      });
    });

    describe("currentTicketingConfig", () => {
      it("should return current ticketing config", () => {
        // Arrange
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {},
          ticketing: {
            system: "Jira",
            ticketIdRegex: "[A-Z]+-\\d+"
          }
        } as any;

        // Act & Assert
        expect(repoConfig.currentTicketingConfig).toEqual({
          system: "Jira",
          ticketIdRegex: "[A-Z]+-\\d+"
        });
      });

      it("should return undefined when no ticketing config", () => {
        // Arrange
        repoConfig.configurationFileContents = {} as any;

        // Act & Assert
        expect(repoConfig.currentTicketingConfig).toBeUndefined();
      });
    });

    describe("ticketingSystemLabel", () => {
      it("should return system name for standard systems", () => {
        // Arrange
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {},
          ticketing: {
            system: "Jira",
            ticketIdRegex: "[A-Z]+-\\d+"
          }
        } as any;

        // Act & Assert
        expect(repoConfig.ticketingSystemLabel).toBe("Jira");
      });

      it("should return custom label for Other system", () => {
        // Arrange
        repoConfig.configurationFileContents = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {},
          ticketing: {
            system: "Other",
            ticketIdRegex: "",
            customLabel: "Custom System"
          }
        } as any;

        // Act & Assert
        expect(repoConfig.ticketingSystemLabel).toBe("Custom System");
      });

      it("should return Not configured when no ticketing config", () => {
        // Arrange
        repoConfig.configurationFileContents = {} as any;

        // Act & Assert
        expect(repoConfig.ticketingSystemLabel).toBe("Not configured");
      });
    });

    describe("isOtherTicketingSystem", () => {
      it("should return true for Other system", () => {
        // Arrange
        repoConfig.editedTicketingConfig = {
          system: "Other",
          ticketIdRegex: ""
        };

        // Act & Assert
        expect(repoConfig.isOtherTicketingSystem).toBe(true);
      });

      it("should return false for standard system", () => {
        // Arrange
        repoConfig.editedTicketingConfig = {
          system: "Jira",
          ticketIdRegex: "[A-Z]+-\\d+"
        };

        // Act & Assert
        expect(repoConfig.isOtherTicketingSystem).toBe(false);
      });
    });
  });

  describe("private methods", () => {
    describe("getDefaultRegexForSystem", () => {
      it("should return correct regex for Jira", () => {
        // Act
        const result = (repoConfig as any).getDefaultRegexForSystem("Jira");

        // Assert
        expect(result).toBe("[A-Z]+-\\d+");
      });

      it("should return correct regex for Asana", () => {
        // Act
        const result = (repoConfig as any).getDefaultRegexForSystem("Asana");

        // Assert
        expect(result).toBe("\\d+");
      });

      it("should return empty string for Other", () => {
        // Act
        const result = (repoConfig as any).getDefaultRegexForSystem("Other");

        // Assert
        expect(result).toBe("");
      });
    });

    describe("prepareConfigForSave", () => {
      it("should prepare config with proper escaping", () => {
        // Arrange
        const config = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {},
          ticketing: {
            system: "Jira",
            ticketIdRegex: "[A-Z]+-\\d+"
          }
        };

        // Act
        const result = (repoConfig as any).prepareConfigForSave(config);

        // Assert
        expect(result).toContain("[A-Z]+-\\\\d+");
      });
    });

    describe("saveConfig", () => {
      it("should save configuration successfully", () => {
        // Arrange
        const config = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {
            main: createTestEnvironmentConfig("Production")
          }
        };

        const saveConfigSpy = jest.spyOn(repoConfig as any, "executeCommand");

        // Act
        (repoConfig as any).saveConfig(config);

        // Assert
        expect(saveConfigSpy).toHaveBeenCalledWith(
          expect.stringContaining("echo")
        );
      });

      it("should add missing branches to pipeline order", () => {
        // Arrange
        const config = {
          version: "1.0.0",
          pipelineOrder: ["main"],
          branches: {
            main: createTestEnvironmentConfig("Production"),
            develop: createTestEnvironmentConfig("Development")
          }
        };

        // Act
        (repoConfig as any).saveConfig(config);

        // Assert
        expect(repoConfig.configurationFileContents!.pipelineOrder).toEqual([
          "main",
          "develop"
        ]);
      });
    });
  });
});
