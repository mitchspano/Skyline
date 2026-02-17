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

import MetadataExplorer from "../../modules/s/metadataExplorer/metadataExplorer";
import { ExecuteResult } from "../../modules/s/app/app";

// Mock the CLIElement parent class
jest.mock("../../modules/s/cliElement/cliElement", () => {
  return jest.fn().mockImplementation(() => ({
    executeCommand: jest.fn(),
    isDebugMode: false
  }));
});

// Mock the Toast component
jest.mock("lightning-base-components/src/lightning/toast/toast.js", () => ({
  show: jest.fn()
}));

// Mock the sfCli module
jest.mock("../../modules/s/metadataExplorer/sfCli", () => ({
  COMMANDS: {
    orgDisplay: "sf org display --json",
    listMetadataTypes: "sf org list metadata-types --json",
    listMetadataOfType: jest.fn(
      (type: string) => `sf org list metadata --metadata-type ${type} --json`
    ),
    queryFieldDefinitions: jest.fn(
      (sObjectNames: string[]) =>
        `sf data query --query "SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN (${sObjectNames.join(",")})" --json`
    ),
    retrieveMetadata: jest.fn(
      (metadataItems: string[]) =>
        `sf project retrieve start --metadata ${metadataItems.join(",")} --json`
    ),
    queryFolderBasedMetadata: jest.fn((type: string) => {
      switch (type) {
        case "EmailTemplate":
          return `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName, Folder.NamespacePrefix, FolderId FROM EmailTemplate" --json`;
        case "Report":
          return `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, FolderName, OwnerId FROM Report ORDER BY Name" --json`;
        case "Dashboard":
          return `sf data query --query "SELECT Id, Title, DeveloperName, NamespacePrefix, LastModifiedDate, FolderName, FolderId FROM Dashboard ORDER BY Title" --json`;
        case "Document":
          return `sf data query --query "SELECT Id, Name, DeveloperName, NamespacePrefix, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName, FolderId FROM Document ORDER BY Name" --json`;
        default:
          throw new Error(`Unsupported folder-based metadata type: ${type}`);
      }
    }),
    queryInstalledPackages:
      'sf data query --use-tooling-api --query "SELECT Id, SubscriberPackageId, SubscriberPackage.NamespacePrefix, SubscriberPackage.Name FROM InstalledSubscriberPackage ORDER BY SubscriberPackage.NamespacePrefix" --json',
    queryPackage2:
      'sf data query --use-tooling-api --query "SELECT Id, Name, NamespacePrefix, ContainerOptions FROM Package2 ORDER BY NamespacePrefix" --json',
    queryPackage2Members:
      'sf data query --use-tooling-api --query "SELECT Id, SubscriberPackageVersionId, SubjectId, SubjectKeyPrefix FROM Package2Member" --json'
  },
  COMMAND_PREFIX: {
    sfOrgListMetadata: "sf org list metadata --metadata-type"
  }
}));

// Mock the table module
jest.mock("../../modules/s/metadataExplorer/table", () => ({
  ICONS: {
    complete: "✅",
    loading: "⏳"
  },
  COLUMNS: [
    { label: "Namespace", fieldName: "namespace", sortable: true },
    { label: "Package Name", fieldName: "packageName", sortable: true },
    { label: "Package Type", fieldName: "packageType", sortable: true },
    { label: "Metadata Type", fieldName: "metadataType", sortable: true },
    { label: "Component Name", fieldName: "componentName", sortable: true },
    { label: "Last Modified", fieldName: "lastModifiedDate", type: "date" }
  ],
  convertMetadataObjectTypeToTableRow: jest.fn((type) => ({
    id: type.xmlName,
    label: type.xmlName,
    metadataType: type.xmlName,
    type: type.xmlName
  })),
  convertMetadataItemToTableRow: jest.fn((item) => ({
    id: item.fullName,
    fullName: item.fullName,
    metadataType: item.type,
    type: item.type,
    lastModifiedDate: item.lastModifiedDate,
    lastModifiedByName: item.lastModifiedByName
  })),
  convertFieldDefinitionRecordToTableRow: jest.fn((sObjectName, field) => ({
    id: `${sObjectName}.${field.QualifiedApiName}`,
    label: field.Label,
    fullName: field.QualifiedApiName,
    metadataType: "StandardField",
    type: "StandardField",
    sObjectApiName: sObjectName
  })),
  createNamespaceRow: jest.fn((nsKey, pkgType) => ({
    id: `ns_${nsKey}`,
    label: nsKey,
    namespace: nsKey,
    packageType: pkgType
  })),
  createPackageRow: jest.fn((nsKey, pkgName, pkgType) => ({
    id: `pkg_${nsKey}_${pkgName}`,
    label: pkgName,
    namespace: nsKey,
    packageName: pkgName,
    packageType: pkgType
  }))
}));

describe("MetadataExplorer Component Tests", () => {
  let metadataExplorer: MetadataExplorer;
  let mockExecuteCommand: jest.MockedFunction<
    (command: string) => Promise<ExecuteResult>
  >;
  let mockRefresh: jest.MockedFunction<() => void>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new instance of MetadataExplorer
    metadataExplorer = new MetadataExplorer();

    // Mock the executeCommand method
    mockExecuteCommand = jest.fn();
    (metadataExplorer as any).executeCommand = mockExecuteCommand;

    // Mock the refresh method
    mockRefresh = jest.fn();
    (metadataExplorer as any).refresh = mockRefresh;
  });

  describe("connectedCallback", () => {
    it("should call initializeMetadataExplorer when connected", () => {
      // Arrange
      const initializeSpy = jest.spyOn(
        metadataExplorer as any,
        "initializeMetadataExplorer"
      );

      // Act
      metadataExplorer.connectedCallback();

      // Assert
      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe("initializeMetadataExplorer", () => {
    it("should handle successful org display and metadata types retrieval", async () => {
      // Arrange
      const orgDisplayResult: ExecuteResult = {
        command: "sf org display --json",
        stdout: JSON.stringify({
          accessToken: "test-token",
          instanceUrl: "https://test.salesforce.com",
          orgId: "test-org-id",
          username: "test@example.com"
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const metadataTypesResult: ExecuteResult = {
        command: "sf org list metadata-types --json",
        stdout: JSON.stringify({
          status: 0,
          result: {
            metadataObjects: [
              {
                xmlName: "CustomObject",
                inFolder: false,
                childXmlNames: ["CustomField"]
              },
              { xmlName: "ApexClass", inFolder: false }
            ]
          }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(orgDisplayResult)
        .mockResolvedValueOnce(metadataTypesResult);

      // Act
      await (metadataExplorer as any).initializeMetadataExplorer();

      // Assert
      expect(metadataExplorer.orgConnectionInfo).toBeDefined();
      expect(metadataExplorer.metadataTypes).toBeDefined();
      expect(
        metadataExplorer.metadataTypes?.result.metadataObjects
      ).toHaveLength(2);
    });

    it("should handle org display error", async () => {
      // Arrange
      const orgDisplayResult: ExecuteResult = {
        command: "sf org display --json",
        stdout: "",
        stderr: "No org found",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      mockExecuteCommand.mockResolvedValue(orgDisplayResult);

      // Act
      await (metadataExplorer as any).initializeMetadataExplorer();

      // Assert
      expect(metadataExplorer.orgConnectionInfo).toBeUndefined();
    });
  });

  describe("handleToggle (load type on expand)", () => {
    beforeEach(() => {
      metadataExplorer.metadataTypes = {
        status: 0,
        result: {
          metadataObjects: [
            {
              xmlName: "CustomObject",
              inFolder: false,
              childXmlNames: ["CustomField"],
              directoryName: "objects",
              metaFile: true,
              suffix: "object"
            },
            {
              xmlName: "ApexClass",
              inFolder: false,
              childXmlNames: [],
              directoryName: "classes",
              metaFile: true,
              suffix: "cls"
            }
          ],
          organizationNamespace: "",
          partialSaveAllowed: false,
          testRequired: false
        },
        warnings: []
      };
    });

    it("should not load again when type is already loaded", async () => {
      metadataExplorer.metadataItemsByType.set("ApexClass", {
        status: 0,
        result: [
          {
            fullName: "TestClass",
            type: "ApexClass",
            fileName: "TestClass.cls",
            id: "id",
            createdById: "",
            createdByName: "",
            createdDate: "",
            lastModifiedById: "",
            lastModifiedByName: "",
            lastModifiedDate: "",
            manageableState: "unmanaged"
          }
        ],
        warnings: []
      });

      await metadataExplorer.handleToggle({
        detail: { name: "ApexClass", isExpanded: true }
      } as CustomEvent);

      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe("handleToggle (expand CustomObject item for fields)", () => {
    beforeEach(() => {
      metadataExplorer.metadataTypes = {
        status: 0,
        result: {
          metadataObjects: [
            {
              xmlName: "CustomObject",
              inFolder: false,
              childXmlNames: ["CustomField"],
              directoryName: "objects",
              metaFile: true,
              suffix: "object"
            }
          ],
          organizationNamespace: "",
          partialSaveAllowed: false,
          testRequired: false
        },
        warnings: []
      };

      metadataExplorer.metadataItemsByType.set("CustomObject", {
        status: 0,
        result: [
          {
            fullName: "TestObject__c",
            type: "CustomObject",
            lastModifiedDate: "2023-01-01",
            createdById: "test-id",
            createdByName: "Test User",
            createdDate: "2023-01-01",
            fileName: "TestObject__c.object",
            id: "test-id",
            lastModifiedById: "test-id",
            lastModifiedByName: "Test User",
            manageableState: "unmanaged"
          }
        ],
        warnings: []
      });
    });

    it("should load field definitions when expanding a CustomObject item", async () => {
      // Arrange
      const fieldQueryResult: ExecuteResult = {
        command:
          "sf data query --query \"SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN ('TestObject__c')\" --json",
        stdout: JSON.stringify({
          status: 0,
          result: {
            records: [
              {
                QualifiedApiName: "Name",
                Label: "Name",
                DataType: "String"
              }
            ]
          }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(fieldQueryResult);

      // Act
      await metadataExplorer.handleToggle({
        detail: { name: "TestObject__c", isExpanded: true }
      } as CustomEvent);

      // Assert
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "sf data query --query \"SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN ('TestObject__c')\" --json"
      );
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should not execute query when expanding non-type, non-SObject row", async () => {
      // TestClass is an item name, not a metadata type; and not in getSObjectApiNames() unless CustomObject is loaded with that item
      await metadataExplorer.handleToggle({
        detail: { name: "TestClass", isExpanded: true }
      } as CustomEvent);

      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it("should not execute query when collapsing", async () => {
      // Act
      await metadataExplorer.handleToggle({
        detail: { name: "TestObject__c", isExpanded: false }
      } as CustomEvent);

      // Assert
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe("handleRetrieveClick", () => {
    beforeEach(() => {
      metadataExplorer.selectedRows = [
        { id: "TestClass", fullName: "TestClass", type: "ApexClass" },
        { id: "TestObject__c", fullName: "TestObject__c", type: "CustomObject" }
      ];
    });

    it("should handle metadata retrieval", async () => {
      // Arrange
      const retrieveResult: ExecuteResult = {
        command:
          "sf project retrieve start --metadata ApexClass:TestClass,CustomObject:TestObject__c --json",
        stdout: JSON.stringify({
          status: 0,
          result: {
            files: [
              {
                filePath: "force-app/main/default/classes/TestClass.cls",
                state: "Created"
              }
            ]
          }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(retrieveResult);

      // Act
      await metadataExplorer.handleRetrieveClick();

      // Assert
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        "sf project retrieve start --metadata ApexClass:TestClass,CustomObject:TestObject__c --json"
      );
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("should not execute retrieval when no rows are selected", async () => {
      // Arrange
      metadataExplorer.selectedRows = [];

      // Act
      await metadataExplorer.handleRetrieveClick();

      // Assert
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe("handleDropdownClick", () => {
    it("should toggle renderDropdownOptions", () => {
      // Arrange
      metadataExplorer.renderDropdownOptions = false;

      // Act
      metadataExplorer.handleDropdownClick({} as CustomEvent);

      // Assert
      expect(metadataExplorer.renderDropdownOptions).toBe(true);

      // Act again
      metadataExplorer.handleDropdownClick({} as CustomEvent);

      // Assert
      expect(metadataExplorer.renderDropdownOptions).toBe(false);
    });
  });

  describe("handleRowSelection", () => {
    it("should update selectedRows", () => {
      // Arrange
      const selectedRows = [{ fullName: "TestClass", type: "ApexClass" }];

      // Act
      metadataExplorer.handleRowSelection({
        detail: { selectedRows }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.selectedRows).toEqual(selectedRows);
    });
  });

  describe("Filter handlers", () => {
    it("should handle component name change", () => {
      // Act
      metadataExplorer.handleComponentNameChange({
        detail: { value: "Test" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.searchTermComponentName).toBe("Test");
    });

    it("should handle user name change", () => {
      // Act
      metadataExplorer.handleUserNameChange({
        detail: { value: "TestUser" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.searchTermUserName).toBe("TestUser");
    });

    it("should handle from date change", () => {
      // Act
      metadataExplorer.handleFromChange({
        detail: { value: "2023-01-01" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.searchTermFrom).toBe("2023-01-01");
    });

    it("should handle to date change", () => {
      // Act
      metadataExplorer.handleToChange({
        detail: { value: "2023-12-31" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.searchTermTo).toBe("2023-12-31");
    });

    it("should handle time zone change", () => {
      // Act
      metadataExplorer.handleTimeZoneChange({
        detail: "America/New_York"
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.selectedTimeZone).toBe("America/New_York");
    });

    it("should handle filter button click", () => {
      // Arrange
      metadataExplorer.filterState = false;
      metadataExplorer.searchTermComponentName = "Test";
      metadataExplorer.searchTermUserName = "User";
      metadataExplorer.searchTermFrom = "2023-01-01";
      metadataExplorer.searchTermTo = "2023-12-31";
      metadataExplorer.selectedTimeZone = "America/New_York";

      // Act
      metadataExplorer.handleFilterButtonClick();

      // Assert
      expect(metadataExplorer.filterState).toBe(true);
      expect(metadataExplorer.searchTermComponentName).toBeUndefined();
      expect(metadataExplorer.searchTermUserName).toBeUndefined();
      expect(metadataExplorer.searchTermFrom).toBeUndefined();
      expect(metadataExplorer.searchTermTo).toBeUndefined();
      expect(metadataExplorer.selectedTimeZone).toBe("America/Los_Angeles");
    });
  });

  describe("Getters", () => {
    describe("selectedMetadataRows", () => {
      it("should return formatted metadata rows", () => {
        // Arrange
        metadataExplorer.selectedRows = [
          { id: "TestClass", fullName: "TestClass", type: "ApexClass" },
          {
            id: "TestObject__c",
            fullName: "TestObject__c",
            type: "CustomObject"
          }
        ];

        // Act & Assert
        expect(metadataExplorer.selectedMetadataRows).toEqual([
          "ApexClass:TestClass",
          "CustomObject:TestObject__c"
        ]);
      });

      it("should filter out rows without fullName", () => {
        // Arrange
        metadataExplorer.selectedRows = [
          { id: "TestClass", fullName: "TestClass", type: "ApexClass" },
          { id: "CustomObject", type: "CustomObject" } // No fullName
        ];

        // Act & Assert
        expect(metadataExplorer.selectedMetadataRows).toEqual([
          "ApexClass:TestClass"
        ]);
      });

      it("should return undefined when no rows are selected", () => {
        // Arrange
        metadataExplorer.selectedRows = undefined;

        // Act & Assert
        expect(metadataExplorer.selectedMetadataRows).toBeUndefined();
      });
    });

    describe("renderRetrieve", () => {
      it("should return true when rows are selected", () => {
        // Arrange
        metadataExplorer.selectedRows = [
          { id: "TestClass", fullName: "TestClass", type: "ApexClass" }
        ];

        // Act & Assert
        expect(metadataExplorer.renderRetrieve).toBe(true);
      });

      it("should return false when no rows are selected", () => {
        // Arrange
        metadataExplorer.selectedRows = [];

        // Act & Assert
        expect(metadataExplorer.renderRetrieve).toBe(false);
      });

      it("should return false when selectedRows is undefined", () => {
        // Arrange
        metadataExplorer.selectedRows = undefined;

        // Act & Assert
        expect(metadataExplorer.renderRetrieve).toBe(false);
      });
    });

    describe("spinnerDisplayText", () => {
      it("should return spinner messages in debug mode", () => {
        // Arrange
        (metadataExplorer as any).isDebugMode = true;
        metadataExplorer.spinnerMessages.add("Command 1");
        metadataExplorer.spinnerMessages.add("Command 2");

        // Act & Assert
        expect(metadataExplorer.spinnerDisplayText).toEqual([
          "Command 1",
          "Command 2"
        ]);
      });

      it("should return empty array when not in debug mode", () => {
        // Arrange
        (metadataExplorer as any).isDebugMode = false;
        metadataExplorer.spinnerMessages.add("Command 1");

        // Act & Assert
        expect(metadataExplorer.spinnerDisplayText).toEqual([]);
      });

      it("should return undefined when no spinner messages", () => {
        // Arrange
        metadataExplorer.spinnerMessages.clear();

        // Act & Assert
        expect(metadataExplorer.spinnerDisplayText).toBeUndefined();
      });
    });

    describe("rows (package-centric view)", () => {
      beforeEach(() => {
        metadataExplorer.metadataTypes = {
          status: 0,
          result: {
            metadataObjects: [
              {
                xmlName: "ApexClass",
                inFolder: false,
                childXmlNames: [],
                directoryName: "classes",
                metaFile: true,
                suffix: "cls"
              },
              {
                xmlName: "CustomObject",
                inFolder: false,
                childXmlNames: ["CustomField"],
                directoryName: "objects",
                metaFile: true,
                suffix: "object"
              }
            ],
            organizationNamespace: "",
            partialSaveAllowed: false,
            testRequired: false
          },
          warnings: []
        };
      });

      it("should return undefined when package discovery is not complete", () => {
        (metadataExplorer as any).packageDiscoveryComplete = false;
        (metadataExplorer as any).packageIndex = undefined;
        metadataExplorer.metadataItemsByType.set("ApexClass", {
          status: 0,
          result: [
            {
              fullName: "MyClass",
              type: "ApexClass",
              fileName: "classes/MyClass.cls",
              id: "001",
              createdById: "",
              createdByName: "",
              createdDate: "",
              lastModifiedById: "",
              lastModifiedByName: "",
              lastModifiedDate: "",
              manageableState: "unmanaged"
            }
          ],
          warnings: []
        });

        const rows = metadataExplorer.rows;
        expect(rows).toBeUndefined();
      });

      it("should produce package-centric tree when package discovery is complete", () => {
        const {
          buildPackageIndex
        } = require("../../modules/s/metadataExplorer/packageResolver");
        (metadataExplorer as any).packageDiscoveryComplete = true;
        (metadataExplorer as any).packageIndex = buildPackageIndex(
          [
            {
              Id: "0A3xx001",
              SubscriberPackageId: "033xx001",
              SubscriberPackage: {
                NamespacePrefix: "CONGA",
                Name: "Conga Composer"
              }
            }
          ],
          [],
          [],
          ""
        );

        metadataExplorer.metadataItemsByType.set("ApexClass", {
          status: 0,
          result: [
            {
              fullName: "MyLocalClass",
              type: "ApexClass",
              fileName: "classes/MyLocalClass.cls",
              id: "001",
              createdById: "",
              createdByName: "",
              createdDate: "",
              lastModifiedById: "",
              lastModifiedByName: "Admin",
              lastModifiedDate: "2025-01-01",
              manageableState: "unmanaged"
            },
            {
              fullName: "CONGA__DocGen",
              type: "ApexClass",
              fileName: "classes/CONGA__DocGen.cls",
              id: "002",
              createdById: "",
              createdByName: "",
              createdDate: "",
              lastModifiedById: "",
              lastModifiedByName: "Conga",
              lastModifiedDate: "2024-06-01",
              manageableState: "installed"
            }
          ],
          warnings: []
        });

        const rows = metadataExplorer.rows;
        expect(rows).toBeDefined();
        expect(rows!.length).toBe(2);

        const localNs = rows!.find((r) => r.id === "ns_(local)");
        expect(localNs).toBeDefined();
        expect(localNs!.namespace).toBe("(local)");

        const congaNs = rows!.find((r) => r.id === "ns_CONGA");
        expect(congaNs).toBeDefined();
        expect(congaNs!.namespace).toBe("CONGA");

        const localPkg = localNs!._children?.[0];
        expect(localPkg).toBeDefined();
        expect(localPkg!.packageName).toBe("");

        const localApex = localPkg!._children?.find(
          (r) => r.metadataType === "ApexClass"
        );
        expect(localApex).toBeDefined();
        expect(localApex!._children).toBeDefined();
        expect(localApex!._children!.length).toBe(1);
        expect(localApex!._children![0].fullName).toBe("MyLocalClass");
        expect(localApex!._children![0].namespace).toBe("(local)");
        expect(localApex!._children![0].packageName).toBe("");
        expect(localApex!._children![0].componentName).toBe("MyLocalClass");

        const congaPkg = congaNs!._children?.[0];
        expect(congaPkg).toBeDefined();
        expect(congaPkg!.packageName).toBe("Conga Composer");

        const congaApex = congaPkg!._children?.find(
          (r) => r.metadataType === "ApexClass"
        );
        expect(congaApex).toBeDefined();
        expect(congaApex!._children).toBeDefined();
        expect(congaApex!._children![0].fullName).toBe("CONGA__DocGen");
      });

      it("should return undefined when no metadata types loaded", () => {
        metadataExplorer.metadataTypes = undefined;
        expect(metadataExplorer.rows).toBeUndefined();
      });
    });
  });

  describe("handleToggle (structural rows)", () => {
    it("should not execute any command for namespace row", async () => {
      await metadataExplorer.handleToggle({
        detail: { name: "ns_(local)", isExpanded: true }
      } as CustomEvent);
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it("should not execute any command for package row", async () => {
      await metadataExplorer.handleToggle({
        detail: { name: "pkg_CONGA_CongaComposer", isExpanded: true }
      } as CustomEvent);
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it("should not execute any command for type-within-package row", async () => {
      await metadataExplorer.handleToggle({
        detail: { name: "type_Local_Unpackaged_ApexClass", isExpanded: true }
      } as CustomEvent);
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe("discoverPackages", () => {
    it("should build packageIndex from Tooling API responses", async () => {
      const installedPkgResponse = JSON.stringify({
        status: 0,
        result: {
          records: [
            {
              Id: "0A3xx001",
              SubscriberPackageId: "033xx001",
              SubscriberPackage: {
                NamespacePrefix: "CONGA",
                Name: "Conga Composer"
              }
            }
          ],
          totalSize: 1,
          done: true
        }
      });

      const pkg2Response = JSON.stringify({
        status: 0,
        result: { records: [], totalSize: 0, done: true }
      });

      mockExecuteCommand
        .mockResolvedValueOnce({
          command: "queryInstalledPackages",
          stdout: installedPkgResponse,
          stderr: "",
          elementId: "test",
          requestId: "test",
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: "queryPackage2",
          stdout: pkg2Response,
          stderr: "",
          elementId: "test",
          requestId: "test",
          errorCode: 0
        });

      await (metadataExplorer as any).discoverPackages("");

      expect((metadataExplorer as any).packageDiscoveryComplete).toBe(true);
      expect((metadataExplorer as any).packageIndex).toBeDefined();
      expect(
        (metadataExplorer as any).packageIndex.knownNamespaces.has("CONGA")
      ).toBe(true);
    });

    it("should handle Tooling API failures gracefully", async () => {
      mockExecuteCommand.mockRejectedValue(
        new Error("Tooling API unavailable")
      );

      await (metadataExplorer as any).discoverPackages("myOrg");

      expect((metadataExplorer as any).packageDiscoveryComplete).toBe(true);
      expect((metadataExplorer as any).packageIndex).toBeDefined();
      expect(
        (metadataExplorer as any).packageIndex.packagesByNamespace.size
      ).toBe(0);
    });

    it("should query Package2Members when any Package2 records exist", async () => {
      const installedPkgResponse = JSON.stringify({
        status: 0,
        result: { records: [], totalSize: 0, done: true }
      });

      const pkg2Response = JSON.stringify({
        status: 0,
        result: {
          records: [
            {
              Id: "0Ho001",
              Name: "My Unlocked Pkg",
              NamespacePrefix: "",
              ContainerOptions: "Unlocked"
            }
          ],
          totalSize: 1,
          done: true
        }
      });

      const membersResponse = JSON.stringify({
        status: 0,
        result: {
          records: [
            {
              Id: "0Mexx0000001",
              Package2Id: "0Ho001",
              SubjectId: "01pxx0000099",
              SubjectKeyPrefix: "01p"
            }
          ],
          totalSize: 1,
          done: true
        }
      });

      mockExecuteCommand
        .mockResolvedValueOnce({
          command: "queryInstalledPackages",
          stdout: installedPkgResponse,
          stderr: "",
          elementId: "test",
          requestId: "test",
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: "queryPackage2",
          stdout: pkg2Response,
          stderr: "",
          elementId: "test",
          requestId: "test",
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: "queryPackage2Members",
          stdout: membersResponse,
          stderr: "",
          elementId: "test",
          requestId: "test",
          errorCode: 0
        });

      await (metadataExplorer as any).discoverPackages("");

      expect(mockExecuteCommand).toHaveBeenCalledTimes(3);
      expect((metadataExplorer as any).packageDiscoveryComplete).toBe(true);
      const pkgIndex = (metadataExplorer as any).packageIndex;
      const emptyNsPackages = pkgIndex.packagesByNamespace.get("");
      expect(emptyNsPackages).toBeDefined();
      expect(emptyNsPackages.length).toBe(1);
      expect(emptyNsPackages[0].name).toBe("My Unlocked Pkg");
      expect(pkgIndex.componentToPackage.get("01pxx0000099")).toBeDefined();
      expect(pkgIndex.componentToPackage.get("01pxx0000099").name).toBe(
        "My Unlocked Pkg"
      );
    });
  });
});
