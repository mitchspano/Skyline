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

import { LightningElement } from "lwc";
import { Pages } from "./app";

/**
 * This component represents the header of the application. It displays the
 * application title and provides a navigation menu for switching between different
 * pages within the application. The navigation menu can be toggled on and off.
 */
export default class Header extends LightningElement {
  showNavigation = false;
  pages = Object.values(Pages);
  currentPage?: Pages;

  /**
   * Handles page clicks in the navigation menu.
   * Emits a 'pagenavigation' event with the selected page value.
   * @param event The custom click event.
   */
  handlePageClick(event: CustomEvent) {
    this.showNavigation = false; // Hide navigation after click
    const target = event.target as HTMLInputElement;
    const value = target?.dataset?.page;
    this.dispatchEvent(
      new CustomEvent("pagenavigation", {
        detail: value
      })
    );
  }

  /**
   * Handles clicks on the navigation button.
   * Toggles the visibility of the navigation menu.
   */
  handleNavigationClick() {
    this.showNavigation = !this.showNavigation;
  }
} 