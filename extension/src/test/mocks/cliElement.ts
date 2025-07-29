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
import { ExecuteResult } from "./app";

/**
 * This module defines a base class `CliElement` for Lightning Web Components
 * that interact with a command-line interface (CLI).  It provides a common
 * interface for handling execution results from the CLI. Components extending
 * this class should implement the `handleExecuteResult` method to process
 * the output of CLI commands.
 */

export default class CliElement extends LightningElement {
  /**
   * Executes a command and returns a promise that resolves with the result.
   * @param command The command to execute.
   * @returns A promise that resolves with the command execution result.
   */
  async executeCommand(command: string): Promise<ExecuteResult> {
    return App.executeCommand(command);
  }

  /**
   * Checks if debug mode is enabled in configuration.
   * @returns {boolean} True if debug mode is enabled.
   */
  get isDebugMode(): boolean {
    return App.isDebugMode();
  }

  /**
   * Gets the current configuration settings.
   * @returns {any} The configuration object.
   */
  get config(): any {
    return App.getConfig();
  }
}

// Import App at the end to avoid circular dependency
import App from "./app"; 