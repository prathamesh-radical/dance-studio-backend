import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import {
    AddDanceStyle,
    DeleteDanceStyle,
    GetDanceStyle,
    GetTrashedDanceStyles,
    MoveDanceStyleToTrash,
    RestoreDanceStyle,
    UpdateDanceStyle,
} from "../controller/DanceController.js";

const DanceRoute = express.Router();

DanceRoute.post("/dance-style", authenticateToken, AddDanceStyle);
DanceRoute.get("/dance-style", authenticateToken, GetDanceStyle);
DanceRoute.get("/trash/dance-style", authenticateToken, GetTrashedDanceStyles);
DanceRoute.put("/update-style", authenticateToken, UpdateDanceStyle);
DanceRoute.delete("/delete-style", authenticateToken, DeleteDanceStyle);
DanceRoute.put("/trash-style", authenticateToken, MoveDanceStyleToTrash);
DanceRoute.put("/restore-style", authenticateToken, RestoreDanceStyle);

export default DanceRoute;