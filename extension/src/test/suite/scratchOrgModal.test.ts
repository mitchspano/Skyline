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

import ScratchOrgModal from "../../modules/s/scratchOrgModal/scratchOrgModal";
import { OrgInfo } from "../../modules/s/orgManager/orgManager";

describe("ScratchOrgModal Component Tests", () => {
  let scratchOrgModal: ScratchOrgModal;
  let mockDispatchEvent: jest.MockedFunction<(event: CustomEvent) => boolean>;

  // Helper function to create mock events
  const createMockEvent = (value: string): Event =>
    ({
      target: { value }
    }) as any;

  const mockDevHubs: OrgInfo[] = [
    {
      alias: "devhub1",
      username: "devhub1@example.com",
      orgId: "00D123",
      instanceUrl: "https://devhub1.salesforce.com",
      accessToken: "mock-token-1",
      loginUrl: "https://login.salesforce.com",
      clientId: "mock-client-id-1",
      isDevHub: true,
      instanceApiVersion: "58.0",
      instanceApiVersionLastRetrieved: "2024-01-01T00:00:00.000Z",
      isDefaultDevHubUsername: false,
      isDefaultUsername: false,
      lastUsed: "2024-01-01T00:00:00.000Z",
      connectedStatus: "Unknown",
      defaultMarker: ""
    },
    {
      alias: "devhub2",
      username: "devhub2@example.com",
      orgId: "00D456",
      instanceUrl: "https://devhub2.salesforce.com",
      accessToken: "mock-token-2",
      loginUrl: "https://login.salesforce.com",
      clientId: "mock-client-id-2",
      isDevHub: true,
      instanceApiVersion: "58.0",
      instanceApiVersionLastRetrieved: "2024-01-01T00:00:00.000Z",
      isDefaultDevHubUsername: false,
      isDefaultUsername: false,
      lastUsed: "2024-01-01T00:00:00.000Z",
      connectedStatus: "Unknown",
      defaultMarker: ""
    }
  ];

  const mockDefinitionFileOptions = [
    "config/project-scratch-def.json",
    "config/dev-scratch-def.json"
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new instance of ScratchOrgModal
    scratchOrgModal = new ScratchOrgModal();

    // Mock the dispatchEvent method
    mockDispatchEvent = jest.fn().mockReturnValue(true);
    scratchOrgModal.dispatchEvent = mockDispatchEvent;

    // Initialize properties manually since @track doesn't work in tests
    scratchOrgModal.devHubs = [...mockDevHubs];
    scratchOrgModal.definitionFileOptions = [...mockDefinitionFileOptions];
    scratchOrgModal.selectedDevHub = "";
    scratchOrgModal.orgAlias = "";
    scratchOrgModal.definitionFile = "";
    scratchOrgModal.days = 7;
    scratchOrgModal.isLoading = false;
    scratchOrgModal.error = null;
  });

  describe("Component Initialization", () => {
    it("should have required properties", () => {
      expect(scratchOrgModal.devHubs).toBeDefined();
      expect(scratchOrgModal.definitionFileOptions).toBeDefined();
      expect(scratchOrgModal.selectedDevHub).toBeDefined();
      expect(scratchOrgModal.orgAlias).toBeDefined();
      expect(scratchOrgModal.definitionFile).toBeDefined();
      expect(scratchOrgModal.days).toBeDefined();
      expect(scratchOrgModal.isLoading).toBeDefined();
      expect(scratchOrgModal.error).toBeDefined();
    });

    it("should have required methods", () => {
      expect(typeof scratchOrgModal.handleDevHubChange).toBe("function");
      expect(typeof scratchOrgModal.handleAliasChange).toBe("function");
      expect(typeof scratchOrgModal.handleDefinitionFileChange).toBe(
        "function"
      );
      expect(typeof scratchOrgModal.handleDaysChange).toBe("function");
      expect(typeof scratchOrgModal.handleCancel).toBe("function");
      expect(typeof scratchOrgModal.handleSubmit).toBe("function");
      expect(typeof scratchOrgModal.connectedCallback).toBe("function");
    });
  });

  describe("Computed Properties", () => {
    describe("hasDevHubs", () => {
      it("should return true when devHubs array has items", () => {
        scratchOrgModal.devHubs = mockDevHubs;
        expect(scratchOrgModal.hasDevHubs).toBe(true);
      });

      it("should return false when devHubs array is empty", () => {
        scratchOrgModal.devHubs = [];
        expect(scratchOrgModal.hasDevHubs).toBe(false);
      });
    });

    describe("devHubOptions", () => {
      it("should return formatted options from devHubs", () => {
        scratchOrgModal.devHubs = mockDevHubs;
        const options = scratchOrgModal.devHubOptions;

        expect(options).toHaveLength(2);
        expect(options[0]).toEqual({
          label: "devhub1 (devhub1@example.com)",
          value: "devhub1"
        });
        expect(options[1]).toEqual({
          label: "devhub2 (devhub2@example.com)",
          value: "devhub2"
        });
      });

      it("should return empty array when no devHubs", () => {
        scratchOrgModal.devHubs = [];
        expect(scratchOrgModal.devHubOptions).toEqual([]);
      });
    });

    describe("hasDefinitionFileOptions", () => {
      it("should return true when definitionFileOptions has items", () => {
        scratchOrgModal.definitionFileOptions = mockDefinitionFileOptions;
        expect(scratchOrgModal.hasDefinitionFileOptions).toBe(true);
      });

      it("should return false when definitionFileOptions is empty", () => {
        scratchOrgModal.definitionFileOptions = [];
        expect(scratchOrgModal.hasDefinitionFileOptions).toBe(false);
      });

      it("should return false when definitionFileOptions is undefined", () => {
        scratchOrgModal.definitionFileOptions = undefined as any;
        expect(scratchOrgModal.hasDefinitionFileOptions).toBe(false);
      });
    });

    describe("isCreateDisabled", () => {
      it("should return true when required fields are missing", () => {
        scratchOrgModal.selectedDevHub = "";
        scratchOrgModal.orgAlias = "";
        scratchOrgModal.definitionFile = "";
        scratchOrgModal.days = 7;
        scratchOrgModal.error = null;

        expect(scratchOrgModal.isCreateDisabled).toBe(true);
      });

      it("should return true when days is invalid", () => {
        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.orgAlias = "test-org";
        scratchOrgModal.definitionFile = "config/project-scratch-def.json";
        scratchOrgModal.days = 0;
        scratchOrgModal.error = null;

        expect(scratchOrgModal.isCreateDisabled).toBe(true);
      });

      it("should return true when days is greater than 30", () => {
        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.orgAlias = "test-org";
        scratchOrgModal.definitionFile = "config/project-scratch-def.json";
        scratchOrgModal.days = 31;
        scratchOrgModal.error = null;

        expect(scratchOrgModal.isCreateDisabled).toBe(true);
      });

      it("should return true when there is an error", () => {
        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.orgAlias = "test-org";
        scratchOrgModal.definitionFile = "config/project-scratch-def.json";
        scratchOrgModal.days = 7;
        scratchOrgModal.error = "Some error";

        expect(scratchOrgModal.isCreateDisabled).toBe(true);
      });

      it("should return false when all fields are valid", () => {
        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.orgAlias = "test-org";
        scratchOrgModal.definitionFile = "config/project-scratch-def.json";
        scratchOrgModal.days = 7;
        scratchOrgModal.error = null;

        expect(scratchOrgModal.isCreateDisabled).toBe(false);
      });
    });
  });

  describe("Event Handlers", () => {
    describe("handleDevHubChange", () => {
      it("should update selectedDevHub from select element", () => {
        const mockEvent = createMockEvent("devhub1");

        scratchOrgModal.handleDevHubChange(mockEvent);
        expect(scratchOrgModal.selectedDevHub).toBe("devhub1");
      });
    });

    describe("handleAliasChange", () => {
      it("should update orgAlias from input element", () => {
        const mockEvent = createMockEvent("test-org-alias");

        scratchOrgModal.handleAliasChange(mockEvent);
        expect(scratchOrgModal.orgAlias).toBe("test-org-alias");
      });
    });

    describe("handleDefinitionFileChange", () => {
      it("should update definitionFile from select element", () => {
        const mockEvent = createMockEvent("config/dev-scratch-def.json");

        scratchOrgModal.handleDefinitionFileChange(mockEvent);
        expect(scratchOrgModal.definitionFile).toBe(
          "config/dev-scratch-def.json"
        );
      });
    });

    describe("handleDaysChange", () => {
      it("should update days and clear error for valid input", () => {
        scratchOrgModal.error = "Previous error";
        const mockEvent = createMockEvent("14");

        scratchOrgModal.handleDaysChange(mockEvent);
        expect(scratchOrgModal.days).toBe(14);
        expect(scratchOrgModal.error).toBe(null);
      });

      it("should set error for days less than 1", () => {
        const mockEvent = createMockEvent("0");

        scratchOrgModal.handleDaysChange(mockEvent);
        expect(scratchOrgModal.error).toBe("Days must be between 1 and 30");
      });

      it("should set error for days greater than 30", () => {
        const mockEvent = createMockEvent("31");

        scratchOrgModal.handleDaysChange(mockEvent);
        expect(scratchOrgModal.error).toBe("Days must be between 1 and 30");
      });

      it("should set error for non-numeric input", () => {
        const mockEvent = createMockEvent("abc");

        scratchOrgModal.handleDaysChange(mockEvent);
        expect(scratchOrgModal.error).toBe("Days must be between 1 and 30");
      });

      it("should not update days for invalid input", () => {
        const originalDays = scratchOrgModal.days;
        const mockEvent = createMockEvent("invalid");

        scratchOrgModal.handleDaysChange(mockEvent);
        expect(scratchOrgModal.days).toBe(originalDays);
      });
    });

    describe("handleCancel", () => {
      it("should dispatch close event", () => {
        scratchOrgModal.handleCancel();

        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "close"
          })
        );
      });
    });

    describe("handleSubmit", () => {
      beforeEach(() => {
        // Set up valid form data
        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.orgAlias = "test-org";
        scratchOrgModal.definitionFile = "config/project-scratch-def.json";
        scratchOrgModal.days = 7;
        scratchOrgModal.error = null;
      });

      it("should dispatch create event with form data when all fields are valid", () => {
        scratchOrgModal.handleSubmit();

        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "create",
            detail: {
              devHub: "devhub1",
              alias: "test-org",
              definitionFile: "config/project-scratch-def.json",
              days: 7
            }
          })
        );
      });

      it("should set error when devHub is not selected", () => {
        scratchOrgModal.selectedDevHub = "";

        scratchOrgModal.handleSubmit();

        expect(scratchOrgModal.error).toBe("Please select a Dev Hub");
        expect(mockDispatchEvent).not.toHaveBeenCalled();
      });

      it("should set error when orgAlias is empty", () => {
        scratchOrgModal.orgAlias = "";

        scratchOrgModal.handleSubmit();

        expect(scratchOrgModal.error).toBe("Please enter an org alias");
        expect(mockDispatchEvent).not.toHaveBeenCalled();
      });

      it("should set error when definitionFile is not selected", () => {
        scratchOrgModal.definitionFile = "";

        scratchOrgModal.handleSubmit();

        expect(scratchOrgModal.error).toBe("Please select a definition file");
        expect(mockDispatchEvent).not.toHaveBeenCalled();
      });

      it("should set error when days is invalid", () => {
        scratchOrgModal.days = 0;

        scratchOrgModal.handleSubmit();

        expect(scratchOrgModal.error).toBe("Days must be between 1 and 30");
        expect(mockDispatchEvent).not.toHaveBeenCalled();
      });

      it("should set error when days is greater than 30", () => {
        scratchOrgModal.days = 31;

        scratchOrgModal.handleSubmit();

        expect(scratchOrgModal.error).toBe("Days must be between 1 and 30");
        expect(mockDispatchEvent).not.toHaveBeenCalled();
      });

      it("should handle multiple validation errors in sequence", () => {
        scratchOrgModal.selectedDevHub = "";
        scratchOrgModal.orgAlias = "";

        scratchOrgModal.handleSubmit();
        expect(scratchOrgModal.error).toBe("Please select a Dev Hub");

        scratchOrgModal.selectedDevHub = "devhub1";
        scratchOrgModal.handleSubmit();
        expect(scratchOrgModal.error).toBe("Please enter an org alias");
      });
    });
  });

  describe("Lifecycle Methods", () => {
    describe("connectedCallback", () => {
      it("should set default definition file when options exist and no file is selected", () => {
        scratchOrgModal.definitionFile = "";
        scratchOrgModal.definitionFileOptions = mockDefinitionFileOptions;

        scratchOrgModal.connectedCallback();

        expect(scratchOrgModal.definitionFile).toBe(
          "config/project-scratch-def.json"
        );
      });

      it("should not change definition file when one is already selected", () => {
        scratchOrgModal.definitionFile = "config/dev-scratch-def.json";
        scratchOrgModal.definitionFileOptions = mockDefinitionFileOptions;

        scratchOrgModal.connectedCallback();

        expect(scratchOrgModal.definitionFile).toBe(
          "config/dev-scratch-def.json"
        );
      });

      it("should not change definition file when no options exist", () => {
        scratchOrgModal.definitionFile = "";
        scratchOrgModal.definitionFileOptions = [];

        scratchOrgModal.connectedCallback();

        expect(scratchOrgModal.definitionFile).toBe("");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty devHubs array gracefully", () => {
      scratchOrgModal.devHubs = [];

      expect(scratchOrgModal.hasDevHubs).toBe(false);
      expect(scratchOrgModal.devHubOptions).toEqual([]);
    });

    it("should handle undefined definitionFileOptions gracefully", () => {
      scratchOrgModal.definitionFileOptions = undefined as any;

      expect(scratchOrgModal.hasDefinitionFileOptions).toBe(false);
    });

    it("should handle null definitionFileOptions gracefully", () => {
      scratchOrgModal.definitionFileOptions = null as any;

      expect(scratchOrgModal.hasDefinitionFileOptions).toBe(false);
    });

    it("should handle devHubs with missing properties", () => {
      const incompleteDevHubs = [
        { alias: "devhub1" } as OrgInfo,
        { username: "devhub2@example.com" } as OrgInfo
      ];
      scratchOrgModal.devHubs = incompleteDevHubs;

      const options = scratchOrgModal.devHubOptions;
      expect(options[0].label).toBe("devhub1 (undefined)");
      expect(options[1].label).toBe("undefined (devhub2@example.com)");
    });

    it("should handle boundary values for days", () => {
      // Test minimum valid value
      const minEvent = createMockEvent("1");
      scratchOrgModal.handleDaysChange(minEvent);
      expect(scratchOrgModal.days).toBe(1);
      expect(scratchOrgModal.error).toBe(null);

      // Test maximum valid value
      const maxEvent = createMockEvent("30");
      scratchOrgModal.handleDaysChange(maxEvent);
      expect(scratchOrgModal.days).toBe(30);
      expect(scratchOrgModal.error).toBe(null);
    });
  });

  describe("Integration Tests", () => {
    it("should complete full form submission flow", () => {
      // Simulate user filling out the form
      scratchOrgModal.handleDevHubChange(createMockEvent("devhub1"));
      scratchOrgModal.handleAliasChange(createMockEvent("test-org"));
      scratchOrgModal.handleDefinitionFileChange(
        createMockEvent("config/project-scratch-def.json")
      );
      scratchOrgModal.handleDaysChange(createMockEvent("14"));

      // Verify form state
      expect(scratchOrgModal.selectedDevHub).toBe("devhub1");
      expect(scratchOrgModal.orgAlias).toBe("test-org");
      expect(scratchOrgModal.definitionFile).toBe(
        "config/project-scratch-def.json"
      );
      expect(scratchOrgModal.days).toBe(14);
      expect(scratchOrgModal.error).toBe(null);
      expect(scratchOrgModal.isCreateDisabled).toBe(false);

      // Submit the form
      scratchOrgModal.handleSubmit();

      // Verify event was dispatched with correct data
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "create",
          detail: {
            devHub: "devhub1",
            alias: "test-org",
            definitionFile: "config/project-scratch-def.json",
            days: 14
          }
        })
      );
    });

    it("should handle form reset after cancel", () => {
      // Fill out form
      scratchOrgModal.selectedDevHub = "devhub1";
      scratchOrgModal.orgAlias = "test-org";
      scratchOrgModal.definitionFile = "config/project-scratch-def.json";
      scratchOrgModal.days = 14;
      scratchOrgModal.error = "Some error";

      // Cancel
      scratchOrgModal.handleCancel();

      // Verify close event was dispatched
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "close" })
      );

      // Note: In a real implementation, the parent component would handle
      // resetting the form state when the modal is closed
    });
  });
});
