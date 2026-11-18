import db from "../db/db.js";

const studentColumns = [
    "user_id", "st_id", "first_name", "last_name", "email", "phone_no", "dob", "gender",
    "address", "city", "pincode", "blood_group", "experience_level", "referred_by",
    "selected_dance_style", "trainer", "class_days", "class_timing", "class_end_date",
    "class_capacity", "dance_price", "registration_fee", "discount", "payment_status",
    "payment_type", "payment_method", "guardian_full_name", "guardian_relationship",
    "guardian_email", "guardian_phone", "guardian_occupation", "guardian_work_phone",
    "guardian_address", "communication_preference", "emergency_contact_name",
    "emergency_email", "emergency_relationship", "notes", "emergency_phone_no",
    "joining_date", "payment", "expiry_date",
];

const textValue = value => value == null || value === "" ? null : String(value).trim();

const validSqlDate = value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const sqlDate = value => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    const dateText = String(value).trim();
    const isoDate = dateText.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (isoDate && validSqlDate(isoDate[1])) return isoDate[1];
    const displayDate = dateText.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (!displayDate) return null;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months.findIndex(name => name.toLowerCase() === displayDate[2].toLowerCase());
    if (month < 0) return null;
    const normalized = `${displayDate[3]}-${String(month + 1).padStart(2, "0")}-${displayDate[1].padStart(2, "0")}`;
    return validSqlDate(normalized) ? normalized : null;
};

const validateStudentBody = body => {
    const requiredFields = [
        ["first_name", "First Name"],
        ["last_name", "Last Name"],
        ["phone_no", "Phone Number"],
        ["dob", "Date of Birth"],
        ["gender", "Gender"],
        ["city", "City"],
        ["pincode", "Pincode"],
        ["selected_dance_style", "Class"],
        ["dance_price", "Monthly Fee"],
        ["joining_date", "Class Start Date"],
        ["guardian_full_name", "Guardian Full Name"],
        ["guardian_phone", "Guardian Phone Number"],
    ];
    const missingFields = requiredFields
        .filter(([key]) => body[key] == null || String(body[key]).trim() === "")
        .map(([, label]) => label);

    if (missingFields.length) {
        return { error: `Please fill all the required fields: ${missingFields.join(", ")}` };
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const [field, label] of [
        ["email", "Email"],
        ["guardian_email", "Guardian Email"],
        ["emergency_email", "Emergency Contact Email"],
    ]) {
        if (body[field] && !emailPattern.test(String(body[field]).trim())) {
            return { error: `Please enter a valid ${label.toLowerCase()}.` };
        }
    }

    const validValues = {
        gender: ["Male", "Female", "Other"],
        payment_status: ["Paid", "Unpaid"],
        payment_type: ["Monthly", "Quarterly", "Half Yearly", "Yearly"],
        payment: ["Cash", "Online", "Upi"],
    };
    for (const [field, values] of Object.entries(validValues)) {
        if (body[field] != null && body[field] !== "" && !values.includes(body[field])) {
            return { error: `Invalid ${field.replaceAll("_", " ")}.` };
        }
    }

    const numericFields = [
        ["dance_price", "Monthly Fee", true],
        ["registration_fee", "Registration Fee", false],
        ["discount", "Discount", false],
        ["class_capacity", "Class Capacity", false],
    ];
    for (const [field, label, required] of numericFields) {
        if (body[field] == null || body[field] === "") {
            if (required) {
                return { error: `${label} must be a valid number.` };
            }
            continue;
        }
        const value = Number(body[field]);
        const maxValue = field === "class_capacity" ? 2147483647 : 99999999.99;
        if (
            !Number.isFinite(value) ||
            value < 0 ||
            value > maxValue ||
            (field === "class_capacity" && !Number.isInteger(value))
        ) {
            return { error: `${label} must be a valid non-negative number.` };
        }
    }

    const dob = sqlDate(body.dob);
    const joiningDate = sqlDate(body.joining_date);
    const classEndDate = sqlDate(body.class_end_date);
    const expiryDate = sqlDate(body.expiry_date);
    if (!dob) return { error: "Date of Birth must be a valid date." };
    if (!joiningDate) return { error: "Class Start Date must be a valid date." };
    if (body.class_end_date && !classEndDate) {
        return { error: "Class End Date must be a valid date." };
    }
    if (body.expiry_date && !expiryDate) {
        return { error: "Expiry Date must be a valid date." };
    }

    return { dates: { dob, joiningDate, classEndDate, expiryDate } };
};

const buildStudentValues = (body, userId, dates) => [
    String(userId), Number(userId), textValue(body.first_name), textValue(body.last_name),
    textValue(body.email), textValue(body.phone_no), dates.dob, body.gender,
    textValue(body.address), textValue(body.city), textValue(body.pincode),
    textValue(body.blood_group), textValue(body.experience_level), textValue(body.referred_by),
    textValue(body.selected_dance_style), textValue(body.trainer),
    Array.isArray(body.class_days) ? body.class_days.join(", ") || null : textValue(body.class_days),
    Array.isArray(body.class_timing) ? body.class_timing.join(", ") || null : textValue(body.class_timing),
    dates.classEndDate, body.class_capacity == null || body.class_capacity === "" ? null : Number(body.class_capacity),
    Number(body.dance_price), body.registration_fee == null || body.registration_fee === "" ? 0 : Number(body.registration_fee),
    body.discount == null || body.discount === "" ? 0 : Number(body.discount),
    body.payment_status || "Unpaid", body.payment_type || "Monthly", textValue(body.payment_method),
    textValue(body.guardian_full_name), textValue(body.guardian_relationship), textValue(body.guardian_email),
    textValue(body.guardian_phone), textValue(body.guardian_occupation), textValue(body.guardian_work_phone),
    textValue(body.guardian_address), textValue(body.communication_preference),
    textValue(body.emergency_contact_name), textValue(body.emergency_email),
    textValue(body.emergency_relationship), textValue(body.notes), textValue(body.emergency_phone_no),
    dates.joiningDate, body.payment || null, dates.expiryDate,
];

const authenticatedUserId = req => {
    const userId = Number(req.user?.id);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};

export const AddStudent = async (req, res) => {
    const body = req.body || {};
    const numericUserId = authenticatedUserId(req);
    if (!numericUserId) {
        return res.status(401).json({ message: "Authenticated user is required.", success: false });
    }
    const validation = validateStudentBody(body);
    if (validation.error) {
        return res.status(400).json({ message: validation.error, success: false });
    }
    const values = buildStudentValues(body, numericUserId, validation.dates);
    const placeholders = studentColumns.map(() => "?").join(", ");

    db.query(
        "SELECT id FROM add_students WHERE st_id = ? AND phone_no = ? LIMIT 1",
        [numericUserId, String(body.phone_no).trim()],
        (duplicateError, existingStudents) => {
            if (duplicateError) {
                console.error("Error checking for duplicate student:", duplicateError);
                return res.status(500).json({ message: "Unable to check whether this student already exists.", success: false });
            }
            if (existingStudents.length) {
                return res.status(409).json({ message: "A student with this phone number already exists.", success: false });
            }

            db.query(
                `INSERT INTO add_students (${studentColumns.join(", ")}) VALUES (${placeholders})`,
                values,
                (insertError, result) => {
                    if (insertError) {
                        console.error("Error saving student:", insertError);
                        return res.status(500).json({ message: "Unable to save student details.", success: false });
                    }
                    return res.status(201).json({
                        message: "Student registered successfully.",
                        success: true,
                        studentId: result.insertId,
                    });
                },
            );
        },
    );
};

export const UpdateStudent = async (req, res) => {
    const body = req.body || {};
    const userId = authenticatedUserId(req);
    const studentId = Number(req.params?.id);
    if (!userId) {
        return res.status(401).json({ message: "Authenticated user is required.", success: false });
    }
    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ message: "A valid student ID is required.", success: false });
    }

    const validation = validateStudentBody(body);
    if (validation.error) {
        return res.status(400).json({ message: validation.error, success: false });
    }

    db.query(
        "SELECT id FROM add_students WHERE id = ? AND st_id = ? LIMIT 1",
        [studentId, userId],
        (lookupError, students) => {
            if (lookupError) {
                console.error("Error finding student to update:", lookupError);
                return res.status(500).json({ message: "Unable to find the student to update.", success: false });
            }
            if (!students.length) {
                return res.status(404).json({ message: "Student not found.", success: false });
            }

            db.query(
                "SELECT id FROM add_students WHERE st_id = ? AND phone_no = ? AND id <> ? LIMIT 1",
                [userId, String(body.phone_no).trim(), studentId],
                (duplicateError, duplicates) => {
                    if (duplicateError) {
                        console.error("Error checking for duplicate student:", duplicateError);
                        return res.status(500).json({ message: "Unable to check whether this student already exists.", success: false });
                    }
                    if (duplicates.length) {
                        return res.status(409).json({ message: "A student with this phone number already exists.", success: false });
                    }

                    const values = buildStudentValues(body, userId, validation.dates);
                    const updateColumns = studentColumns.slice(2);
                    db.query(
                        `UPDATE add_students SET ${updateColumns.map(column => `${column} = ?`).join(", ")} WHERE id = ? AND st_id = ?`,
                        [...values.slice(2), studentId, userId],
                        (updateError) => {
                            if (updateError) {
                                console.error("Error updating student:", updateError);
                                return res.status(500).json({ message: "Unable to update student details.", success: false });
                            }
                            return res.status(200).json({
                                message: "Student details updated successfully.",
                                success: true,
                                studentId,
                            });
                        },
                    );
                },
            );
        },
    );
};

export const UpdateDetails = async (req, res) => {
    const {
        first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, dance_style, experience_level, goals, additional_notes, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, physical_limitations, medications
    } = req.body;

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
        { key: 'dob', label: 'Date of Birth' },
        { key: 'gender', label: 'Gender' },
        { key: 'city', label: 'City' },
        { key: 'dance_style', label: 'Dance Style' },
        { key: 'experience_level', label: 'Experience Level' },
        { key: 'goals', label: 'Goals' },
        { key: 'allergies', label: 'Allergies' },
    ];

    let missingFields = requiredFields
        .filter(field => !req.body[field.key] || req.body[field.key].toString().trim() === '')
        .map(field => field.label);

    const userIdFromBodyOrQuery = req.body.user_id || req.query.user_id;
    if (!userIdFromBodyOrQuery || userIdFromBodyOrQuery.toString().trim() === '') {
        missingFields.push('User Id');
    }

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
            "UPDATE add_students SET first_name = ?, last_name = ?, email = ?, phone_no = ?, dob = ?, gender = ?, address = ?, city = ?, weight = ?, height = ?, dance_style = ?, level = ?, goals = ?, notes = ?, emergency_first_name = ?, emergency_last_name = ?, relation = ?, emergency_phone_no = ?, allergies = ?, details = ?, prev_injuries = ?, current_medication = ? WHERE phone_no = ? AND st_id = ?", 
            [first_name, last_name, email, phone_no, dob, gender, address, city, weight, height, dance_style, experience_level, goals, additional_notes, emergency_first_name, emergency_last_name, relation, emergency_phone_no, allergies, details, physical_limitations, medications, phone_no, req?.query?.user_id],
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