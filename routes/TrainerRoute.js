import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import {
	AddTrainer,
	DeleteTrainer,
	GetTrainers,
	GetTrashedTrainers,
	MoveTrainerToTrash,
	RestoreTrainer,
	UpdateTrainer,
} from "../controller/TrainerController.js";

const TrainerRoute = express.Router();

TrainerRoute.post("/add-trainer", authenticateToken, AddTrainer);
TrainerRoute.put("/update-trainer/:id", authenticateToken, UpdateTrainer);
TrainerRoute.get("/trainers", authenticateToken, GetTrainers);
TrainerRoute.get("/trash/trainers", authenticateToken, GetTrashedTrainers);
TrainerRoute.put("/trash-trainer", authenticateToken, MoveTrainerToTrash);
TrainerRoute.put("/restore-trainer", authenticateToken, RestoreTrainer);
TrainerRoute.delete("/delete-trainer", authenticateToken, DeleteTrainer);

export default TrainerRoute;
