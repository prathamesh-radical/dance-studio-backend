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
    const userId = req.user?.id;

    try {
        db.query("SELECT * FROM dance_style WHERE user_id = ? AND deleted_at IS NULL", [userId], async (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching values", success: false });
            }
            res.status(200).json({ message: "Dance style fetched successfully", success: true, danceStyle: result });
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const GetTrashedDanceStyles = (req, res) => {
    const userId = req.user?.id;

    db.query(
        "SELECT * FROM dance_style WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
        [userId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching trash", success: false });
            }
            return res.status(200).json({
                message: "Trash fetched successfully",
                success: true,
                danceStyles: result,
            });
        },
    );
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
    const { styleId, styleIds } = req.body;
    const userId = req.user?.id || req?.query?.user_id;
    const rawIds = Array.isArray(styleIds) ? styleIds : [styleId];
    const ids = [...new Set(rawIds.map(Number))];

    if (!userId || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        return res.status(400).json({ message: "Valid dance style IDs are required", success: false });
    }

    const placeholders = ids.map(() => "?").join(", ");
    db.query(
        `DELETE FROM dance_style WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...ids],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Server error", success: false });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Style not found or unauthorized", success: false });
            }
            const deletedCount = result.affectedRows;
            return res.status(200).json({
                message: deletedCount === 1
                    ? "Dance style permanently deleted"
                    : `${deletedCount} dance styles permanently deleted`,
                success: true,
            });
        },
    );
};

export const MoveDanceStyleToTrash = (req, res) => {
    const { styleId, styleIds } = req.body;
    const userId = req.user?.id;
    const rawIds = Array.isArray(styleIds) ? styleIds : [styleId];
    const ids = [...new Set(rawIds.map(Number))];

    if (!userId || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        return res.status(400).json({ message: "Valid dance style IDs are required", success: false });
    }

    const placeholders = ids.map(() => "?").join(", ");
    db.query(
        `UPDATE dance_style SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = ? AND deleted_at IS NULL AND id IN (${placeholders})`,
        [userId, ...ids],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Server error', success: false });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Style not found or unauthorized', success: false });
            }
            return res.status(200).json({
                message: result.affectedRows === 1
                    ? 'Dance style moved to trash'
                    : `${result.affectedRows} dance styles moved to trash`,
                success: true,
            });
        },
    );
};

export const RestoreDanceStyle = (req, res) => {
    const { styleId, styleIds } = req.body;
    const userId = req.user?.id;
    const rawIds = Array.isArray(styleIds) ? styleIds : [styleId];
    const ids = [...new Set(rawIds.map(Number))];

    if (!userId || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        return res.status(400).json({ message: "Valid dance style IDs are required", success: false });
    }

    const placeholders = ids.map(() => "?").join(", ");
    db.query(
        `UPDATE dance_style SET deleted_at = NULL WHERE user_id = ? AND deleted_at IS NOT NULL AND id IN (${placeholders})`,
        [userId, ...ids],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Server error", success: false });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Dance style not found in trash", success: false });
            }
            return res.status(200).json({
                message: result.affectedRows === 1
                    ? "Dance style restored successfully"
                    : `${result.affectedRows} dance styles restored successfully`,
                success: true,
            });
        },
    );
}