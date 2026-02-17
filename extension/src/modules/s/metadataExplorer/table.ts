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
 * This module defines constants and types related to displaying metadata
 * in a tabular format, specifically for use with the lightning-tree-grid component.
 * It provides column definitions, icons for status representation, an interface
 * for table rows, and helper functions to convert metadata objects into table rows.
 */

import {
  MetadataObjectType,
  MetadataItem,
  FieldDefinitionRecord
} from "./sfCli";

const DEFAULT_LAST_MODIFIED_DATE = "1970-01-01T00:00:00.000Z";
const DEFAULT_LAST_MODIFIED_BY = "Salesforce";
/**
 * Enum representing icons used to display status in the table.
 */
export enum ICONS {
  loading = "utility:spinner",
  complete = "utility:check",
  empty = "standard:empty"
}

/**
 * Column definitions for the lightning-tree-grid component.  Determines which fields are displayed
 * and how they are formatted.
 */
export const COLUMNS = [
  { label: "Namespace", fieldName: "namespace", sortable: true },
  { label: "Package Name", fieldName: "packageName", sortable: true },
  { label: "Package Type", fieldName: "packageType", sortable: true },
  { label: "Metadata Type", fieldName: "metadataType", sortable: true },
  { label: "Component Name", fieldName: "componentName", sortable: true },
  {
    label: "Last Modified By",
    fieldName: "lastModifiedByName",
    sortable: true
  },
  {
    label: "Last Modified Date",
    fieldName: "lastModifiedDate",
    type: "date",
    typeAttributes: {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    },
    sortable: true
  }
  // {
  //   fieldName: "status",
  //   label: "Status",
  //   cellAttributes: { iconName: { fieldName: "statusIcon" } }
  // }
];

/**
 * Interface representing a row of data in the table. Used to structure
 * metadata for display in the lightning-tree-grid.
 */
export interface TableRow {
  id: string;
  label?: string;
  fullName?: string;
  metadataType?: string;
  namespace?: string;
  packageName?: string;
  packageType?: string;
  componentName?: string;
  lastModifiedByName?: string;
  lastModifiedDate?: string;
  sObjectApiName?: string;
  type?: string;
  _children?: TableRow[];
  statusIcon?: string;
}

/**
 * Converts a MetadataObjectType object to a TableRow for display.
 * @param metadataObjectType The MetadataObjectType object to convert.
 * @returns A TableRow representing the MetadataObjectType.
 */
export function convertMetadataObjectTypeToTableRow(
  metadataObjectType: MetadataObjectType
): TableRow {
  return {
    id: metadataObjectType.xmlName,
    label: metadataObjectType.xmlName,
    metadataType: metadataObjectType.xmlName
  };
}

/**
 * Converts a MetadataItem object to a TableRow for display.
 * @param metadataItem The MetadataItem object to convert.
 * @returns A TableRow representing the MetadataItem.
 */
export function convertMetadataItemToTableRow(
  metadataItem: MetadataItem
): TableRow {
  const sObjectApiName = getObjectNameFromFileName(metadataItem.fileName);
  const displayName = metadataItem.fullName.replace(`${sObjectApiName}.`, "");
  return {
    id: metadataItem.fullName,
    label: displayName,
    fullName: metadataItem.fullName,
    componentName: displayName,
    lastModifiedByName:
      metadataItem.lastModifiedByName ?? DEFAULT_LAST_MODIFIED_BY,
    lastModifiedDate:
      metadataItem.lastModifiedDate ?? DEFAULT_LAST_MODIFIED_DATE,
    sObjectApiName: sObjectApiName,
    type: metadataItem.type
  };
}

/**
 * Converts a FieldDefinitionRecord object to a TableRow for display.
 * @param sObjectApiName The API name of the SObject.
 * @param record The FieldDefinitionRecord object to convert.
 * @returns A TableRow representing the FieldDefinitionRecord.
 */
export function convertFieldDefinitionRecordToTableRow(
  sObjectApiName: string,
  record: FieldDefinitionRecord
): TableRow {
  return {
    id: `${record.Id}.${record.QualifiedApiName}`,
    label: record.QualifiedApiName,
    fullName: `${sObjectApiName}.${record.QualifiedApiName}`,
    componentName: record.QualifiedApiName,
    lastModifiedByName: record.LastModifiedBy?.Name ?? DEFAULT_LAST_MODIFIED_BY,
    lastModifiedDate: record.LastModifiedDate ?? DEFAULT_LAST_MODIFIED_DATE,
    type: "CustomField"
  };
}

/**
 * Creates a TableRow representing a namespace grouping node.
 * @param namespaceKey The namespace identifier (e.g. "nCino", "Local").
 * @param packageType A label describing the package type (e.g. "managed", "unlocked").
 * @returns A TableRow for the namespace node.
 */
export function createNamespaceRow(
  namespaceKey: string,
  pkgType: string
): TableRow {
  return {
    id: `ns_${namespaceKey}`,
    label: namespaceKey,
    namespace: namespaceKey,
    packageType: pkgType
  };
}

/**
 * Creates a TableRow representing a package grouping node.
 * @param namespaceKey The parent namespace identifier.
 * @param packageName The package display name.
 * @param packageType A label describing the package type.
 * @returns A TableRow for the package node.
 */
export function createPackageRow(
  namespaceKey: string,
  packageName: string,
  pkgType: string
): TableRow {
  return {
    id: `pkg_${namespaceKey}_${packageName}`,
    label: packageName,
    namespace: namespaceKey,
    packageName: packageName,
    packageType: pkgType
  };
}

/**
 * Extracts the object name from a file name.
 * @param fileName The file name to extract the object name from.
 * @returns The extracted object name.
 */
function getObjectNameFromFileName(fileName: string): string {
  const firstSlashIndex = fileName.indexOf("/");
  if (firstSlashIndex === -1) {
    return "";
  }
  const firstDotAfterSlashIndex = fileName.indexOf(".", firstSlashIndex + 1);
  if (firstDotAfterSlashIndex === -1) {
    return fileName.substring(firstSlashIndex + 1);
  }
  return fileName.substring(firstSlashIndex + 1, firstDotAfterSlashIndex);
}
