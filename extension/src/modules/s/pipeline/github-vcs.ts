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

import type {
  VersionControlSystem,
  ValidationResult,
  PullRequest,
  ChangeRequest
} from "../../../types/version-control";
import type { ExecuteResult } from "../app/app";

const OPEN_PR_STATE = "OPEN";

const GITHUB_COMMANDS = {
  validateCLI: "gh --version",
  validateAuth: "gh auth status",
  searchPullRequests: (searchTerm: string) =>
    `gh pr list --json number,title,body,baseRefName,url,files,createdAt,state,closedAt --search "${searchTerm}" --state all`,
  createPullRequest: (request: ChangeRequest) =>
    `gh pr create --title "${request.title}" --body "${request.body}" --base "${request.baseBranch}" --head "${request.headBranch}"${request.isDraft ? " --draft" : ""}`,
  updatePullRequest: (number: number, title?: string, body?: string) => {
    let command = `gh pr edit ${number}`;
    if (title) command += ` --title "${title}"`;
    if (body) command += ` --body "${body}"`;
    return command;
  },
  closePullRequest: (number: number) => `gh pr close ${number}`
};

export class GitHubVersionControlSystem implements VersionControlSystem {
  private executeCommand: (command: string) => Promise<ExecuteResult>;

  constructor(executeCommand: (command: string) => Promise<ExecuteResult>) {
    this.executeCommand = executeCommand;
  }

  getName(): string {
    return "GitHub";
  }

  async validateCliInstallation(): Promise<ValidationResult> {
    try {
      const result = await this.executeCommand(GITHUB_COMMANDS.validateCLI);
      if (result.errorCode) {
        return {
          isValid: false,
          errorMessage:
            "GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/"
        };
      }
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: "Failed to validate GitHub CLI installation"
      };
    }
  }

  async validateAuthentication(): Promise<ValidationResult> {
    try {
      const result = await this.executeCommand(GITHUB_COMMANDS.validateAuth);
      if (result.errorCode) {
        return {
          isValid: false,
          errorMessage:
            "You are not authenticated with GitHub CLI. Please run 'gh auth login' to authenticate."
        };
      }
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: "Failed to validate GitHub CLI authentication"
      };
    }
  }

  async searchPullRequests(searchTerm: string): Promise<PullRequest[]> {
    try {
      const result = await this.executeCommand(
        GITHUB_COMMANDS.searchPullRequests(searchTerm)
      );

      if (result.errorCode) {
        throw new Error(result.stderr || "Failed to search pull requests");
      }

      if (!result.stdout) {
        return [];
      }

      const pullRequests = JSON.parse(result.stdout);
      return this.sortPullRequests(
        pullRequests.map(this.mapGitHubPullRequest.bind(this))
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error searching GitHub pull requests: ${errorMessage}`);
    }
  }

  async createPullRequest(request: ChangeRequest): Promise<PullRequest> {
    try {
      const result = await this.executeCommand(
        GITHUB_COMMANDS.createPullRequest(request)
      );

      if (result.errorCode) {
        throw new Error(result.stderr || "Failed to create pull request");
      }

      if (!result.stdout) {
        throw new Error("No response received when creating pull request");
      }

      // Parse the created PR from the response
      const createdPR = JSON.parse(result.stdout);
      return this.mapGitHubPullRequest(createdPR);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error creating GitHub pull request: ${errorMessage}`);
    }
  }

  async updatePullRequest(
    number: number,
    updates: Partial<ChangeRequest>
  ): Promise<PullRequest> {
    try {
      const result = await this.executeCommand(
        GITHUB_COMMANDS.updatePullRequest(number, updates.title, updates.body)
      );

      if (result.errorCode) {
        throw new Error(result.stderr || "Failed to update pull request");
      }

      // Get the updated PR details
      const updatedResult = await this.executeCommand(
        `gh pr view ${number} --json number,title,body,baseRefName,url,files,createdAt,state,closedAt`
      );
      if (updatedResult.errorCode || !updatedResult.stdout) {
        throw new Error("Failed to retrieve updated pull request details");
      }
      const updatedPR = JSON.parse(updatedResult.stdout);
      return this.mapGitHubPullRequest(updatedPR);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error updating GitHub pull request: ${errorMessage}`);
    }
  }

  async closePullRequest(number: number): Promise<void> {
    try {
      const result = await this.executeCommand(
        GITHUB_COMMANDS.closePullRequest(number)
      );

      if (result.errorCode) {
        throw new Error(result.stderr || "Failed to close pull request");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Error closing GitHub pull request: ${errorMessage}`);
    }
  }

  private mapGitHubPullRequest(ghPr: any): PullRequest {
    return {
      number: ghPr.number,
      title: ghPr.title,
      body: ghPr.body || "",
      baseRefName: ghPr.baseRefName,
      url: ghPr.url,
      files: ghPr.files || [],
      createdAt: ghPr.createdAt,
      state: ghPr.state,
      closedAt: ghPr.closedAt,
      bodySectionName: `${ghPr.number}_body`,
      filesSectionName: `${ghPr.number}_files`,
      stateBadgeClass:
        ghPr.state === OPEN_PR_STATE
          ? "slds-badge slds-theme_success"
          : "slds-badge"
    };
  }

  private sortPullRequests(pullRequests: PullRequest[]): PullRequest[] {
    return pullRequests.sort((a, b) => {
      // First compare by state
      if (a.state === OPEN_PR_STATE && b.state !== OPEN_PR_STATE) {
        return -1;
      }
      if (a.state !== OPEN_PR_STATE && b.state === OPEN_PR_STATE) {
        return 1;
      }
      // If states are the same, sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
}
