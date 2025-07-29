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
const mockVscode = {
  window: {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn()
  },
  ViewColumn: {
    One: 1
  },
  Uri: {
    joinPath: jest.fn(),
    file: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn()
  },
  commands: {
    registerCommand: jest.fn()
  }
};

// Mock extensionUri with fsPath
const mockExtensionUri = {
  fsPath: '/test/extension/path'
};

// Mock child_process
const mockChildProcess = {
  exec: jest.fn()
};

// Mock LWC
const mockLwc = {
  createElement: jest.fn(),
  syntheticShadow: {}
};

// Setup global mocks
(global as any).vscode = mockVscode;
(global as any).exec = mockChildProcess.exec;

// Mock document and window properly
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: jest.fn(),
    body: {
      appendChild: jest.fn()
    }
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn()
  },
  writable: true
});

// Mock modules are now handled by moduleNameMapping in jest.config.js

// Setup DOM environment for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Setup console mocks to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 