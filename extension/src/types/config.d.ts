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

export interface SalesforceEnvironmentConfig {
  label: string;
  instanceUrl: string;
  consumerKey: string;
  username: string;
  secretNames: {
    keySecret: string;
    certificatePath: string;
  };
  testLevels: {
    presubmit:
      | "NoTestRun"
      | "RunSpecifiedTests"
      | "RunLocalTests"
      | "RunAllTestsInOrg";
    deployment:
      | "NoTestRun"
      | "RunSpecifiedTests"
      | "RunLocalTests"
      | "RunAllTestsInOrg";
  };
}

export interface TicketingSystemConfig {
  system: string;
  customLabel?: string;
  ticketIdRegex: string;
}

export interface SkylineConfig {
  version: string;
  versionControlSystem: string;
  pipelineOrder: string[];
  branches: {
    [branchName: string]: SalesforceEnvironmentConfig;
  };
  ticketing?: TicketingSystemConfig;
}
