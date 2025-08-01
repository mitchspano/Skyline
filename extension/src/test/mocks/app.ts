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

import { LightningElement } from "lwc";
import { v4 as uuidv4 } from "uuid";

declare global {
  interface Window {
    vsCodeConfig: any;
    extensionPath: string;
  }
}

// Mock acquireVsCodeApi
const mockVscode = {
  postMessage: jest.fn()
};

// Mock acquireVsCodeApi globally
(global as any).acquireVsCodeApi = jest.fn(() => mockVscode);

// Export mockVscode for tests to access
export { mockVscode };

/**
 * Enum representing the different pages within the application.
 */
export enum Pages {
  home = "Home",
  orgManager = "Org Manager",
  repoConfig = "Project Configuration",
  metadataExplorer = "Metadata Explorer",
  pipeline = "Pipeline"
}

/**
 * Interface representing the result of a command execution.
 */
export interface ExecuteResult {
  command: string;
  stdout?: string;
  stderr?: string;
  elementId?: string;
  requestId?: string;
  errorCode?: number;
}

/**
 * The main application component. Manages the application state and handles
 * communication with the VS Code extension.
 */
export default class App extends LightningElement {
  private static instance?: App;
  private static vscode = (global as any).acquireVsCodeApi();
  currentPage = Pages.home;
  config: any;
  private static pendingResolvers: Map<
    string,
    (result: ExecuteResult) => void
  > = new Map();

  /**
   * Constructor for the App component. Sets the singleton instance.
   */
  constructor() {
    super();
    App.instance = this;
    this.config = window.vsCodeConfig || {};
  }

  /**
   * Retrieves the singleton instance of the App component.
   * @returns The singleton instance.
   */
  static getInstance(): App {
    if (!App.instance) {
      App.instance = new App();
    }
    return App.instance;
  }

  /**
   * Gets the current configuration values.
   * @returns The configuration object.
   */
  static getConfig(): any {
    return App.getInstance().config;
  }

  /**
   * Checks if debug mode is enabled.
   * @returns True if debug mode is enabled, false otherwise.
   */
  static isDebugMode(): boolean {
    return !!App.getConfig().debugMode;
  }

  /**
   * Executes a command and returns a promise that resolves with the result.
   * @param command The command to execute.
   * @param elementId The ID of the element that initiated the command.
   * @returns A promise that resolves with the command execution result.
   */
  static async executeCommand(command: string): Promise<ExecuteResult> {
    const requestId = "test-uuid-123"; // Mock UUID for testing

    // Post message to VS Code
    App.vscode.postMessage({
      command,
      requestId
    });

    // Log in debug mode
    if (App.isDebugMode()) {
      console.log(
        `[DEBUG] Sending command: ${command}, requestId: ${requestId}`
      );
    }

    // Create a promise that will be resolved when handleCommandResult is called
    return new Promise<ExecuteResult>((resolve) => {
      App.pendingResolvers.set(requestId, resolve);
    });
  }

  /**
   * Sends a message to the VS Code extension without expecting a response.
   * @param message The message to send.
   */
  static sendMessage(message: any): void {
    App.vscode.postMessage(message);

    if (App.isDebugMode()) {
      console.log(`[DEBUG] Sending message:`, message);
    }
  }

  /**
   * Handles command results received from the VS Code extension.
   * Dispatches the result to the appropriate resolver based on the requestId.
   * @param result The command execution result.
   */
  static handleCommandResult(result: ExecuteResult) {
    // Try to resolve a pending promise first
    if (result.requestId && App.pendingResolvers.has(result.requestId)) {
      App.pendingResolvers.get(result.requestId)!(result);
      App.pendingResolvers.delete(result.requestId);
    }

    // Log in debug mode
    if (App.isDebugMode()) {
      console.log("[DEBUG] Command result:", result);
    }
  }

  /**
   * Handles page navigation events.
   * Updates the current page based on the event detail.
   * @param event The page navigation event.
   */
  handlePageNavigation(event: CustomEvent) {
    this.currentPage = event.detail;
  }

  /**
   * Getter to determine if the Home page should be displayed.
   * @returns True if the current page is Home, false otherwise.
   */
  get showHome() {
    return this.currentPage === Pages.home;
  }

  /**
   * Getter to determine if the Metadata Explorer page should be displayed.
   * @returns True if the current page is Metadata Explorer, false otherwise.
   */
  get showMetadataExplorer() {
    return this.currentPage === Pages.metadataExplorer;
  }

  /**
   * Getter to determine if the Repo Config page should be displayed.
   * @returns True if the current page is Repo Config, false otherwise.
   */
  get showRepoConfig() {
    return this.currentPage === Pages.repoConfig;
  }

  get showPipeline() {
    return this.currentPage === Pages.pipeline;
  }

  get showOrgManager() {
    return this.currentPage === Pages.orgManager;
  }
}
