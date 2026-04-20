import express from 'express';
import {
    AdminLogin, AdminRegister, ForgotPassword, UpdatePassword, UpdatePreference, UpdateProfile, UpdateStudio,
    VerifyOTP
} from '../controller/AdminAuthController.js';
import authenticateToken from '../middlewares/verifyToken.js';

const AuthAdminRoute = express.Router();

AuthAdminRoute.post("/register", AdminRegister);
AuthAdminRoute.post("/login", AdminLogin);
AuthAdminRoute.put("/update-password", authenticateToken, UpdatePassword);
AuthAdminRoute.put("/update-profile", authenticateToken, UpdateProfile);
AuthAdminRoute.put("/update-preference", authenticateToken, UpdatePreference);
AuthAdminRoute.put("/update-studio", authenticateToken, UpdateStudio);
AuthAdminRoute.post("/forgot-password", ForgotPassword);
AuthAdminRoute.post("/verify-otp", VerifyOTP);

export default AuthAdminRoute;