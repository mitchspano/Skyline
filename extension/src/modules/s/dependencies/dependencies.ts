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

/**
 * Component for visualizing Salesforce metadata dependencies.
 * Queries MetadataComponentDependency and creates an interactive network graph.
 */

import { track } from "lwc";
import CliElement from "../cliElement/cliElement";
import Toast from "lightning-base-components/src/lightning/toast/toast.js";
import * as d3 from "d3";

// Constants
const CONFIG = {
  SCALE_FACTOR: 1000,
  CANVAS_WIDTH: 1400,
  CANVAS_HEIGHT: 800,
  NODE_RADIUS: 8,
  COMMUNITY_NODE_RADIUS: 10,
  EDGE_WIDTH: 1,
  NODE_BORDER_WIDTH: 2,
  COMMUNITY_OPACITY: 0.8,
  TYPE_OPACITY: 0.9
} as const;

const COMMUNITY_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#D7BDE2"
] as const;

const TYPE_COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf"
] as const;

const METADATA_DEPENDENCY_QUERY = `
SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType,
       RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType
FROM MetadataComponentDependency
ORDER BY MetadataComponentName
`;

// Interfaces

/* eslint-disable @typescript-eslint/naming-convention */
interface MetadataRecord {
  MetadataComponentId: string;
  MetadataComponentName: string;
  MetadataComponentType: string;
  RefMetadataComponentId: string;
  RefMetadataComponentName: string;
  RefMetadataComponentType: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

interface Node {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  community?: number;
  size: number;
  color: string;
  opacity: number;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  width: number;
  color: string;
  opacity: number;
}

interface Community {
  id: number;
  nodes: string[];
  color: string;
  name: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
  communities: Community[];
}

export default class Dependencies extends CliElement {
  @track isLoading = false;
  @track error?: string;
  @track searchTerm = "";
  @track enableClustering = true;
  @track hasData = false;
  @track hasLegend = false;

  nodeSize: number = CONFIG.NODE_RADIUS;
  edgeWidth: number = CONFIG.EDGE_WIDTH;
  showLabels = "hover";

  private graphData?: GraphData;
  private svg?: any;
  private simulation?: any;
  private tooltip?: any;
  private d3?: any;

  labelOptions = [
    { label: "On Hover", value: "hover" },
    { label: "Always", value: "always" },
    { label: "Never", value: "never" }
  ];

  get statsText(): string {
    if (!this.graphData) {
      return "";
    }
    return `${this.graphData.nodes.length} components • ${this.graphData.edges.length} dependencies • ${this.graphData.communities.length} clusters`;
  }

  /**
   * Called when the component is connected to the DOM
   */
  connectedCallback(): void {
    this.loadDependencies();
  }

  /**
   * Called when component is rendered
   */
  renderedCallback(): void {
    if (this.hasData && this.graphData && !this.svg) {
      // Add a small delay to ensure DOM is fully rendered
      setTimeout(() => {
        this.initializeVisualization();
      }, 100);
    }
  }

  /**
   * Loads metadata dependencies from Salesforce
   */
  async loadDependencies(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = undefined;

      // First, test if SF CLI is available
      const testCommand = "sf --version";
      const testResult = await this.executeCommand(testCommand);

      if (testResult.errorCode) {
        throw new Error(
          `SF CLI not available: ${testResult.stderr || "Unknown error"}`
        );
      }

      console.log("SF CLI version:", testResult.stdout);

      const command = `sf data query --query "${METADATA_DEPENDENCY_QUERY}" --use-tooling-api --json`;
      console.log("Executing command:", command);

      const result = await this.executeCommand(command);

      console.log("Command result:", {
        errorCode: result.errorCode,
        stdout: result.stdout?.substring(0, 200) + "...",
        stderr: result.stderr
      });

      if (result.errorCode || !result.stdout) {
        throw new Error(
          result.stderr || "Failed to query metadata dependencies"
        );
      }

      const response = JSON.parse(result.stdout);
      if (response.status !== 0) {
        throw new Error(response.message || "Query failed");
      }

      const records: MetadataRecord[] = response.result?.records || [];
      if (records.length === 0) {
        throw new Error("No dependency records found");
      }

      this.graphData = this.buildGraphData(records);
      this.hasData = true;
      this.hasLegend = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      console.error("Dependencies load error:", err);
      Toast.show(
        {
          label: "Error",
          message: this.error,
          variant: "error"
        },
        this
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Builds graph data from metadata records
   */
  private buildGraphData(records: MetadataRecord[]): GraphData {
    const nodes = new Map<string, { name: string; type: string }>();
    const edges: Array<{ source: string; target: string }> = [];

    // Build nodes and edges
    for (const record of records) {
      // Source node
      if (!nodes.has(record.MetadataComponentId)) {
        nodes.set(record.MetadataComponentId, {
          name: record.MetadataComponentName,
          type: record.MetadataComponentType
        });
      }

      // Target node
      if (!nodes.has(record.RefMetadataComponentId)) {
        nodes.set(record.RefMetadataComponentId, {
          name: record.RefMetadataComponentName,
          type: record.RefMetadataComponentType
        });
      }

      // Edge
      edges.push({
        source: record.MetadataComponentId,
        target: record.RefMetadataComponentId
      });
    }

    const graphData: GraphData = {
      nodes: Array.from(nodes.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        type: data.type,
        size: CONFIG.NODE_RADIUS,
        color: "",
        opacity: CONFIG.TYPE_OPACITY
      })),
      edges: edges.map((edge) => ({
        ...edge,
        width: CONFIG.EDGE_WIDTH,
        color: "#888888",
        opacity: 0.6
      })),
      communities: []
    };

    // Detect communities if clustering is enabled
    if (this.enableClustering) {
      graphData.communities = this.detectCommunities(graphData);
    }

    this.applyColorsAndStyles(graphData);

    return graphData;
  }

  /**
   * Detects communities based on component types
   */
  private detectCommunities(graphData: GraphData): Community[] {
    const typeCommunities = new Map<string, string[]>();

    for (const node of graphData.nodes) {
      if (!typeCommunities.has(node.type)) {
        typeCommunities.set(node.type, []);
      }
      typeCommunities.get(node.type)!.push(node.id);
    }

    const communities: Community[] = [];
    let communityId = 0;

    for (const [type, nodeIds] of typeCommunities) {
      if (nodeIds.length > 1) {
        communities.push({
          id: communityId,
          nodes: nodeIds,
          color: COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length],
          name: `Cluster ${communityId} (${type})`
        });
        communityId++;
      }
    }

    return communities;
  }

  /**
   * Applies colors and styles to nodes
   */
  private applyColorsAndStyles(graphData: GraphData): void {
    const { nodes, communities } = graphData;

    if (communities.length > 0) {
      // Color by communities
      for (const node of nodes) {
        const community = communities.find((c) => c.nodes.includes(node.id));
        if (community) {
          node.color = community.color;
          node.size = CONFIG.COMMUNITY_NODE_RADIUS;
          node.opacity = CONFIG.COMMUNITY_OPACITY;
          node.community = community.id;
        } else {
          node.color = "#cccccc";
          node.size = CONFIG.NODE_RADIUS;
          node.opacity = CONFIG.TYPE_OPACITY;
        }
      }
    } else {
      // Color by component type
      const typeColors = new Map<string, string>();
      let colorIndex = 0;

      for (const node of nodes) {
        if (!typeColors.has(node.type)) {
          typeColors.set(
            node.type,
            TYPE_COLORS[colorIndex % TYPE_COLORS.length]
          );
          colorIndex++;
        }
        node.color = typeColors.get(node.type)!;
        node.size = CONFIG.NODE_RADIUS;
        node.opacity = CONFIG.TYPE_OPACITY;
      }
    }
  }

  /**
   * Initializes D3 visualization
   */
  private initializeVisualization(): void {
    if (!this.graphData) {
      return;
    }

    if (!d3) {
      return;
    }

    // Try different selectors to find the container
    let containerEl = this.template!.querySelector(
      String.raw`[lwc\:ref="graphContainer"]`
    );

    containerEl ??= this.template!.querySelector(".graph-container");

    if (!containerEl) {
      return;
    }

    const container = containerEl as HTMLElement;

    // Clear any existing SVG
    d3.select(container).selectAll("*").remove();

    const width = CONFIG.CANVAS_WIDTH;
    const height = CONFIG.CANVAS_HEIGHT;

    // Create SVG
    this.svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Create tooltip
    this.tooltip = d3
      .select(container)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute");

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event: any) => {
        graphGroup.attr("transform", event.transform.toString());
      });

    this.svg.call(zoom);

    const graphGroup = this.svg.append("g");

    // Create simulation
    this.simulation = d3
      .forceSimulation(this.graphData.nodes)
      .force(
        "link",
        d3
          .forceLink(this.graphData.edges)
          .id((d: any) => d.id)
          .distance(80)
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => d.size + 5)
      )
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // Create edges
    const edge = graphGroup
      .append("g")
      .selectAll("line")
      .data(this.graphData.edges)
      .enter()
      .append("line")
      .attr("class", "edge")
      .attr("stroke-width", (d: Edge) => d.width)
      .attr("stroke", (d: Edge) => d.color)
      .attr("stroke-opacity", (d: Edge) => d.opacity);

    // Create nodes
    const node = graphGroup
      .append("g")
      .selectAll("circle")
      .data(this.graphData.nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d: Node) => d.size)
      .attr("fill", (d: Node) => d.color)
      .attr("opacity", (d: Node) => d.opacity)
      .call(
        d3
          .drag()
          .on("start", (event: any, d: any) => this.dragstarted(event, d))
          .on("drag", (event: any, d: any) => this.dragged(event, d))
          .on("end", (event: any, d: any) => this.dragended(event, d))
      );

    // Add labels
    const label = graphGroup
      .append("g")
      .selectAll("text")
      .data(this.graphData.nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .text((d: Node) => d.name)
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .style("display", "none");

    // Add tooltips
    node
      .on("mouseover", (event: any, d: Node) => {
        if (this.tooltip) {
          const clusterInfo =
            d.community === undefined ? "" : `<br/>Cluster: ${d.community}`;

          this.tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.name}</strong><br/>Type: ${d.type}${clusterInfo}`
            )
            .style("left", `${event.pageX}px`)
            .style("top", `${event.pageY - 270}px`)
            .style("transform", "translate(-50%, -100%)");
        }
      })
      .on("mouseout", () => {
        if (this.tooltip) {
          this.tooltip.style("opacity", 0);
        }
      });

    // Update positions on simulation tick
    this.simulation.on("tick", () => {
      edge
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: Node) => d.x!).attr("cy", (d: Node) => d.y!);

      label.attr("x", (d: Node) => d.x!).attr("y", (d: Node) => d.y!);
    });

    // Create legend
    this.createLegend();
  }

  /**
   * Creates the legend
   */
  private createLegend(): void {
    if (!this.graphData) {
      return;
    }

    const legendEl = this.template!.querySelector(
      String.raw`[lwc\:ref="legendContainer"]`
    );
    if (!legendEl) {
      return;
    }
    const legendContainer = legendEl as HTMLElement;

    // Clear existing legend
    this.d3.select(legendContainer).selectAll("*").remove();

    const legendData =
      this.graphData.communities.length > 0
        ? this.graphData.communities
        : [...new Set(this.graphData.nodes.map((d: Node) => d.type))].map(
            (type) => ({
              name: type as string,
              color: this.graphData!.nodes.find((n: Node) => n.type === type)!
                .color
            })
          );

    const legend = this.d3.select(legendContainer);

    const legendItems = legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("div")
      .attr("class", "legend-item");

    legendItems
      .append("span")
      .attr("class", "legend-color")
      .style("background-color", (d: any) => d.color);

    legendItems.append("span").text((d: any) => d.name || d.type);
  }

  /**
   * Drag event handlers
   */
  private dragstarted(event: any, d: Node): void {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: any, d: Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: any, d: Node): void {
    if (!event.active && this.simulation) {
      this.simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  /**
   * Event handlers for controls
   */
  handleSearch(event: CustomEvent): void {
    const detail = event.detail as any;
    this.searchTerm = detail.value || "";
    this.applySearchFilter();
  }

  handleClusteringToggle(event: CustomEvent): void {
    const detail = event.detail as any;
    this.enableClustering = detail.checked;
    this.reloadVisualization();
  }

  handleNodeSizeChange(event: CustomEvent): void {
    const detail = event.detail as any;
    this.nodeSize = Number.parseFloat(detail.value);
    this.updateNodeSize();
  }

  handleEdgeWidthChange(event: CustomEvent): void {
    const detail = event.detail as any;
    this.edgeWidth = Number.parseFloat(detail.value);
    this.updateEdgeWidth();
  }

  handleLabelChange(event: CustomEvent): void {
    const detail = event.detail as any;
    this.showLabels = detail.value;
    this.updateLabelVisibility();
  }

  /**
   * Applies search filter to visualization
   */
  private applySearchFilter(): void {
    if (!this.svg || !this.graphData) {
      return;
    }

    const searchTerm = this.searchTerm.toLowerCase();

    const nodes = this.svg.selectAll(".node");
    const edges = this.svg.selectAll(".edge");

    if (searchTerm) {
      nodes.style("opacity", (d: Node) =>
        d.name.toLowerCase().includes(searchTerm) ||
        d.type.toLowerCase().includes(searchTerm)
          ? 1
          : 0.1
      );

      edges.style("opacity", (d: any) => {
        const source = d.source as Node;
        const target = d.target as Node;
        return source.name.toLowerCase().includes(searchTerm) ||
          source.type.toLowerCase().includes(searchTerm) ||
          target.name.toLowerCase().includes(searchTerm) ||
          target.type.toLowerCase().includes(searchTerm)
          ? 0.6
          : 0.1;
      });
    } else {
      nodes.style("opacity", (d: Node) => d.opacity);
      edges.style("opacity", (d: Edge) => d.opacity);
    }
  }

  /**
   * Updates node size
   */
  private updateNodeSize(): void {
    if (!this.svg) {
      return;
    }
    this.svg.selectAll(".node").attr("r", this.nodeSize);
  }

  /**
   * Updates edge width
   */
  private updateEdgeWidth(): void {
    if (!this.svg) {
      return;
    }
    this.svg.selectAll(".edge").attr("stroke-width", this.edgeWidth);
  }

  /**
   * Updates label visibility
   */
  private updateLabelVisibility(): void {
    if (!this.svg) {
      return;
    }

    const labels = this.svg.selectAll(".label");

    if (this.showLabels === "always") {
      labels.style("display", "block");
    } else if (this.showLabels === "never") {
      labels.style("display", "none");
    } else {
      // hover mode - handled by CSS
      labels.style("display", "none");
    }
  }

  /**
   * Reloads the visualization with updated data
   */
  private async reloadVisualization(): Promise<void> {
    if (!this.graphData) {
      return;
    }

    // Stop existing simulation
    if (this.simulation) {
      this.simulation.stop();
    }

    // Clear SVG
    this.svg = undefined;
    this.hasData = false;

    // Rebuild with new settings
    if (this.enableClustering) {
      this.graphData.communities = this.detectCommunities(this.graphData);
    } else {
      this.graphData.communities = [];
    }

    this.applyColorsAndStyles(this.graphData);
    this.hasData = true;

    // Re-render will trigger initializeVisualization
  }
}
