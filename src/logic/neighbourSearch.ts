import { Request, Response } from 'express'
import { COORDS_TO_METRES, EdgeType, NEIGHBOURS_INCLUDES_PROXIMITY, TABLE_PREFIX, USE_TABLE_PREFIX } from '../consts';
import { readDB } from '../db';
import { BlobArrayToMatrix, convertToUICoordinateScale } from './utils';
import logger from '../logger';

export async function searchNeighbour(mainPointId: number, distanceThreshold: number, yDistThresh: number, currentPoint: { x_trans: any; y_trans: any; z_trans: any; }) {
  logger.verbose(`[searchNeighbour] starting search for ${mainPointId} with distance ${distanceThreshold} with yDist ${yDistThresh} from currentPoint: ${currentPoint}`)
  // Used BFS to find all points down the graph within a range
  const minDepth = 2; // case for when point distances are too large to give decent # of options
  const maxDepth = 5;
  const usePhysicalProximity = NEIGHBOURS_INCLUDES_PROXIMITY ?? true;

  const getDistance = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    return [Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2)), Math.abs(y2 - y1)];
  };

  const { x_trans: x1, y_trans: y1, z_trans: z1 } = currentPoint;
  logger.verbose(`[searchNeighbour] Current Point: ${mainPointId} CurrentPoint: ${currentPoint}`)

  // Initialize a queue for BFS and a set to keep track of visited nodes
  const queue: { keyframe_id: number, depth: number }[] = [{ keyframe_id: mainPointId, depth: 0 }];
  const visited = new Set<number>();
  const result = new Set<number>(); // keyframe_id => list of neighbors
  const output = []

  visited.add(mainPointId);


  if (usePhysicalProximity) {
    logger.verbose(`[searchVerbose] Using physical proximity`)
    const resultData = await readDB(`WITH target_point AS (
    SELECT 
        x_trans, 
        y_trans, 
        z_trans
    FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes
    WHERE keyframe_id = ?
    )
    SELECT 
        keyframe_id
    FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes rn
    JOIN target_point ON (
            SQRT(POWER(rn.x_trans - target_point.x_trans, 2) +
            POWER(rn.z_trans - target_point.z_trans, 2))
         <= ?
         AND   
         ABS(rn.y_trans - target_point.y_trans) <= ? 
    )
    WHERE rn.keyframe_id != ?;`, [mainPointId, Math.pow(distanceThreshold / COORDS_TO_METRES, 2), yDistThresh / (COORDS_TO_METRES * 2), mainPointId])
    logger.verbose(`[searchNeigbour] Phsyical proximity: ${resultData}`)
    for (const row of resultData) {
      const id: number = Number(row["keyframe_id"])
      const node = await readDB(`SELECT keyframe_id, x_trans, y_trans, z_trans, ts, pose FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes WHERE keyframe_id = ?`, [id], true)
      output.push({ ...node, pose: BlobArrayToMatrix(node.pose) })
      result.add(id)
      queue.push({ keyframe_id: id, depth: 1 })
    }

  }

  while (queue.length > 0) {
    const { keyframe_id, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Fetch neighbors at current depth
    const neighbours = await readDB(
      `SELECT e.keyframe_id1 AS keyframe_id,
              n.x_trans,
              n.y_trans,
              n.z_trans,
              n.ts,
              n.pose
       FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}edges e
       JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes n ON e.keyframe_id1 = n.keyframe_id
       WHERE e.keyframe_id0 = ? AND e.type >= ${EdgeType.Normal}`,
      [keyframe_id]
    );

    for (const neighbour of neighbours) {
      const { keyframe_id: neighbourId, x_trans: x2, y_trans: y2, z_trans: z2 } = neighbour;

      // Check distance
      const [distance, y_dist] = getDistance(x1 * COORDS_TO_METRES, y1 * COORDS_TO_METRES, z1 * COORDS_TO_METRES, x2 * COORDS_TO_METRES, y2 * COORDS_TO_METRES, z2 * COORDS_TO_METRES);

      if ((distance < distanceThreshold && y_dist < yDistThresh) || depth < minDepth) {

        if (Number(mainPointId) !== Number(neighbourId) && !result.has(neighbourId)) {
          result.add(neighbourId);
          output.push({ ...neighbour, pose: BlobArrayToMatrix(neighbour.pose) });
        }

        if (!visited.has(neighbourId)) {
          visited.add(neighbourId);
          queue.push({ keyframe_id: neighbourId, depth: depth + 1 });
        }
      }
    }
  }

  // Finally, scale the points to the front-end's coordinate scale
  return output.map(neighbour => convertToUICoordinateScale(neighbour))
}