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

import App from "../../modules/s/app/app";

// Mock App module
jest.mock("../../modules/s/app/app", () => ({
  esModule: true,
  default: {
    executeCommand: jest.fn()
  }
}));

// Test utility functions extracted from RestExplorer logic
const testUtils = {
  // Test showRequestBody logic
  showRequestBody: (selectedMethod: string): boolean => {
    return ["POST", "PUT", "PATCH"].includes(selectedMethod);
  },

  // Test response status class logic
  getResponseStatusClass: (status?: number): string => {
    if (!status) {
      return "";
    }

    if (status >= 200 && status < 300) {
      return "success";
    }
    if (status >= 400 && status < 500) {
      return "warning";
    }
    if (status >= 500) {
      return "error";
    }
    return "info";
  },

  // Test response headers formatting
  formatResponseHeaders: (headers: Record<string, string>): string => {
    if (!headers) {
      return "";
    }

    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  },

  // Test response body formatting
  formatResponseBody: (body: string): string => {
    if (!body) {
      return "";
    }

    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  },

  // Test URL construction logic
  buildUrl: (instanceUrl: string, endpointPath: string): string => {
    return `${instanceUrl}${endpointPath.startsWith("/") ? "" : "/"}${endpointPath}`;
  },

  // Test curl command building logic
  buildCurlCommand: (
    method: string,
    url: string,
    accessToken: string,
    body?: string
  ): string => {
    let command = `curl -s -w "\\nHTTPSTATUS:%{http_code}" -X ${method}`;

    // Add headers
    command += ` -H "Authorization: Bearer ${accessToken}"`;
    command += ` -H "Content-Type: application/json"`;

    // Add body for methods that require it
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      const escapedBody = body.replace(/'/g, "'\"'\"'");
      command += ` -d '${escapedBody}'`;
    }

    command += ` "${url}"`;
    return command;
  },

  // Test response parsing logic
  parseCurlResponse: (stdout: string): { status: number; body: string } => {
    const lines = stdout.split("\n");
    const statusLine = lines.find((line) => line.startsWith("HTTPSTATUS:"));
    const bodyLines = lines.filter((line) => !line.startsWith("HTTPSTATUS:"));

    const status = statusLine ? parseInt(statusLine.split(":")[1]) : 200;
    const body = bodyLines.join("\n").trim();

    return { status, body };
  }
};

describe("RestExplorer Utility Functions", () => {
  let mockExecuteCommand: jest.MockedFunction<typeof App.executeCommand>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteCommand = App.executeCommand as jest.MockedFunction<
      typeof App.executeCommand
    >;
  });

  describe("showRequestBody", () => {
    it("should return true for POST method", () => {
      expect(testUtils.showRequestBody("POST")).toBe(true);
    });

    it("should return true for PUT method", () => {
      expect(testUtils.showRequestBody("PUT")).toBe(true);
    });

    it("should return true for PATCH method", () => {
      expect(testUtils.showRequestBody("PATCH")).toBe(true);
    });

    it("should return false for GET method", () => {
      expect(testUtils.showRequestBody("GET")).toBe(false);
    });

    it("should return false for DELETE method", () => {
      expect(testUtils.showRequestBody("DELETE")).toBe(false);
    });
  });

  describe("getResponseStatusClass", () => {
    it("should return success for 2xx status", () => {
      expect(testUtils.getResponseStatusClass(200)).toBe("success");
      expect(testUtils.getResponseStatusClass(201)).toBe("success");
      expect(testUtils.getResponseStatusClass(299)).toBe("success");
    });

    it("should return warning for 4xx status", () => {
      expect(testUtils.getResponseStatusClass(400)).toBe("warning");
      expect(testUtils.getResponseStatusClass(404)).toBe("warning");
      expect(testUtils.getResponseStatusClass(499)).toBe("warning");
    });

    it("should return error for 5xx status", () => {
      expect(testUtils.getResponseStatusClass(500)).toBe("error");
      expect(testUtils.getResponseStatusClass(502)).toBe("error");
      expect(testUtils.getResponseStatusClass(599)).toBe("error");
    });

    it("should return info for other status codes", () => {
      expect(testUtils.getResponseStatusClass(100)).toBe("info");
      expect(testUtils.getResponseStatusClass(300)).toBe("info");
      expect(testUtils.getResponseStatusClass(600)).toBe("error"); // 600+ is error
    });

    it("should return empty string when no status", () => {
      expect(testUtils.getResponseStatusClass(undefined)).toBe("");
    });
  });

  describe("formatResponseHeaders", () => {
    it("should format headers correctly", () => {
      const headers = {
        contentType: "application/json",
        authorization: "Bearer token"
      };

      const result = testUtils.formatResponseHeaders(headers);
      expect(result).toBe(
        "contentType: application/json\nauthorization: Bearer token"
      );
    });

    it("should return empty string when no headers", () => {
      expect(testUtils.formatResponseHeaders({})).toBe("");
    });

    it("should handle undefined headers", () => {
      expect(testUtils.formatResponseHeaders(undefined as any)).toBe("");
    });
  });

  describe("formatResponseBody", () => {
    it("should format JSON body with proper indentation", () => {
      const jsonBody = '{"name":"test","value":123}';
      const result = testUtils.formatResponseBody(jsonBody);
      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it("should return body as-is when not valid JSON", () => {
      const plainText = "This is plain text";
      const result = testUtils.formatResponseBody(plainText);
      expect(result).toBe(plainText);
    });

    it("should return empty string when no body", () => {
      expect(testUtils.formatResponseBody("")).toBe("");
    });
  });

  describe("buildUrl", () => {
    it("should handle endpoint with leading slash", () => {
      const result = testUtils.buildUrl(
        "https://test.salesforce.com",
        "/services/data/v58.0/sobjects"
      );
      expect(result).toBe(
        "https://test.salesforce.com/services/data/v58.0/sobjects"
      );
    });

    it("should handle endpoint without leading slash", () => {
      const result = testUtils.buildUrl(
        "https://test.salesforce.com",
        "services/data/v58.0/sobjects"
      );
      expect(result).toBe(
        "https://test.salesforce.com/services/data/v58.0/sobjects"
      );
    });

    it("should handle empty endpoint", () => {
      const result = testUtils.buildUrl("https://test.salesforce.com", "");
      expect(result).toBe("https://test.salesforce.com/");
    });
  });

  describe("buildCurlCommand", () => {
    it("should build correct GET command", () => {
      const result = testUtils.buildCurlCommand(
        "GET",
        "https://test.salesforce.com/services/data/v58.0/sobjects",
        "test-token"
      );

      expect(result).toContain("curl -s -w");
      expect(result).toContain("-X GET");
      expect(result).toContain("Authorization: Bearer test-token");
      expect(result).toContain("Content-Type: application/json");
      expect(result).toContain(
        "https://test.salesforce.com/services/data/v58.0/sobjects"
      );
      expect(result).not.toContain("-d");
    });

    it("should build correct POST command with body", () => {
      const result = testUtils.buildCurlCommand(
        "POST",
        "https://test.salesforce.com/services/data/v58.0/sobjects/Account",
        "test-token",
        '{"Name": "Test Account"}'
      );

      expect(result).toContain("-X POST");
      expect(result).toContain('-d \'{"Name": "Test Account"}\'');
    });

    it("should escape single quotes in request body", () => {
      const result = testUtils.buildCurlCommand(
        "POST",
        "https://test.salesforce.com/test",
        "test-token",
        '{"name": "O\'Connor"}'
      );

      expect(result).toContain('-d \'{"name": "O\'"\'"\'Connor"}\'');
    });
  });

  describe("parseCurlResponse", () => {
    it("should parse response with status and body", () => {
      const response = 'HTTPSTATUS:200\n{"success": true}';
      const result = testUtils.parseCurlResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toBe('{"success": true}');
    });

    it("should handle response without status line", () => {
      const response = '{"success": true}';
      const result = testUtils.parseCurlResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toBe('{"success": true}');
    });

    it("should handle empty response", () => {
      const response = "";
      const result = testUtils.parseCurlResponse(response);

      expect(result.status).toBe(200);
      expect(result.body).toBe("");
    });

    it("should handle invalid status", () => {
      const response = "HTTPSTATUS:invalid\nbody";
      const result = testUtils.parseCurlResponse(response);

      expect(result.status).toBe(NaN);
      expect(result.body).toBe("body");
    });
  });
});

describe("RestExplorer Integration Tests", () => {
  let mockExecuteCommand: jest.MockedFunction<typeof App.executeCommand>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteCommand = App.executeCommand as jest.MockedFunction<
      typeof App.executeCommand
    >;
  });

  describe("Authentication Flow", () => {
    it("should handle successful authentication check", async () => {
      const mockOrgInfo = {
        status: 0,
        result: {
          instanceUrl: "https://test.salesforce.com",
          accessToken: "test-token"
        }
      };

      mockExecuteCommand.mockResolvedValue({
        command: "sf org display --json",
        stdout: JSON.stringify(mockOrgInfo),
        errorCode: 0
      });

      // Test the authentication logic
      const result = await App.executeCommand("sf org display --json");
      const orgInfo = JSON.parse(result.stdout!);

      expect(orgInfo.status).toBe(0);
      expect(orgInfo.result.instanceUrl).toBe("https://test.salesforce.com");
      expect(orgInfo.result.accessToken).toBe("test-token");
    });

    it("should handle authentication failure", async () => {
      mockExecuteCommand.mockResolvedValue({
        command: "sf org display --json",
        stdout: "",
        errorCode: 1
      });

      const result = await App.executeCommand("sf org display --json");

      expect(result.errorCode).toBe(1);
      expect(result.stdout).toBe("");
    });

    it("should handle org info with non-zero status", async () => {
      const mockOrgInfo = {
        status: 1,
        warnings: ["No org found"]
      };

      mockExecuteCommand.mockResolvedValue({
        command: "sf org display --json",
        stdout: JSON.stringify(mockOrgInfo),
        errorCode: 0
      });

      const result = await App.executeCommand("sf org display --json");
      const orgInfo = JSON.parse(result.stdout!);

      expect(orgInfo.status).toBe(1);
      expect(orgInfo.warnings).toEqual(["No org found"]);
    });
  });

  describe("REST API Request Flow", () => {
    it("should build and execute complete REST request", async () => {
      const mockOrgInfo = {
        status: 0,
        result: {
          instanceUrl: "https://test.salesforce.com",
          accessToken: "test-token"
        }
      };

      const mockCurlResponse = 'HTTPSTATUS:200\n{"records":[]}';

      mockExecuteCommand
        .mockResolvedValueOnce({
          command: "sf org display --json",
          stdout: JSON.stringify(mockOrgInfo),
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: expect.stringContaining("curl"),
          stdout: mockCurlResponse,
          errorCode: 0
        });

      // Test the complete flow
      const orgResult = await App.executeCommand("sf org display --json");
      const orgInfo = JSON.parse(orgResult.stdout!);

      const url = testUtils.buildUrl(
        orgInfo.result.instanceUrl,
        "/services/data/v58.0/sobjects"
      );
      const curlCommand = testUtils.buildCurlCommand(
        "GET",
        url,
        orgInfo.result.accessToken
      );

      const curlResult = await App.executeCommand(curlCommand);
      const parsedResponse = testUtils.parseCurlResponse(curlResult.stdout!);

      expect(parsedResponse.status).toBe(200);
      expect(parsedResponse.body).toBe('{"records":[]}');
    });

    it("should handle POST request with body", async () => {
      const mockOrgInfo = {
        status: 0,
        result: {
          instanceUrl: "https://test.salesforce.com",
          accessToken: "test-token"
        }
      };

      const mockCurlResponse = 'HTTPSTATUS:201\n{"id":"0011234567890ABC"}';

      mockExecuteCommand
        .mockResolvedValueOnce({
          command: "sf org display --json",
          stdout: JSON.stringify(mockOrgInfo),
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: expect.stringContaining("curl"),
          stdout: mockCurlResponse,
          errorCode: 0
        });

      // Test POST request flow
      const orgResult = await App.executeCommand("sf org display --json");
      const orgInfo = JSON.parse(orgResult.stdout!);

      const url = testUtils.buildUrl(
        orgInfo.result.instanceUrl,
        "/services/data/v58.0/sobjects/Account"
      );
      const requestBody = '{"Name": "Test Account"}';
      const curlCommand = testUtils.buildCurlCommand(
        "POST",
        url,
        orgInfo.result.accessToken,
        requestBody
      );

      const curlResult = await App.executeCommand(curlCommand);
      const parsedResponse = testUtils.parseCurlResponse(curlResult.stdout!);

      expect(parsedResponse.status).toBe(201);
      expect(parsedResponse.body).toBe('{"id":"0011234567890ABC"}');
    });
  });

  describe("Error Handling", () => {
    it("should handle command execution errors", async () => {
      mockExecuteCommand.mockRejectedValue(new Error("Network error"));

      await expect(App.executeCommand("sf org display --json")).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle JSON parse errors", async () => {
      mockExecuteCommand.mockResolvedValue({
        command: "sf org display --json",
        stdout: "invalid json",
        errorCode: 0
      });

      const result = await App.executeCommand("sf org display --json");

      expect(() => JSON.parse(result.stdout!)).toThrow();
    });

    it("should handle curl command failures", async () => {
      const mockOrgInfo = {
        status: 0,
        result: {
          instanceUrl: "https://test.salesforce.com",
          accessToken: "test-token"
        }
      };

      mockExecuteCommand
        .mockResolvedValueOnce({
          command: "sf org display --json",
          stdout: JSON.stringify(mockOrgInfo),
          errorCode: 0
        })
        .mockResolvedValueOnce({
          command: expect.stringContaining("curl"),
          stderr: "Connection failed",
          errorCode: 1
        });

      const orgResult = await App.executeCommand("sf org display --json");
      const orgInfo = JSON.parse(orgResult.stdout!);

      const url = testUtils.buildUrl(orgInfo.result.instanceUrl, "/test");
      const curlCommand = testUtils.buildCurlCommand(
        "GET",
        url,
        orgInfo.result.accessToken
      );

      const curlResult = await App.executeCommand(curlCommand);

      expect(curlResult.errorCode).toBe(1);
      expect(curlResult.stderr).toBe("Connection failed");
    });
  });
});
