import express from 'express';
import { AddCustomer, AddMembership, RenewMembership, UpdateDetails } from '../controller/MemberController.js';

const MemberRoute = express.Router();

MemberRoute.post("/addMembership", AddMembership);
MemberRoute.post("/addCustomer", AddCustomer);
MemberRoute.put("/updateDetails", UpdateDetails);
MemberRoute.post("/renewMembership", RenewMembership);

export default MemberRoute;