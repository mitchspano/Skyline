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

import Pipeline from "../../modules/s/pipeline/pipeline";
import { ExecuteResult } from "../../modules/s/app/app";

// Mock the Toast module
jest.mock("lightning-base-components/src/lightning/toast/toast.js", () => ({
  show: jest.fn()
}));

describe("Pipeline Component Tests", () => {
  let pipeline: Pipeline;
  let mockExecuteCommand: jest.MockedFunction<(command: string) => Promise<ExecuteResult>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance of Pipeline
    pipeline = new Pipeline();
    
    // Mock the executeCommand method
    mockExecuteCommand = jest.fn();
    (pipeline as any).executeCommand = mockExecuteCommand;
  });

  describe("connectedCallback", () => {
    it("should call loadConfiguration when connected", () => {
      // Arrange
      const loadConfigSpy = jest.spyOn(pipeline as any, 'loadConfiguration');
      
      // Act
      pipeline.connectedCallback();
      
      // Assert
      expect(loadConfigSpy).toHaveBeenCalled();
    });
  });

  describe("handleTicketIdChange", () => {
    it("should update searchTerm when ticket ID changes", () => {
      // Arrange
      const newSearchTerm = "ABC-123";
      const event = {
        detail: { value: newSearchTerm }
      } as CustomEvent;

      // Act
      pipeline.handleTicketIdChange(event);

      // Assert
      expect(pipeline.searchTerm).toBe(newSearchTerm);
    });
  });

  describe("handleSearch", () => {
    it("should call executeSearch when search is triggered", () => {
      // Arrange
      const executeSearchSpy = jest.spyOn(pipeline as any, 'executeSearch');
      
      // Act
      pipeline.handleSearch();
      
      // Assert
      expect(executeSearchSpy).toHaveBeenCalled();
    });
  });

  describe("handleSectionToggle", () => {
    it("should update activeSections when section is toggled", () => {
      // Arrange
      const openSections = ["section1", "section2"];
      const event = {
        detail: { openSections }
      } as CustomEvent;

      // Act
      pipeline.handleSectionToggle(event);

      // Assert
      expect(pipeline.activeSections).toEqual(openSections);
    });
  });

  describe("loadConfiguration", () => {
    it("should load configuration successfully", async () => {
      // Arrange
      const configResult: ExecuteResult = {
        command: "cat skyline.config.json",
        stdout: JSON.stringify({
          version: "1.0.0",
          pipelineOrder: ["main", "develop"],
          branches: {
            main: { 
              label: "Production",
              instanceUrl: "https://test.salesforce.com",
              consumerKey: "test-key",
              username: "test@example.com",
              secretNames: {
                keySecret: "key-secret",
                certificatePath: "cert-path"
              },
              testLevels: {
                presubmit: "RunLocalTests",
                deployment: "RunLocalTests"
              }
            },
            develop: { 
              label: "Development",
              instanceUrl: "https://test.salesforce.com",
              consumerKey: "test-key",
              username: "test@example.com",
              secretNames: {
                keySecret: "key-secret",
                certificatePath: "cert-path"
              },
              testLevels: {
                presubmit: "RunLocalTests",
                deployment: "RunLocalTests"
              }
            }
          }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(configResult);

      // Act
      await (pipeline as any).loadConfiguration();

      // Assert
      expect(pipeline.isLoading).toBe(false);
      expect(pipeline.configurationFileContents).toBeDefined();
      expect(pipeline.orderedBranches).toEqual(["main", "develop"]);
    });

    it("should handle configuration loading errors", async () => {
      // Arrange
      const expectedError = new Error("Configuration loading failed");
      mockExecuteCommand.mockRejectedValue(expectedError);

      // Act
      await (pipeline as any).loadConfiguration();

      // Assert
      expect(pipeline.isLoading).toBe(false);
    });
  });

  describe("handleOpenConfigurationFile", () => {
    it("should parse valid JSON configuration", () => {
      // Arrange
      const configData = {
        version: "1.0.0",
        pipelineOrder: ["main", "develop"],
        branches: {
          main: { 
            label: "Production",
            instanceUrl: "https://test.salesforce.com",
            consumerKey: "test-key",
            username: "test@example.com",
            secretNames: {
              keySecret: "key-secret",
              certificatePath: "cert-path"
            },
            testLevels: {
              presubmit: "RunLocalTests",
              deployment: "RunLocalTests"
            }
          },
          develop: { 
            label: "Development",
            instanceUrl: "https://test.salesforce.com",
            consumerKey: "test-key",
            username: "test@example.com",
            secretNames: {
              keySecret: "key-secret",
              certificatePath: "cert-path"
            },
            testLevels: {
              presubmit: "RunLocalTests",
              deployment: "RunLocalTests"
            }
          }
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
      (pipeline as any).handleOpenConfigurationFile(result);

      // Assert
      expect(pipeline.configurationFileContents).toEqual(configData);
      expect(pipeline.orderedBranches).toEqual(["main", "develop"]);
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
      (pipeline as any).handleOpenConfigurationFile(result);

      // Assert
      expect(pipeline.configurationFileContents).toBeUndefined();
    });
  });

  describe("executeSearch", () => {
    it("should execute search successfully", async () => {
      // Arrange
      pipeline.searchTerm = "ABC-123";
      const searchResult: ExecuteResult = {
        command: 'gh pr list --json number,title,body,baseRefName,url,files,createdAt,state,closedAt --search "ABC-123" --state all',
        stdout: JSON.stringify([
          {
            number: 1,
            title: "ABC-123: Test PR",
            body: "Test body",
            baseRefName: "main",
            url: "https://github.com/test/pr/1",
            files: [],
            createdAt: "2023-01-01T00:00:00Z",
            state: "OPEN"
          }
        ]),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(searchResult);

      // Act
      await (pipeline as any).executeSearch();

      // Assert
      expect(pipeline.isLoading).toBe(false);
      expect(pipeline.pullRequests).toHaveLength(1);
      expect(pipeline.searchMessage).toBe("");
    });

    it("should handle search with no results", async () => {
      // Arrange
      pipeline.searchTerm = "NONEXISTENT";
      const searchResult: ExecuteResult = {
        command: 'gh pr list --json number,title,body,baseRefName,url,files,createdAt,state,closedAt --search "NONEXISTENT" --state all',
        stdout: JSON.stringify([]),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(searchResult);

      // Act
      await (pipeline as any).executeSearch();

      // Assert
      expect(pipeline.isLoading).toBe(false);
      expect(pipeline.pullRequests).toHaveLength(0);
      expect(pipeline.searchMessage).toBe('No changes found matching "NONEXISTENT"');
    });

    it("should handle search errors", async () => {
      // Arrange
      pipeline.searchTerm = "ABC-123";
      const expectedError = new Error("Search failed");
      mockExecuteCommand.mockRejectedValue(expectedError);

      // Act
      await (pipeline as any).executeSearch();

      // Assert
      expect(pipeline.isLoading).toBe(false);
    });
  });

  describe("sortPullRequests", () => {
    it("should sort pull requests with OPEN state first", () => {
      // Arrange
      const pullRequests = [
        {
          number: 1,
          title: "Closed PR",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "CLOSED"
        },
        {
          number: 2,
          title: "Open PR",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "OPEN"
        }
      ];

      // Act
      const result = (pipeline as any).sortPullRequests(pullRequests);

      // Assert
      expect(result[0].state).toBe("OPEN");
      expect(result[1].state).toBe("CLOSED");
    });

    it("should sort by date when states are the same", () => {
      // Arrange
      const pullRequests = [
        {
          number: 1,
          title: "Older PR",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "OPEN"
        },
        {
          number: 2,
          title: "Newer PR",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-02T00:00:00Z",
          state: "OPEN"
        }
      ];

      // Act
      const result = (pipeline as any).sortPullRequests(pullRequests);

      // Assert
      expect(result[0].number).toBe(2); // Newer first
      expect(result[1].number).toBe(1); // Older second
    });
  });

  describe("mapPullRequest", () => {
    it("should map pull request with correct properties", () => {
      // Arrange
      const pr = {
        number: 123,
        title: "Test PR",
        body: "Test body",
        baseRefName: "main",
        url: "https://github.com/test/pr/123",
        files: [],
        createdAt: "2023-01-01T00:00:00Z",
        state: "OPEN"
      };

      // Act
      const result = (pipeline as any).mapPullRequest(pr);

      // Assert
      expect(result.bodySectionName).toBe("123_body");
      expect(result.filesSectionName).toBe("123_files");
      expect(result.stateBadgeClass).toBe("slds-badge slds-theme_success");
    });

    it("should map closed pull request with correct badge class", () => {
      // Arrange
      const pr = {
        number: 123,
        title: "Test PR",
        body: "Test body",
        baseRefName: "main",
        url: "https://github.com/test/pr/123",
        files: [],
        createdAt: "2023-01-01T00:00:00Z",
        state: "CLOSED"
      };

      // Act
      const result = (pipeline as any).mapPullRequest(pr);

      // Assert
      expect(result.stateBadgeClass).toBe("slds-badge");
    });
  });

  describe("groupPullRequestsByBranch", () => {
    it("should group pull requests by branch name", () => {
      // Arrange
      const pullRequests = [
        {
          number: 1,
          title: "PR 1",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "OPEN"
        },
        {
          number: 2,
          title: "PR 2",
          body: "",
          baseRefName: "develop",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "OPEN"
        },
        {
          number: 3,
          title: "PR 3",
          body: "",
          baseRefName: "main",
          url: "",
          files: [],
          createdAt: "2023-01-01T00:00:00Z",
          state: "OPEN"
        }
      ];

      // Act
      const result = (pipeline as any).groupPullRequestsByBranch(pullRequests);

      // Assert
      expect(Object.keys(result)).toEqual(["main", "develop"]);
      expect(result.main).toHaveLength(2);
      expect(result.develop).toHaveLength(1);
    });
  });

  describe("getters", () => {
    describe("hasResults", () => {
      it("should return true when pull requests exist", () => {
        // Arrange
        pipeline.pullRequests = [{ number: 1 } as any];

        // Act & Assert
        expect(pipeline.hasResults).toBe(true);
      });

      it("should return false when no pull requests exist", () => {
        // Arrange
        pipeline.pullRequests = [];

        // Act & Assert
        expect(pipeline.hasResults).toBe(false);
      });
    });

    describe("searchIsDisabled", () => {
      it("should return true when search term is empty", () => {
        // Arrange
        pipeline.searchTerm = "";

        // Act & Assert
        expect(pipeline.searchIsDisabled).toBe(true);
      });

      it("should return false when search term has value", () => {
        // Arrange
        pipeline.searchTerm = "ABC-123";

        // Act & Assert
        expect(pipeline.searchIsDisabled).toBe(false);
      });
    });
  });
}); 