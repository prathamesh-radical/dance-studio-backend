import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db/db.js';

dotenv.config();

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, 'your-secret-key');
        const session = await db.query('SELECT * FROM user_sessions WHERE user_id = ? AND session_token = ?', [
            decoded.userId,
            token,
        ]);
        if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export default verifyToken;