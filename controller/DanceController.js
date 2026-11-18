import db from "../db/db.js";

export const AddDanceStyle = async (req, res) => {
    const { dance_style, price, duration, unit, status = 'active' } = req.body;
    const userId = await req?.query?.user_id;

    if (!userId || !dance_style || !price || !duration || !unit) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            'INSERT INTO dance_style (user_id, style, price, duration, unit, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, dance_style, price, duration, unit, status], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Server error', success: false });
                }
                res.status(201).json({ message: 'Dance style created successfully', success: true });
            });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false })
    }
};

export const GetDanceStyle = async (req, res) => {
    const userId = await req?.query?.user_id;

    try {
        db.query("SELECT * FROM dance_style WHERE user_id = ?", [userId], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Dance style fetched successfully", success: true, danceStyle: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const UpdateDanceStyle = async (req, res) => {
    const { id, dance_style, price, duration, unit, status } = req.body;
    const userId = await req?.query?.user_id;

    if (!userId || !dance_style || !price) {
        return res.status(400).json({ message: "All fields are required", success: false });
    }

    try {
        db.query(
            'UPDATE dance_style SET style = ?, price = ?, duration = ?, unit = ?, status = COALESCE(?, status) WHERE user_id = ? AND id = ?',
            [dance_style, price, duration, unit, status ?? null, userId, id], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Server error', success: false });
                }
                res.status(201).json({ message: 'Dance style updated successfully', success: true });
            });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", success: false })
    }
};

export const DeleteDanceStyle = async (req, res) => {
    const { styleId } = req.body;
    const userId = await req?.query?.user_id;

    try {
        db.query('DELETE FROM dance_style WHERE id = ? AND user_id = ?', [styleId, userId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Server error', success: false });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Style not found or unauthorized', success: false });
            }
            res.status(201).json({ message: 'Dance style deleted successfully', success: true });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', success: false });
    }
}