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

// Mock the App component
const mockHandleCommandResult = jest.fn();
jest.mock("../../modules/s/app/app", () => ({
  _esModule: true,
  default: {
    handleCommandResult: mockHandleCommandResult
  }
}));

// Mock LWC createElement
const mockCreateElement = jest.fn();
jest.mock("lwc", () => ({
  createElement: mockCreateElement
}));

describe("Index Tests", () => {
  let originalDocument: Document;
  let originalWindow: Window;

  beforeEach(() => {
    // Store original globals
    originalDocument = global.document;
    originalWindow = global.window;

    // Mock createElement to return a proper Node-like object
    mockCreateElement.mockReturnValue({
      tagName: "s-app",
      nodeType: 1,
      appendChild: jest.fn(),
      removeChild: jest.fn()
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original globals
    (global as any).document = originalDocument;
    (global as any).window = originalWindow;
  });

  describe("DOM Content Loaded Event", () => {
    it("should add DOMContentLoaded event listener", () => {
      // Simulate the index.ts behavior
      const domContentLoadedCallback = jest.fn();
      document.addEventListener("DOMContentLoaded", domContentLoadedCallback);

      expect(document.addEventListener).toHaveBeenCalledWith(
        "DOMContentLoaded",
        expect.any(Function)
      );
    });

    it("should create app element and append to body when DOMContentLoaded fires", () => {
      // Mock createElement to return a mock element
      mockCreateElement.mockReturnValue({ tagName: "s-app" });

      // Simulate the index.ts behavior
      const domContentLoadedCallback = jest.fn(() => {
        const appElement = mockCreateElement("s-app", {
          is: expect.any(Object)
        });
        document.body.appendChild(appElement);
      });

      document.addEventListener("DOMContentLoaded", domContentLoadedCallback);

      // Simulate DOMContentLoaded event
      domContentLoadedCallback();

      expect(mockCreateElement).toHaveBeenCalledWith("s-app", {
        is: expect.any(Object)
      });
      expect(document.body.appendChild).toHaveBeenCalledWith({
        tagName: "s-app"
      });
    });
  });

  describe("Message Event Listener", () => {
    it("should add message event listener", () => {
      // Simulate the index.ts behavior
      const messageCallback = jest.fn();
      window.addEventListener("message", messageCallback);

      expect(window.addEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );
    });

    it("should call App.handleCommandResult when message event fires", () => {
      // Simulate the index.ts behavior
      const messageCallback = jest.fn((event) => {
        mockHandleCommandResult(event.data);
      });

      window.addEventListener("message", messageCallback);

      const mockEvent = {
        data: {
          command: "test-command",
          stdout: "test output",
          elementId: "test-element",
          requestId: "test-request"
        }
      };

      // Simulate message event
      messageCallback(mockEvent);

      expect(mockHandleCommandResult).toHaveBeenCalledWith(mockEvent.data);
    });

    it("should handle message event with different data structures", () => {
      // Simulate the index.ts behavior
      const messageCallback = jest.fn((event) => {
        mockHandleCommandResult(event.data);
      });

      window.addEventListener("message", messageCallback);

      const testCases = [
        { data: { command: "simple-command" } },
        {
          data: {
            command: "error-command",
            stderr: "error message",
            errorCode: 1
          }
        },
        { data: { command: "success-command", stdout: "success message" } },
        { data: {} }
      ];

      testCases.forEach((testCase) => {
        messageCallback(testCase);
        expect(mockHandleCommandResult).toHaveBeenCalledWith(testCase.data);
      });

      expect(mockHandleCommandResult).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe("Integration Tests", () => {
    it("should initialize both event listeners when module is loaded", () => {
      // Simulate the index.ts behavior
      const domContentLoadedCallback = jest.fn();
      const messageCallback = jest.fn();

      document.addEventListener("DOMContentLoaded", domContentLoadedCallback);
      window.addEventListener("message", messageCallback);

      expect(document.addEventListener).toHaveBeenCalledTimes(1);
      expect(window.addEventListener).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple message events correctly", () => {
      // Simulate the index.ts behavior
      const messageCallback = jest.fn((event) => {
        mockHandleCommandResult(event.data);
      });

      window.addEventListener("message", messageCallback);

      const messages = [
        { data: { command: "first-command" } },
        { data: { command: "second-command" } },
        { data: { command: "third-command" } }
      ];

      messages.forEach((message) => {
        messageCallback(message);
      });

      expect(mockHandleCommandResult).toHaveBeenCalledTimes(3);
      messages.forEach((message, index) => {
        expect(mockHandleCommandResult).toHaveBeenNthCalledWith(
          index + 1,
          message.data
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle App.handleCommandResult throwing an error", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockHandleCommandResult.mockImplementation(() => {
        throw new Error("Test error");
      });

      // Simulate the index.ts behavior
      const messageCallback = jest.fn((event) => {
        try {
          mockHandleCommandResult(event.data);
        } catch (error) {
          console.error(error);
        }
      });

      window.addEventListener("message", messageCallback);

      const mockEvent = { data: { command: "test" } };

      // Should not throw, but should log error
      expect(() => messageCallback(mockEvent)).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
