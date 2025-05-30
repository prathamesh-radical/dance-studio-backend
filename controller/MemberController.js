import db from "../db/db.js";
import bcrypt from "bcrypt";

export const AddMembership = async (req, res) => {
    const { st_id, plan_name, duration, unit, price } = req.body;
    const sql = `INSERT INTO membership (st_id, plan_name, duration, unit, price) VALUES (?, ?, ?, ?, ?)`;

    if (!st_id || !plan_name || !duration || !unit || !price) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(sql, [ st_id, plan_name, duration, unit, price ], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Server error', success: false });
            }
            res.status(201).json({ message: 'Membership created successfully', success: true });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false })
    }
};

export const AddCustomer = async (req, res) => {
    const {
        st_id, first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date
    } = req.body;

    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address.", success: false });
        }
    }

    const requiredFields = [
        { key: 'st_id', label: 'Studio ID' },
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'phone_no', label: 'Phone Number' },
        { key: 'gender', label: 'Gender' },
        { key: 'city', label: 'City' },
        { key: 'allergies', label: 'Allergies' },
    ];

    let missingFields = requiredFields
        .filter(field => !req.body[field.key] || req.body[field.key].toString().trim() === '')
        .map(field => field.label);

    if (allergies === "Yes" && (!details || details.toString().trim() === '')) {
        missingFields.push('Details');
    }

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            message: `Please fill all the required fields: ${missingFields.join(', ')}`, 
            success: false 
        });
    }

    try {
        db.query(
            "SELECT * FROM customer_registration WHERE phone_no = ? AND st_id = ?", 
            [phone_no, st_id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing customer", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "Customer already exists", success: false });
                }

                db.query(
                    "INSERT INTO customer_registration (st_id, first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [st_id, first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while registering customer", success: false });
                        }

                        const customerId = result.insertId;

                        if (membership_type || membership_duration || membership_unit || membership_price || joining_date || payment || expiry_date) {
                            db.query(
                                "INSERT INTO renew_customer (user_id, st_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                [customerId, st_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date],
                                (err, renewResult) => {
                                    if (err) {
                                        return res.status(500).json({ message: "Error while registering renewal", success: false });
                                    }
                                    return res.status(200).json({ message: "Customer registered successfully", success: true });
                                }
                            );
                        } else {
                            return res.status(200).json({ message: "Customer registered successfully", success: true });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateDetails = async (req, res) => {
    const {
        st_id, first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details
    } = req.body;

    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address.", success: false });
        }
    }

    const requiredFields = [
        { key: 'st_id', label: 'Studio ID' },
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'phone_no', label: 'Phone Number' },
        { key: 'gender', label: 'Gender' },
        { key: 'city', label: 'City' },
        { key: 'allergies', label: 'allergies' },
    ];

    let missingFields = requiredFields
        .filter(field => !req.body[field.key] || req.body[field.key].toString().trim() === '')
        .map(field => field.label);

    if (allergies === "Yes" && (!details || details.toString().trim() === '')) {
        missingFields.push('Details');
    }

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            message: `Please fill all the required fields: ${missingFields.join(', ')}`, 
            success: false 
        });
    }

    try {
        db.query(
            "UPDATE customer_registration SET first_name = ?, last_name = ?, email = ?, dob = ?, gender = ?, address = ?, city = ?, weight = ?, height = ?, emergency_first_name = ?, emergency_last_name = ?, relation = ?, emergency_phone_no = ?, allergies = ?, details = ? WHERE phone_no = ? AND st_id = ?", [first_name, last_name, email, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, phone_no, st_id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                }
                if (result.affectedRows > 0) {
                    return res.status(200).json({ message: "Data updated successfully", success: true });
                } else {
                    return res.status(404).json({ message: "No record found with the provided phone number", success: false });
                }
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const RenewMembership = async (req, res) => {
    const { user_id, st_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, renew_date, expiry_date } = req.body;

    const requiredFields = [
        { key: 'membership_type', label: 'Membership Type' },
        { key: 'membership_duration', label: 'Membership Duration' },
        { key: 'membership_unit', label: 'Membership Unit' },
        { key: 'membership_price', label: 'Membership Price' },
        { key: 'payment', label: 'Payment' },
        { key: 'user_id', label: 'User Id' },
        { key: 'st_id', label: 'Studio Id' },
        { key: 'expiry_date', label: 'Expiry Date' },
    ];

    let missingFields = requiredFields
        .filter(field => !req.body[field.key] || req.body[field.key].toString().trim() === '')
        .map(field => field.label);

    if (!joining_date && !renew_date) {
        missingFields.push('Joining Date or Renew Date (at least one is required)');
    }

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            message: `Please fill all the required fields: ${missingFields.join(', ')}`, 
            success: false 
        });
    }

    try {
        db.query(
            "SELECT * FROM renew_customer WHERE user_id = ? AND st_id = ? AND (joining_date = ? OR joining_date = ? OR renew_date = ? OR renew_date = ?)", 
            [user_id, st_id, joining_date, renew_date, joining_date, renew_date], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing customer", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "Membership is already renewed.", success: false });
                }
                db.query(
                    "INSERT INTO renew_customer (user_id, st_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, renew_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                    [user_id, st_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, renew_date, payment, expiry_date],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while renewing the subscription.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "Membership renewed successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateUserName = async (req, res) => {
    const { id, first_name, last_name } = req.body;

    if (!id || !first_name || !last_name) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            "SELECT * FROM registration WHERE first_name = ? AND last_name = ? AND id = ?", [first_name, last_name, id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing user", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "This name is already registered.", success: false });
                }
                db.query(
                    "UPDATE registration SET first_name = ?, last_name = ? WHERE id = ?", [first_name, last_name, id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "User Name updated successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateStudioName = async (req, res) => {
    const { id, studio_name } = req.body;

    if (!id || !studio_name) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            "SELECT * FROM registration WHERE studio_name = ? AND id = ?", [studio_name, id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing user", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "This studio name is already registered.", success: false });
                }
                db.query(
                    "UPDATE registration SET studio_name = ? WHERE id = ?", [studio_name, id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "Studio Name updated successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateUserNumber = async (req, res) => {
    const { id, phone_number } = req.body;

    if (!id || !phone_number) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            "SELECT * FROM registration WHERE phone_number = ?", [phone_number], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing user", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "This phone number is already registered.", success: false });
                }
                db.query(
                    "UPDATE registration SET phone_number = ? WHERE id = ?", [phone_number, id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "Phone number updated successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateUserEmail = async (req, res) => {
    const { id, email } = req.body;

    if (!id || !email) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            "SELECT * FROM registration WHERE email = ? AND id = ?", [email, id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing user", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "This email is already registered.", success: false });
                }
                db.query(
                    "UPDATE registration SET email = ? WHERE id = ?", [email, id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "Email updated successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateUserCountry = async (req, res) => {
    const { id, country_name } = req.body;

    if (!id || !country_name) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            "SELECT * FROM registration WHERE country_name = ? AND id = ?", [country_name, id], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing user", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "This country is already registered.", success: false });
                }
                db.query(
                    "UPDATE registration SET country_name = ? WHERE id = ?", [country_name, id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while updating the existing data.", success: false });
                        }
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ message: "Country updated successfully", success: true });
                        } else {
                            return res.status(404).json({ message: "No record found with the provided id", success: false });
                        }
                    }
                );
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const UpdateUserPassword = async (req, res) => {
    const { id, password, confirm_password } = req.body;

    if (!id || !password || !confirm_password) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match", success: false });
    }

    try {
        db.query("SELECT * FROM registration WHERE id = ?", [id], (err, results) => {
            if (err) {
                return res.status(500).json({ success: false, message: "An error occurred" });
            }

            if (results.length === 0) {
                return res.status(400).json({ success: false, message: "No record found with the provided id" });
            }

            const currentPassword = results[0].password;

            bcrypt.compare(password, currentPassword, (err, isMatch) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "An error occurred" });
                }

                if (isMatch) {
                    return res.status(400).json({ success: false, message: "Old and new password can't be the same." });
                }

                bcrypt.hash(password, 10, (err, hashedPassword) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err || "An error occurred" });
                    }

                    const updateQuery = "UPDATE registration SET password = ? WHERE id = ?";
                    db.query(updateQuery, [hashedPassword, id], (err, result) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: err || "An error occurred" });
                        }

                        res.status(200).json({ success: true, message: "Password updated successfully" });
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};