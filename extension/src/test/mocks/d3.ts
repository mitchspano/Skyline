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

const mockD3 = {
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  forceSimulation: jest.fn(),
  forceLink: jest.fn(),
  forceManyBody: jest.fn(),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(),
  forceX: jest.fn(),
  forceY: jest.fn(),
  zoom: jest.fn(),
  drag: jest.fn()
};

// Setup d3 force simulation mocks
mockD3.forceSimulation.mockReturnValue({
  force: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  alphaTarget: jest.fn().mockReturnThis(),
  restart: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis()
});

mockD3.forceLink.mockReturnValue({
  id: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
  strength: jest.fn().mockReturnThis()
});

mockD3.forceManyBody.mockReturnValue({
  strength: jest.fn().mockReturnThis()
});

mockD3.forceCenter.mockReturnValue({});
mockD3.forceCollide.mockReturnValue({
  radius: jest.fn().mockReturnThis()
});

mockD3.forceX.mockReturnValue({
  strength: jest.fn().mockReturnThis()
});

mockD3.forceY.mockReturnValue({
  strength: jest.fn().mockReturnThis()
});

mockD3.zoom.mockReturnValue({
  scaleExtent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis()
});

mockD3.drag.mockReturnValue({
  on: jest.fn().mockReturnThis()
});

export default mockD3;
export const {
  select,
  selectAll,
  append,
  attr,
  style,
  data,
  enter,
  call,
  on,
  text,
  html,
  remove,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  zoom,
  drag
} = mockD3;
