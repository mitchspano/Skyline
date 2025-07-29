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

// Mock LWC
export const createElement = jest.fn();

// Mock LightningElement base class
export class LightningElement {
  constructor() {
    // Mock constructor
  }

  // Mock template property
  template = null;

  // Mock render method
  render() {
    return this.template;
  }

  // Mock connectedCallback
  connectedCallback() {
    // Mock lifecycle method
  }

  // Mock disconnectedCallback
  disconnectedCallback() {
    // Mock lifecycle method
  }

  // Mock renderedCallback
  renderedCallback() {
    // Mock lifecycle method
  }

  // Mock dispatchEvent method
  dispatchEvent(event: CustomEvent) {
    // Mock implementation for testing
    return true;
  }
}

// Mock track decorator - simple implementation
export const track = (target: any, propertyKey?: string) => {
  if (propertyKey) {
    // Property decorator - make it reactive for testing
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      return descriptor;
    }
    return {
      configurable: true,
      enumerable: true,
      get(this: any): any {
        return (this as any)[`_${propertyKey}`];
      },
      set(this: any, value: any): void {
        (this as any)[`_${propertyKey}`] = value;
      }
    };
  } else {
    // Class decorator or parameter decorator
    return (target: any, propertyKey: string) => target;
  }
};

// Mock api decorator - simple implementation
export const api = (target: any, propertyKey?: string) => {
  if (propertyKey) {
    // Property decorator
    return target;
  } else {
    // Class decorator or parameter decorator
    return (target: any, propertyKey: string) => target;
  }
};

// Mock wire decorator - simple implementation
export const wire = (target: any, propertyKey?: string) => {
  if (propertyKey) {
    // Property decorator
    return target;
  } else {
    // Class decorator or parameter decorator
    return (target: any, propertyKey: string) => target;
  }
}; 