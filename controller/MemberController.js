import db from "../db/db.js";

export const AddMembership = async (req, res) => {
    const { plan_name, duration, unit, price } = req.body;
    const sql = `INSERT INTO membership (plan_name, duration, unit, price) VALUES (?, ?, ?, ?)`;

    if (!plan_name || !duration || !unit || !price) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(sql, [ plan_name, duration, unit, price ], (err, result) => {
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
        first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date
    } = req.body;

    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phone_no)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number.", success: false });
    }

    if (emergency_phone_no) {
        if (!phonePattern.test(emergency_phone_no)) {
            return res.status(400).json({ message: "Please enter a valid 10-digit number.", success: false });
        }
    }

    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address.", success: false });
        }
    }

    const requiredFields = [
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
            "SELECT * FROM customer_registration WHERE phone_no = ?", 
            [phone_no], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing customer", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "Customer already exists", success: false });
                }

                db.query(
                    "INSERT INTO customer_registration (first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error while registering customer", success: false });
                        }

                        const customerId = result.insertId;

                        if (membership_type || membership_duration || membership_unit || membership_price || joining_date || payment || expiry_date) {
                            db.query(
                                "INSERT INTO renew_customer (user_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                [customerId, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, expiry_date],
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
        first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details
    } = req.body;

    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phone_no)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit number.", success: false });
    }

    if (emergency_phone_no) {
        if (!phonePattern.test(emergency_phone_no)) {
            return res.status(400).json({ message: "Please enter a valid 10-digit number.", success: false });
        }
    }

    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address.", success: false });
        }
    }

    const requiredFields = [
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
            "UPDATE customer_registration SET first_name = ?, last_name = ?, email = ?, dob = ?, gender = ?, address = ?, city = ?, weight = ?, height = ?, emergency_first_name = ?, emergency_last_name = ?, relation = ?, emergency_phone_no = ?, allergies = ?, details = ? WHERE phone_no = ?", [first_name, last_name, email, dob, gender, address, city, weight, height, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, phone_no],
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
    const { user_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, payment, renew_date, expiry_date } = req.body;

    const requiredFields = [
        { key: 'membership_type', label: 'Membership Type' },
        { key: 'membership_duration', label: 'Membership Duration' },
        { key: 'membership_unit', label: 'Membership Unit' },
        { key: 'membership_price', label: 'Membership Price' },
        { key: 'renew_date', label: 'Renew Date' },
        { key: 'payment', label: 'payment' },
        { key: 'user_id', label: 'User Id' },
    ];

    let missingFields = requiredFields
        .filter(field => !req.body[field.key] || req.body[field.key].toString().trim() === '')
        .map(field => field.label);

    if (missingFields.length > 0) {
        return res.status(400).json({ 
            message: `Please fill all the required fields: ${missingFields.join(', ')}`, 
            success: false 
        });
    }

    try {
        db.query(
            "SELECT * FROM renew_customer WHERE joining_date = ? OR renew_date = ?", 
            [joining_date, renew_date], 
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error checking existing customer", success: false });
                }
                if (result.length > 0) {
                    return res.status(400).json({ message: "Membership is already renewed.", success: false });
                }
                db.query(
                    "INSERT INTO renew_customer (user_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, renew_date, payment, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [user_id, membership_type, membership_duration, membership_unit, membership_price, joining_date, renew_date, payment, expiry_date],
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
                )
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};