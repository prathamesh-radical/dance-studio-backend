import express from 'express';
import {
    AddCustomer, AddMembership, RenewMembership, UpdateDetails, UpdateStudioName, UpdateUserCountry, UpdateUserEmail, UpdateUserName, UpdateUserNumber, UpdateUserPassword
} from '../controller/MemberController.js';

const MemberRoute = express.Router();

MemberRoute.post("/addMembership", AddMembership);
MemberRoute.post("/addCustomer", AddCustomer);
MemberRoute.put("/updateDetails", UpdateDetails);
MemberRoute.post("/renewMembership", RenewMembership);
MemberRoute.put("/updateUserName", UpdateUserName);
MemberRoute.put("/updateStudioName", UpdateStudioName);
MemberRoute.put("/updateUserNumber", UpdateUserNumber);
MemberRoute.put("/updateUserEmail", UpdateUserEmail);
MemberRoute.put("/updateUserCountry", UpdateUserCountry);
MemberRoute.put("/updateUserPassword", UpdateUserPassword);

export default MemberRoute;