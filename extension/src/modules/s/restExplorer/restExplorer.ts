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

/**
 * This component represents the REST Explorer page.
 * It provides functionality for exploring and testing REST API endpoints.
 */
import { LightningElement, track } from "lwc";
import App from "../app/app";

const DEFAULT_VARIANT = "brand-outline";
interface HttpMethod {
  value: string;
  label: string;
  checked: boolean;
  variant: string;
}

interface RestResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export default class RestExplorer extends LightningElement {
  @track endpointPath = "";
  @track requestBody = "";
  @track selectedMethod = "GET";
  @track isSubmitting = false;
  @track isLoading = false;
  @track error?: string;
  @track response?: RestResponse;
  @track isAuthenticated = false;
  @track isCheckingAuth = true;
  @track authError?: string;

  httpMethods: HttpMethod[] = [
    { value: "GET", label: "GET", checked: true, variant: DEFAULT_VARIANT },
    { value: "POST", label: "POST", checked: false, variant: DEFAULT_VARIANT },
    { value: "PUT", label: "PUT", checked: false, variant: DEFAULT_VARIANT },
    {
      value: "PATCH",
      label: "PATCH",
      checked: false,
      variant: DEFAULT_VARIANT
    },
    {
      value: "DELETE",
      label: "DELETE",
      checked: false,
      variant: DEFAULT_VARIANT
    }
  ];

  connectedCallback() {
    this.checkAuthentication();
  }

  /**
   * Checks if the user is authenticated to a Salesforce org
   */
  async checkAuthentication(): Promise<void> {
    try {
      this.isCheckingAuth = true;
      this.authError = undefined;

      const result = await App.executeCommand("sf org display --json");

      if (result.errorCode || !result.stdout) {
        this.isAuthenticated = false;
        this.authError = "No authenticated org found";
        return;
      }

      const orgInfo = JSON.parse(result.stdout);
      if (orgInfo.status !== 0) {
        this.isAuthenticated = false;
        this.authError =
          orgInfo.warnings?.join(", ") || "Failed to get org information";
        return;
      }

      this.isAuthenticated = true;
    } catch (error) {
      this.isAuthenticated = false;
      this.authError =
        error instanceof Error ? error.message : "Authentication check failed";
    } finally {
      this.isCheckingAuth = false;
    }
  }

  /**
   * Handles authentication button click
   */
  async handleAuthenticate(): Promise<void> {
    try {
      this.isCheckingAuth = true;
      this.authError = undefined;

      const result = await App.executeCommand("sf org login web");

      if (result.errorCode) {
        throw new Error(result.stderr || "Authentication failed");
      }

      // Re-check authentication after login
      await this.checkAuthentication();
    } catch (error) {
      this.authError =
        error instanceof Error ? error.message : "Authentication failed";
    } finally {
      this.isCheckingAuth = false;
    }
  }

  /**
   * Getter to determine if request body should be shown
   * (only for POST, PUT, PATCH methods)
   */
  get showRequestBody(): boolean {
    return ["POST", "PUT", "PATCH"].includes(this.selectedMethod);
  }

  /**
   * Getter for response status display
   */
  get responseStatus(): string {
    return this.response ? `${this.response.status}` : "";
  }

  /**
   * Getter for response status CSS class
   */
  get responseStatusClass(): string {
    if (!this.response) {
      return "";
    }

    const status = this.response.status;
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
  }

  /**
   * Getter for formatted response headers
   */
  get responseHeaders(): string {
    if (!this.response?.headers) {
      return "";
    }

    return Object.entries(this.response.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  /**
   * Getter for formatted response body
   */
  get responseBody(): string {
    if (!this.response?.body) {
      return "";
    }

    try {
      // Try to format as JSON for better readability
      const parsed = JSON.parse(this.response.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, return as is
      return this.response.body;
    }
  }

  /**
   * Getter to determine if authentication check is in progress
   */
  get showAuthCheck(): boolean {
    return this.isCheckingAuth;
  }

  /**
   * Getter to determine if not authenticated message should be shown
   */
  get showNotAuthenticatedMessage(): boolean {
    return !this.isCheckingAuth && !this.isAuthenticated;
  }

  /**
   * Getter to determine if main content should be shown
   */
  get showMainContent(): boolean {
    return !this.isCheckingAuth && this.isAuthenticated;
  }

  /**
   * Getter to determine if authentication error should be shown
   */
  get showAuthError(): boolean {
    return !!this.authError;
  }

  /**
   * Getter to determine if authentication button should show loading state
   */
  get isAuthButtonLoading(): boolean {
    return this.isCheckingAuth;
  }

  /**
   * Handles HTTP method selection change
   */
  handleMethodChange(event: Event): void {
    const target = event.target as HTMLElement;
    const methodValue = target.dataset.method;

    if (!methodValue) {
      return;
    }

    this.selectedMethod = methodValue;

    // Update the checked state and variant of all methods
    this.httpMethods = this.httpMethods.map((method) => ({
      ...method,
      checked: method.value === methodValue,
      variant: method.value === methodValue ? "brand" : "brand-outline"
    }));
  }

  /**
   * Handles endpoint path input change
   */
  handleEndpointChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endpointPath = target.value;
  }

  /**
   * Handles request body input change
   */
  handleBodyChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.requestBody = target.value;
  }

  /**
   * Handles form submission
   */
  async handleSubmit(): Promise<void> {
    if (!this.endpointPath.trim()) {
      this.error = "Please enter an endpoint path";
      return;
    }

    // Validate JSON for methods that require body
    if (this.showRequestBody && this.requestBody.trim()) {
      try {
        JSON.parse(this.requestBody);
      } catch (e) {
        this.error = "Invalid JSON in request body";
        return;
      }
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.error = undefined;
    this.response = undefined;

    try {
      // Build the sf CLI command
      const command = await this.buildSfCommand();

      // Execute the command
      const result = await App.executeCommand(command);
      console.dir(result, { depth: null });

      if (result.errorCode && result.errorCode !== 0) {
        this.error = `Request failed: ${result.stderr || result.stdout || "Unknown error"}`;
      } else {
        // Parse the response
        this.parseResponse(result.stdout || "");
      }
    } catch (err) {
      this.error = `Error executing request: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      this.isSubmitting = false;
      this.isLoading = false;
    }
  }

  /**
   * Builds the Salesforce CLI command for the REST API call
   */
  private async buildSfCommand(): Promise<string> {
    // First, get the current org information to get the instance URL and access token
    const orgDisplayResult = await App.executeCommand("sf org display --json");

    if (orgDisplayResult.errorCode || !orgDisplayResult.stdout) {
      throw new Error(
        "Failed to get org information. Please ensure you're authenticated to a Salesforce org."
      );
    }

    const orgInfo = JSON.parse(orgDisplayResult.stdout);
    if (orgInfo.status !== 0) {
      throw new Error(
        `Failed to get org information: ${orgInfo.warnings?.join(", ") || "Unknown error"}`
      );
    }

    const { instanceUrl, accessToken } = orgInfo.result;

    // Build the curl command to make the REST API call
    // Ensure proper URL construction with forward slash
    const url = `${instanceUrl}${this.endpointPath.startsWith("/") ? "" : "/"}${this.endpointPath}`;
    const headers = [
      `Authorization: Bearer ${accessToken}`,
      "Content-Type: application/json"
    ];

    let curlCommand = `curl -s -w "\\nHTTPSTATUS:%{http_code}" -X ${this.selectedMethod}`;

    // Add headers
    headers.forEach((header) => {
      curlCommand += ` -H "${header}"`;
    });

    // Add body for methods that require it
    if (this.showRequestBody && this.requestBody.trim()) {
      curlCommand += ` -d '${this.requestBody.replace(/'/g, "'\"'\"'")}'`;
    }

    curlCommand += ` "${url}"`;

    return curlCommand;
  }

  /**
   * Parses the response from the curl command
   */
  private parseResponse(stdout: string): void {
    try {
      // Parse the curl output format
      const lines = stdout.split("\n");
      const statusLine = lines.find((line) => line.startsWith("HTTPSTATUS:"));
      const bodyLines = lines.filter((line) => !line.startsWith("HTTPSTATUS:"));

      const status = statusLine ? parseInt(statusLine.split(":")[1]) : 200;
      const body = bodyLines.join("\n").trim();

      this.response = {
        status,
        headers: {}, // Simplified - we'll get headers from a separate call if needed
        body
      };
    } catch (e) {
      console.error("Parse error:", e);
      this.error = `Failed to parse response: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  /**
   * Clears the current response and error state
   */
  clearResponse(): void {
    this.response = undefined;
    this.error = undefined;
  }
}
