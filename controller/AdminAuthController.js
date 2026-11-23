import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import db from "../db/db.js";

async function verifyGoogleUser(idToken, res) {
    const googleClientId = process.env.GOOGLE_WEB_CLIENT_ID;

    if (!googleClientId) {
        res.status(500).json({ message: "Google sign-in is not configured on the server.", success: false });
        return null;
    }

    if (!idToken) {
        res.status(400).json({ message: "Google ID token is required.", success: false });
        return null;
    }

    try {
        const ticket = await new OAuth2Client(googleClientId).verifyIdToken({
            idToken,
            audience: googleClientId,
        });
        const googleUser = ticket.getPayload();

        if (!googleUser?.email || googleUser.email_verified !== true) {
            res.status(401).json({ message: "A verified Google email is required.", success: false });
            return null;
        }

        return googleUser;
    } catch (error) {
        res.status(401).json({ message: "Invalid Google sign-in token.", success: false });
        return null;
    }
}

function sendGoogleLoginSuccess(res, user, message = "Login successful.") {
    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "3650d" }
    );

    return res.status(200).json({
        message,
        success: true,
        isNewUser: false,
        token,
        userId: user.id,
        studioName: user.studio_name,
        currency: user.currency,
        profileUrl: user.profile_url,
    });
}

export const AdminRegister = async (req, res) => {
    const { first_name, last_name, studio_name, phone_number, email, password, confirm_password } = req.body;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!emailPattern.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address.", success: false });
    }

    if (!first_name || !last_name || !studio_name || !phone_number || !email || !password || !confirm_password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match", success: false });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query("SELECT * FROM registration WHERE phone_number = ? OR email = ?", [phone_number, email], (err, result) => {
            if (result.length > 0) {
                return res.status(400).json({ message: "User already exists", success: false });
            } else {
                db.query(
                    "INSERT INTO registration (first_name, last_name, studio_name, phone_number, email, password, profile_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [first_name, last_name, studio_name, phone_number, email, hashedPassword, ""],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while registering you", success: false });
                        }
                        return res.status(200).json({ message: "User Registered Successfully", success: true });
                    }
                );
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false })
    }
};

export const AdminLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        db.query("SELECT * FROM  registration WHERE email = ?", [email], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            if (result.length > 0) {
                const isPasswordValid = await bcrypt.compare(password, result[0].password);
                if (isPasswordValid) {
                    const token = jwt.sign(
                        { id: result[0].id, email: result[0].email },
                        process.env.JWT_SECRET,
                        { expiresIn: "3650d" }
                    );
                    return res.status(200).json({ message: "Login successfull.", success: true, token: token, userId: result[0].id, studioName: result[0].studio_name, currency: result[0].currency });
                } else {
                    return res.status(401).json({ message: "Invalid Credential", success: false });
                }
            }
            else {
                return res.status(401).json({ message: "Invalid Credential", success: false });
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const AdminGoogleLogin = async (req, res) => {
    const { idToken, studio_name, phone_number, country_name, currency } = req.body || {};
    const studioName = typeof studio_name === "string" ? studio_name.trim() : "";
    const phoneNumber = typeof phone_number === "string" ? phone_number.trim() : "";
    const countryName = typeof country_name === "string" ? country_name.trim() : "";
    const currencyCode = typeof currency === "string" ? currency.trim().toUpperCase() : "";
    const googleUser = await verifyGoogleUser(idToken, res);
    if (!googleUser) return;
    const email = googleUser.email.trim().toLowerCase();
    const profileUrl = typeof googleUser.picture === "string" ? googleUser.picture : "";
    const fullName = String(googleUser.name || "").trim();
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const firstName = String(googleUser.given_name || nameParts[0] || email.split("@")[0]).trim();
    const lastName = String(googleUser.family_name || nameParts.slice(1).join(" ")).trim();

    try {
        const [existingAccounts] = await db.promise().query(
            "SELECT id, email, studio_name, currency, profile_url FROM registration WHERE LOWER(email) = LOWER(?) LIMIT 1",
            [email]
        );
        if (existingAccounts.length > 0) {
            const existingAccount = existingAccounts[0];
            if (profileUrl && profileUrl !== existingAccount.profile_url) {
                await db.promise().query(
                    "UPDATE registration SET profile_url = ? WHERE id = ?",
                    [profileUrl, existingAccount.id]
                );
                existingAccount.profile_url = profileUrl;
            }
            return sendGoogleLoginSuccess(res, existingAccount);
        }

        const hasOnboardingDetails = Boolean(studioName || phoneNumber || countryName || currencyCode);
        if (!hasOnboardingDetails) {
            return res.status(200).json({
                message: "Studio details are required to finish creating your account.",
                success: true,
                isNewUser: true,
                userData: { email, firstName, lastName },
            });
        }

        if (!studioName || !phoneNumber || !countryName || !currencyCode) {
            return res.status(400).json({
                message: "Studio name, phone number, country, and currency are required.",
                success: false,
            });
        }

        const [phoneAccounts] = await db.promise().query(
            "SELECT id FROM registration WHERE phone_number = ? LIMIT 1",
            [phoneNumber]
        );
        if (phoneAccounts.length > 0) {
            return res.status(409).json({ message: "This phone number is already associated with another account.", success: false });
        }

        const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

        const [insertResult] = await db.promise().query(
            "INSERT INTO registration (first_name, last_name, studio_name, phone_number, country_name, currency, email, password, profile_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [firstName, lastName, studioName, phoneNumber, countryName, currencyCode, email, password, profileUrl]
        );

        return sendGoogleLoginSuccess(res, {
            id: insertResult.insertId,
            email,
            studio_name: studioName,
            currency: currencyCode,
            profile_url: profileUrl,
        }, "Account created successfully.");
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "An account with these details already exists. Please sign in again.", success: false });
        }
        console.error("Error completing Google sign-in:", error);
        return res.status(500).json({ message: "Error completing Google sign-in.", success: false });
    }
};

export const UpdateProfile = (req, res) => {
    const {
        first_name, last_name, email, studio_name, phone_number, country_name, currency,
    } = req.body || {};
    const userId = req?.query?.user_id;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    const profileFields = {
        first_name,
        last_name,
        email,
        studio_name,
        phone_number,
        country_name,
        currency,
    };
    const fields = Object.entries(profileFields).filter(([, value]) => value !== undefined);
    if (fields.length === 0) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    const assignments = fields.map(([field]) => `${field} = ?`);
    const values = fields.map(([, value]) => value);
    values.push(userId);

    db.query(
        `UPDATE registration SET ${assignments.join(", ")} WHERE id = ?`,
        values,
        (err, results) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: "This email address is already associated with another account.", success: false });
                }
                return res.status(500).json({ message: "Database error", success: false });
            }
            if (results.affectedRows === 0) {
                return db.query("SELECT id FROM registration WHERE id = ?", [userId], (lookupErr, users) => {
                    if (lookupErr) {
                        return res.status(500).json({ message: "Database error", success: false });
                    }
                    if (users.length === 0) {
                        return res.status(404).json({ message: "User not found", success: false });
                    }
                    return res.status(200).json({ message: "Profile updated successfully", success: true });
                });
            }
            return res.status(200).json({ message: "Profile updated successfully", success: true });
        }
    );
};

export const UpdateStudio = (req, res) => {
    const { studio_name, phone_number } = req.body;
    const userId = req?.query?.user_id;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!studio_name && !phone_number) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    try {
        db.query(`UPDATE registration SET studio_name = ?, phone_number = ? WHERE id = ?`,
            [studio_name, phone_number, userId],
            (err, results) => {
                if (err) {
                    return res.status(500).json({ message: "Database error", success: false });
                }
                if (results.affectedRows === 0) {
                    return res.status(404).json({ message: "User not found", success: false });
                }
                return res.status(200).json({ message: "Profile updated successfully", success: true });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const UpdatePreference = (req, res) => {
    const { currency, country_name } = req.body;
    const userId = req?.query?.user_id;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!currency && !country_name) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    const fields = [];
    const values = [];

    if (currency) {
        fields.push("currency = ?");
        values.push(currency);
    }
    if (country_name) {
        fields.push("country_name = ?");
        values.push(country_name);
    }

    values.push(userId);

    db.query(`UPDATE registration SET ${fields.join(", ")} WHERE id = ?`, values, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", success: false });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        return res.status(200).json({ message: "Settings updated successfully", success: true });
    });
};

export const UpdatePassword = (req, res) => {
    const { password, confirm_password } = req.body;
    const userId = req?.query?.user_id;

    if (!password && !confirm_password) {
        return res.status(400).json({ message: "Password is required", success: false });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ message: "Password and Confirm Password should be same.", success: false });
    }

    db.query("SELECT password FROM registration WHERE id = ?", [userId], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", success: false });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query("UPDATE registration SET password = ? WHERE id = ?", [hashedPassword, userId],
                (updateErr, updateResults) => {
                    if (updateErr) {
                        return res.status(500).json({ message: "Database error", success: false });
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ message: "User not found", success: false });
                    }

                    return res.status(200).json({ message: "Password updated successfully", success: true });
                }
            );
        } catch (error) {
            return res.status(500).json({ message: "Error processing password", success: false });
        }
    });
};