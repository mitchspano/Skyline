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

// Mock the exec function to be called synchronously
jest.mock("child_process", () => ({
  exec: jest.fn()
}));

import * as vscode from "vscode";
import { exec } from "child_process";
import { activate } from "../../extension";

// Mock child_process.exec
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe("Extension Tests", () => {
  let mockContext: vscode.ExtensionContext;
  let mockPanel: vscode.WebviewPanel;
  let mockWebview: vscode.Webview;
  let mockExtensionUri: vscode.Uri;
  let mockSubscriptions: vscode.Disposable[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset the exec mock
    (exec as unknown as jest.Mock).mockReset();

    // Mock extension context
    mockSubscriptions = [];
    mockContext = {
      subscriptions: mockSubscriptions,
      extensionUri: { fsPath: "/test/extension/path" } as vscode.Uri
    } as vscode.ExtensionContext;

    // Mock webview panel
    mockWebview = {
      html: "",
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
      asWebviewUri: jest.fn(() => "test-uri")
    } as any;

    mockPanel = {
      webview: mockWebview
    } as any;

    // Mock VS Code API
    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
      undefined
    );
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({
      dispose: jest.fn()
    });
    (vscode.commands.executeCommand as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      debugMode: false
    });
    (vscode.Uri.joinPath as jest.Mock).mockReturnValue({
      fsPath: "/test/path"
    });
  });

  describe("activate function", () => {
    it("should register the skyline.launch command", () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "skyline.launch",
        expect.any(Function)
      );
    });

    it("should add command registration to subscriptions", () => {
      activate(mockContext);

      expect(mockSubscriptions).toHaveLength(1);
    });

    it("should create webview panel when command is executed", () => {
      activate(mockContext);

      // Get the registered command callback
      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];

      // Execute the command
      commandCallback();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        "skyline",
        "Skyline",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [mockContext.extensionUri]
        }
      );
    });

    it("should set up webview HTML content", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      expect(mockPanel.webview.html).toBeTruthy();
      expect(typeof mockPanel.webview.html).toBe("string");
    });

    it("should set up message listener", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        mockSubscriptions
      );
    });
  });

  describe("Webview HTML Content", () => {
    it("should include proper HTML structure", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const html = mockPanel.webview.html;
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("<head>");
      expect(html).toContain("<body>");
    });

    it("should include script and style references", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const html = mockPanel.webview.html;
      expect(html).toContain("test-uri");
      expect(html).toContain("script src");
      expect(html).toContain("link");
    });

    it("should include extension path and configuration", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const html = mockPanel.webview.html;
      expect(html).toContain("window.extensionPath");
      expect(html).toContain("window.vsCodeConfig");
    });
  });

  describe("Message Handling", () => {
    it("should execute command when message is received", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      const testMessage = {
        command: "test-command",
        elementId: "test-element",
        requestId: "test-request"
      };

      messageCallback(testMessage);

      expect(mockExec).toHaveBeenCalledWith(
        "test-command",
        expect.any(Function)
      );
    });

    it("should handle command execution success", async () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      (exec as unknown as jest.Mock).mockImplementation(
        (command, optionsOrCallback, callback) => {
          const actualCallback = callback || optionsOrCallback;
          if (actualCallback && typeof actualCallback === "function") {
            actualCallback(null, "success output", "");
          }
          return {} as any;
        }
      );

      const testMessage = {
        command: "success-command",
        elementId: "test-element",
        requestId: "test-request"
      };

      messageCallback(testMessage);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: "success-command",
        stdout: "success output",
        elementId: "test-element",
        requestId: "test-request"
      });
    });

    it("should handle command execution error", async () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      const testError = new Error("Command failed");
      (testError as any).code = 1;

      (exec as unknown as jest.Mock).mockImplementation(
        (command, optionsOrCallback, callback) => {
          const actualCallback = callback || optionsOrCallback;
          if (actualCallback && typeof actualCallback === "function") {
            actualCallback(testError, "", "error output");
          }
          return {} as any;
        }
      );

      const testMessage = {
        command: "error-command",
        elementId: "test-element",
        requestId: "test-request"
      };

      messageCallback(testMessage);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: "error-command",
        stderr: "error output",
        errorCode: 1,
        elementId: "test-element",
        requestId: "test-request"
      });
    });
  });

  describe("URI Generation", () => {
    it("should generate proper URIs for webview resources", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      expect(vscode.Uri.joinPath).toHaveBeenCalled();
    });
  });

  describe("Configuration Handling", () => {
    it("should get workspace configuration", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith("skyline");
    });

    it("should handle configuration with debug mode enabled", () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        debugMode: true
      });

      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const html = mockPanel.webview.html;
      expect(html).toContain("debugMode");
    });
  });

  describe("Settings Functionality", () => {
    it("should handle openSettings message and execute command", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      const testMessage = {
        openSettings: true
      };

      messageCallback(testMessage);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        '@ext:mitchspano.skyline-devops'
      );
    });

    it("should not execute command for non-settings messages", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      const testMessage = {
        command: "test-command",
        elementId: "test-element"
      };

      messageCallback(testMessage);

      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
        'workbench.action.openSettings',
        expect.any(String)
      );
    });
  });

  describe("Error Scenarios", () => {
    it("should handle missing command in message", () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      const testMessage = {
        elementId: "test-element"
      };

      expect(() => messageCallback(testMessage)).not.toThrow();
    });

    it("should handle exec callback with null error and no output", async () => {
      activate(mockContext);

      const commandCallback = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];
      commandCallback();

      const messageCallback = (mockWebview.onDidReceiveMessage as jest.Mock)
        .mock.calls[0][0];

      (exec as unknown as jest.Mock).mockImplementation(
        (command, optionsOrCallback, callback) => {
          const actualCallback = callback || optionsOrCallback;
          if (actualCallback && typeof actualCallback === "function") {
            actualCallback(null, "", "");
          }
          return {} as any;
        }
      );

      const testMessage = {
        command: "empty-command"
      };

      messageCallback(testMessage);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: "empty-command",
        stdout: ""
      });
    });
  });
});
