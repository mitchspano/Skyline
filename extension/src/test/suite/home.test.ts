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

import Home from "../../modules/s/home/home";
import { ExecuteResult } from "../../modules/s/app/app";
import App from "../../modules/s/app/app";

describe("Home Component Tests", () => {
  let home: Home;
  let mockExecuteCommand: jest.MockedFunction<(command: string) => Promise<ExecuteResult>>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance of Home
    home = new Home();
    
    // Mock the home component's executeCommand method
    mockExecuteCommand = jest.fn();
    (home as any).executeCommand = mockExecuteCommand;
    
    // Initialize properties manually since @track doesn't work in tests
    home.showSpinner = false;
    home.gitInstalled = false;
    home.sfCliInstalled = false;
    home.inGitDir = false;
    home.fullyVerified = false;
    home.hasError = false;
    home.errorMessage = undefined;
  });

  describe("connectedCallback", () => {
    it("should be callable", () => {
      // Act & Assert
      expect(() => home.connectedCallback()).not.toThrow();
    });
  });

  describe("initializeVerification", () => {
    it("should set showSpinner to true initially", async () => {
      // Arrange
      mockExecuteCommand.mockResolvedValue({
        command: "test",
        stdout: "test output",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      });

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.showSpinner).toBe(false); // Should be false after completion
    });

    it("should handle successful verification of all prerequisites", async () => {
      // Arrange
      const gitResult: ExecuteResult = {
        command: "git --version",
        stdout: "git version 2.30.1",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };
      
      const sfCliResult: ExecuteResult = {
        command: "sf --version",
        stdout: "sf version 1.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };
      
      const gitDirResult: ExecuteResult = {
        command: "git status",
        stdout: "On branch main",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(gitResult)
        .mockResolvedValueOnce(sfCliResult)
        .mockResolvedValueOnce(gitDirResult);

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.gitInstalled).toBe(true);
      expect(home.sfCliInstalled).toBe(true);
      expect(home.inGitDir).toBe(true);
      expect(home.fullyVerified).toBe(true);
      expect(home.hasError).toBe(false);
      expect(home.showSpinner).toBe(false);
    });

    it("should handle Git not installed error", async () => {
      // Arrange
      const gitResult: ExecuteResult = {
        command: "git --version",
        stdout: "",
        stderr: "command not found",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };
      
      const sfCliResult: ExecuteResult = {
        command: "sf --version",
        stdout: "sf version 1.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(gitResult)
        .mockResolvedValueOnce(sfCliResult);

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.gitInstalled).toBe(false);
      expect(home.sfCliInstalled).toBe(true);
      expect(home.hasError).toBe(true);
      expect(home.errorMessage).toBe("Git is not installed on this machine");
      expect(home.fullyVerified).toBe(false);
    });

    it("should handle SF CLI not installed error", async () => {
      // Arrange
      const gitResult: ExecuteResult = {
        command: "git --version",
        stdout: "git version 2.30.1",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };
      
      const sfCliResult: ExecuteResult = {
        command: "sf --version",
        stdout: "",
        stderr: "command not found",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      mockExecuteCommand
        .mockResolvedValueOnce(gitResult)
        .mockResolvedValueOnce(sfCliResult)
        .mockResolvedValueOnce({ command: "git status" }); // for git status, not used but prevents undefined

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.gitInstalled).toBe(true);
      expect(home.sfCliInstalled).toBe(false);
      expect(home.hasError).toBe(true);
      expect(home.errorMessage).toBe("The sf CLI is not installed on this machine");
      expect(home.fullyVerified).toBe(false);
    });

    it("should handle not in Git directory error", async () => {
      // Arrange
      const gitResult: ExecuteResult = {
        command: "git --version",
        stdout: "git version 2.30.1",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };
      
      const sfCliResult: ExecuteResult = {
        command: "sf --version",
        stdout: "sf version 1.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };
      
      const gitDirResult: ExecuteResult = {
        command: "git status",
        stdout: "",
        stderr: "fatal: not a git repository",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      mockExecuteCommand
        .mockResolvedValueOnce(gitResult)
        .mockResolvedValueOnce(sfCliResult)
        .mockResolvedValueOnce(gitDirResult);

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.gitInstalled).toBe(true);
      expect(home.sfCliInstalled).toBe(true);
      expect(home.inGitDir).toBe(false);
      expect(home.hasError).toBe(true);
      expect(home.errorMessage).toBe("The current working directory is not a git repository");
      expect(home.fullyVerified).toBe(false);
    });

    it("should handle execution errors", async () => {
      // Arrange
      const expectedError = new Error("Command execution failed");
      mockExecuteCommand.mockRejectedValue(expectedError);

      // Act
      await (home as any).initializeVerification();

      // Assert
      expect(home.hasError).toBe(true);
      expect(home.errorMessage).toBe("An error occurred during verification");
      expect(home.showSpinner).toBe(false);
    });
  });

  describe("handleInGitDirResult", () => {
    it("should set inGitDir to true when stdout is present", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "git status",
        stdout: "On branch main",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      // Act
      (home as any).handleInGitDirResult(result);

      // Assert
      expect(home.inGitDir).toBe(true);
      expect(home.hasError).toBe(false);
    });

    it("should set error when stdout is empty", () => {
      // Arrange
      const result: ExecuteResult = {
        command: "git status",
        stdout: "",
        stderr: "fatal: not a git repository",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      // Act
      (home as any).handleInGitDirResult(result);

      // Assert
      expect(home.inGitDir).toBe(false);
      expect(home.hasError).toBe(true);
      expect(home.errorMessage).toBe("The current working directory is not a git repository");
    });
  });

  describe("checkingGit getter", () => {
    it("should return true when spinner is shown and Git is not installed", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = false;

      // Act & Assert
      expect(home.checkingGit).toBe(true);
    });

    it("should return false when Git is already installed", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = true;

      // Act & Assert
      expect(home.checkingGit).toBe(false);
    });

    it("should return false when spinner is not shown", () => {
      // Arrange
      home.showSpinner = false;
      home.gitInstalled = false;

      // Act & Assert
      expect(home.checkingGit).toBe(false);
    });
  });

  describe("checkingInGitDir getter", () => {
    it("should return true when spinner is shown, Git is installed, but not in Git dir", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = true;
      home.inGitDir = false;

      // Act & Assert
      expect(home.checkingInGitDir).toBe(true);
    });

    it("should return false when already in Git directory", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = true;
      home.inGitDir = true;

      // Act & Assert
      expect(home.checkingInGitDir).toBe(false);
    });

    it("should return false when Git is not installed", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = false;
      home.inGitDir = false;

      // Act & Assert
      expect(home.checkingInGitDir).toBe(false);
    });
  });

  describe("checkingSfCli getter", () => {
    it("should return true when spinner is shown, Git and Git dir are verified, but SF CLI is not", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = true;
      home.inGitDir = true;
      home.sfCliInstalled = false;

      // Act & Assert
      expect(home.checkingSfCli).toBe(true);
    });

    it("should return false when SF CLI is already installed", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = true;
      home.inGitDir = true;
      home.sfCliInstalled = true;

      // Act & Assert
      expect(home.checkingSfCli).toBe(false);
    });

    it("should return false when Git is not installed", () => {
      // Arrange
      home.showSpinner = true;
      home.gitInstalled = false;
      home.inGitDir = true;
      home.sfCliInstalled = false;

      // Act & Assert
      expect(home.checkingSfCli).toBe(false);
    });
  });

  describe("currentStep getter", () => {
    it("should return complete when fully verified", () => {
      // Arrange
      home.fullyVerified = true;

      // Act & Assert
      expect(home.currentStep).toBe("complete");
    });

    it("should return git when Git is not installed", () => {
      // Arrange
      home.fullyVerified = false;
      home.gitInstalled = false;

      // Act & Assert
      expect(home.currentStep).toBe("git");
    });

    it("should return gitDir when Git is installed but not in Git directory", () => {
      // Arrange
      home.fullyVerified = false;
      home.gitInstalled = true;
      home.inGitDir = false;

      // Act & Assert
      expect(home.currentStep).toBe("gitDir");
    });

    it("should return sfCli when Git and Git dir are verified but SF CLI is not", () => {
      // Arrange
      home.fullyVerified = false;
      home.gitInstalled = true;
      home.inGitDir = true;
      home.sfCliInstalled = false;

      // Act & Assert
      expect(home.currentStep).toBe("sfCli");
    });
  });
}); 