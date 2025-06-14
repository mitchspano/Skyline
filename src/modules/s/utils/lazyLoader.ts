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

import { LightningElement } from 'lwc';

interface ComponentModule {
    default: typeof LightningElement;
}

const componentCache = new Map<string, Promise<ComponentModule>>();

// Static mapping of component names to their import paths
const componentImports: { [key: string]: () => Promise<ComponentModule> } = {
    home: () => import('../home/home'),
    metadataExplorer: () => import('../metadataExplorer/metadataExplorer'),
    repoConfig: () => import('../repoConfig/repoConfig'),
    pipeline: () => import('../pipeline/pipeline'),
    orgManager: () => import('../orgManager/orgManager'),
    cliElement: () => import('../cliElement/cliElement'),
    header: () => import('../header/header'),
    branchModal: () => import('../branchModal/branchModal'),
    timeZone: () => import('../timeZone/timeZone'),
    scratchOrgModal: () => import('../scratchOrgModal/scratchOrgModal'),
    orgListItem: () => import('../orgListItem/orgListItem')
};

/**
 * Lazy loads an LWC component
 * @param componentName The name of the component to load
 * @returns A promise that resolves to the component module
 */
export function lazyLoadComponent(componentName: string): Promise<ComponentModule> {
    if (componentCache.has(componentName)) {
        return componentCache.get(componentName)!;
    }

    const importFn = componentImports[componentName];
    if (!importFn) {
        return Promise.reject(new Error(`Component ${componentName} not found in import map`));
    }

    const promise = importFn();
    componentCache.set(componentName, promise);
    return promise;
} 