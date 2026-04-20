import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/db.js";
import nodemailer from "nodemailer";

export const AdminRegister = async (req, res) => {
    const { first_name, last_name, studio_name, phone_number, email, password, confirm_password } = req.body;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
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
                    "INSERT INTO registration (first_name, last_name, studio_name, phone_number, email, password) VALUES (?, ?, ?, ?, ?, ?)",
                    [first_name, last_name, studio_name, phone_number, email, hashedPassword],
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

export const UpdateProfile = (req, res) => {
    const { first_name, last_name, email } = req.body;
    const userId = req?.query?.user_id;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required", success: false });
    }

    if (!first_name && !last_name && !email) {
        return res.status(400).json({ message: "At least one field is required", success: false });
    }

    try {
        db.query(`UPDATE registration SET first_name = ?, last_name = ?, email = ? WHERE id = ?`,
            [first_name, last_name, email, userId],
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

const otpStore = new Map();

export const ForgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required", success: false });
    }

    try {
        // 1. Check if user exists
        db.query("SELECT * FROM registration WHERE email = ?", [email], async (err, result) => {
            console.log("err", err);
            if (result.length === 0) {
                return res.status(404).json({ message: "User not found with this email", success: false });
            }

            // 2. Generate 6 Digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            otpStore.set(email, { otp, expires: Date.now() + 600000 }); // 10 mins expiry

            // 3. Setup Nodemailer
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // Port 465 ke liye true, 587 ke liye false
                auth: {
                    user: "nimjeprathamesh1@gmail.com",
                    pass: "euzs wapg dspf jlyc",
                },
                tls: {
                    // Isse connection reject nahi hoga agar network resolve issue ho
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: "nimjeprathamesh1@gmail.com",
                to: email,
                subject: "Your OTP for Password Reset",
                text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
                html: `<h3>Password Reset OTP</h3><p>Your OTP is <b>${otp}</b></p>`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);
                    return res.status(500).json({ message: "Failed to send email", success: false });
                }
                return res.status(200).json({ message: "OTP sent successfully to your email", success: true });
            });
        });
    } catch (error) {
        console.log("error", error);
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const VerifyOTP = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const storedData = otpStore.get(email);

    if (!storedData || storedData.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (Date.now() > storedData.expires) {
        otpStore.delete(email);
        return res.status(400).json({ message: "OTP Expired", success: false });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query("UPDATE registration SET password = ? WHERE email = ?", [hashedPassword, email], (err, result) => {
            otpStore.delete(email);
            return res.status(200).json({ message: "Password updated successfully", success: true });
        });
    } catch (error) {
        return res.status(500).json({ message: "Error updating password", success: false });
    }
};