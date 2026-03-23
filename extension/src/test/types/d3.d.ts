/**
 * Copyright 2026 Mitch Spano
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

declare module "d3" {
  export function select(selector: any): any;
  export function selectAll(selector: any): any;
  export function forceSimulation(nodes?: any[]): any;
  export function forceLink(links?: any[]): any;
  export function forceManyBody(): any;
  export function forceCenter(x: number, y: number): any;
  export function forceCollide(): any;
  export function forceX(x: number): any;
  export function forceY(y: number): any;
  export function zoom(): any;
  export function drag(): any;
}
