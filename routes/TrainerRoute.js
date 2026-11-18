import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import { AddTrainer, GetTrainers, UpdateTrainer } from "../controller/TrainerController.js";

const TrainerRoute = express.Router();

TrainerRoute.post("/add-trainer", authenticateToken, AddTrainer);
TrainerRoute.put("/update-trainer/:id", authenticateToken, UpdateTrainer);
TrainerRoute.get("/trainers", authenticateToken, GetTrainers);

export default TrainerRoute;
