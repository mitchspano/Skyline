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

declare module "lightning-base-components/src/lightning/alert/alert.js" {
  export default class LightningAlert {
    /**
     * Value to use for header text in "header" variant
     * or aria-label in "headerless" variant.
     * @type {string}
     * @default "Alert" (translated accordingly)
     */
    label: string;

    /**
     * Text to display in the alert.
     */
    message: string;

    /**
     * Variant to use for alert. Valid values are
     * "header" and "headerless".
     */
    variant: "header" | "headerless";

    /**
     * Theme to use when variant is "header".
     * Valid values are "default", "shade",
     * "inverse", "alt-inverse", "success",
     * "success", "info", "warning", "error",
     * and "offline".
     */
    theme:
      | "default"
      | "shade"
      | "inverse"
      | "alt-inverse"
      | "success"
      | "info"
      | "warning"
      | "error"
      | "offline";

    /**
     * Dispatches privateclose event
     * and closes dialog
     */
    close(result: any): Promise<void>;

    /**
     * Dispatches privateclose event
     * and closes dialog
     */
    static open(options: AlertOptions): Promise<void>;
  }

  interface AlertOptions {
    message: string;
    label: string;
    theme?:
      | "default"
      | "shade"
      | "inverse"
      | "alt-inverse"
      | "success"
      | "info"
      | "warning"
      | "error"
      | "offline";
    variant?: "header" | "headerless";
  }
}
