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

import App, { Pages, ExecuteResult } from "../../modules/s/app/app";

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-123")
}));

// Mock acquireVsCodeApi
const mockVscode = {
  postMessage: jest.fn()
};

// Mock window object
const mockWindow = {
  vsCodeConfig: {
    debugMode: false,
    someOtherConfig: "test"
  },
  extensionPath: "/test/extension/path"
};

// Mock acquireVsCodeApi globally
(global as any).acquireVsCodeApi = jest.fn(() => mockVscode);

describe("App Component Tests", () => {
  let app: App;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset the singleton instance
    (App as any).instance = undefined;

    // Mock window object
    Object.defineProperty(global, "window", {
      value: mockWindow,
      writable: true
    });

    // Create a new instance
    app = new App();
  });

  afterEach(() => {
    // Clean up
    (App as any).instance = undefined;
  });

  describe("Pages Enum", () => {
    it("should have correct page values", () => {
      expect(Pages.home).toBe("Home");
      expect(Pages.orgManager).toBe("Org Manager");
      expect(Pages.repoConfig).toBe("Project Configuration");
      expect(Pages.metadataExplorer).toBe("Metadata Explorer");
      expect(Pages.pipeline).toBe("Pipeline");
    });
  });

  describe("ExecuteResult Interface", () => {
    it("should allow creating ExecuteResult objects", () => {
      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output",
        stderr: "test error",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };

      expect(result.command).toBe("test-command");
      expect(result.stdout).toBe("test output");
      expect(result.stderr).toBe("test error");
      expect(result.elementId).toBe("test-element");
      expect(result.requestId).toBe("test-request");
      expect(result.errorCode).toBe(0);
    });
  });

  describe("Constructor", () => {
    it("should set the singleton instance", () => {
      expect((App as any).instance).toBe(app);
    });

    it("should initialize config from window.vsCodeConfig", () => {
      expect(app.config).toEqual(mockWindow.vsCodeConfig);
    });

    it("should initialize config as empty object when window.vsCodeConfig is undefined", () => {
      // Reset instance
      (App as any).instance = undefined;

      // Mock window without vsCodeConfig
      Object.defineProperty(global, "window", {
        value: { extensionPath: "/test/path" },
        writable: true
      });

      const newApp = new App();
      expect(newApp.config).toEqual({});
    });
  });

  describe("getInstance()", () => {
    it("should return existing instance if available", () => {
      const instance1 = App.getInstance();
      const instance2 = App.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(app);
    });

    it("should create new instance if none exists", () => {
      // Reset instance
      (App as any).instance = undefined;

      const instance = App.getInstance();
      expect(instance).toBeInstanceOf(App);
      expect((App as any).instance).toBe(instance);
    });
  });

  describe("getConfig()", () => {
    it("should return the configuration from the singleton instance", () => {
      const config = App.getConfig();
      expect(config).toEqual(mockWindow.vsCodeConfig);
    });
  });

  describe("isDebugMode()", () => {
    it("should return false when debugMode is not enabled", () => {
      expect(App.isDebugMode()).toBe(false);
    });

    it("should return true when debugMode is enabled", () => {
      // Mock window with debug mode enabled
      Object.defineProperty(global, "window", {
        value: {
          ...mockWindow,
          vsCodeConfig: { debugMode: true }
        },
        writable: true
      });

      // Reset instance to get fresh config
      (App as any).instance = undefined;
      new App();

      expect(App.isDebugMode()).toBe(true);
    });

    it("should return false when config is undefined", () => {
      // Mock window without config
      Object.defineProperty(global, "window", {
        value: { extensionPath: "/test/path" },
        writable: true
      });

      // Reset instance
      (App as any).instance = undefined;
      new App();

      expect(App.isDebugMode()).toBe(false);
    });
  });

  describe("executeCommand()", () => {
    it("should post message to VS Code with command and requestId", async () => {
      const command = "test-command";
      const promise = App.executeCommand(command);

      // Get the vscode instance from the App class
      const vscodeInstance = (App as any).vscode;
      expect(vscodeInstance.postMessage).toHaveBeenCalledWith({
        command: "test-command",
        requestId: "test-uuid-123"
      });

      // The promise should be pending
      expect(promise).toBeInstanceOf(Promise);
    });

    it("should log debug message when debug mode is enabled", async () => {
      // Enable debug mode
      Object.defineProperty(global, "window", {
        value: {
          ...mockWindow,
          vsCodeConfig: { debugMode: true }
        },
        writable: true
      });

      // Reset instance
      (App as any).instance = undefined;
      new App();

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      App.executeCommand("debug-command");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[DEBUG] Sending command: debug-command, requestId: test-uuid-123"
      );

      consoleSpy.mockRestore();
    });

    it("should not log debug message when debug mode is disabled", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      App.executeCommand("normal-command");

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG]")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("handleCommandResult()", () => {
    it("should resolve pending promise when requestId matches", async () => {
      const command = "test-command";
      const promise = App.executeCommand(command);

      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output",
        requestId: "test-uuid-123"
      };

      // Handle the result
      App.handleCommandResult(result);

      // Wait for promise to resolve
      const resolvedResult = await promise;
      expect(resolvedResult).toEqual(result);
    });

    it("should not resolve promise when requestId does not match", async () => {
      const command = "test-command";
      const promise = App.executeCommand(command);

      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output",
        requestId: "different-uuid"
      };

      // Handle the result
      App.handleCommandResult(result);

      // The promise should still be pending
      expect(promise).toBeInstanceOf(Promise);

      // Clean up the pending promise
      const pendingResolvers = (App as any).pendingResolvers;
      pendingResolvers.clear();
    });

    it("should log debug message when debug mode is enabled", () => {
      // Enable debug mode
      Object.defineProperty(global, "window", {
        value: {
          ...mockWindow,
          vsCodeConfig: { debugMode: true }
        },
        writable: true
      });

      // Reset instance
      (App as any).instance = undefined;
      new App();

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output"
      };

      App.handleCommandResult(result);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[DEBUG] Command result:",
        result
      );

      consoleSpy.mockRestore();
    });

    it("should not log debug message when debug mode is disabled", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output"
      };

      App.handleCommandResult(result);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG]")
      );

      consoleSpy.mockRestore();
    });

    it("should remove resolved promise from pendingResolvers", async () => {
      const command = "test-command";
      const promise = App.executeCommand(command);

      const result: ExecuteResult = {
        command: "test-command",
        stdout: "test output",
        requestId: "test-uuid-123"
      };

      const pendingResolvers = (App as any).pendingResolvers;
      expect(pendingResolvers.has("test-uuid-123")).toBe(true);

      // Handle the result
      App.handleCommandResult(result);

      // Wait for promise to resolve
      await promise;

      // The resolver should be removed
      expect(pendingResolvers.has("test-uuid-123")).toBe(false);
    });
  });

  describe("handlePageNavigation()", () => {
    it("should update currentPage when navigation event is received", () => {
      const event = new CustomEvent("navigation", {
        detail: Pages.orgManager
      });

      app.handlePageNavigation(event);

      expect(app.currentPage).toBe(Pages.orgManager);
    });

    it("should update currentPage to different page", () => {
      const event = new CustomEvent("navigation", {
        detail: Pages.metadataExplorer
      });

      app.handlePageNavigation(event);

      expect(app.currentPage).toBe(Pages.metadataExplorer);
    });
  });

  describe("Page Display Getters", () => {
    it("should return true for showHome when currentPage is home", () => {
      app.currentPage = Pages.home;
      expect(app.showHome).toBe(true);
    });

    it("should return false for showHome when currentPage is not home", () => {
      app.currentPage = Pages.orgManager;
      expect(app.showHome).toBe(false);
    });

    it("should return true for showMetadataExplorer when currentPage is metadataExplorer", () => {
      app.currentPage = Pages.metadataExplorer;
      expect(app.showMetadataExplorer).toBe(true);
    });

    it("should return false for showMetadataExplorer when currentPage is not metadataExplorer", () => {
      app.currentPage = Pages.home;
      expect(app.showMetadataExplorer).toBe(false);
    });

    it("should return true for showRepoConfig when currentPage is repoConfig", () => {
      app.currentPage = Pages.repoConfig;
      expect(app.showRepoConfig).toBe(true);
    });

    it("should return false for showRepoConfig when currentPage is not repoConfig", () => {
      app.currentPage = Pages.home;
      expect(app.showRepoConfig).toBe(false);
    });

    it("should return true for showPipeline when currentPage is pipeline", () => {
      app.currentPage = Pages.pipeline;
      expect(app.showPipeline).toBe(true);
    });

    it("should return false for showPipeline when currentPage is not pipeline", () => {
      app.currentPage = Pages.home;
      expect(app.showPipeline).toBe(false);
    });

    it("should return true for showOrgManager when currentPage is orgManager", () => {
      app.currentPage = Pages.orgManager;
      expect(app.showOrgManager).toBe(true);
    });

    it("should return false for showOrgManager when currentPage is not orgManager", () => {
      app.currentPage = Pages.home;
      expect(app.showOrgManager).toBe(false);
    });
  });

  describe("Static Properties", () => {
    it("should have vscode property initialized", () => {
      const vscodeInstance = (App as any).vscode;
      expect(vscodeInstance).toBeDefined();
      expect(vscodeInstance.postMessage).toBeDefined();
    });

    it("should have pendingResolvers as a Map", () => {
      expect((App as any).pendingResolvers).toBeInstanceOf(Map);
    });
  });

  describe("Instance Properties", () => {
    it("should have currentPage initialized to home", () => {
      expect(app.currentPage).toBe(Pages.home);
    });

    it("should have config property", () => {
      expect(app.config).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete command execution flow", async () => {
      const command = "integration-test";
      const promise = App.executeCommand(command);

      const result: ExecuteResult = {
        command: "integration-test",
        stdout: "integration success",
        requestId: "test-uuid-123"
      };

      App.handleCommandResult(result);

      const resolvedResult = await promise;
      expect(resolvedResult).toEqual(result);
    });

    it("should maintain singleton pattern across multiple getInstance calls", () => {
      const instance1 = App.getInstance();
      const instance2 = App.getInstance();
      const instance3 = App.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(app);
    });

    it("should handle page navigation and update display getters", () => {
      // Start on home page
      expect(app.showHome).toBe(true);
      expect(app.showOrgManager).toBe(false);

      // Navigate to org manager
      const event = new CustomEvent("navigation", {
        detail: Pages.orgManager
      });
      app.handlePageNavigation(event);

      // Check updated state
      expect(app.showHome).toBe(false);
      expect(app.showOrgManager).toBe(true);
    });
  });
});
