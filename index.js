import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import db from "./db/db.js";
import AuthAdminRoute from "./routes/AdminAuth.js";
import MemberRoute from "./routes/MemberRoute.js";
import GetRoutes from "./routes/GetRoute.js";
import DanceRoute from "./routes/DanceRoute.js";
import StudentRoute from "./routes/StudentRoute.js";
import TrainerRoute from "./routes/TrainerRoute.js";
import ClassRoute from "./routes/ClassRoute.js";
import AttendancePaymentRoute from "./routes/AttendancePaymentRoute.js";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);

app.use(express.json())

app.use(cors());
app.use(bodyParser.json());;

db.getConnection((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

app.get("/", (req, res) => {
    res.send("Hello Dance Management System");
});

app.use("/api/auth", AuthAdminRoute);
app.use("/api", MemberRoute);
app.use("/api", GetRoutes);
app.use("/api", DanceRoute);
app.use("/api", StudentRoute);
app.use("/api", TrainerRoute);
app.use("/api", ClassRoute);
app.use("/api", AttendancePaymentRoute);

app.listen(PORT, () => {
    console.log(`Native app listening on port ${PORT}`);
});