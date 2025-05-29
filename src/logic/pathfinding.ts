import { readDB } from "../db";

import { MinQueue } from "heapify";
import { getNeighbours, getNodePosition } from "./utils";
import { USE_TABLE_PREFIX, TABLE_PREFIX, EdgeType } from "../consts";
import logger from "../logger";
import { ThreeNumbersArray } from "../types";

// Function to calculate Euclidean distance between two nodes
function calculateDistance(
  nodeA: ThreeNumbersArray,
  nodeB: ThreeNumbersArray
): number {
  const dx = nodeA[0] - nodeB[0];
  const dy = nodeA[1] - nodeB[1];
  const dz = nodeA[2] - nodeB[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 *
 * @param db
 * @param startId
 * @param endId
 * @param firstWith - Give location/label here to shortcircuit, if along the track it finds a point earlier that meets the label/location
 * @returns
 */
export async function aStarPathfinding(
  startId: number,
  endId: number,
  firstWith: string | null = null // Allow shortcircuit if it finds a point earlier that meets criteria
): Promise<number[]> {
  logger.verbose(
    `[aStartPathfinding] Searching for path between: ${startId} and endId: ${endId}`
  );
  const openSet = new MinQueue(500);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  openSet.push(startId, 0);
  gScore.set(startId, 0);
  fScore.set(startId, await heuristic(startId, endId));

  while (openSet.size > 0) {
    const currentId = openSet.pop()!;

    const currentNodeData = await readDB(
      `SELECT n.keyframe_id, location FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
      }nodes n 
      JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
      }node_locations n1 ON n.keyframe_id = n1.keyframe_id 
      WHERE n.keyframe_id = ?`,
      [currentId]
    );
    if (currentNodeData.length == 0) {
      logger.error(
        `[aStarPathfinding] Could not fetch next Id's information: ${currentId} result:  ${currentNodeData}`
      );
      return []; // An error occurred, fail quickly
    }
    const currentNode = currentNodeData[0];

    if (
      currentId === endId ||
      (firstWith && currentNode.location == firstWith)
    ) {
      // Backtrack to find final path
      const path: number[] = [];
      let node = endId;
      while (node) {
        path.push(node);
        node = cameFrom.get(node)!;
      }
      logger.debug(
        `[aStarPathfinding] Found path from starId: ${startId} to: ${endId} steps: ${path.length}`
      );
      return path.reverse();
    }

    const currentPos = await getNodePosition(currentId);
    if (!currentPos) {
      continue;
    }
    const neighbours = await getNeighbours(currentId);

    for (const neighbour of neighbours) {
      const nodeData = await getNodePosition(neighbour.keyframe_id);
      if (!nodeData) {
        continue;
      }
      const distance = calculateDistance(currentPos, nodeData);
      const tentativeGScore = (gScore.get(currentId) ?? Infinity) + distance;
      if (tentativeGScore < (gScore.get(neighbour.keyframe_id) ?? Infinity)) {
        cameFrom.set(neighbour.keyframe_id, currentId);
        gScore.set(neighbour.keyframe_id, tentativeGScore);
        const neighborHeuristic = await heuristic(neighbour.keyframe_id, endId);
        fScore.set(neighbour.keyframe_id, tentativeGScore + neighborHeuristic);

        openSet.push(
          neighbour.keyframe_id,
          fScore.get(neighbour.keyframe_id) ?? Infinity
        );
      }
    }
  }
  logger.warn(
    `[aStartPathfinding] Found no path from startId: ${startId} to: ${endId}`
  );
  return []; // No path was found
}

async function heuristic(nodeId: number, endId: number): Promise<number> {
  const node = await getNodePosition(nodeId);
  const endNode = await getNodePosition(endId);
  if (node && endNode) {
    return calculateDistance(node, endNode);
  }
  return Infinity;
}
