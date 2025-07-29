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

// Mock VS Code API
export const window = {
  createWebviewPanel: jest.fn(),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn()
};

export const ViewColumn = {
  One: 1
};

export const Uri = {
  joinPath: jest.fn(() => ({ fsPath: '/test/path' })),
  file: jest.fn()
};

export const workspace = {
  getConfiguration: jest.fn()
};

export const commands = {
  registerCommand: jest.fn()
};

export const ExtensionContext = jest.fn();
export const WebviewPanel = jest.fn();
export const Webview = jest.fn();
export const Disposable = jest.fn(); 