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

import type { VersionControlSystem } from "../../../types/version-control";
import type { ExecuteResult } from "../app/app";
import { GitHubVersionControlSystem } from "./github-vcs";

export type SupportedVCS = "GitHub" | "GitLab" | "Azure DevOps" | "Bitbucket";

export class VersionControlSystemFactory {
  private static readonly SUPPORTED_SYSTEMS: SupportedVCS[] = [
    "GitHub",
    "GitLab",
    "Azure DevOps",
    "Bitbucket"
  ];

  /**
   * Creates an instance of the appropriate version control system
   * @param vcsType The type of version control system to create
   * @param executeCommand Function to execute CLI commands
   * @returns Instance of the VCS implementation
   * @throws Error if the VCS type is not supported
   */
  static create(
    vcsType: string,
    executeCommand: (command: string) => Promise<ExecuteResult>
  ): VersionControlSystem {
    switch (vcsType) {
      case "GitHub":
        return new GitHubVersionControlSystem(executeCommand);

      case "GitLab":
        // Future implementation
        throw new Error("GitLab support is not yet implemented. Coming soon!");

      case "Azure DevOps":
        // Future implementation
        throw new Error(
          "Azure DevOps support is not yet implemented. Coming soon!"
        );

      case "Bitbucket":
        // Future implementation
        throw new Error(
          "Bitbucket support is not yet implemented. Coming soon!"
        );

      default:
        throw new Error(
          `Unsupported version control system: ${vcsType}. ` +
            `Supported systems are: ${this.SUPPORTED_SYSTEMS.join(", ")}`
        );
    }
  }

  /**
   * Gets the list of supported version control systems
   * @returns Array of supported VCS names
   */
  static getSupportedSystems(): SupportedVCS[] {
    return [...this.SUPPORTED_SYSTEMS];
  }

  /**
   * Checks if a version control system is supported
   * @param vcsType The VCS type to check
   * @returns True if supported, false otherwise
   */
  static isSupported(vcsType: string): vcsType is SupportedVCS {
    return this.SUPPORTED_SYSTEMS.includes(vcsType as SupportedVCS);
  }

  /**
   * Gets the list of fully implemented version control systems
   * @returns Array of implemented VCS names
   */
  static getImplementedSystems(): SupportedVCS[] {
    return ["GitHub"]; // Only GitHub is currently implemented
  }

  /**
   * Checks if a version control system is fully implemented
   * @param vcsType The VCS type to check
   * @returns True if implemented, false otherwise
   */
  static isImplemented(vcsType: string): boolean {
    return this.getImplementedSystems().includes(vcsType as SupportedVCS);
  }
}
