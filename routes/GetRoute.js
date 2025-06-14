import express from "express";
import { GetCustomers, GetMembership, GetRenewData, GetUsersData } from "../controller/GetDataController.js";
import authenticateToken from "../middlewares/verifyToken.js";

const GetRoutes = express.Router();

GetRoutes.get("/membership", authenticateToken, GetMembership);
GetRoutes.get("/customers", authenticateToken, GetCustomers);
GetRoutes.get("/renew", authenticateToken, GetRenewData);
GetRoutes.get("/users", authenticateToken, GetUsersData);

export default GetRoutes;