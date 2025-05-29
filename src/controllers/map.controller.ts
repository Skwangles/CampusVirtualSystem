import path from "node:path";
import fs from 'fs'
import { USE_TABLE_PREFIX, TABLE_PREFIX, FLOORPLAN_IMG_DIR, REASONABLE_MAX_STRING_SIZE } from "../consts";
import { readDB } from "../db";
import { NextFunction, Request, Response } from "express";
import logger from "../logger";

export function mapFeaturesEnabled(req: Request, res: Response, next: NextFunction) {
  if (!process.env.IS_FLOORPLANS_EXISTS || process.env.IS_FLOORPLANS_EXISTS == 'false') {
    res.sendStatus(403);
    return;
  }
  next()
}

export async function getMapPoints(req: Request, res: Response) {

  const name = String(req.params.name).trim();
  if (name == null || name == "") {
    logger.warn(`[GetMapPoints] Invalid name: ${name}`)
    res.status(400).send("Invalid Arguments")
    return
  }

  // Includes keyframes bordering the floor (add 'AND type < 50' to exclude)
  const pointResult = await readDB(`SELECT f.keyframe_id, x, y, type FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_points f JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}nodes n ON n.keyframe_id = f.keyframe_id WHERE location = ?`, [name]);
  const image = await readDB(`SELECT path FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_images WHERE location = ? LIMIT 1;`, [name])

  const edges = await readDB(`SELECT  e.keyframe_id0, e.keyframe_id1 FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}edges e JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_points f ON e.keyframe_id0 = f.keyframe_id JOIN ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_points f2 ON e.keyframe_id1 = f2.keyframe_id WHERE f.location = ? AND f2.location = ?`, [name, name])
  if (pointResult.length && pointResult.length > 0 && image.length && image.length > 0) {
    res.json({ nodes: pointResult, has_image: image[0].path != '', image: image[0].path, edges: edges })
  } else {
    logger.warn(`[GetMapPoints] Floorplan not found with name: ${name}`)
    res.status(404).send('Floorplan not found');
  }
}

export async function getAllLocationGroups(req: Request, res: Response) {
  const floorplanResults = await readDB(`SELECT DISTINCT location FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_images;`)
  res.json(floorplanResults.map((val: { location: string }) => val.location));
}

export async function getLocationGroupImageByName(req: Request, res: Response) {

  const name = String(req.params.name);
  if (name == null || name == "" || name.length > REASONABLE_MAX_STRING_SIZE) {
    logger.error(`[GetLocGroupImgByName] Invalid name passed: ${name}`)
    res.status(400).send("Invalid Arguments")
    return
  }

  const result = await readDB(`SELECT path FROM ${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_images WHERE location = ? LIMIT 1;`, [name], true)
  if (!result) {
    logger.warn(`[GetLocGroupImgByName] Could not find path from location name: ${name}`)
    res.sendStatus(404).send("Invalid uments");
    return;
  }

  const pathString = path.join(FLOORPLAN_IMG_DIR, String(result.path));

  // Check the path is valid and isn't a directory traversal attempt
  if (!pathString && path.dirname(pathString) == FLOORPLAN_IMG_DIR && path.basename(pathString) != "") {
    logger.warn(`[GetLocGroupImgByName] Invalid path string: ${pathString} for name: ${name}`)
    res.status(404).send("Invalid Arguments")
    return
  }
  else if (fs.existsSync(pathString) && fs.statSync(pathString).isFile()) {

    res.sendFile(pathString)
    return
  }
  else {
    logger.warn(`[GetLocGroupImgByName] File does not exist: ${pathString} for name: ${name}`)
    res.status(404).send("Invalid Arguments");
  }
}