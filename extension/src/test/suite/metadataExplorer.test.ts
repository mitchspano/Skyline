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
    listMetadataOfType: jest.fn((type: string) => `sf org list metadata --metadata-type ${type} --json`),
    queryFieldDefinitions: jest.fn((sObjectNames: string[]) => `sf data query --query "SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN (${sObjectNames.join(',')})" --json`),
    retrieveMetadata: jest.fn((metadataItems: string[]) => `sf project retrieve start --metadata ${metadataItems.join(',')} --json`),
    queryFolderBasedMetadata: jest.fn((type: string) => `sf data query --query "SELECT Id, Name, DeveloperName, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName FROM ${type} ORDER BY Name" --json`)
  },
  COMMAND_PREFIX: {
    sfOrgListMetadata: "sf org list metadata"
  }
}));

// Mock the table module
jest.mock("../../modules/s/metadataExplorer/table", () => ({
  ICONS: {
    complete: "✅",
    loading: "⏳"
  },
  COLUMNS: [
    { label: "Name", fieldName: "fullName", type: "text" },
    { label: "Type", fieldName: "metadataType", type: "text" },
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
  }))
}));

describe("MetadataExplorer Component Tests", () => {
  let metadataExplorer: MetadataExplorer;
  let mockExecuteCommand: jest.MockedFunction<(command: string) => Promise<ExecuteResult>>;
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
      const initializeSpy = jest.spyOn(metadataExplorer as any, 'initializeMetadataExplorer');
      
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
              { xmlName: "CustomObject", inFolder: false, childXmlNames: ["CustomField"] },
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
      expect(metadataExplorer.metadataTypes?.result.metadataObjects).toHaveLength(2);
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

  describe("handleMetadataTypeSelection", () => {
    beforeEach(() => {
      // Setup metadata types
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

    it("should handle standard metadata type selection", async () => {
      // Arrange
      const metadataResult: ExecuteResult = {
        command: "sf org list metadata --metadata-type ApexClass --json",
        stdout: JSON.stringify({
          status: 0,
          result: [
            { fullName: "TestClass", type: "ApexClass", lastModifiedDate: "2023-01-01" }
          ]
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(metadataResult);

      // Act
      await metadataExplorer.handleMetadataTypeSelection({
        detail: { value: "ApexClass" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.selectedMetadataType?.xmlName).toBe("ApexClass");
      expect(metadataExplorer.metadataItemsByType.get("ApexClass")).toBeDefined();
    });

    it("should handle folder-based metadata type selection", async () => {
      // Arrange
      metadataExplorer.metadataTypes!.result.metadataObjects[0].inFolder = true;
      
      const folderResult: ExecuteResult = {
        command: "sf data query --query \"SELECT Id, Name, DeveloperName, LastModifiedDate, LastModifiedBy.Name, Folder.DeveloperName FROM CustomObject ORDER BY Name\" --json",
        stdout: JSON.stringify({
          status: 0,
          result: {
            records: [
              {
                Id: "test-id",
                Name: "Test Object",
                DeveloperName: "TestObject__c",
                LastModifiedDate: "2023-01-01",
                LastModifiedBy: { Name: "Test User" },
                Folder: { DeveloperName: "Test Folder" }
              }
            ]
          }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand.mockResolvedValue(folderResult);

      // Act
      await metadataExplorer.handleMetadataTypeSelection({
        detail: { value: "CustomObject" }
      } as CustomEvent);

      // Assert
      expect(metadataExplorer.selectedMetadataType?.xmlName).toBe("CustomObject");
      expect(metadataExplorer.folderBasedMetadataItems.get("CustomObject")).toBeDefined();
    });
  });

  describe("handleToggle", () => {
    beforeEach(() => {
      metadataExplorer.selectedMetadataType = {
        xmlName: "CustomObject",
        inFolder: false,
        childXmlNames: ["CustomField"],
        directoryName: "objects",
        metaFile: true,
        suffix: "object"
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

    it("should handle custom object expansion", async () => {
      // Arrange
      const fieldQueryResult: ExecuteResult = {
        command: "sf data query --query \"SELECT QualifiedApiName, Label, DataType FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName IN ('TestObject__c')\" --json",
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

    it("should not execute query for non-custom object types", async () => {
      // Arrange
      metadataExplorer.selectedMetadataType!.xmlName = "ApexClass";

      // Act
      await metadataExplorer.handleToggle({
        detail: { name: "TestClass", isExpanded: true }
      } as CustomEvent);

      // Assert
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
        command: "sf project retrieve start --metadata ApexClass:TestClass,CustomObject:TestObject__c --json",
        stdout: JSON.stringify({
          status: 0,
          result: {
            files: [
              { filePath: "force-app/main/default/classes/TestClass.cls", state: "Created" }
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
      const selectedRows = [
        { fullName: "TestClass", type: "ApexClass" }
      ];

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
          { id: "TestObject__c", fullName: "TestObject__c", type: "CustomObject" }
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
        metadataExplorer.selectedRows = [{ id: "TestClass", fullName: "TestClass", type: "ApexClass" }];

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

    describe("metadataTypeOptions", () => {
      it("should return sorted metadata type options", () => {
        // Arrange
        metadataExplorer.metadataTypes = {
          status: 0,
          result: {
            metadataObjects: [
              { 
                xmlName: "CustomObject",
                directoryName: "objects",
                inFolder: false,
                metaFile: true,
                suffix: "object",
                childXmlNames: []
              },
              { 
                xmlName: "ApexClass",
                directoryName: "classes",
                inFolder: false,
                metaFile: true,
                suffix: "cls",
                childXmlNames: []
              }
            ],
            organizationNamespace: "",
            partialSaveAllowed: false,
            testRequired: false
          },
          warnings: []
        };

        // Act & Assert
        expect(metadataExplorer.metadataTypeOptions).toEqual([
          { label: "ApexClass", value: "ApexClass" },
          { label: "CustomObject", value: "CustomObject" }
        ]);
      });

      it("should return undefined when no metadata types are available", () => {
        // Arrange
        metadataExplorer.metadataTypes = undefined;

        // Act & Assert
        expect(metadataExplorer.metadataTypeOptions).toBeUndefined();
      });
    });

    describe("selectedMetadataTypeValue", () => {
      it("should return the selected metadata type value", () => {
        // Arrange
        metadataExplorer.selectedMetadataType = { 
          xmlName: "CustomObject",
          directoryName: "objects",
          inFolder: false,
          metaFile: true,
          suffix: "object",
          childXmlNames: []
        };

        // Act & Assert
        expect(metadataExplorer.selectedMetadataTypeValue).toBe("CustomObject");
      });

      it("should return undefined when no metadata type is selected", () => {
        // Arrange
        metadataExplorer.selectedMetadataType = undefined;

        // Act & Assert
        expect(metadataExplorer.selectedMetadataTypeValue).toBeUndefined();
      });
    });

    describe("spinnerDisplayText", () => {
      it("should return spinner messages in debug mode", () => {
        // Arrange
        (metadataExplorer as any).isDebugMode = true;
        metadataExplorer.spinnerMessages.add("Command 1");
        metadataExplorer.spinnerMessages.add("Command 2");

        // Act & Assert
        expect(metadataExplorer.spinnerDisplayText).toEqual(["Command 1", "Command 2"]);
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
  });
}); 