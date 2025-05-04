/**
 * This module defines the main application component and related types.
 * It manages the application state, including the current page,
 * and handles communication with the VS Code extension through message passing.
 * It also provides a mechanism for dispatching command execution results
 * to the appropriate child components.
 */

import { LightningElement, track } from "lwc";
import CLIElement from "../cliElement/cliElement";
import { v4 as uuidv4 } from "uuid";

declare global {
  interface Window {
    vsCodeConfig: any;
    extensionPath: string;
  }
}

/**
 * Enum representing the different pages within the application.
 */
export enum Pages {
  home = "Home",
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
  private static vscode = eval("acquireVsCodeApi()");
  @track currentPage = Pages.home;
  @track config: any;
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
    const requestId = uuidv4();

    return new Promise<ExecuteResult>((resolve) => {
      App.pendingResolvers.set(requestId, resolve);
      App.vscode.postMessage({ command, requestId });

      // Log in debug mode
      if (App.isDebugMode()) {
        console.log(
          `[DEBUG] Sending command: ${command}, requestId: ${requestId}`
        );
      }
    });
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
}
