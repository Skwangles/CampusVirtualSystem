
import { Router } from "express";
import { getImageByTs, getImageById } from "../controllers/image.controller";

const app = Router();

app.get('/:resolution/:ts', getImageByTs)

app.get('/:id', getImageById)

export default app;