import { Router } from "express";
import { getMapPoints, getAllLocationGroups, getLocationGroupImageByName, mapFeaturesEnabled } from "../controllers/map.controller";

const app = Router();

app.get('/:name/image', mapFeaturesEnabled, getLocationGroupImageByName)

app.get('/:name', mapFeaturesEnabled, getMapPoints)

app.get('/', mapFeaturesEnabled, getAllLocationGroups)


export default app;