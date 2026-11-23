import express from "express";
import authenticateToken from "../middlewares/verifyToken.js";
import {
    CollectStudentPayment,
    GetAttendanceReport,
    GetPaymentById,
    GetPaymentHistory,
    GetPaymentSummary,
    GetPendingFees,
    GetEnrollmentReport,
    GetRevenueReport,
    GetReportSummary,
    GetStudentAttendance,
    GetStudentAttendanceHistory,
    GetStudentAttendanceSummary,
    GetTrainerAttendance,
    GetTrainerAttendanceHistory,
    SaveStudentAttendance,
    SaveTrainerAttendance,
} from "../controller/AttendancePaymentController.js";

const AttendancePaymentRoute = express.Router();

AttendancePaymentRoute.get("/attendance/students/:studentId/history", authenticateToken, GetStudentAttendanceHistory);
AttendancePaymentRoute.get("/attendance/students/summary", authenticateToken, GetStudentAttendanceSummary);
AttendancePaymentRoute.get("/attendance/students", authenticateToken, GetStudentAttendance);
AttendancePaymentRoute.post("/attendance/students", authenticateToken, SaveStudentAttendance);
AttendancePaymentRoute.get("/attendance/trainers/:trainerId/history", authenticateToken, GetTrainerAttendanceHistory);
AttendancePaymentRoute.get("/attendance/trainers", authenticateToken, GetTrainerAttendance);
AttendancePaymentRoute.post("/attendance/trainers", authenticateToken, SaveTrainerAttendance);
AttendancePaymentRoute.get("/attendance/report", authenticateToken, GetAttendanceReport);
AttendancePaymentRoute.get("/payments/pending", authenticateToken, GetPendingFees);
AttendancePaymentRoute.get("/payments/summary", authenticateToken, GetPaymentSummary);
AttendancePaymentRoute.get("/payments/history", authenticateToken, GetPaymentHistory);
AttendancePaymentRoute.get("/payments/history/:id", authenticateToken, GetPaymentById);
AttendancePaymentRoute.post("/payments/collect", authenticateToken, CollectStudentPayment);
AttendancePaymentRoute.get("/reports/summary", authenticateToken, GetReportSummary);
AttendancePaymentRoute.get("/reports/enrollment", authenticateToken, GetEnrollmentReport);
AttendancePaymentRoute.get("/reports/revenue", authenticateToken, GetRevenueReport);

export default AttendancePaymentRoute;
