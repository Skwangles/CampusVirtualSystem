import { Request, Response } from "express";
import path from "path";
import sharp from "sharp";
import {
  KEYFRAME_IMG_DIR,
  KEYFRAME_IMG_EXTENSION,
  USE_TABLE_PREFIX,
  TABLE_PREFIX,
} from "../consts";
import fs from "fs";
import { readDB } from "../db";
import logger from "../logger";

const RESOLUTION_LEVELS = {
  // Aspect ratio of Equirectangular images is 2:1
  preview: { width: 64, height: 32 },
  lowest: { width: 256, height: 128 },
  low: { width: 512, height: 256 },
  medium: { width: 1024, height: 512 },
  high: { width: 2048, height: 1024 },
  ultra: { width: 4096, height: 2048 },
} as const;

type ResolutionLevel = keyof typeof RESOLUTION_LEVELS;

export async function getImageByTs(req: Request, res: Response): Promise<void> {
  const ts = Number(req.params.ts);
  if (isNaN(ts)) {
    logger.warn(
      `[getImageByTs] invalid ts (note, may be called via getImgbyId):${ts}`
    );
    res.status(400).send("Invalid Arguments");
    return;
  }

  const resolution = req.params.resolution as ResolutionLevel;
  if (!(resolution in RESOLUTION_LEVELS)) {
    logger.warn(
      `[getImageByTs] invalid res (note, may be called via getImgbyId): ${res}not in: ${Object.keys(
        RESOLUTION_LEVELS
      ).join(", ")}`
    );
    res.status(400).send("Invalid Arguments");
    return;
  }

  const imgPath = path.join(
    KEYFRAME_IMG_DIR,
    ts.toFixed(5) + KEYFRAME_IMG_EXTENSION
  );
  if (!fs.existsSync(imgPath)) {
    logger.error(`[getImageByTs] Cannot find image file: ${imgPath}`);
    res.status(404).send("Image does not exist").end();
    return;
  }

  try {
    const { width, height } = RESOLUTION_LEVELS[resolution];

    // Process and send the image at the requested resolution
    const image = sharp(imgPath)
      .resize(width, height, {
        fit: "fill",
        withoutEnlargement: true,
      })
      .jpeg({ quality: resolution === "preview" ? 60 : 85 });

    res.set("Content-Type", "image/png");
    image.pipe(res);
  } catch (error) {
    logger.error(
      `[getImageByTs] Internal error - Error processing image: ${error}`
    );
    res.status(500).send("Could not process image, please try again later");
  }
}

export async function getImageById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    logger.warn(`[GetImageById] invalid ID argument: ${id}`);
    res.status(400).send("Invalid Arguments");
    return;
  }

  const result = await readDB(
    `SELECT ts FROM ${
      USE_TABLE_PREFIX ? TABLE_PREFIX : ""
    }nodes WHERE keyframe_id = ? LIMIT 1`,
    [id],
    true
  );
  if (!result) {
    logger.warn(`[GetImageById] - Could not find node with id: ${id}`);
    res.status(404).send("Invalid Arguments");
    return;
  }

  const ts = Number(result.ts).toFixed(5);
  if (isNaN(Number(result.ts))) {
    logger.warn(
      `[GetImageById] Invalid Timestamp from TS: ${ts} from id: ${id}`
    );
    res.status(400).send("Invalid Arguments");
    return;
  }

  req.params.ts = ts;
  req.params.resolution = "ultra";
  await getImageByTs(req, res);
}
