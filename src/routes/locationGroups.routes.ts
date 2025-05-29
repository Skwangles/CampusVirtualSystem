import { Router } from "express";
import { getAllSearchableLabels, getPointWithLocationGroupOrLabelName } from "../controllers/locationGroups.controller";

const app = Router();

app.get('/labels', getAllSearchableLabels)

app.get('/:locationgroup/point/', getPointWithLocationGroupOrLabelName)


export default app;