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

import Dependencies from "../../modules/s/dependencies/dependencies";
import { ExecuteResult } from "../../modules/s/app/app";
import Toast from "../../test/mocks/toast";

describe("Dependencies Component Tests", () => {
  let dependencies: Dependencies;
  let mockExecuteCommand: jest.MockedFunction<
    (command: string) => Promise<ExecuteResult>
  >;

  const mockMetadataRecords = [
    {
      MetadataComponentId: "id1",
      MetadataComponentName: "Component1",
      MetadataComponentType: "ApexClass",
      RefMetadataComponentId: "id2",
      RefMetadataComponentName: "Component2",
      RefMetadataComponentType: "ApexTrigger"
    },
    {
      MetadataComponentId: "id2",
      MetadataComponentName: "Component2",
      MetadataComponentType: "ApexTrigger",
      RefMetadataComponentId: "id3",
      RefMetadataComponentName: "Component3",
      RefMetadataComponentType: "CustomObject"
    },
    {
      MetadataComponentId: "id3",
      MetadataComponentName: "Component3",
      MetadataComponentType: "CustomObject",
      RefMetadataComponentId: "id1",
      RefMetadataComponentName: "Component1",
      RefMetadataComponentType: "ApexClass"
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new instance of Dependencies
    dependencies = new Dependencies();

    // Mock the executeCommand method
    mockExecuteCommand = jest.fn();
    (dependencies as any).executeCommand = mockExecuteCommand;

    // Mock Toast.show
    jest.spyOn(Toast, "show");

    // Initialize properties manually since @track doesn't work in tests
    dependencies.isLoading = false;
    dependencies.error = undefined;
    dependencies.searchTerm = "";
    dependencies.enableClustering = true;
    dependencies.hasData = false;
    dependencies.hasLegend = false;

    // Mock template querySelector
    (dependencies as any).template = {
      querySelector: jest.fn().mockReturnValue({
        appendChild: jest.fn(),
        innerHTML: ""
      })
    };
  });

  describe("connectedCallback", () => {
    it("should call loadDependencies", () => {
      // Arrange
      const loadDependenciesSpy = jest
        .spyOn(dependencies as any, "loadDependencies")
        .mockResolvedValue(undefined);

      // Act
      dependencies.connectedCallback();

      // Assert
      expect(loadDependenciesSpy).toHaveBeenCalled();
    });
  });

  describe("renderedCallback", () => {
    it("should initialize visualization when hasData is true and svg is undefined", () => {
      // Arrange
      dependencies.hasData = true;
      (dependencies as any).graphData = {
        nodes: [],
        edges: [],
        communities: []
      };
      (dependencies as any).svg = undefined;

      const initSpy = jest
        .spyOn(dependencies as any, "initializeVisualization")
        .mockImplementation(() => {});

      jest.useFakeTimers();

      // Act
      dependencies.renderedCallback();
      jest.advanceTimersByTime(100);

      // Assert
      expect(initSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should not initialize visualization when hasData is false", () => {
      // Arrange
      dependencies.hasData = false;
      const initSpy = jest
        .spyOn(dependencies as any, "initializeVisualization")
        .mockImplementation(() => {});

      // Act
      dependencies.renderedCallback();

      // Assert
      expect(initSpy).not.toHaveBeenCalled();
    });

    it("should not initialize visualization when svg already exists", () => {
      // Arrange
      dependencies.hasData = true;
      (dependencies as any).graphData = {
        nodes: [],
        edges: [],
        communities: []
      };
      (dependencies as any).svg = {};

      const initSpy = jest
        .spyOn(dependencies as any, "initializeVisualization")
        .mockImplementation(() => {});

      // Act
      dependencies.renderedCallback();

      // Assert
      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe("loadDependencies", () => {
    it("should successfully load and process metadata dependencies", async () => {
      // Arrange
      const versionResult: ExecuteResult = {
        command: "sf --version",
        stdout: "@salesforce/cli/2.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const queryResult: ExecuteResult = {
        command: "sf data query",
        stdout: JSON.stringify({
          status: 0,
          result: { records: mockMetadataRecords }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(versionResult)
        .mockResolvedValueOnce(queryResult);

      // Act
      await (dependencies as any).loadDependencies();

      // Assert
      expect(dependencies.isLoading).toBe(false);
      expect(dependencies.error).toBeUndefined();
      expect(dependencies.hasData).toBe(true);
      expect(dependencies.hasLegend).toBe(true);
      expect((dependencies as any).graphData).toBeDefined();
    });

    it("should handle SF CLI not available error", async () => {
      // Arrange
      const versionResult: ExecuteResult = {
        command: "sf --version",
        stdout: "",
        stderr: "command not found",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      mockExecuteCommand.mockResolvedValueOnce(versionResult);

      // Act
      await (dependencies as any).loadDependencies();

      // Assert
      expect(dependencies.isLoading).toBe(false);
      expect(dependencies.error).toContain("SF CLI not available");
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error"
        }),
        dependencies
      );
    });

    it("should handle query failure", async () => {
      // Arrange
      const versionResult: ExecuteResult = {
        command: "sf --version",
        stdout: "@salesforce/cli/2.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const queryResult: ExecuteResult = {
        command: "sf data query",
        stdout: "",
        stderr: "Query failed",
        elementId: "test",
        requestId: "test",
        errorCode: 1
      };

      mockExecuteCommand
        .mockResolvedValueOnce(versionResult)
        .mockResolvedValueOnce(queryResult);

      // Act
      await (dependencies as any).loadDependencies();

      // Assert
      expect(dependencies.isLoading).toBe(false);
      expect(dependencies.error).toBe("Query failed");
      expect(Toast.show).toHaveBeenCalled();
    });

    it("should handle no records found", async () => {
      // Arrange
      const versionResult: ExecuteResult = {
        command: "sf --version",
        stdout: "@salesforce/cli/2.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const queryResult: ExecuteResult = {
        command: "sf data query",
        stdout: JSON.stringify({
          status: 0,
          result: { records: [] }
        }),
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(versionResult)
        .mockResolvedValueOnce(queryResult);

      // Act
      await (dependencies as any).loadDependencies();

      // Assert
      expect(dependencies.isLoading).toBe(false);
      expect(dependencies.error).toBe("No dependency records found");
    });

    it("should handle JSON parse error", async () => {
      // Arrange
      const versionResult: ExecuteResult = {
        command: "sf --version",
        stdout: "@salesforce/cli/2.0.0",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      const queryResult: ExecuteResult = {
        command: "sf data query",
        stdout: "invalid json",
        stderr: "",
        elementId: "test",
        requestId: "test",
        errorCode: 0
      };

      mockExecuteCommand
        .mockResolvedValueOnce(versionResult)
        .mockResolvedValueOnce(queryResult);

      // Act
      await (dependencies as any).loadDependencies();

      // Assert
      expect(dependencies.isLoading).toBe(false);
      expect(dependencies.error).toBeDefined();
    });
  });

  describe("buildGraphData", () => {
    it("should build graph data from metadata records", () => {
      // Act
      const graphData = (dependencies as any).buildGraphData(
        mockMetadataRecords
      );

      // Assert
      expect(graphData.nodes).toHaveLength(3);
      expect(graphData.edges).toHaveLength(3);
      expect(graphData.nodes[0]).toHaveProperty("id");
      expect(graphData.nodes[0]).toHaveProperty("name");
      expect(graphData.nodes[0]).toHaveProperty("type");
      expect(graphData.nodes[0]).toHaveProperty("size");
      expect(graphData.nodes[0]).toHaveProperty("color");
    });

    it("should detect communities when clustering is enabled", () => {
      // Arrange
      dependencies.enableClustering = true;

      // Use records with multiple nodes of the same type to trigger community detection
      const recordsWithDuplicateTypes = [
        ...mockMetadataRecords,
        {
          MetadataComponentId: "id4",
          MetadataComponentName: "Component4",
          MetadataComponentType: "ApexClass",
          RefMetadataComponentId: "id1",
          RefMetadataComponentName: "Component1",
          RefMetadataComponentType: "ApexClass"
        }
      ];

      // Act
      const graphData = (dependencies as any).buildGraphData(
        recordsWithDuplicateTypes
      );

      // Assert
      expect(graphData.communities.length).toBeGreaterThan(0);
    });

    it("should not detect communities when clustering is disabled", () => {
      // Arrange
      dependencies.enableClustering = false;

      // Act
      const graphData = (dependencies as any).buildGraphData(
        mockMetadataRecords
      );

      // Assert
      expect(graphData.communities).toHaveLength(0);
    });

    it("should create edges between nodes", () => {
      // Act
      const graphData = (dependencies as any).buildGraphData(
        mockMetadataRecords
      );

      // Assert
      expect(graphData.edges[0]).toHaveProperty("source");
      expect(graphData.edges[0]).toHaveProperty("target");
      expect(graphData.edges[0]).toHaveProperty("width");
      expect(graphData.edges[0]).toHaveProperty("color");
    });
  });

  describe("detectCommunities", () => {
    it("should group nodes by type", () => {
      // Arrange
      const graphData = {
        nodes: [
          {
            id: "1",
            name: "A",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9
          },
          {
            id: "2",
            name: "B",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9
          },
          {
            id: "3",
            name: "C",
            type: "ApexTrigger",
            size: 8,
            color: "",
            opacity: 0.9
          }
        ],
        edges: [],
        communities: []
      };

      // Act
      const communities = (dependencies as any).detectCommunities(graphData);

      // Assert
      expect(communities.length).toBeGreaterThan(0);
      expect(communities[0]).toHaveProperty("id");
      expect(communities[0]).toHaveProperty("nodes");
      expect(communities[0]).toHaveProperty("color");
      expect(communities[0]).toHaveProperty("name");
    });

    it("should only create communities for types with multiple nodes", () => {
      // Arrange
      const graphData = {
        nodes: [
          {
            id: "1",
            name: "A",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9
          },
          {
            id: "2",
            name: "B",
            type: "ApexTrigger",
            size: 8,
            color: "",
            opacity: 0.9
          }
        ],
        edges: [],
        communities: []
      };

      // Act
      const communities = (dependencies as any).detectCommunities(graphData);

      // Assert
      expect(communities).toHaveLength(0);
    });
  });

  describe("applyColorsAndStyles", () => {
    it("should apply community colors when communities exist", () => {
      // Arrange
      const graphData = {
        nodes: [
          {
            id: "1",
            name: "A",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9,
            community: undefined as number | undefined
          },
          {
            id: "2",
            name: "B",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9,
            community: undefined as number | undefined
          }
        ],
        edges: [],
        communities: [
          { id: 0, nodes: ["1", "2"], color: "#FF6B6B", name: "Cluster 0" }
        ]
      };

      // Act
      (dependencies as any).applyColorsAndStyles(graphData);

      // Assert
      expect(graphData.nodes[0].color).toBe("#FF6B6B");
      expect(graphData.nodes[0].community).toBe(0);
    });

    it("should apply type colors when no communities exist", () => {
      // Arrange
      const graphData = {
        nodes: [
          {
            id: "1",
            name: "A",
            type: "ApexClass",
            size: 8,
            color: "",
            opacity: 0.9
          },
          {
            id: "2",
            name: "B",
            type: "ApexTrigger",
            size: 8,
            color: "",
            opacity: 0.9
          }
        ],
        edges: [],
        communities: []
      };

      // Act
      (dependencies as any).applyColorsAndStyles(graphData);

      // Assert
      expect(graphData.nodes[0].color).toBeTruthy();
      expect(graphData.nodes[1].color).toBeTruthy();
      expect(graphData.nodes[0].color).not.toBe(graphData.nodes[1].color);
    });
  });

  describe("statsText getter", () => {
    it("should return empty string when no graph data", () => {
      // Arrange
      (dependencies as any).graphData = undefined;

      // Act & Assert
      expect(dependencies.statsText).toBe("");
    });

    it("should return stats when graph data exists", () => {
      // Arrange
      (dependencies as any).graphData = {
        nodes: [{ id: "1" }, { id: "2" }],
        edges: [{ source: "1", target: "2" }],
        communities: [{ id: 0, nodes: ["1", "2"] }]
      };

      // Act
      const stats = dependencies.statsText;

      // Assert
      expect(stats).toContain("2 components");
      expect(stats).toContain("1 dependencies");
      expect(stats).toContain("1 clusters");
    });
  });

  describe("event handlers", () => {
    describe("handleSearch", () => {
      it("should update searchTerm and apply filter", () => {
        // Arrange
        const event = {
          detail: { value: "test" }
        } as CustomEvent;

        const applyFilterSpy = jest
          .spyOn(dependencies as any, "applySearchFilter")
          .mockImplementation(() => {});

        // Act
        dependencies.handleSearch(event);

        // Assert
        expect(dependencies.searchTerm).toBe("test");
        expect(applyFilterSpy).toHaveBeenCalled();
      });
    });

    describe("handleClusteringToggle", () => {
      it("should update enableClustering and reload visualization", () => {
        // Arrange
        const event = {
          detail: { checked: false }
        } as CustomEvent;

        const reloadSpy = jest
          .spyOn(dependencies as any, "reloadVisualization")
          .mockResolvedValue(undefined);

        // Act
        dependencies.handleClusteringToggle(event);

        // Assert
        expect(dependencies.enableClustering).toBe(false);
        expect(reloadSpy).toHaveBeenCalled();
      });
    });

    describe("handleNodeSizeChange", () => {
      it("should update nodeSize and apply changes", () => {
        // Arrange
        const event = {
          detail: { value: "12" }
        } as CustomEvent;

        const updateSpy = jest
          .spyOn(dependencies as any, "updateNodeSize")
          .mockImplementation(() => {});

        // Act
        dependencies.handleNodeSizeChange(event);

        // Assert
        expect((dependencies as any).nodeSize).toBe(12);
        expect(updateSpy).toHaveBeenCalled();
      });
    });

    describe("handleEdgeWidthChange", () => {
      it("should update edgeWidth and apply changes", () => {
        // Arrange
        const event = {
          detail: { value: "2.5" }
        } as CustomEvent;

        const updateSpy = jest
          .spyOn(dependencies as any, "updateEdgeWidth")
          .mockImplementation(() => {});

        // Act
        dependencies.handleEdgeWidthChange(event);

        // Assert
        expect((dependencies as any).edgeWidth).toBe(2.5);
        expect(updateSpy).toHaveBeenCalled();
      });
    });

    describe("handleLabelChange", () => {
      it("should update showLabels and apply changes", () => {
        // Arrange
        const event = {
          detail: { value: "always" }
        } as CustomEvent;

        const updateSpy = jest
          .spyOn(dependencies as any, "updateLabelVisibility")
          .mockImplementation(() => {});

        // Act
        dependencies.handleLabelChange(event);

        // Assert
        expect((dependencies as any).showLabels).toBe("always");
        expect(updateSpy).toHaveBeenCalled();
      });
    });
  });

  describe("applySearchFilter", () => {
    it("should do nothing if svg is undefined", () => {
      // Arrange
      (dependencies as any).svg = undefined;

      // Act & Assert
      expect(() => (dependencies as any).applySearchFilter()).not.toThrow();
    });

    it("should filter nodes and edges based on search term", () => {
      // Arrange
      const mockNodes = {
        style: jest.fn().mockReturnThis()
      };
      const mockEdges = {
        style: jest.fn().mockReturnThis()
      };

      (dependencies as any).svg = {
        selectAll: jest.fn((selector: string) =>
          selector === ".node" ? mockNodes : mockEdges
        )
      };
      (dependencies as any).graphData = {
        nodes: [],
        edges: [],
        communities: []
      };
      dependencies.searchTerm = "test";

      // Act
      (dependencies as any).applySearchFilter();

      // Assert
      expect(mockNodes.style).toHaveBeenCalledWith(
        "opacity",
        expect.any(Function)
      );
      expect(mockEdges.style).toHaveBeenCalledWith(
        "opacity",
        expect.any(Function)
      );
    });
  });

  describe("updateNodeSize", () => {
    it("should update node radius when svg exists", () => {
      // Arrange
      const mockNodes = {
        attr: jest.fn().mockReturnThis()
      };

      (dependencies as any).svg = {
        selectAll: jest.fn().mockReturnValue(mockNodes)
      };
      (dependencies as any).nodeSize = 10;

      // Act
      (dependencies as any).updateNodeSize();

      // Assert
      expect(mockNodes.attr).toHaveBeenCalledWith("r", 10);
    });
  });

  describe("updateEdgeWidth", () => {
    it("should update edge stroke width when svg exists", () => {
      // Arrange
      const mockEdges = {
        attr: jest.fn().mockReturnThis()
      };

      (dependencies as any).svg = {
        selectAll: jest.fn().mockReturnValue(mockEdges)
      };
      (dependencies as any).edgeWidth = 2;

      // Act
      (dependencies as any).updateEdgeWidth();

      // Assert
      expect(mockEdges.attr).toHaveBeenCalledWith("stroke-width", 2);
    });
  });

  describe("updateLabelVisibility", () => {
    it("should show labels when showLabels is 'always'", () => {
      // Arrange
      const mockLabels = {
        style: jest.fn().mockReturnThis()
      };

      (dependencies as any).svg = {
        selectAll: jest.fn().mockReturnValue(mockLabels)
      };
      (dependencies as any).showLabels = "always";

      // Act
      (dependencies as any).updateLabelVisibility();

      // Assert
      expect(mockLabels.style).toHaveBeenCalledWith("display", "block");
    });

    it("should hide labels when showLabels is 'never'", () => {
      // Arrange
      const mockLabels = {
        style: jest.fn().mockReturnThis()
      };

      (dependencies as any).svg = {
        selectAll: jest.fn().mockReturnValue(mockLabels)
      };
      (dependencies as any).showLabels = "never";

      // Act
      (dependencies as any).updateLabelVisibility();

      // Assert
      expect(mockLabels.style).toHaveBeenCalledWith("display", "none");
    });
  });

  describe("drag event handlers", () => {
    it("should handle dragstarted event", () => {
      // Arrange
      const mockSimulation = {
        alphaTarget: jest.fn().mockReturnThis(),
        restart: jest.fn().mockReturnThis()
      };
      (dependencies as any).simulation = mockSimulation;

      const event = { active: false, x: 10, y: 20 };
      const node = { x: 5, y: 15 };

      // Act
      (dependencies as any).dragstarted(event, node);

      // Assert
      expect(node).toHaveProperty("fx", 5);
      expect(node).toHaveProperty("fy", 15);
      expect(mockSimulation.alphaTarget).toHaveBeenCalledWith(0.3);
    });

    it("should handle dragged event", () => {
      // Arrange
      const event = { x: 10, y: 20 };
      const node = {} as any;

      // Act
      (dependencies as any).dragged(event, node);

      // Assert
      expect(node.fx).toBe(10);
      expect(node.fy).toBe(20);
    });

    it("should handle dragended event", () => {
      // Arrange
      const mockSimulation = {
        alphaTarget: jest.fn().mockReturnThis()
      };
      (dependencies as any).simulation = mockSimulation;

      const event = { active: false };
      const node = { fx: 10, fy: 20 } as any;

      // Act
      (dependencies as any).dragended(event, node);

      // Assert
      expect(node.fx).toBeNull();
      expect(node.fy).toBeNull();
      expect(mockSimulation.alphaTarget).toHaveBeenCalledWith(0);
    });
  });

  describe("reloadVisualization", () => {
    it("should rebuild graph data with new settings", async () => {
      // Arrange
      const mockSimulation = {
        stop: jest.fn()
      };

      (dependencies as any).graphData = {
        nodes: [{ id: "1", name: "A", type: "ApexClass" }],
        edges: [],
        communities: []
      };
      (dependencies as any).simulation = mockSimulation;
      (dependencies as any).svg = {};
      dependencies.hasData = true;
      dependencies.enableClustering = true;

      // Act
      await (dependencies as any).reloadVisualization();

      // Assert
      expect(mockSimulation.stop).toHaveBeenCalled();
      expect((dependencies as any).svg).toBeUndefined();
      expect(dependencies.hasData).toBe(true);
    });

    it("should do nothing if graphData is undefined", async () => {
      // Arrange
      (dependencies as any).graphData = undefined;

      // Act & Assert
      await expect(
        (dependencies as any).reloadVisualization()
      ).resolves.not.toThrow();
    });
  });

  describe("labelOptions", () => {
    it("should have three label display options", () => {
      // Assert
      expect((dependencies as any).labelOptions).toHaveLength(3);
      expect((dependencies as any).labelOptions[0].value).toBe("hover");
      expect((dependencies as any).labelOptions[1].value).toBe("always");
      expect((dependencies as any).labelOptions[2].value).toBe("never");
    });
  });
});
