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

import Header from "../../modules/s/header/header";
import { Pages } from "../../modules/s/app/app";

// Mock the App module
jest.mock("../../modules/s/app/app", () => ({
  ...jest.requireActual("../../modules/s/app/app"),
  default: {
    ...jest.requireActual("../../modules/s/app/app").default,
    sendMessage: jest.fn()
  }
}));

describe("Header Tests", () => {
  let header: Header;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new instance of Header for each test
    header = new Header();
  });

  describe("Initial State", () => {
    it("should initialize with showNavigation as false", () => {
      expect(header.showNavigation).toBe(false);
    });

    it("should initialize with pages array containing all Pages enum values", () => {
      const expectedPages = Object.values(Pages);
      expect(header.pages).toEqual(expectedPages);
      expect(header.pages).toContain(Pages.home);
      expect(header.pages).toContain(Pages.orgManager);
      expect(header.pages).toContain(Pages.repoConfig);
      expect(header.pages).toContain(Pages.metadataExplorer);
      expect(header.pages).toContain(Pages.pipeline);
    });

    it("should initialize with currentPage as undefined", () => {
      expect(header.currentPage).toBeUndefined();
    });
  });

  describe("handlePageClick", () => {
    it("should set showNavigation to false and dispatch pagenavigation event", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.orgManager
          }
        }
      } as unknown as CustomEvent;

      // Spy on dispatchEvent
      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.orgManager
        })
      );
    });

    it("should dispatch event with correct page value for home", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.home
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.home
        })
      );
    });

    it("should dispatch event with correct page value for repoConfig", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.repoConfig
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.repoConfig
        })
      );
    });

    it("should dispatch event with correct page value for metadataExplorer", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.metadataExplorer
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.metadataExplorer
        })
      );
    });

    it("should dispatch event with correct page value for pipeline", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.pipeline
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.pipeline
        })
      );
    });

    it("should handle event with undefined page value", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: undefined
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalled();
      const callArgs = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(callArgs.type).toBe("pagenavigation");
      expect(callArgs.detail).toBeNull();
    });

    it("should handle event with empty string page value", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: ""
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: ""
        })
      );
    });
  });

  describe("handleNavigationClick", () => {
    it("should toggle showNavigation from false to true", () => {
      // Arrange
      header.showNavigation = false;

      // Act
      header.handleNavigationClick();

      // Assert
      expect(header.showNavigation).toBe(true);
    });

    it("should toggle showNavigation from true to false", () => {
      // Arrange
      header.showNavigation = true;

      // Act
      header.handleNavigationClick();

      // Assert
      expect(header.showNavigation).toBe(false);
    });

    it("should toggle showNavigation multiple times correctly", () => {
      // Arrange
      header.showNavigation = false;

      // Act & Assert
      header.handleNavigationClick();
      expect(header.showNavigation).toBe(true);

      header.handleNavigationClick();
      expect(header.showNavigation).toBe(false);

      header.handleNavigationClick();
      expect(header.showNavigation).toBe(true);
    });
  });

  describe("currentPage API", () => {
    it("should allow setting currentPage via @api", () => {
      // Act
      header.currentPage = Pages.orgManager;

      // Assert
      expect(header.currentPage).toBe(Pages.orgManager);
    });

    it("should allow setting currentPage to undefined", () => {
      // Arrange
      header.currentPage = Pages.home;

      // Act
      header.currentPage = undefined;

      // Assert
      expect(header.currentPage).toBeUndefined();
    });

    it("should allow setting currentPage to any Pages enum value", () => {
      // Test each page value
      const testPages = [
        Pages.home,
        Pages.orgManager,
        Pages.repoConfig,
        Pages.metadataExplorer,
        Pages.pipeline
      ];

      testPages.forEach((page) => {
        // Act
        header.currentPage = page;

        // Assert
        expect(header.currentPage).toBe(page);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete navigation flow", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.metadataExplorer
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act - Open navigation
      header.handleNavigationClick();
      expect(header.showNavigation).toBe(true);

      // Act - Click on a page
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.metadataExplorer
        })
      );
    });

    it("should maintain state correctly through multiple operations", () => {
      // Arrange
      const mockEvent1 = {
        target: { dataset: { page: Pages.home } }
      } as unknown as CustomEvent;
      const mockEvent2 = {
        target: { dataset: { page: Pages.pipeline } }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act & Assert
      // Set current page
      header.currentPage = Pages.orgManager;
      expect(header.currentPage).toBe(Pages.orgManager);

      // Open navigation
      header.handleNavigationClick();
      expect(header.showNavigation).toBe(true);

      // Click first page
      header.handlePageClick(mockEvent1);
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.home
        })
      );

      // Open navigation again
      header.handleNavigationClick();
      expect(header.showNavigation).toBe(true);

      // Click second page
      header.handlePageClick(mockEvent2);
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pagenavigation",
          detail: Pages.pipeline
        })
      );

      // Verify total calls
      expect(dispatchEventSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("handleSettingsClick", () => {
    it("should have handleSettingsClick method", () => {
      // Assert
      expect(typeof header.handleSettingsClick).toBe('function');
    });

    it("should call App.sendMessage with openSettings message", () => {
      // Arrange
      const mockEvent = {
        preventDefault: jest.fn()
      } as unknown as Event;

      // Get the mocked App
      const App = require("../../modules/s/app/app").default;

      // Act
      header.handleSettingsClick(mockEvent);

      // Assert
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(App.sendMessage).toHaveBeenCalledWith({
        openSettings: true
      });
    });

    it("should prevent default link behavior", () => {
      // Arrange
      const mockEvent = {
        preventDefault: jest.fn()
      } as unknown as Event;

      // Act
      header.handleSettingsClick(mockEvent);

      // Assert
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should send correct message format", () => {
      // Arrange
      const mockEvent = {
        preventDefault: jest.fn()
      } as unknown as Event;

      // Get the mocked App
      const App = require("../../modules/s/app/app").default;

      // Act
      header.handleSettingsClick(mockEvent);

      // Assert
      expect(App.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          openSettings: true
        })
      );
    });

    it("should handle multiple settings clicks", () => {
      // Arrange
      const mockEvent = {
        preventDefault: jest.fn()
      } as unknown as Event;

      // Get the mocked App
      const App = require("../../modules/s/app/app").default;

      // Act
      header.handleSettingsClick(mockEvent);
      header.handleSettingsClick(mockEvent);
      header.handleSettingsClick(mockEvent);

      // Assert
      expect(App.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle event with null target", () => {
      // Arrange
      const mockEvent = {
        target: null
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalled();
      const callArgs = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(callArgs.type).toBe("pagenavigation");
      expect(callArgs.detail).toBeNull();
    });

    it("should handle event with target but no dataset", () => {
      // Arrange
      const mockEvent = {
        target: {}
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      header.handlePageClick(mockEvent);

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalled();
      const callArgs = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(callArgs.type).toBe("pagenavigation");
      expect(callArgs.detail).toBeNull();
    });

    it("should handle rapid navigation clicks", () => {
      // Act
      for (let i = 0; i < 10; i++) {
        header.handleNavigationClick();
      }

      // Assert - Should end up in the same state as starting (false)
      expect(header.showNavigation).toBe(false);
    });

    it("should handle rapid page clicks", () => {
      // Arrange
      const mockEvent = {
        target: {
          dataset: {
            page: Pages.home
          }
        }
      } as unknown as CustomEvent;

      const dispatchEventSpy = jest.spyOn(header, "dispatchEvent");

      // Act
      for (let i = 0; i < 5; i++) {
        header.handlePageClick(mockEvent);
      }

      // Assert
      expect(header.showNavigation).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledTimes(5);
    });
  });
});
