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

import { LightningElement, api } from "lwc";
import type { OrgInfo } from "../orgManager/orgManager";

export default class OrgListItem extends LightningElement {
  @api org!: OrgInfo;
  @api isLoading = false;
  @api showExpiration = false;

  handleRemoveOrg(event: CustomEvent) {
    const removeEvent = new CustomEvent("removeorg", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(removeEvent);
  }

  handleOpenOrg(event: CustomEvent) {
    const openEvent = new CustomEvent("openorg", {
      detail: this.org.alias,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(openEvent);
  }
}
