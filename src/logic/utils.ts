import { readDB } from "../db";
import {
  COORDS_TO_METRES,
  EdgeType,
  TABLE_PREFIX,
  USE_TABLE_PREFIX,
} from "../consts";
import * as THREE from "three";
import logger from "../logger";
import { ThreeNumbersArray } from "../types";
// Helper function to get neighbours
export async function getNeighbours(keyframeId: number): Promise<any[]> {
  const result = await readDB(
    `SELECT e.keyframe_id1 as keyframe_id, n.ts, COUNT(e1.keyframe_id1) as degree FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
    }edges e 
              JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
    }edges e1 ON e.keyframe_id1 = e1.keyframe_id0
              JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
    }nodes n ON e.keyframe_id1 = n.keyframe_id 
              WHERE e.keyframe_id0 = ? AND (e.type >= ${EdgeType.Normal
    }) AND (e1.type >= ${EdgeType.Normal}) 
              GROUP BY e.keyframe_id1, n.ts`,
    [keyframeId]
  );
  return result;
}

export function BlobArrayToMatrix(array: Buffer): number[] {
  const BytesInDouble = 8;
  const output = [];
  const numDoubles = array.byteLength / BytesInDouble;
  for (let i = 0; i < numDoubles; i++) {
    const num = array.readDoubleLE(i * BytesInDouble); // Intel CPU uses LE
    output.push(num);
  }
  return output;
}

export function DbArrayToMatrix(array: string | number[]): number[] | null {
  let arr: number[] = [];

  if (typeof array === "string") {
    try {
      arr = JSON.parse(array.replace("{", "[").replace("}", "]"));
    } catch (e) {
      logger.error(
        `[DbArrayToMatrix] Failed to parse DbArrayToMatrix - array: ${array} error: ${e}`
      );
      return null;
    }
  } else {
    arr = array;
  }

  if (arr && arr.length == 16) {
    return arr.map(Number);
  }
  return null;
}

// Helper function to get node position
export async function getNodePosition(
  keyframeId: number,
  use_trans = true
): Promise<ThreeNumbersArray | null> {
  const result = (await readDB(
    `SELECT pose, x_trans, y_trans, z_trans FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""
    }nodes WHERE keyframe_id = ?LIMIT 1;`,
    [keyframeId],
    true
  )) as any;
  if (!result) {
    logger.warn(
      `[getNodePosition] could not get node data for id: ${keyframeId} when using translation: ${use_trans}`
    );
    return null;
  }

  if (use_trans) {
    const ret: ThreeNumbersArray = [
      -result.x_trans * COORDS_TO_METRES,
      -result.y_trans * COORDS_TO_METRES,
      result.z_trans * COORDS_TO_METRES,
    ];
    if (!ret) {
      logger.error(
        "[getNodePosition] Return result was Null of getNodePosition - using trans"
      );
      return null;
    }
    return ret;
  }

  const ret = calculatePositionFromMatrix(BlobArrayToMatrix(result.pose) ?? []);
  if (!ret) {
    logger.error(
      "[getNodePosition] Return result was Null of getNodePosition - using pose"
    );
    return null;
  }
  return ret;
}

const USE_TRANS = true;
export function getPositionOfNode(point: {
  pose: number[];
  x_trans: number;
  y_trans: number;
  z_trans: number;
}) {
  if (USE_TRANS) {
    return [
      -point.x_trans * COORDS_TO_METRES,
      -point.y_trans * COORDS_TO_METRES,
      point.z_trans * COORDS_TO_METRES,
    ];
  }
  return calculatePositionFromMatrix(point.pose);
}

export function calculatePositionFromMatrix(
  matrix_cw: number[]
): ThreeNumbersArray | null {
  if (!matrix_cw || matrix_cw.length != 16) {
    return null;
  }

  const m_wc = new THREE.Matrix4();
  //@ts-ignore
  m_wc.set(...matrix_cw);
  m_wc.invert();
  const position_wc = new THREE.Vector3();
  position_wc.setFromMatrixPosition(m_wc);
  return [
    -position_wc.x * COORDS_TO_METRES,
    -position_wc.y * COORDS_TO_METRES,
    position_wc.z * COORDS_TO_METRES,
  ];
}

export function convertToUICoordinateScale(node: {
  x_trans: number;
  y_trans: number;
  z_trans: number;
}) {
  // return node
  if (!node || !node.x_trans || !node.y_trans || !node.z_trans) {
    return node;
  }
  const newNode = {
    ...node,
    x_trans: Number(node.x_trans) * Number(COORDS_TO_METRES),
    y_trans: Number(node.y_trans) * Number(COORDS_TO_METRES),
    z_trans: Number(node.z_trans) * Number(COORDS_TO_METRES),
  };
  return newNode;
}
