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

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export interface PullRequestFile {
  path: string;
  status: string; // "added", "modified", "removed", etc.
  isAdded: boolean;
  isModified: boolean;
  isRemoved: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  renderedBody?: string;
  baseRefName: string;
  url: string;
  files: PullRequestFile[];
  bodySectionName?: string;
  filesSectionName?: string;
  createdAt: string;
  state: string;
  closedAt?: string;
  stateBadgeClass: string;
}

export interface ChangeRequest {
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  isDraft?: boolean;
}

export interface VersionControlSystem {
  /**
   * Validates that the CLI tool for this VCS is installed on the local machine
   */
  validateCliInstallation(): Promise<ValidationResult>;

  /**
   * Validates that the user is authenticated with the VCS via the CLI
   */
  validateAuthentication(): Promise<ValidationResult>;

  /**
   * Searches for pull requests/merge requests based on search criteria
   */
  searchPullRequests(searchTerm: string): Promise<PullRequest[]>;

  /**
   * Creates a new pull request/merge request
   */
  createPullRequest(request: ChangeRequest): Promise<PullRequest>;

  /**
   * Updates an existing pull request/merge request
   */
  updatePullRequest(number: number, updates: Partial<ChangeRequest>): Promise<PullRequest>;

  /**
   * Closes a pull request/merge request
   */
  closePullRequest(number: number): Promise<void>;

  /**
   * Gets the name of this version control system
   */
  getName(): string;
}
