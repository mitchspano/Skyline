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
 * Resolves Salesforce metadata items to their owning package/namespace.
 *
 * Uses data from three Tooling API sources:
 *  - InstalledSubscriberPackage: identifies managed packages and their namespaces
 *  - Package2: identifies 2GP packages (managed + unlocked)
 *  - Package2Member: maps individual components to a specific Package2
 *
 * The resolver builds a PackageIndex lookup structure and provides pure
 * functions to classify MetadataItem and FolderBasedMetadataItem records.
 */

import {
  MetadataItem,
  FolderBasedMetadataItem,
  InstalledSubscriberPackageRecord,
  Package2Record,
  Package2MemberRecord
} from "./sfCli";

export type PackageType = "managed" | "unlocked" | "unpackaged";

/** Represents a single installed or developed package. */
export interface PackageInfo {
  id: string;
  name: string;
  namespacePrefix: string;
  type: PackageType;
}

/** Lookup structure built from Tooling API queries. */
export interface PackageIndex {
  orgNamespace: string;
  /** namespace -> PackageInfo[] (1GP = single entry, 2GP may have multiple) */
  packagesByNamespace: Map<string, PackageInfo[]>;
  /** component 18-char Id -> PackageInfo (from Package2Member, when available) */
  componentToPackage: Map<string, PackageInfo>;
  /** All known namespace prefixes from installed packages (for fast lookup) */
  knownNamespaces: Set<string>;
}

/** Result of classifying a single metadata item. */
export interface ClassifiedItem {
  namespaceKey: string;
  packageKey: string;
  packageType: PackageType;
}

export const LOCAL_NAMESPACE_LABEL = "(local)";
export const UNPACKAGED_LABEL = "Unpackaged";
const UNKNOWN_MANAGED_LABEL = "Unknown Managed";

/** Extension of FolderBasedMetadataItem that may carry ManageableState. */
interface FolderBasedMetadataItemWithState extends FolderBasedMetadataItem {
  ManageableState?: string;
}

/**
 * Extracts a namespace prefix from a metadata fullName.
 *
 * Many metadata types embed the namespace as a `ns__` prefix
 * (e.g. `nCino__MyObject__c`, `nCino__MyClass`). This function
 * checks the fullName against a set of known namespaces and returns
 * the first match, or undefined if no namespace is found.
 */
export function extractNamespaceFromFullName(
  fullName: string,
  knownNamespaces: Set<string>
): string | undefined {
  const separatorIndex = fullName.indexOf("__");
  if (separatorIndex <= 0) {
    return undefined;
  }
  const candidate = fullName.substring(0, separatorIndex);
  if (knownNamespaces.has(candidate)) {
    return candidate;
  }
  return undefined;
}

/**
 * Builds a PackageIndex from Tooling API query results.
 *
 * @param installedPkgs Records from InstalledSubscriberPackage query.
 * @param package2s Records from Package2 query (may be empty if query failed).
 * @param package2Members Records from Package2Member query (may be empty).
 * @param orgNamespace The organization's own namespace from describeMetadata.
 */
export function buildPackageIndex(
  installedPkgs: InstalledSubscriberPackageRecord[],
  package2s: Package2Record[],
  package2Members: Package2MemberRecord[],
  orgNamespace: string
): PackageIndex {
  const packagesByNamespace = new Map<string, PackageInfo[]>();
  const knownNamespaces = new Set<string>();

  for (const pkg of installedPkgs) {
    const ns = pkg.SubscriberPackage.NamespacePrefix || "";
    if (ns) {
      knownNamespaces.add(ns);
    }
    const info: PackageInfo = {
      id: pkg.Id,
      name: pkg.SubscriberPackage.Name,
      namespacePrefix: ns,
      type: ns ? "managed" : "unlocked"
    };
    const existing = packagesByNamespace.get(ns);
    if (existing) {
      existing.push(info);
    } else {
      packagesByNamespace.set(ns, [info]);
    }
  }

  const package2ById = new Map<string, Package2Record>();
  for (const p2 of package2s) {
    package2ById.set(p2.Id, p2);
    const ns = p2.NamespacePrefix || "";
    if (ns) {
      knownNamespaces.add(ns);
    }
    const containerType = (p2.ContainerOptions || "").toLowerCase();
    const pkgType: PackageType =
      containerType === "managed" ? "managed" : "unlocked";
    const info: PackageInfo = {
      id: p2.Id,
      name: p2.Name,
      namespacePrefix: ns,
      type: pkgType
    };
    const existing = packagesByNamespace.get(ns);
    if (existing) {
      const alreadyPresent = existing.some((e) => e.id === info.id);
      if (!alreadyPresent) {
        existing.push(info);
      }
    } else {
      packagesByNamespace.set(ns, [info]);
    }
  }

  const versionToPackage2 = new Map<string, Package2Record>();
  for (const p2 of package2s) {
    versionToPackage2.set(p2.Id, p2);
  }

  const componentToPackage = new Map<string, PackageInfo>();
  for (const member of package2Members) {
    const p2 = package2ById.get(member.Package2Id);
    if (!p2) {
      continue;
    }
    const containerType = (p2.ContainerOptions || "").toLowerCase();
    const pkgType: PackageType =
      containerType === "managed" ? "managed" : "unlocked";
    componentToPackage.set(member.SubjectId, {
      id: p2.Id,
      name: p2.Name,
      namespacePrefix: p2.NamespacePrefix || "",
      type: pkgType
    });
  }

  return {
    orgNamespace: orgNamespace || "",
    packagesByNamespace,
    componentToPackage,
    knownNamespaces
  };
}

/**
 * States that indicate a component was installed from a package
 * (managed or unlocked). "installed" = locked managed, "installedEditable" =
 * editable (unlocked packages, or managed-beta in the subscriber org).
 */
const INSTALLED_STATES = new Set(["installed", "installededitable"]);

/**
 * Classifies a MetadataItem into a namespace/package group.
 */
export function classifyMetadataItem(
  item: MetadataItem,
  index: PackageIndex
): ClassifiedItem {
  // 1. Exact component-to-package mapping (from Package2Member)
  if (index.componentToPackage.size > 0 && item.id) {
    const pkg = index.componentToPackage.get(item.id);
    if (pkg) {
      return {
        namespaceKey: pkg.namespacePrefix || localLabel(index),
        packageKey: pkg.name,
        packageType: pkg.type
      };
    }
  }

  const state = (item.manageableState || "").toLowerCase();

  // 2. Component was installed from a package
  if (INSTALLED_STATES.has(state)) {
    const ns = extractNamespaceFromFullName(
      item.fullName,
      index.knownNamespaces
    );
    if (ns) {
      const packages = index.packagesByNamespace.get(ns);
      if (packages && packages.length === 1) {
        return {
          namespaceKey: ns,
          packageKey: packages[0].name,
          packageType: packages[0].type
        };
      }
      if (packages && packages.length > 1) {
        return {
          namespaceKey: ns,
          packageKey: ns,
          packageType: "managed"
        };
      }
      return {
        namespaceKey: ns,
        packageKey: ns,
        packageType: "managed"
      };
    }

    // No namespace in fullName — try packages registered with empty namespace
    return resolveNoNamespaceInstalledItem(index);
  }

  // 3. Default: unpackaged / local component
  return {
    namespaceKey: localLabel(index),
    packageKey: UNPACKAGED_LABEL,
    packageType: "unpackaged"
  };
}

/**
 * Resolves an installed component that has no namespace prefix.
 * Checks for packages registered under the empty-string namespace key
 * (typically unlocked packages without a namespace).
 */
function resolveNoNamespaceInstalledItem(index: PackageIndex): ClassifiedItem {
  const noNsPackages = index.packagesByNamespace.get("");
  if (noNsPackages && noNsPackages.length === 1) {
    return {
      namespaceKey: localLabel(index),
      packageKey: noNsPackages[0].name,
      packageType: noNsPackages[0].type
    };
  }
  if (noNsPackages && noNsPackages.length > 1) {
    // Multiple namespace-less packages — group generically since we
    // cannot determine which package owns this component without
    // Package2Member data.
    return {
      namespaceKey: localLabel(index),
      packageKey: UNKNOWN_MANAGED_LABEL,
      packageType: "unlocked"
    };
  }
  return {
    namespaceKey: UNKNOWN_MANAGED_LABEL,
    packageKey: UNKNOWN_MANAGED_LABEL,
    packageType: "managed"
  };
}

/**
 * Classifies a FolderBasedMetadataItem using its NamespacePrefix field.
 */
export function classifyFolderBasedItem(
  item: FolderBasedMetadataItem,
  index: PackageIndex
): ClassifiedItem {
  const ns = item.NamespacePrefix || "";

  if (ns && index.knownNamespaces.has(ns)) {
    const packages = index.packagesByNamespace.get(ns);
    if (packages && packages.length === 1) {
      return {
        namespaceKey: ns,
        packageKey: packages[0].name,
        packageType: packages[0].type
      };
    }
    if (packages && packages.length > 1) {
      return {
        namespaceKey: ns,
        packageKey: ns,
        packageType: "managed"
      };
    }
    return {
      namespaceKey: ns,
      packageKey: ns,
      packageType: "managed"
    };
  }

  if (ns && ns !== "") {
    return {
      namespaceKey: ns,
      packageKey: ns,
      packageType: "managed"
    };
  }

  // No namespace — check manageableState for installed status
  const state = (
    (item as FolderBasedMetadataItemWithState).ManageableState || ""
  ).toLowerCase();
  if (INSTALLED_STATES.has(state)) {
    return resolveNoNamespaceInstalledItem(index);
  }

  return {
    namespaceKey: localLabel(index),
    packageKey: UNPACKAGED_LABEL,
    packageType: "unpackaged"
  };
}

/**
 * Returns the display label for the local/org namespace.
 */
function localLabel(index: PackageIndex): string {
  return index.orgNamespace || LOCAL_NAMESPACE_LABEL;
}

/**
 * Creates an empty PackageIndex (used as fallback when discovery fails).
 */
export function createEmptyPackageIndex(orgNamespace: string): PackageIndex {
  return {
    orgNamespace: orgNamespace || "",
    packagesByNamespace: new Map(),
    componentToPackage: new Map(),
    knownNamespaces: new Set()
  };
}
