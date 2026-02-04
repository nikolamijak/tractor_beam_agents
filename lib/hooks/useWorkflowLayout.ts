import { useMemo } from 'react';
import * as dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

/**
 * Calculate automatic vertical layout for workflow nodes using Dagre.
 * Layout is computed once based on node/edge structure, not on every status update.
 */
export function useWorkflowLayout(nodes: Node[], edges: Edge[]): Node[] {
  return useMemo(() => {
    if (!nodes.length) return [];

    // Create Dagre graph with vertical top-to-bottom layout
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });
    graph.setDefaultEdgeLabel(() => ({}));

    // Add nodes with fixed dimensions
    nodes.forEach((node) => {
      graph.setNode(node.id, { width: 200, height: 60 });
    });

    // Add edges to define hierarchy
    edges.forEach((edge) => {
      graph.setEdge(edge.source, edge.target);
    });

    // Compute layout
    dagre.layout(graph);

    // Extract computed positions and return layouted nodes
    return nodes.map((node) => {
      const pos = graph.node(node.id);
      return {
        ...node,
        position: {
          x: pos.x - 100, // Center node horizontally (200px width / 2)
          y: pos.y - 30,  // Center node vertically (60px height / 2)
        },
      };
    });
  }, [JSON.stringify(nodes.map((n) => n.id)), JSON.stringify(edges)]);
}
