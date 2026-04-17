import express from 'express';
import {
    AdminLogin, AdminRegister, UpdatePassword, UpdatePreference, UpdateProfile, UpdateStudio
} from '../controller/AdminAuthController.js';
import authenticateToken from '../middlewares/verifyToken.js';

const AuthAdminRoute = express.Router();

AuthAdminRoute.post("/register", AdminRegister);
AuthAdminRoute.post("/login", AdminLogin);
AuthAdminRoute.put("/update-password", authenticateToken, UpdatePassword);
AuthAdminRoute.put("/update-profile", authenticateToken, UpdateProfile);
AuthAdminRoute.put("/update-preference", authenticateToken, UpdatePreference);
AuthAdminRoute.put("/update-studio", authenticateToken, UpdateStudio);

export default AuthAdminRoute;