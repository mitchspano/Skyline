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

import {
  buildPackageIndex,
  classifyMetadataItem,
  classifyFolderBasedItem,
  extractNamespaceFromFullName,
  createEmptyPackageIndex,
  PackageIndex,
  LOCAL_NAMESPACE_LABEL,
  UNPACKAGED_LABEL
} from "../../modules/s/metadataExplorer/packageResolver";
import {
  InstalledSubscriberPackageRecord,
  Package2Record,
  Package2MemberRecord,
  MetadataItem,
  FolderBasedMetadataItem
} from "../../modules/s/metadataExplorer/sfCli";

function makeMetadataItem(
  overrides: Partial<MetadataItem> & { fullName: string; type: string }
): MetadataItem {
  return {
    createdById: "005xx0000001",
    createdByName: "Test User",
    createdDate: "2025-01-01T00:00:00.000Z",
    fileName: `classes/${overrides.fullName}.cls`,
    id: "00Axx0000001",
    lastModifiedById: "005xx0000001",
    lastModifiedByName: "Test User",
    lastModifiedDate: "2025-01-01T00:00:00.000Z",
    manageableState: "unmanaged",
    ...overrides
  };
}

function makeFolderBasedItem(
  overrides: Partial<FolderBasedMetadataItem> & { Name: string }
): FolderBasedMetadataItem {
  return {
    Id: "00Dxx0000001",
    DeveloperName: overrides.Name.replace(/\s/g, "_"),
    LastModifiedDate: "2025-01-01T00:00:00.000Z",
    LastModifiedBy: { Name: "Test User" },
    Folder: null,
    FolderId: "00lxx0000001",
    ...overrides
  };
}

const CONGA_INSTALLED: InstalledSubscriberPackageRecord = {
  Id: "0A3xx0000001",
  SubscriberPackageId: "033xx0000001",
  SubscriberPackage: { NamespacePrefix: "CONGA", Name: "Conga Composer" }
};

const NCINO_INSTALLED: InstalledSubscriberPackageRecord = {
  Id: "0A3xx0000002",
  SubscriberPackageId: "033xx0000002",
  SubscriberPackage: { NamespacePrefix: "nCino", Name: "nCino Core" }
};

const PKG2_UNLOCKED_A: Package2Record = {
  Id: "0Ho000000001",
  Name: "Trigger Actions Framework",
  NamespacePrefix: "",
  ContainerOptions: "Unlocked"
};

const PKG2_NCINO_A: Package2Record = {
  Id: "0Ho000000002",
  Name: "PackageA",
  NamespacePrefix: "nCino",
  ContainerOptions: "Managed"
};

const PKG2_NCINO_B: Package2Record = {
  Id: "0Ho000000003",
  Name: "PackageB",
  NamespacePrefix: "nCino",
  ContainerOptions: "Managed"
};

describe("packageResolver", () => {
  describe("extractNamespaceFromFullName", () => {
    const namespaces = new Set(["CONGA", "nCino"]);

    it("extracts namespace from fullName with __ separator", () => {
      expect(
        extractNamespaceFromFullName("CONGA__MyObject__c", namespaces)
      ).toBe("CONGA");
    });

    it("returns undefined for fullName without namespace", () => {
      expect(
        extractNamespaceFromFullName("MyClass", namespaces)
      ).toBeUndefined();
    });

    it("returns undefined for fullName with unknown namespace prefix", () => {
      expect(
        extractNamespaceFromFullName("UNKNOWN__MyClass", namespaces)
      ).toBeUndefined();
    });

    it("returns undefined when __ appears after first segment that is not a known namespace", () => {
      expect(
        extractNamespaceFromFullName("Custom__Field__c", namespaces)
      ).toBeUndefined();
    });

    it("correctly extracts known namespace even with multiple __ segments", () => {
      expect(extractNamespaceFromFullName("nCino__Custom__c", namespaces)).toBe(
        "nCino"
      );
    });

    it("returns undefined for empty string", () => {
      expect(extractNamespaceFromFullName("", namespaces)).toBeUndefined();
    });

    it("returns undefined when __ is at the start", () => {
      expect(
        extractNamespaceFromFullName("__Something", namespaces)
      ).toBeUndefined();
    });
  });

  describe("buildPackageIndex", () => {
    it("builds index from installed packages only", () => {
      const index = buildPackageIndex(
        [CONGA_INSTALLED, NCINO_INSTALLED],
        [],
        [],
        ""
      );

      expect(index.knownNamespaces.has("CONGA")).toBe(true);
      expect(index.knownNamespaces.has("nCino")).toBe(true);
      expect(index.packagesByNamespace.get("CONGA")).toHaveLength(1);
      expect(index.packagesByNamespace.get("CONGA")![0].name).toBe(
        "Conga Composer"
      );
      expect(index.packagesByNamespace.get("CONGA")![0].type).toBe("managed");
    });

    it("defaults InstalledSubscriberPackage with no namespace to unlocked type", () => {
      const noNsInstalled: InstalledSubscriberPackageRecord = {
        Id: "0A3xx0000099",
        SubscriberPackageId: "033xx0000099",
        SubscriberPackage: { NamespacePrefix: "", Name: "My Framework" }
      };
      const index = buildPackageIndex([noNsInstalled], [], [], "");
      const noNsPackages = index.packagesByNamespace.get("")!;
      expect(noNsPackages).toHaveLength(1);
      expect(noNsPackages[0].name).toBe("My Framework");
      expect(noNsPackages[0].type).toBe("unlocked");
    });

    it("merges Package2 records with installed packages", () => {
      const index = buildPackageIndex(
        [NCINO_INSTALLED],
        [PKG2_NCINO_A, PKG2_NCINO_B],
        [],
        ""
      );

      const nCinoPackages = index.packagesByNamespace.get("nCino")!;
      expect(nCinoPackages.length).toBeGreaterThanOrEqual(2);
      const names = nCinoPackages.map((p) => p.name);
      expect(names).toContain("PackageA");
      expect(names).toContain("PackageB");
    });

    it("adds unlocked packages without namespace", () => {
      const index = buildPackageIndex([], [PKG2_UNLOCKED_A], [], "myOrg");

      const emptyNsPackages = index.packagesByNamespace.get("")!;
      expect(emptyNsPackages).toHaveLength(1);
      expect(emptyNsPackages[0].name).toBe("Trigger Actions Framework");
      expect(emptyNsPackages[0].type).toBe("unlocked");
    });

    it("builds componentToPackage map from Package2Member records", () => {
      const members: Package2MemberRecord[] = [
        {
          Id: "0Mexx0000001",
          Package2Id: "0Ho000000002",
          SubjectId: "01pxx0000099",
          SubjectKeyPrefix: "01p"
        }
      ];
      const index = buildPackageIndex([], [PKG2_NCINO_A], members, "");

      const pkg = index.componentToPackage.get("01pxx0000099");
      expect(pkg).toBeDefined();
      expect(pkg!.name).toBe("PackageA");
    });

    it("preserves orgNamespace", () => {
      const index = buildPackageIndex([], [], [], "myNs");
      expect(index.orgNamespace).toBe("myNs");
    });

    it("handles empty inputs", () => {
      const index = buildPackageIndex([], [], [], "");
      expect(index.packagesByNamespace.size).toBe(0);
      expect(index.componentToPackage.size).toBe(0);
      expect(index.knownNamespaces.size).toBe(0);
    });

    it("does not duplicate Package2 entries that share id with InstalledSubscriberPackage", () => {
      const installedWithSameNs: InstalledSubscriberPackageRecord = {
        Id: "0A3xx0000010",
        SubscriberPackageId: "033xx0000010",
        SubscriberPackage: { NamespacePrefix: "nCino", Name: "nCino Core" }
      };
      const index = buildPackageIndex(
        [installedWithSameNs],
        [PKG2_NCINO_A],
        [],
        ""
      );

      const nCinoPackages = index.packagesByNamespace.get("nCino")!;
      const ids = nCinoPackages.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("classifyMetadataItem", () => {
    let index: PackageIndex;

    beforeEach(() => {
      index = buildPackageIndex(
        [CONGA_INSTALLED, NCINO_INSTALLED],
        [PKG2_UNLOCKED_A],
        [],
        ""
      );
    });

    it("classifies installed item with known namespace to managed package", () => {
      const item = makeMetadataItem({
        fullName: "CONGA__DocumentGenerator",
        type: "ApexClass",
        manageableState: "installed"
      });
      const result = classifyMetadataItem(item, index);
      expect(result.namespaceKey).toBe("CONGA");
      expect(result.packageKey).toBe("Conga Composer");
      expect(result.packageType).toBe("managed");
    });

    it("classifies installed item with no namespace to namespace-less unlocked package", () => {
      const item = makeMetadataItem({
        fullName: "FinalizerHandler",
        type: "ApexClass",
        manageableState: "installed"
      });
      const result = classifyMetadataItem(item, index);
      expect(result.namespaceKey).toBe("(local)");
      expect(result.packageKey).toBe("Trigger Actions Framework");
      expect(result.packageType).toBe("unlocked");
    });

    it("classifies installedEditable item to namespace-less unlocked package", () => {
      const item = makeMetadataItem({
        fullName: "TriggerAction",
        type: "ApexClass",
        manageableState: "installedEditable"
      });
      const result = classifyMetadataItem(item, index);
      expect(result.namespaceKey).toBe("(local)");
      expect(result.packageKey).toBe("Trigger Actions Framework");
      expect(result.packageType).toBe("unlocked");
    });

    it("classifies installed item with no namespace and no matching package as Unknown Managed", () => {
      const indexNoUnlocked = buildPackageIndex(
        [CONGA_INSTALLED, NCINO_INSTALLED],
        [],
        [],
        ""
      );
      const item = makeMetadataItem({
        fullName: "MysteryClass",
        type: "ApexClass",
        manageableState: "installed"
      });
      const result = classifyMetadataItem(item, indexNoUnlocked);
      expect(result.namespaceKey).toBe("Unknown Managed");
      expect(result.packageType).toBe("managed");
    });

    it("classifies unmanaged item as Unpackaged under (local)", () => {
      const item = makeMetadataItem({
        fullName: "CustomUtility",
        type: "ApexClass",
        manageableState: "unmanaged"
      });
      const result = classifyMetadataItem(item, index);
      expect(result.namespaceKey).toBe("(local)");
      expect(result.packageKey).toBe(UNPACKAGED_LABEL);
      expect(result.packageType).toBe("unpackaged");
    });

    it("uses orgNamespace for local label when set", () => {
      const indexWithNs = buildPackageIndex([], [], [], "myOrgNs");
      const item = makeMetadataItem({
        fullName: "CustomUtility",
        type: "ApexClass",
        manageableState: "unmanaged"
      });
      const result = classifyMetadataItem(item, indexWithNs);
      expect(result.namespaceKey).toBe("myOrgNs");
      expect(result.packageKey).toBe(UNPACKAGED_LABEL);
    });

    it("prefers componentToPackage over namespace extraction", () => {
      const members: Package2MemberRecord[] = [
        {
          Id: "0Mexx0000001",
          Package2Id: "0Ho000000001",
          SubjectId: "COMP_ID_001",
          SubjectKeyPrefix: "01p"
        }
      ];
      const indexWithMembers = buildPackageIndex(
        [],
        [PKG2_UNLOCKED_A],
        members,
        ""
      );
      const item = makeMetadataItem({
        fullName: "MetadataTriggerHandler",
        type: "ApexClass",
        manageableState: "unmanaged",
        id: "COMP_ID_001"
      });
      const result = classifyMetadataItem(item, indexWithMembers);
      expect(result.packageKey).toBe("Trigger Actions Framework");
      expect(result.packageType).toBe("unlocked");
    });

    it("classifies item with empty manageableState as unpackaged", () => {
      const item = makeMetadataItem({
        fullName: "SomeClass",
        type: "ApexClass",
        manageableState: ""
      });
      const result = classifyMetadataItem(item, index);
      expect(result.packageKey).toBe(UNPACKAGED_LABEL);
      expect(result.packageType).toBe("unpackaged");
    });

    it("handles 2GP namespace with multiple packages (no member resolution)", () => {
      const indexMulti = buildPackageIndex(
        [NCINO_INSTALLED],
        [PKG2_NCINO_A, PKG2_NCINO_B],
        [],
        ""
      );
      const item = makeMetadataItem({
        fullName: "nCino__AccountRecalcBatch",
        type: "ApexClass",
        manageableState: "installed"
      });
      const result = classifyMetadataItem(item, indexMulti);
      expect(result.namespaceKey).toBe("nCino");
      expect(result.packageType).toBe("managed");
    });
  });

  describe("classifyFolderBasedItem", () => {
    let index: PackageIndex;

    beforeEach(() => {
      index = buildPackageIndex([CONGA_INSTALLED], [], [], "");
    });

    it("classifies item with known NamespacePrefix as managed", () => {
      const item = makeFolderBasedItem({
        Name: "Conga Template",
        NamespacePrefix: "CONGA"
      });
      const result = classifyFolderBasedItem(item, index);
      expect(result.namespaceKey).toBe("CONGA");
      expect(result.packageKey).toBe("Conga Composer");
      expect(result.packageType).toBe("managed");
    });

    it("classifies item without NamespacePrefix as unpackaged", () => {
      const item = makeFolderBasedItem({
        Name: "My Report"
      });
      const result = classifyFolderBasedItem(item, index);
      expect(result.namespaceKey).toBe("(local)");
      expect(result.packageKey).toBe(UNPACKAGED_LABEL);
      expect(result.packageType).toBe("unpackaged");
    });

    it("classifies item with unknown NamespacePrefix under that namespace", () => {
      const item = makeFolderBasedItem({
        Name: "Unknown Report",
        NamespacePrefix: "UNKNOWN_NS"
      });
      const result = classifyFolderBasedItem(item, index);
      expect(result.namespaceKey).toBe("UNKNOWN_NS");
      expect(result.packageType).toBe("managed");
    });

    it("classifies item with empty NamespacePrefix as unpackaged", () => {
      const item = makeFolderBasedItem({
        Name: "Local Report",
        NamespacePrefix: ""
      });
      const result = classifyFolderBasedItem(item, index);
      expect(result.packageKey).toBe(UNPACKAGED_LABEL);
      expect(result.packageType).toBe("unpackaged");
    });
  });

  describe("createEmptyPackageIndex", () => {
    it("creates an empty index with the given org namespace", () => {
      const index = createEmptyPackageIndex("testNs");
      expect(index.orgNamespace).toBe("testNs");
      expect(index.packagesByNamespace.size).toBe(0);
      expect(index.componentToPackage.size).toBe(0);
      expect(index.knownNamespaces.size).toBe(0);
    });

    it("handles empty org namespace", () => {
      const index = createEmptyPackageIndex("");
      expect(index.orgNamespace).toBe("");
    });
  });
});
