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

/**
 * This component serves as the home page of the application.  It performs
 * initial checks to verify that the necessary prerequisites (Git, Salesforce CLI,
 * and a Git repository) are met before the user can proceed with other functionalities.
 * It displays loading indicators and error messages as appropriate.
 */
import CLIElement from "../cliElement/cliElement";
import { ExecuteResult } from "../app/app";

/**
 * Error messages displayed to the user if prerequisites are not met.
 */
const ERROR_MESSAGES = {
  gitNotInstalled: "Git is not installed on this machine",
  notInGitDirectory: "The current working directory is not a git repository",
  sfCliNotInstalled: "The sf CLI is not installed on this machine"
};

/**
 * CLI commands used to verify prerequisites.
 */
const COMMANDS = {
  verifyGitIsInstalled: "git --version",
  verifySfCliIsInstalled: "sf --version",
  verifyInCurrentGitDir: "git status"
};

/**
 * Enum representing the different stages of the verification process.
 */
enum STAGES {
  git = "git",
  gitDir = "gitDir",
  sfCli = "sfCli",
  complete = "complete"
}

export default class Home extends CLIElement {
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

  private async initializeVerification(): Promise<void> {
    this.showSpinner = true;
    try {
      // Execute commands in parallel
      const [gitResult, sfCliResult] = await Promise.all([
        this.executeCommand(COMMANDS.verifyGitIsInstalled),
        this.executeCommand(COMMANDS.verifySfCliIsInstalled)
      ]);

      // Handle Git installation check
      if (gitResult.stdout) {
        this.gitInstalled = true;
        const gitDirResult = await this.executeCommand(
          COMMANDS.verifyInCurrentGitDir
        );
        this.handleInGitDirResult(gitDirResult);
      } else {
        this.hasError = true;
        this.errorMessage = ERROR_MESSAGES.gitNotInstalled;
      }

      // Handle SF CLI installation check
      if (sfCliResult.stdout) {
        this.sfCliInstalled = true;
      } else {
        this.hasError = true;
        this.errorMessage = ERROR_MESSAGES.sfCliNotInstalled;
      }

      // Update verification status
      if (this.gitInstalled && this.sfCliInstalled && this.inGitDir) {
        this.fullyVerified = true;
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = "An error occurred during verification";
      console.error("Verification error:", error);
    } finally {
      this.showSpinner = false;
    }
  }

  /**
   * Handles the result of the Git repository check.
   * @param result The execution result.
   */
  handleInGitDirResult(result: ExecuteResult) {
    if (result.stdout) {
      this.inGitDir = true;
    } else {
      this.hasError = true;
      this.errorMessage = ERROR_MESSAGES.notInGitDirectory;
    }
  }

  /**
   * Getter to determine whether to display the "Checking Git" message.
   * @returns True if Git is being checked and not yet installed, false otherwise.
   */
  get checkingGit() {
    return this.showSpinner && !this.gitInstalled;
  }

  /**
   * Getter to determine whether to display the "Checking Git Directory" message.
   * @returns True if Git is installed and the directory check is in progress, false otherwise.
   */
  get checkingInGitDir() {
    return this.showSpinner && this.gitInstalled && !this.inGitDir;
  }

  /**
   * Getter to determine whether to display the "Checking Salesforce CLI" message.
   * @returns True if Git, Git directory checks are complete, and Salesforce CLI check is in progress, false otherwise.
   */
  get checkingSfCli() {
    return (
      this.showSpinner &&
      this.gitInstalled &&
      this.inGitDir &&
      !this.sfCliInstalled
    );
  }

  /**
   * Determines the current step of the verification process.
   * @returns The current stage of verification.
   */
  get currentStep() {
    if (this.fullyVerified) {
      return STAGES.complete;
    } else if (!this.gitInstalled) {
      return STAGES.git;
    } else if (!this.inGitDir) {
      return STAGES.gitDir;
    } else {
      return STAGES.sfCli;
    }
  }
}
