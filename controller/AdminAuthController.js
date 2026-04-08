import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/db.js";

export const AdminRegister = async (req, res) => {
    const { first_name, last_name, studio_name, phone_number, country_name, currency, email, password, confirm_password } = req.body;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!emailPattern.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address.", success: false });
    }

    if (!first_name || !last_name || !studio_name || !phone_number || !email || !password || !confirm_password || !currency) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }
    
    if (!country_name || typeof country_name !== 'string' || country_name.trim() === '' || !isNaN(country_name)) {
        return res.status(400).json({ message: "Please enter a valid country name", success: false });
    }

    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
        return res.status(400).json({ message: "Please select a valid currency", success: false });
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
                    "INSERT INTO registration (first_name, last_name, studio_name, phone_number, country_name, currency, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [first_name, last_name, studio_name, phone_number, country_name, currency, email, hashedPassword],
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
                        { expiresIn: "2h" }
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

export const UpdateProfile = async (req, res) => {
    const userId = req?.query?.user_id;

    let { first_name, last_name, studio_name, phone_number, email, country_name, currency, password, confirm_password } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: "user_id query parameter is required",
            success: false
        });
    }

    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address.", success: false });
        }
    }

    const cleanPassword = password?.trim();
    const cleanConfirmPassword = confirm_password?.trim();

    if (cleanPassword || cleanConfirmPassword) {

        if (!cleanPassword || !cleanConfirmPassword) {
            return res.status(400).json({ message: "Both password and confirm_password are required", success: false });
        }

        if (cleanPassword !== cleanConfirmPassword) {
            return res.status(400).json({ message: "Passwords do not match", success: false });
        }
    }

    const fieldsToUpdate = [];
    const values = [];

    if (first_name) {
        fieldsToUpdate.push("first_name = ?");
        values.push(first_name);
    }

    if (last_name) {
        fieldsToUpdate.push("last_name = ?");
        values.push(last_name);
    }

    if (studio_name) {
        fieldsToUpdate.push("studio_name = ?");
        values.push(studio_name);
    }

    if (phone_number) {
        fieldsToUpdate.push("phone_number = ?");
        values.push(phone_number);
    }

    if (email) {
        fieldsToUpdate.push("email = ?");
        values.push(email);
    }

    if (country_name && typeof country_name === 'string' && country_name.trim() !== '' && isNaN(country_name)) {
        fieldsToUpdate.push("country_name = ?");
        values.push(country_name);
    }

    if (currency && typeof currency === 'string' && currency.trim() !== '') {
        fieldsToUpdate.push("currency = ?");
        values.push(currency);
    }

    if (cleanPassword && cleanConfirmPassword) {
        try {
            const hashedPassword = await bcrypt.hash(cleanPassword, 10);
            fieldsToUpdate.push("password = ?");
            values.push(hashedPassword);
        } catch (err) {
            return res.status(500).json({ message: "Error hashing the password", success: false });
        }
    }

    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: "At least one field is required.", success: false });
    }

    const updateQuery = `UPDATE registration SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
    values.push(userId);

    try {
        db.query(updateQuery, values, (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error while updating profile", success: false });
            }

            if (result.affectedRows > 0) {
                return res.status(200).json({ message: "Profile updated successfully", success: true });
            }

            return res.status(404).json({ message: "No record found with the provided id", success: false });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};