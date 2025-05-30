import db from "../db/db.js";

export const GetMembership = async (req, res) => {
    try {
        db.query("SELECT * FROM membership", async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Memberships fetched successfully", success: true, membership: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const GetCustomers = async (req, res) => {
    try {
        db.query("SELECT * FROM customer_registration", async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Customers fetched successfully", success: true, customer: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const GetRenewData = async (req, res) => {
    try {
        db.query("SELECT * FROM renew_customer", async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Customers fetched successfully", success: true, renew: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const GetUsersData = async (req, res) => {
    try {
        db.query("SELECT * FROM registration", async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Users fetched successfully", success: true, users: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};