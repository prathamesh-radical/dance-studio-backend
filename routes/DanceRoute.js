import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import { AddDanceStyle, DeleteDanceStyle, GetDanceStyle, UpdateDanceStyle } from "../controller/DanceController.js";

const DanceRoute = express.Router();

DanceRoute.post("/dance-style", authenticateToken, AddDanceStyle);
DanceRoute.get("/dance-style", authenticateToken, GetDanceStyle);
DanceRoute.put("/update-style", authenticateToken, UpdateDanceStyle);
DanceRoute.delete("/delete-style", authenticateToken, DeleteDanceStyle);

export default DanceRoute;