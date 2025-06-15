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
 * This is the entry point for the LWC application running within the VS Code webview.
 * It initializes the main application component (`s-app`) and sets up
 * message handling to receive command execution results from the VS Code extension.
 */
import "@lwc/synthetic-shadow";
import { createElement } from "lwc";
import App from "./modules/s/app/app";

// Wait for the DOM to fully load before initializing the LWC application
document.addEventListener("DOMContentLoaded", () => {
  const application = createElement("s-app", { is: App });
  document.body.appendChild(application);
});

// Listen for messages from the VS Code extension
window.addEventListener("message", (event) => {
  App.handleCommandResult(event.data);
});
