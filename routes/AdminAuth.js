import express from 'express';
import { AdminLogin, AdminRegister, UpdateProfile } from '../controller/AdminAuthController.js';
import authenticateToken from '../middlewares/verifyToken.js';

const AuthAdminRoute = express.Router();

AuthAdminRoute.post("/register", AdminRegister);
AuthAdminRoute.post("/login", AdminLogin);
AuthAdminRoute.put("/update-profile", authenticateToken, UpdateProfile);

export default AuthAdminRoute;