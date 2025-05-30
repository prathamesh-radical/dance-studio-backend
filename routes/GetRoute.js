import express from "express";
import { GetCustomers, GetMembership, GetRenewData, GetUsersData } from "../controller/GetDataController.js";

const GetRoutes = express.Router();

GetRoutes.get("/membership", GetMembership);
GetRoutes.get("/customers", GetCustomers);
GetRoutes.get("/renew", GetRenewData);
GetRoutes.get("/users", GetUsersData);

export default GetRoutes;