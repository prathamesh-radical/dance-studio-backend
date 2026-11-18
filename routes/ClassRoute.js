import express from "express";
import { AddClass, GetClasses, UpdateClass } from "../controller/ClassController.js";
import authenticateToken from "../middlewares/verifyToken.js";

const ClassRoute = express.Router();

ClassRoute.get("/classes", authenticateToken, GetClasses);
ClassRoute.post("/classes", authenticateToken, AddClass);
ClassRoute.put("/classes/:id", authenticateToken, UpdateClass);

export default ClassRoute;