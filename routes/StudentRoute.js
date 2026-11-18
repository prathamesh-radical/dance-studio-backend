import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import { AddStudent, UpdateStudent } from "../controller/StudentController.js";

const StudentRoute = express.Router();

StudentRoute.post("/add-student", authenticateToken, AddStudent);
StudentRoute.put("/update-student/:id", authenticateToken, UpdateStudent);

export default StudentRoute;