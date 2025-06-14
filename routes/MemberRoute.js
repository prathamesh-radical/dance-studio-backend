import express from 'express';
import {
    AddCustomer, AddMembership, RenewMembership, UpdateDetails, UpdateStudioName, UpdateUserCountry, UpdateUserEmail, UpdateUserName, UpdateUserNumber, UpdateUserPassword
} from '../controller/MemberController.js';
import authenticateToken from '../middlewares/verifyToken.js';

const MemberRoute = express.Router();

MemberRoute.post("/addMembership", authenticateToken, AddMembership);
MemberRoute.post("/addCustomer", authenticateToken, AddCustomer);
MemberRoute.put("/updateDetails", authenticateToken, UpdateDetails);
MemberRoute.post("/renewMembership", authenticateToken, RenewMembership);
MemberRoute.put("/updateUserName", authenticateToken, UpdateUserName);
MemberRoute.put("/updateStudioName", authenticateToken, UpdateStudioName);
MemberRoute.put("/updateUserNumber", authenticateToken, UpdateUserNumber);
MemberRoute.put("/updateUserEmail", authenticateToken, UpdateUserEmail);
MemberRoute.put("/updateUserCountry", authenticateToken, UpdateUserCountry);
MemberRoute.put("/updateUserPassword", authenticateToken, UpdateUserPassword);

export default MemberRoute;