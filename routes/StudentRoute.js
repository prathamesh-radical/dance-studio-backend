import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import {
    AddStudent,
    DeleteStudent,
    GetTrashedStudents,
    MoveStudentToTrash,
    RestoreStudent,
    UpdateStudent,
} from "../controller/StudentController.js";

const StudentRoute = express.Router();

StudentRoute.post("/add-student", authenticateToken, AddStudent);
StudentRoute.put("/update-student/:id", authenticateToken, UpdateStudent);
StudentRoute.get("/trash/students", authenticateToken, GetTrashedStudents);
StudentRoute.put("/trash-student", authenticateToken, MoveStudentToTrash);
StudentRoute.put("/restore-student", authenticateToken, RestoreStudent);
StudentRoute.delete("/delete-student", authenticateToken, DeleteStudent);

export default StudentRoute;