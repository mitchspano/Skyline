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
 * This module defines constants and functions related to Salesforce CLI commands
 * used for retrieving and interacting with metadata.  It provides a structured
 * way to generate commands with appropriate flags and parameters, as well as
 * interfaces for the expected JSON responses.
 */

const JSON_FLAG = "--json";

/**
 * Common prefixes for Salesforce CLI commands.  Used to build complete commands.
 */
export const COMMAND_PREFIX = {
  sfOrgDisplay: `sf org display ${JSON_FLAG}`,
  sfOrgListMetadataTypes: `sf org list metadata-types ${JSON_FLAG}`,
  sfOrgListMetadata: `sf org list metadata --metadata-type`,
  sfProjectRetrieveStart: `sf project retrieve start`,
  sfDataQueryFieldDefinitions: `sf data query --query "SELECT QualifiedApiName, LastModifiedDate, LastModifiedBy.Name, Id FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN `,
  sfDataQueryEmailTemplates: `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName, Folder.NamespacePrefix, FolderId FROM EmailTemplate"`,
  sfDataQueryReports: `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, FolderName, OwnerId FROM Report ORDER BY Name"`,
  sfDataQueryDashboards: `sf data query --query "SELECT Id, Title, DeveloperName, NamespacePrefix, LastModifiedDate, FolderName, FolderId FROM Dashboard ORDER BY Title"`,
  sfDataQueryDocuments: `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName, FolderId FROM Document ORDER BY Name"`,
  sfQueryInstalledPackages: `sf data query --use-tooling-api --query "SELECT Id, SubscriberPackageId, SubscriberPackage.NamespacePrefix, SubscriberPackage.Name FROM InstalledSubscriberPackage ORDER BY SubscriberPackage.NamespacePrefix"`,
  sfQueryPackage2: `sf data query --use-tooling-api --query "SELECT Id, Name, NamespacePrefix, ContainerOptions FROM Package2 ORDER BY NamespacePrefix"`,
  sfQueryPackage2Members: `sf data query --use-tooling-api --query "SELECT Id, Package2Id, SubjectId, SubjectKeyPrefix FROM Package2Member"`
};

/**
 * Functions to generate complete Salesforce CLI commands.
 */
export const COMMANDS = {
  /**
   * Command to display current org information.
   */
  orgDisplay: COMMAND_PREFIX.sfOrgDisplay,
  /**
   * Command to list available metadata types.
   */
  listMetadataTypes: COMMAND_PREFIX.sfOrgListMetadataTypes,
  /**
   * Generates a command to list metadata of a specific type.
   * @param selectedMetadataType The API name of the metadata type to list.
   * @returns The CLI command string.
   */
  listMetadataOfType: (selectedMetadataType: string): string =>
    `${COMMAND_PREFIX.sfOrgListMetadata} ${selectedMetadataType} ${JSON_FLAG}`,
  /**
   * Generates a command to retrieve specific metadata components.
   * @param selectedMetadataRows An array of metadata component names, formatted as "type:fullName".
   * @returns The CLI command string.
   */
  retrieveMetadata: (selectedMetadataRows: string[]) => {
    const metadataStatements: string[] = [];
    for (const row of selectedMetadataRows) {
      metadataStatements.push(` --metadata "${row}"`);
    }
    return `${COMMAND_PREFIX.sfProjectRetrieveStart}${metadataStatements.join(
      " "
    )} --ignore-conflicts ${JSON_FLAG}`;
  },
  /**
   * Generates a command to query field definitions for specified SObjects.
   * @param sObjectApiNames Array of SObject API names.
   * @returns The command string.
   */
  queryFieldDefinitions: (sObjectApiNames: string[]) => {
    return `${
      COMMAND_PREFIX.sfDataQueryFieldDefinitions
    } (${sObjectApiNames.join(", ")})" ${JSON_FLAG}`;
  },
  /**
   * Generates a command to query folder-based metadata items.
   * @param metadataType The type of folder-based metadata to query (e.g., 'EmailTemplate')
   * @returns The CLI command string.
   */
  queryFolderBasedMetadata: (metadataType: string): string => {
    switch (metadataType) {
      case "EmailTemplate":
        return `${COMMAND_PREFIX.sfDataQueryEmailTemplates} ${JSON_FLAG}`;
      case "Report":
        return `${COMMAND_PREFIX.sfDataQueryReports} ${JSON_FLAG}`;
      case "Dashboard":
        return `${COMMAND_PREFIX.sfDataQueryDashboards} ${JSON_FLAG}`;
      case "Document":
        return `${COMMAND_PREFIX.sfDataQueryDocuments} ${JSON_FLAG}`;
      default:
        throw new Error(
          `Unsupported folder-based metadata type: ${metadataType}`
        );
    }
  },
  /**
   * Command to query installed managed packages via the Tooling API.
   */
  queryInstalledPackages: `${COMMAND_PREFIX.sfQueryInstalledPackages} ${JSON_FLAG}`,
  /**
   * Command to query Package2 (2GP) records via the Tooling API.
   */
  queryPackage2: `${COMMAND_PREFIX.sfQueryPackage2} ${JSON_FLAG}`,
  /**
   * Command to query Package2Member records via the Tooling API.
   */
  queryPackage2Members: `${COMMAND_PREFIX.sfQueryPackage2Members} ${JSON_FLAG}`
};

/**
 * Represents the connection information for a Salesforce org.
 */
export interface SalesforceConnectionInfo {
  status: number;
  result: {
    id: string;
    devHubId: string;
    apiVersion: string;
    accessToken: string;
    instanceUrl: string;
    username: string;
    clientId: string;
    status: string;
    expirationDate: string;
    createdBy: string;
    edition: string;
    orgName: string;
    createdDate: string;
    signupUsername: string;
    alias: string;
  };
  warnings: string[];
}

/**
 * Represents the response from listing metadata types.
 */
export interface ListMetadataTypesResponse {
  status: number;
  result: MetadataResult;
  warnings: string[];
}

/**
 * Core result of listing metadata types.
 */
interface MetadataResult {
  metadataObjects: MetadataObjectType[];
  organizationNamespace: string;
  partialSaveAllowed: boolean;
  testRequired: boolean;
}

/**
 * Represents a specific metadata type.
 */
export interface MetadataObjectType {
  directoryName: string;
  inFolder: boolean;
  metaFile: boolean;
  suffix: string;
  xmlName: string;
  childXmlNames: string[];
}

/**
 * Represents the response from listing metadata of a specific type.
 */
export interface ListMetadataOfTypeResponse {
  status: number;
  result: MetadataItem[];
  warnings: string[];
}

/**
 * Represents a single metadata item.
 */
export interface MetadataItem {
  createdById: string;
  createdByName: string;
  createdDate: string;
  fileName: string;
  fullName: string;
  id: string;
  lastModifiedById: string;
  lastModifiedByName: string;
  lastModifiedDate: string;
  manageableState: string;
  type: string;
}

/**
 * Represents the response from retrieving metadata.
 */
export interface RetrieveMetadataResponse {
  status: number;
  result: RetrieveMetadataResult;
  warnings: string[];
}

/**
 * The core result of retrieving metadata.
 */
interface RetrieveMetadataResult {
  done: boolean;
  fileProperties: FileProperty[];
  id: string;
  status: string;
  success: boolean;
  messages: any[];
  files: File[];
}

/**
 * Represents the properties of a retrieved file.
 */
interface FileProperty {
  createdById: string;
  createdByName: string;
  createdDate: string;
  fileName: string;
  fullName: string;
  id: string;
  lastModifiedById: string;
  lastModifiedByName: string;
  lastModifiedDate: string;
  manageableState: string;
  type: string;
}

/**
 * Represents a retrieved file.
 */
interface File {
  fullName: string;
  type: string;
  state: string;
  filePath: string;
  error?: string;
  problemType?: string;
}

/**
 * Represents the response from querying field definitions.
 */
export interface FieldDefinitionResponse {
  status: number;
  result: FieldDefinitionResult;
  warnings: any[];
}

/**
 * The core result of querying field definitions.
 */
interface FieldDefinitionResult {
  records: FieldDefinitionRecord[];
  totalSize: number;
  done: boolean;
}

/**
 * Represents attributes of a field definition.
 */
interface FieldDefinitionAttribute {
  type: string;
  url: string;
}

/**
 * Represents a single field definition record.
 */
/* eslint-disable @typescript-eslint/naming-convention */
export interface FieldDefinitionRecord {
  attributes: FieldDefinitionAttribute;
  QualifiedApiName: string;
  LastModifiedDate?: string;
  Id: string;
  LastModifiedBy: User;
}

/**
 * Represents a Salesforce user.
 */
interface User {
  Id?: string;
  Name?: string;
}

/**
 * Normalized representation of a folder-based metadata item.
 * Different types (EmailTemplate, Report, Dashboard, Document) have
 * varying SOQL shapes; they are normalized into this interface in
 * metadataExplorer.ts after the query returns.
 */
export interface FolderBasedMetadataItem {
  Id: string;
  Name: string;
  DeveloperName: string;
  NamespacePrefix?: string;
  LastModifiedDate: string;
  LastModifiedBy: {
    Name: string;
  } | null;
  Folder: {
    DeveloperName: string;
    NamespacePrefix?: string;
  } | null;
  FolderId: string;
}

/**
 * Raw record shape returned by SOQL for a Report.
 */
export interface ReportRecord {
  Id: string;
  Name: string;
  DeveloperName: string;
  NamespacePrefix?: string;
  LastModifiedDate: string;
  LastModifiedBy?: { Name: string } | null;
  FolderName: string;
  OwnerId: string;
}

/**
 * Raw record shape returned by SOQL for a Dashboard.
 * Note: Dashboard uses "Title" for display name, not "Name".
 */
export interface DashboardRecord {
  Id: string;
  Title: string;
  DeveloperName: string;
  NamespacePrefix?: string;
  LastModifiedDate: string;
  FolderName: string;
  FolderId: string;
}

/**
 * Raw record shape returned by SOQL for a Document.
 */
export interface DocumentRecord {
  Id: string;
  Name: string;
  DeveloperName: string;
  NamespacePrefix?: string;
  LastModifiedDate: string;
  LastModifiedBy?: { Name: string } | null;
  Folder: { DeveloperName: string } | null;
  FolderId: string;
}

export interface FolderBasedMetadataResponse {
  status: number;
  result: {
    records: FolderBasedMetadataItem[];
    totalSize: number;
    done: boolean;
  };
  warnings: string[];
}

/**
 * Represents an installed managed package record from the Tooling API.
 */
export interface InstalledSubscriberPackageRecord {
  Id: string;
  SubscriberPackageId: string;
  SubscriberPackage: {
    NamespacePrefix: string;
    Name: string;
  };
}

/**
 * Represents a second-generation package (Package2) record from the Tooling API.
 */
export interface Package2Record {
  Id: string;
  Name: string;
  NamespacePrefix: string;
  ContainerOptions: string;
}

/**
 * Represents a Package2Member record mapping a component to a Package2.
 */
export interface Package2MemberRecord {
  Id: string;
  Package2Id: string;
  SubjectId: string;
  SubjectKeyPrefix: string;
}

/**
 * Generic Tooling API query response shape.
 */
export interface ToolingQueryResponse<T> {
  status: number;
  result: {
    records: T[];
    totalSize: number;
    done: boolean;
  };
  warnings: string[];
}
