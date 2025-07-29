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

import OrgListItem from "../../modules/s/orgListItem/orgListItem";
import type { OrgInfo } from "../../modules/s/orgManager/orgManager";

describe("OrgListItem Component Tests", () => {
  let orgListItem: OrgListItem;
  let mockOrg: OrgInfo;

  beforeEach(() => {
    // Create a new instance of OrgListItem
    orgListItem = new OrgListItem();
    
    // Create a mock org
    mockOrg = {
      accessToken: "test-token",
      instanceUrl: "https://test.salesforce.com",
      orgId: "test-org-id",
      username: "test@example.com",
      loginUrl: "https://login.salesforce.com",
      clientId: "test-client-id",
      isDevHub: false,
      instanceApiVersion: "58.0",
      instanceApiVersionLastRetrieved: "2023-01-01",
      alias: "test-org",
      isDefaultDevHubUsername: false,
      isDefaultUsername: false,
      lastUsed: "2023-01-01",
      connectedStatus: "Connected",
      defaultMarker: "",
      orgName: "Test Org",
      edition: "Developer",
      status: "Active"
    };
    
    // Set the org property
    orgListItem.org = mockOrg;
  });

  describe("Properties", () => {
    it("should have default values for optional properties", () => {
      // Act & Assert
      expect(orgListItem.isLoading).toBe(false);
      expect(orgListItem.showExpiration).toBe(false);
    });

    it("should accept org property", () => {
      // Act & Assert
      expect(orgListItem.org).toBe(mockOrg);
      expect(orgListItem.org.alias).toBe("test-org");
      expect(orgListItem.org.username).toBe("test@example.com");
    });

    it("should accept isLoading property", () => {
      // Arrange
      orgListItem.isLoading = true;

      // Act & Assert
      expect(orgListItem.isLoading).toBe(true);
    });

    it("should accept showExpiration property", () => {
      // Arrange
      orgListItem.showExpiration = true;

      // Act & Assert
      expect(orgListItem.showExpiration).toBe(true);
    });
  });

  describe("handleRemoveOrg", () => {
    it("should dispatch removeorg event with org alias", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');
      const expectedEvent = new CustomEvent("removeorg", {
        detail: "test-org",
        bubbles: true,
        composed: true
      });

      // Act
      orgListItem.handleRemoveOrg({} as CustomEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(expectedEvent);
    });

    it("should include org alias in event detail", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');
      orgListItem.org.alias = "different-org";

      // Act
      orgListItem.handleRemoveOrg({} as CustomEvent);

      // Assert
      const call = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(call.detail).toBe("different-org");
    });
  });

  describe("handleOpenOrg", () => {
    it("should dispatch openorg event with org alias", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');
      const expectedEvent = new CustomEvent("openorg", {
        detail: "test-org",
        bubbles: true,
        composed: true
      });

      // Act
      orgListItem.handleOpenOrg({} as CustomEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(expectedEvent);
    });

    it("should include org alias in event detail", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');
      orgListItem.org.alias = "different-org";

      // Act
      orgListItem.handleOpenOrg({} as CustomEvent);

      // Assert
      const call = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(call.detail).toBe("different-org");
    });
  });

  describe("Event Properties", () => {
    it("should set correct event properties for removeorg event", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');

      // Act
      orgListItem.handleRemoveOrg({} as CustomEvent);

      // Assert
      const call = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(call.type).toBe("removeorg");
      expect(call.bubbles).toBe(true);
      expect(call.composed).toBe(true);
    });

    it("should set correct event properties for openorg event", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');

      // Act
      orgListItem.handleOpenOrg({} as CustomEvent);

      // Assert
      const call = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(call.type).toBe("openorg");
      expect(call.bubbles).toBe(true);
      expect(call.composed).toBe(true);
    });
  });

  describe("OrgInfo Interface", () => {
    it("should handle complete OrgInfo object", () => {
      // Arrange
      const completeOrg: OrgInfo = {
        accessToken: "complete-token",
        instanceUrl: "https://complete.salesforce.com",
        orgId: "complete-org-id",
        username: "complete@example.com",
        loginUrl: "https://login.salesforce.com",
        clientId: "complete-client-id",
        isDevHub: true,
        instanceApiVersion: "59.0",
        instanceApiVersionLastRetrieved: "2023-12-01",
        alias: "complete-org",
        isDefaultDevHubUsername: true,
        isDefaultUsername: true,
        lastUsed: "2023-12-01",
        connectedStatus: "Connected",
        defaultMarker: "D",
        devHubUsername: "devhub@example.com",
        created: "2023-01-01",
        expirationDate: "2024-01-01",
        createdOrgInstance: "CS123",
        isScratch: true,
        isSandbox: false,
        tracksSource: true,
        signupUsername: "signup@example.com",
        createdBy: "creator@example.com",
        createdDate: "2023-01-01",
        devHubOrgId: "devhub-org-id",
        devHubId: "devhub-id",
        attributes: {
          type: "ScratchOrgInfo",
          url: "/services/data/v59.0/sobjects/ScratchOrgInfo/scratch-org-id"
        },
        orgName: "Complete Test Org",
        edition: "Developer",
        status: "Active",
        isExpired: false,
        namespace: "test_namespace"
      };

      // Act
      orgListItem.org = completeOrg;

      // Assert
      expect(orgListItem.org.isDevHub).toBe(true);
      expect(orgListItem.org.isScratch).toBe(true);
      expect(orgListItem.org.isSandbox).toBe(false);
      expect(orgListItem.org.tracksSource).toBe(true);
      expect(orgListItem.org.namespace).toBe("test_namespace");
    });

    it("should handle minimal OrgInfo object", () => {
      // Arrange
      const minimalOrg: OrgInfo = {
        accessToken: "minimal-token",
        instanceUrl: "https://minimal.salesforce.com",
        orgId: "minimal-org-id",
        username: "minimal@example.com",
        loginUrl: "https://login.salesforce.com",
        clientId: "minimal-client-id",
        isDevHub: false,
        instanceApiVersion: "58.0",
        instanceApiVersionLastRetrieved: "2023-01-01",
        alias: "minimal-org",
        isDefaultDevHubUsername: false,
        isDefaultUsername: false,
        lastUsed: "2023-01-01",
        connectedStatus: "Connected",
        defaultMarker: ""
      };

      // Act
      orgListItem.org = minimalOrg;

      // Assert
      expect(orgListItem.org.isDevHub).toBe(false);
      expect(orgListItem.org.isScratch).toBeUndefined();
      expect(orgListItem.org.isSandbox).toBeUndefined();
      expect(orgListItem.org.tracksSource).toBeUndefined();
      expect(orgListItem.org.namespace).toBeUndefined();
    });
  });

  describe("Component Integration", () => {
    it("should handle multiple event dispatches", () => {
      // Arrange
      const dispatchEventSpy = jest.spyOn(orgListItem, 'dispatchEvent');

      // Act
      orgListItem.handleRemoveOrg({} as CustomEvent);
      orgListItem.handleOpenOrg({} as CustomEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledTimes(2);
      
      const removeCall = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      const openCall = dispatchEventSpy.mock.calls[1][0] as CustomEvent;
      
      expect(removeCall.type).toBe("removeorg");
      expect(openCall.type).toBe("openorg");
    });

    it("should maintain org reference after event handling", () => {
      // Arrange
      const originalAlias = orgListItem.org.alias;

      // Act
      orgListItem.handleRemoveOrg({} as CustomEvent);
      orgListItem.handleOpenOrg({} as CustomEvent);

      // Assert
      expect(orgListItem.org.alias).toBe(originalAlias);
      expect(orgListItem.org).toBe(mockOrg);
    });
  });
}); 