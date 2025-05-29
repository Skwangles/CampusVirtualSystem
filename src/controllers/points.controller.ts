import { Request, Response } from "express";
import { USE_TABLE_PREFIX, TABLE_PREFIX, REASONABLE_MAX_STRING_SIZE, REASONABLE_MAX_Y_DIST_THRESHOLD, REASONABLE_MAX_XZ_DIST_THRESHOLD } from "../consts";
import { readDB } from "../db";
import { searchNeighbour } from "../logic/neighbourSearch";
import { aStarPathfinding } from "../logic/pathfinding";
import { BlobArrayToMatrix, convertToUICoordinateScale } from "../logic/utils";
import logger from "../logger";

const MAX_CACHE_SIZE = 5000;
const local_cache = new Map<string, any>();

export async function getFirstPointId(req: Request, res: Response) {
  const firstPoint = await readDB(`SELECT keyframe_id FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes WHERE keyframe_id >= 0 LIMIT 1;`, [], true);
  if (firstPoint && 'keyframe_id' in firstPoint) {
    res.json(firstPoint.keyframe_id)
  }
  else {
    logger.warn(`[getFirstPointId] Failed to get first point`)
    res.status(500).send("Failed to get first point - No points exist, or internal server error").end()
  }
}

export async function pathfindFromPointId(req: Request, res: Response) {
  const point = Number(req.params.id)
  const locationCode = String(req.params.location)
  if (isNaN(point) || !locationCode || locationCode == "" || locationCode.length > REASONABLE_MAX_STRING_SIZE) {
    logger.warn(`[PathfindFromPointId] had invalid arguments:${point} location: ${locationCode}`)
    res.status(400).send("Invalid Arguments").end()
    return
  }

  if (local_cache.has(`${point}-${locationCode}`)) {
    res.json({ path: local_cache.get(`${point}-${locationCode}`) })
    return
  }

  // Check label first, as these are manually annotated (and supposedly special) points
  let locationResults = await readDB(`SELECT s.keyframe_id FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}special_labels s WHERE s.label = ? LIMIT 1;`, [locationCode], true);
  let isLabel = true;
  if (!locationResults) {
    isLabel = false
    const firstPointWithLocation = (await readDB(`SELECT n.keyframe_id FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes n JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}node_locations nl ON n.keyframe_id = nl.keyframe_id WHERE nl.location = ? LIMIT 1;`, [locationCode], true));
    if (firstPointWithLocation.length === 0) {
      logger.warn(`[PathfindFromPointId] Failed to find endpoint for a location, for start: ${point} and end location: ${locationCode}`)
      res.status(400).send("End location could not be found");
      return
    }
    locationResults = firstPointWithLocation
  }

  if ('keyframe_id' in locationResults) {
    const path = await aStarPathfinding(point, locationResults.keyframe_id, isLabel ? null : locationCode) ?? []
    local_cache.set(`${point}-${locationCode}`, path)
    if (local_cache.size > MAX_CACHE_SIZE) {
      try {
        local_cache.delete(local_cache.keys().next().value!)
      } catch (e) {
        logger.error(`[PathfindFromPointId] Failed to make space in the local_cache: ${e}`)
      }
    }
    res.json({ path })
  }
  else {
    logger.warn(`[PathfindFromPointId] A* failed to find endpoint: ${locationResults.keyframe_id} for start: ${point} and end location: ${locationCode}`)
    res.status(400).send("End location could not be found");
  }
}

export async function findNeigboursFromPointId(req: Request, res: Response) {

  const mainPointId = Number(req.params.id)
  const distanceThreshold = Number(req.params.distance_thresh_m);
  const yDistThresh = Number(req.params.y_dist_thresh_m);
  if (isNaN(Number(mainPointId)) || isNaN(Number(distanceThreshold)) || isNaN(Number(yDistThresh)) || yDistThresh > REASONABLE_MAX_Y_DIST_THRESHOLD || distanceThreshold > REASONABLE_MAX_XZ_DIST_THRESHOLD) {
    logger.warn(`[findNeighbourFromPointId] Invalid params - point: ${mainPointId} with dist threshold: ${distanceThreshold} and y threshold: ${yDistThresh}`)
    res.status(400).send("Invalid params").end();
    return;
  }

  // Fetch the initial point
  const currentPoint = await readDB(
    `SELECT x_trans, y_trans, z_trans FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes WHERE keyframe_id = ?`,
    [mainPointId], true
  );
  if (!currentPoint) {
    logger.warn(`[findNeighbourFromPointId] Point id doesn't exist: ${mainPointId} with dist threshold: ${distanceThreshold} and y threshold: ${yDistThresh}`)
    res.status(400).send("Point ID given does not exist!").end()
    return
  }

  res.json(await searchNeighbour(mainPointId, distanceThreshold, yDistThresh, currentPoint))
}

export async function getPointInfoFromId(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    logger.warn(`[getPointInfoFromId] invalid ID:${id}`)
    res.status(400).send("Non-number point ID passed").end()
    return
  }

  const pointData = await readDB(`SELECT n.keyframe_id, n.ts, n.pose, l.location, n.x_trans, n.y_trans, n.z_trans FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes n LEFT JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}node_locations l ON n.keyframe_id = l.keyframe_id WHERE n.keyframe_id = ?;`, [id], true);
  if (pointData && 'pose' in pointData) {
    res.json(convertToUICoordinateScale({ ...pointData, pose: BlobArrayToMatrix(pointData.pose) }))
  }
  else {
    logger.warn(`[getPointInfoFromId] id doesn't exist, or pose not in pointData: ${id} data: ${pointData}`)
    res.status(400).send("Point ID given does not exist!").end()
  }
}