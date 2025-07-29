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

import CliElement from "./cliElement";

// Error messages that match the actual component
const ERROR_MESSAGES = {
  gitNotInstalled: "Git is not installed on this machine",
  notInGitDirectory: "The current working directory is not a git repository",
  sfCliNotInstalled: "The sf CLI is not installed on this machine"
};

export default class Home extends CliElement {
  showSpinner = false;
  gitInstalled = false;
  sfCliInstalled = false;
  inGitDir = false;
  fullyVerified = false;
  hasError = false;
  errorMessage?: String;

  connectedCallback(): void {
    this.initializeVerification();
  }

  async initializeVerification(): Promise<void> {
    this.showSpinner = true;
    this.hasError = false;
    this.errorMessage = undefined;

    try {
      let gitResult, sfCliResult;
      try {
        [gitResult, sfCliResult] = await Promise.all([
          this.executeCommand("git --version"),
          this.executeCommand("sf --version")
        ]);
      } catch (e) {
        if (!this.hasError) {
          this.hasError = true;
          this.errorMessage = "An error occurred during verification";
        }
        this.showSpinner = false;
        return;
      }

      // Handle Git installation check
      if (gitResult && gitResult.stdout) {
        this.gitInstalled = true;
        const gitDirResult = await this.executeCommand("git status");
        this.handleInGitDirResult(gitDirResult);
      } else {
        this.gitInstalled = false;
        this.hasError = true;
        this.errorMessage = ERROR_MESSAGES.gitNotInstalled;
      }

      // Handle SF CLI installation check
      if (sfCliResult && sfCliResult.stdout) {
        this.sfCliInstalled = true;
      } else {
        this.sfCliInstalled = false;
        this.hasError = true;
        this.errorMessage = ERROR_MESSAGES.sfCliNotInstalled;
      }

      // Update verification status
      if (this.gitInstalled && this.sfCliInstalled && this.inGitDir) {
        this.fullyVerified = true;
      }
    } catch (error) {
      if (!this.hasError) {
        this.hasError = true;
        this.errorMessage = "An error occurred during verification";
      }
    } finally {
      this.showSpinner = false;
    }
  }

  handleInGitDirResult(result: any): void {
    if (result.stdout) {
      this.inGitDir = true;
      this.hasError = false;
    } else {
      this.inGitDir = false;
      this.hasError = true;
      this.errorMessage = ERROR_MESSAGES.notInGitDirectory;
    }
  }

  // Mock executeCommand method for testing
  executeCommand = jest.fn();

  get checkingGit() {
    return this.showSpinner && !this.gitInstalled;
  }

  get checkingInGitDir() {
    return this.showSpinner && this.gitInstalled && !this.inGitDir;
  }

  get checkingSfCli() {
    return (
      this.showSpinner &&
      this.gitInstalled &&
      this.inGitDir &&
      !this.sfCliInstalled
    );
  }

  get currentStep() {
    if (this.fullyVerified) {
      return "complete";
    } else if (!this.gitInstalled) {
      return "git";
    } else if (!this.inGitDir) {
      return "gitDir";
    } else {
      return "sfCli";
    }
  }
} 