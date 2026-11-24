import express from "express";
import {
	AddClass,
	DeleteClass,
	GetClasses,
	GetTrashedClasses,
	MoveClassToTrash,
	RestoreClass,
	UpdateClass,
} from "../controller/ClassController.js";
import authenticateToken from "../middlewares/verifyToken.js";

const ClassRoute = express.Router();

ClassRoute.get("/classes", authenticateToken, GetClasses);
ClassRoute.get("/trash/classes", authenticateToken, GetTrashedClasses);
ClassRoute.post("/classes", authenticateToken, AddClass);
ClassRoute.put("/classes/:id", authenticateToken, UpdateClass);
ClassRoute.put("/trash-class", authenticateToken, MoveClassToTrash);
ClassRoute.put("/restore-class", authenticateToken, RestoreClass);
ClassRoute.delete("/delete-class", authenticateToken, DeleteClass);

export default ClassRoute;