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

import CliElement from "../../modules/s/cliElement/cliElement";
import App, { ExecuteResult } from "../../modules/s/app/app";

// Mock the App module
jest.mock("../../modules/s/app/app");

describe("CliElement Tests", () => {
  let cliElement: CliElement;
  let mockApp: jest.Mocked<typeof App>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get the mocked App module
    mockApp = App as jest.Mocked<typeof App>;
    
    // Create a new instance of CliElement
    cliElement = new CliElement();
  });

  describe("executeCommand", () => {
    it("should call App.executeCommand with the provided command", async () => {
      // Arrange
      const testCommand = "test-command";
      const expectedResult: ExecuteResult = {
        command: testCommand,
        stdout: "test output",
        stderr: "",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };
      
      mockApp.executeCommand.mockResolvedValue(expectedResult);

      // Act
      const result = await cliElement.executeCommand(testCommand);

      // Assert
      expect(mockApp.executeCommand).toHaveBeenCalledWith(testCommand);
      expect(result).toEqual(expectedResult);
    });

    it("should handle command execution errors", async () => {
      // Arrange
      const testCommand = "failing-command";
      const errorResult: ExecuteResult = {
        command: testCommand,
        stdout: "",
        stderr: "Command failed",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 1
      };
      
      mockApp.executeCommand.mockResolvedValue(errorResult);

      // Act
      const result = await cliElement.executeCommand(testCommand);

      // Assert
      expect(mockApp.executeCommand).toHaveBeenCalledWith(testCommand);
      expect(result).toEqual(errorResult);
      expect(result.errorCode).toBe(1);
      expect(result.stderr).toBe("Command failed");
    });

    it("should propagate exceptions from App.executeCommand", async () => {
      // Arrange
      const testCommand = "exception-command";
      const expectedError = new Error("Command execution failed");
      
      mockApp.executeCommand.mockRejectedValue(expectedError);

      // Act & Assert
      await expect(cliElement.executeCommand(testCommand)).rejects.toThrow("Command execution failed");
      expect(mockApp.executeCommand).toHaveBeenCalledWith(testCommand);
    });
  });

  describe("isDebugMode", () => {
    it("should return true when debug mode is enabled", () => {
      // Arrange
      mockApp.isDebugMode.mockReturnValue(true);

      // Act
      const result = cliElement.isDebugMode;

      // Assert
      expect(mockApp.isDebugMode).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when debug mode is disabled", () => {
      // Arrange
      mockApp.isDebugMode.mockReturnValue(false);

      // Act
      const result = cliElement.isDebugMode;

      // Assert
      expect(mockApp.isDebugMode).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("config", () => {
    it("should return the configuration from App.getConfig", () => {
      // Arrange
      const mockConfig = {
        debugMode: true,
        apiVersion: "58.0",
        orgAlias: "test-org"
      };
      
      mockApp.getConfig.mockReturnValue(mockConfig);

      // Act
      const result = cliElement.config;

      // Assert
      expect(mockApp.getConfig).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it("should return empty object when no config is available", () => {
      // Arrange
      mockApp.getConfig.mockReturnValue({});

      // Act
      const result = cliElement.config;

      // Assert
      expect(mockApp.getConfig).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it("should return null when config is null", () => {
      // Arrange
      mockApp.getConfig.mockReturnValue(null);

      // Act
      const result = cliElement.config;

      // Assert
      expect(mockApp.getConfig).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("Integration Tests", () => {
    it("should work together with all properties and methods", async () => {
      // Arrange
      const mockConfig = { debugMode: true, testSetting: "value" };
      const testCommand = "integration-test";
      const expectedResult: ExecuteResult = {
        command: testCommand,
        stdout: "success",
        stderr: "",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };

      mockApp.isDebugMode.mockReturnValue(true);
      mockApp.getConfig.mockReturnValue(mockConfig);
      mockApp.executeCommand.mockResolvedValue(expectedResult);

      // Act
      const debugMode = cliElement.isDebugMode;
      const config = cliElement.config;
      const commandResult = await cliElement.executeCommand(testCommand);

      // Assert
      expect(debugMode).toBe(true);
      expect(config).toEqual(mockConfig);
      expect(commandResult).toEqual(expectedResult);
      expect(mockApp.isDebugMode).toHaveBeenCalled();
      expect(mockApp.getConfig).toHaveBeenCalled();
      expect(mockApp.executeCommand).toHaveBeenCalledWith(testCommand);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty command string", async () => {
      // Arrange
      const emptyCommand = "";
      const expectedResult: ExecuteResult = {
        command: emptyCommand,
        stdout: "",
        stderr: "",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };
      
      mockApp.executeCommand.mockResolvedValue(expectedResult);

      // Act
      const result = await cliElement.executeCommand(emptyCommand);

      // Assert
      expect(mockApp.executeCommand).toHaveBeenCalledWith(emptyCommand);
      expect(result).toEqual(expectedResult);
    });

    it("should handle very long command strings", async () => {
      // Arrange
      const longCommand = "a".repeat(1000);
      const expectedResult: ExecuteResult = {
        command: longCommand,
        stdout: "executed",
        stderr: "",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };
      
      mockApp.executeCommand.mockResolvedValue(expectedResult);

      // Act
      const result = await cliElement.executeCommand(longCommand);

      // Assert
      expect(mockApp.executeCommand).toHaveBeenCalledWith(longCommand);
      expect(result).toEqual(expectedResult);
    });

    it("should handle special characters in command", async () => {
      // Arrange
      const specialCommand = "test-command --flag='value with spaces' && echo 'done'";
      const expectedResult: ExecuteResult = {
        command: specialCommand,
        stdout: "executed",
        stderr: "",
        elementId: "test-element",
        requestId: "test-request",
        errorCode: 0
      };
      
      mockApp.executeCommand.mockResolvedValue(expectedResult);

      // Act
      const result = await cliElement.executeCommand(specialCommand);

      // Assert
      expect(mockApp.executeCommand).toHaveBeenCalledWith(specialCommand);
      expect(result).toEqual(expectedResult);
    });
  });
}); 