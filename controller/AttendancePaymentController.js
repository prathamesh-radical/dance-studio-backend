import { randomUUID } from "node:crypto";
import db from "../db/db.js";

const attendanceStatuses = new Set(["Present", "Absent", "Late", "Excused"]);
const paymentMethods = new Set(["Cash", "Online", "Upi"]);
const paymentTypes = new Set(["Monthly", "Quarterly", "Half Yearly", "Yearly"]);

const query = (executor, sql, values = []) =>
    new Promise((resolve, reject) => {
        executor.query(sql, values, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });

const withTransaction = async work => {
    const connection = await new Promise((resolve, reject) => {
        db.getConnection((error, connection) => {
            if (error) reject(error);
            else resolve(connection);
        });
    });

    try {
        await new Promise((resolve, reject) => {
            connection.beginTransaction(error => error ? reject(error) : resolve());
        });
        const result = await work(connection);
        await new Promise((resolve, reject) => {
            connection.commit(error => error ? reject(error) : resolve());
        });
        return result;
    } catch (error) {
        await new Promise(resolve => connection.rollback(() => resolve()));
        throw error;
    } finally {
        connection.release();
    }
};

const studioIdFromRequest = req => {
    const studioId = Number(req.user?.id);
    return Number.isSafeInteger(studioId) && studioId > 0 ? studioId : null;
};

const validDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const dateFromQuery = value => {
    if (value == null || value === "") return new Date().toISOString().slice(0, 10);
    return validDate(value) ? value : null;
};

const sendDatabaseError = (res, operation, error) => {
    console.error(`${operation} failed:`, error);
    const message = error.code === "ER_NO_SUCH_TABLE"
        ? "Required database tables are missing. Apply backend/db/migrations/001_attendance_and_payments.sql and try again."
        : "The request could not be completed.";
    return res.status(500).json({ success: false, message });
};

const getAttendanceRoster = async (req, res, kind) => {
    const studioId = studioIdFromRequest(req);
    const date = dateFromQuery(req.query.date);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!date) return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format." });

    const isStudent = kind === "student";
    const rosterTable = isStudent ? "add_students" : "trainer";
    const rosterId = isStudent ? "id" : "id";
    const attendanceTable = isStudent ? "student_attendance" : "trainer_attendance";
    const attendanceId = isStudent ? "student_id" : "trainer_id";
    const studioColumn = isStudent ? "st_id" : "user_id";
    const nameSql = isStudent
        ? "CONCAT_WS(' ', roster.first_name, roster.last_name)"
        : "roster.name";
    const querySql = `
        SELECT roster.${rosterId} AS id, ${nameSql} AS name,
               attendance.status, attendance.notes
        FROM ${rosterTable} AS roster
        LEFT JOIN ${attendanceTable} AS attendance
          ON attendance.${attendanceId} = roster.${rosterId}
         AND attendance.st_id = roster.${studioColumn}
         AND attendance.attendance_date = ?
        WHERE roster.${studioColumn} = ?
        ${isStudent ? "" : "AND roster.status = 'active'"}
        ORDER BY name`;

    try {
        const records = await query(db, querySql, [date, studioId]);
        return res.status(200).json({ success: true, date, records });
    } catch (error) {
        return sendDatabaseError(res, `Loading ${kind} attendance`, error);
    }
};

const saveAttendance = async (req, res, kind) => {
    const studioId = studioIdFromRequest(req);
    const { date, records } = req.body || {};
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!validDate(date)) return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format." });
    if (!Array.isArray(records) || records.length < 1 || records.length > 500) {
        return res.status(400).json({ success: false, message: "Submit between 1 and 500 attendance records." });
    }

    const seenIds = new Set();
    for (const record of records) {
        const recordId = Number(record?.id);
        if (!Number.isSafeInteger(recordId) || recordId < 1 || seenIds.has(recordId)) {
            return res.status(400).json({ success: false, message: "Attendance records must have unique, valid IDs." });
        }
        if (!attendanceStatuses.has(record.status)) {
            return res.status(400).json({ success: false, message: "Select a valid attendance status for every record." });
        }
        if (record.notes != null && (typeof record.notes !== "string" || record.notes.length > 1000)) {
            return res.status(400).json({ success: false, message: "Attendance notes must not exceed 1000 characters." });
        }
        seenIds.add(recordId);
    }

    const isStudent = kind === "student";
    const rosterTable = isStudent ? "add_students" : "trainer";
    const attendanceTable = isStudent ? "student_attendance" : "trainer_attendance";
    const idColumn = isStudent ? "student_id" : "trainer_id";
    const studioColumn = isStudent ? "st_id" : "user_id";
    const placeholders = records.map(() => "?").join(", ");
    const ids = records.map(record => Number(record.id));

    try {
        await withTransaction(async connection => {
            const validRoster = await query(
                connection,
                `SELECT id FROM ${rosterTable} WHERE ${studioColumn} = ? AND id IN (${placeholders})`,
                [isStudent ? studioId : String(studioId), ...ids],
            );
            if (validRoster.length !== ids.length) {
                const error = new Error("One or more selected records do not belong to this studio.");
                error.statusCode = 404;
                throw error;
            }

            for (const record of records) {
                await query(
                    connection,
                    `INSERT INTO ${attendanceTable} (st_id, ${idColumn}, attendance_date, status, notes)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)`,
                    [studioId, Number(record.id), date, record.status, record.notes?.trim() || null],
                );
            }
        });
        return res.status(200).json({ success: true, message: `${kind === "student" ? "Student" : "Trainer"} attendance saved.` });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
        return sendDatabaseError(res, `Saving ${kind} attendance`, error);
    }
};

export const GetStudentAttendance = (req, res) => getAttendanceRoster(req, res, "student");
export const SaveStudentAttendance = (req, res) => saveAttendance(req, res, "student");
export const GetTrainerAttendance = (req, res) => getAttendanceRoster(req, res, "trainer");
export const SaveTrainerAttendance = (req, res) => saveAttendance(req, res, "trainer");

export const GetStudentAttendanceHistory = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    const studentId = Number(req.params.studentId);
    const from = req.query.from;
    const to = req.query.to;
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!Number.isSafeInteger(studentId) || studentId < 1) {
        return res.status(400).json({ success: false, message: "Student ID must be a positive whole number." });
    }
    if (!validDate(from) || !validDate(to) || from > to) {
        return res.status(400).json({ success: false, message: "Enter a valid date range in YYYY-MM-DD format." });
    }

    try {
        const students = await query(db,
            `SELECT id, first_name, last_name, email, phone_no, dob, gender, blood_group,
                    selected_dance_style, trainer, class_days, class_timing, joining_date,
                    expiry_date, class_end_date
             FROM add_students WHERE id = ? AND st_id = ? LIMIT 1`,
            [studentId, studioId]);
        if (!students.length) {
            return res.status(404).json({ success: false, message: "Student not found for this studio." });
        }

        const records = await query(db,
            `SELECT id, attendance_date, status, notes
             FROM student_attendance
             WHERE st_id = ? AND student_id = ? AND attendance_date BETWEEN ? AND ?
             ORDER BY attendance_date DESC`,
            [studioId, studentId, from, to]);
        return res.status(200).json({
            success: true,
            from,
            to,
            student: students[0],
            records,
        });
    } catch (error) {
        return sendDatabaseError(res, "Loading student attendance history", error);
    }
};

export const GetStudentAttendanceSummary = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });

    try {
        const records = await query(db,
            `SELECT students.id AS student_id,
                    COUNT(attendance.id) AS total_marks,
                    COALESCE(SUM(attendance.status = 'Present'), 0) AS present_count,
                    COALESCE(SUM(attendance.status = 'Absent'), 0) AS absent_count,
                    COALESCE(SUM(attendance.status = 'Late'), 0) AS late_count,
                    COALESCE(SUM(attendance.status = 'Excused'), 0) AS excused_count
             FROM add_students AS students
             LEFT JOIN student_attendance AS attendance
               ON attendance.st_id = students.st_id
              AND attendance.student_id = students.id
             WHERE students.st_id = ?
             GROUP BY students.id`,
            [studioId]);
        return res.status(200).json({ success: true, records });
    } catch (error) {
        return sendDatabaseError(res, "Loading student attendance summaries", error);
    }
};

export const GetAttendanceReport = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    const from = req.query.from;
    const to = req.query.to;
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!validDate(from) || !validDate(to) || from > to) {
        return res.status(400).json({ success: false, message: "Enter a valid date range in YYYY-MM-DD format." });
    }

    try {
        const [students, trainers, byClass, recent] = await Promise.all([
            query(db,
                `SELECT attendance_date, status, COUNT(*) AS count
                 FROM student_attendance
                 WHERE st_id = ? AND attendance_date BETWEEN ? AND ?
                 GROUP BY attendance_date, status ORDER BY attendance_date`,
                [studioId, from, to]),
            query(db,
                `SELECT attendance_date, status, COUNT(*) AS count
                 FROM trainer_attendance
                 WHERE st_id = ? AND attendance_date BETWEEN ? AND ?
                 GROUP BY attendance_date, status ORDER BY attendance_date`,
                [studioId, from, to]),
            query(db,
                `SELECT COALESCE(NULLIF(TRIM(students.selected_dance_style), ''), 'Unassigned') AS class_name,
                        COUNT(DISTINCT students.id) AS enrolled_students,
                        COUNT(attendance.id) AS marked_count,
                        COALESCE(SUM(attendance.status = 'Present'), 0) AS present_count,
                        COALESCE(SUM(attendance.status = 'Absent'), 0) AS absent_count,
                        COALESCE(SUM(attendance.status = 'Late'), 0) AS late_count,
                        COALESCE(SUM(attendance.status = 'Excused'), 0) AS excused_count
                 FROM add_students AS students
                 LEFT JOIN student_attendance AS attendance
                   ON attendance.st_id = students.st_id
                  AND attendance.student_id = students.id
                  AND attendance.attendance_date BETWEEN ? AND ?
                 WHERE students.st_id = ?
                 GROUP BY COALESCE(NULLIF(TRIM(students.selected_dance_style), ''), 'Unassigned')
                 ORDER BY present_count DESC, class_name
                 LIMIT 10`,
                [from, to, studioId]),
            query(db,
                `SELECT activity.attendance_date, activity.name, activity.status,
                        activity.class_name, activity.person_type, activity.id
                 FROM (
                     SELECT attendance.id, attendance.attendance_date,
                            CONCAT_WS(' ', students.first_name, students.last_name) AS name,
                            attendance.status, students.selected_dance_style AS class_name,
                            'Student' AS person_type
                     FROM student_attendance AS attendance
                     INNER JOIN add_students AS students
                       ON students.id = attendance.student_id AND students.st_id = attendance.st_id
                     WHERE attendance.st_id = ? AND attendance.attendance_date BETWEEN ? AND ?
                     UNION ALL
                     SELECT attendance.id, attendance.attendance_date, trainers.name,
                            attendance.status, NULL AS class_name,
                            'Trainer' AS person_type
                     FROM trainer_attendance AS attendance
                     INNER JOIN trainer AS trainers
                       ON trainers.id = attendance.trainer_id
                      AND trainers.user_id = CAST(attendance.st_id AS CHAR)
                     WHERE attendance.st_id = ? AND attendance.attendance_date BETWEEN ? AND ?
                 ) AS activity
                 ORDER BY activity.attendance_date DESC, activity.id DESC
                 LIMIT 8`,
                [studioId, from, to, studioId, from, to]),
        ]);
        return res.status(200).json({ success: true, from, to, students, trainers, by_class: byClass, recent });
    } catch (error) {
        return sendDatabaseError(res, "Loading attendance report", error);
    }
};

export const GetPendingFees = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });

    try {
        const students = await query(db,
            `SELECT id, first_name, last_name, phone_no, email, dance_price,
                    registration_fee, discount, payment_type, payment_status, expiry_date
             FROM add_students
             WHERE st_id = ? AND payment_status = 'Unpaid'
             ORDER BY first_name, last_name`,
            [studioId]);
        return res.status(200).json({ success: true, students });
    } catch (error) {
        return sendDatabaseError(res, "Loading pending fees", error);
    }
};

export const GetPaymentHistory = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    const studentId = req.query.student_id == null ? null : Number(req.query.student_id);
    const limit = req.query.limit == null ? null : Number(req.query.limit);
    const from = req.query.from == null ? null : req.query.from;
    const to = req.query.to == null ? null : req.query.to;
    if (studentId != null && (!Number.isSafeInteger(studentId) || studentId < 1)) {
        return res.status(400).json({ success: false, message: "Student ID must be a positive whole number." });
    }
    if (limit != null && (!Number.isSafeInteger(limit) || limit < 1 || limit > 500)) {
        return res.status(400).json({ success: false, message: "Limit must be a whole number between 1 and 500." });
    }
    if ((from == null) !== (to == null) ||
        (from != null && (!validDate(from) || !validDate(to) || from > to))) {
        return res.status(400).json({ success: false, message: "Enter a valid payment date range in YYYY-MM-DD format." });
    }

    try {
        const conditions = ["payments.st_id = ?"];
        const values = [studioId];
        if (studentId != null) {
            conditions.push("payments.student_id = ?");
            values.push(studentId);
        }
        if (from != null) {
            conditions.push("payments.payment_date BETWEEN ? AND ?");
            values.push(from, to);
        }
        const limitSql = limit == null ? "" : " LIMIT ?";
        if (limit != null) values.push(limit);
        const payments = await query(db,
            `SELECT payments.*, CONCAT_WS(' ', students.first_name, students.last_name) AS student_name
             FROM student_payments AS payments
             INNER JOIN add_students AS students
               ON students.id = payments.student_id AND students.st_id = payments.st_id
             WHERE ${conditions.join(" AND ")}
             ORDER BY payments.payment_date DESC, payments.id DESC${limitSql}`,
            values);
        return res.status(200).json({ success: true, payments });
    } catch (error) {
        return sendDatabaseError(res, "Loading payment history", error);
    }
};

export const GetPaymentSummary = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    try {
        const [payments, pending] = await Promise.all([
            query(db,
                `SELECT COUNT(*) AS payment_count, COALESCE(SUM(amount), 0) AS revenue
                 FROM student_payments WHERE st_id = ?`,
                [studioId]),
            query(db,
                `SELECT COUNT(*) AS student_count,
                        COALESCE(SUM(GREATEST(COALESCE(dance_price, 0) * (1 - COALESCE(discount, 0) / 100) + COALESCE(registration_fee, 0), 0)), 0) AS balance
                 FROM add_students WHERE st_id = ? AND payment_status = 'Unpaid'`,
                [studioId]),
        ]);
        return res.status(200).json({ success: true, payments: payments[0], pending: pending[0] });
    } catch (error) {
        return sendDatabaseError(res, "Loading payment summary", error);
    }
};

export const GetPaymentById = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    const paymentId = Number(req.params.id);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!Number.isSafeInteger(paymentId) || paymentId < 1) {
        return res.status(400).json({ success: false, message: "Payment ID must be a positive whole number." });
    }
    try {
        const payments = await query(db,
            `SELECT payments.*, CONCAT_WS(' ', students.first_name, students.last_name) AS student_name,
                    students.phone_no, students.email
             FROM student_payments AS payments
             INNER JOIN add_students AS students
               ON students.id = payments.student_id AND students.st_id = payments.st_id
             WHERE payments.st_id = ? AND payments.id = ? LIMIT 1`,
            [studioId, paymentId]);
        if (!payments.length) return res.status(404).json({ success: false, message: "Payment receipt was not found." });
        return res.status(200).json({ success: true, payment: payments[0] });
    } catch (error) {
        return sendDatabaseError(res, "Loading payment receipt", error);
    }
};

export const CollectStudentPayment = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    const { student_id: studentId, payment_date: paymentDate, payment_type: paymentType,
        payment_method: paymentMethod, notes } = req.body || {};
    const amount = Number(req.body?.amount);

    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!Number.isSafeInteger(Number(studentId)) || Number(studentId) < 1) {
        return res.status(400).json({ success: false, message: "Select a valid student." });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(req.body?.amount))) {
        return res.status(400).json({ success: false, message: "Amount must be greater than zero and have at most two decimal places." });
    }
    if (!validDate(paymentDate) || !paymentTypes.has(paymentType) || !paymentMethods.has(paymentMethod)) {
        return res.status(400).json({ success: false, message: "Enter a valid payment date, fee period, and payment method." });
    }
    if (notes != null && (typeof notes !== "string" || notes.length > 1000)) {
        return res.status(400).json({ success: false, message: "Payment notes must not exceed 1000 characters." });
    }

    const receiptNumber = `DS-${randomUUID()}`;
    try {
        const payment = await withTransaction(async connection => {
            const students = await query(connection,
                `SELECT id, payment_type FROM add_students
                 WHERE id = ? AND st_id = ? LIMIT 1 FOR UPDATE`,
                [Number(studentId), studioId]);
            if (!students.length) {
                const error = new Error("Student not found for this studio.");
                error.statusCode = 404;
                throw error;
            }

            const insert = await query(connection,
                `INSERT INTO student_payments
                 (st_id, student_id, amount, payment_date, payment_type, payment_method, receipt_number, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [studioId, Number(studentId), amount.toFixed(2), paymentDate, paymentType, paymentMethod, receiptNumber, notes?.trim() || null]);

            await query(connection,
                `UPDATE add_students
                 SET payment_status = 'Paid', payment_type = ?, payment_method = ?, payment = ?
                 WHERE id = ? AND st_id = ?`,
                [paymentType, paymentMethod, paymentMethod === "Upi" ? "Upi" : paymentMethod, Number(studentId), studioId]);
            return { id: insert.insertId, receipt_number: receiptNumber };
        });
        return res.status(201).json({ success: true, message: "Payment collected successfully.", payment });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
        return sendDatabaseError(res, "Collecting student payment", error);
    }
};

export const GetRevenueReport = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    const from = req.query.from;
    const to = req.query.to;
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    if (!validDate(from) || !validDate(to) || from > to) {
        return res.status(400).json({ success: false, message: "Enter a valid date range in YYYY-MM-DD format." });
    }
    try {
        const [totals, daily, byType] = await Promise.all([
            query(db,
                `SELECT COUNT(*) AS payment_count, COALESCE(SUM(amount), 0) AS revenue
                 FROM student_payments WHERE st_id = ? AND payment_date BETWEEN ? AND ?`,
                [studioId, from, to]),
            query(db,
                `SELECT payment_date, COUNT(*) AS payment_count, COALESCE(SUM(amount), 0) AS revenue
                 FROM student_payments WHERE st_id = ? AND payment_date BETWEEN ? AND ?
                 GROUP BY payment_date ORDER BY payment_date`,
                [studioId, from, to]),
            query(db,
                `SELECT payment_type, COUNT(*) AS payment_count, COALESCE(SUM(amount), 0) AS revenue
                 FROM student_payments WHERE st_id = ? AND payment_date BETWEEN ? AND ?
                 GROUP BY payment_type ORDER BY revenue DESC, payment_type`,
                [studioId, from, to]),
        ]);
        return res.status(200).json({ success: true, from, to, summary: totals[0], daily, by_type: byType });
    } catch (error) {
        return sendDatabaseError(res, "Loading revenue report", error);
    }
};

export const GetReportSummary = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    try {
        const [students, trainers, classes, unpaid, revenue] = await Promise.all([
            query(db, "SELECT COUNT(*) AS count FROM add_students WHERE st_id = ?", [studioId]),
            query(db, "SELECT COUNT(*) AS count FROM trainer WHERE user_id = ?", [String(studioId)]),
            query(db, "SELECT COUNT(*) AS count FROM classes WHERE trainer_id IN (SELECT id FROM trainer WHERE user_id = ?)", [String(studioId)]),
            query(db, "SELECT COUNT(*) AS count FROM add_students WHERE st_id = ? AND payment_status = 'Unpaid'", [studioId]),
            query(db, "SELECT COALESCE(SUM(amount), 0) AS amount FROM student_payments WHERE st_id = ?", [studioId]),
        ]);
        return res.status(200).json({
            success: true,
            summary: {
                students: Number(students[0].count),
                trainers: Number(trainers[0].count),
                classes: Number(classes[0].count),
                unpaid_students: Number(unpaid[0].count),
                lifetime_revenue: Number(revenue[0].amount),
            },
        });
    } catch (error) {
        return sendDatabaseError(res, "Loading report summary", error);
    }
};

export const GetEnrollmentReport = async (req, res) => {
    const studioId = studioIdFromRequest(req);
    if (!studioId) return res.status(401).json({ success: false, message: "Authenticated studio is required." });
    try {
        const [total, byStyle] = await Promise.all([
            query(db, "SELECT COUNT(*) AS count FROM add_students WHERE st_id = ?", [studioId]),
            query(db,
                `SELECT COALESCE(NULLIF(TRIM(selected_dance_style), ''), 'Unassigned') AS dance_style,
                        COUNT(*) AS student_count
                 FROM add_students WHERE st_id = ?
                 GROUP BY COALESCE(NULLIF(TRIM(selected_dance_style), ''), 'Unassigned')
                 ORDER BY student_count DESC, dance_style`,
                [studioId]),
        ]);
        return res.status(200).json({ success: true, total: Number(total[0].count), by_style: byStyle });
    } catch (error) {
        return sendDatabaseError(res, "Loading enrollment report", error);
    }
};
