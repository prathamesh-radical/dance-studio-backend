import db from "../db/db.js";

const normalizeOptionalText = value => {
	if (value == null) {
		return null;
	}

	const normalized = String(value).trim();
	return normalized || null;
};

const normalizeMonthlySalary = value => {
	const salary = value == null || value === "" ? "0" : String(value).trim();
	if (!/^\d+(?:\.\d{1,2})?$/.test(salary)) return null;
	const amount = Number(salary);
	return Number.isFinite(amount) && amount >= 0 && amount <= 99999999.99
		? amount.toFixed(2)
		: null;
};

export const AddTrainer = (req, res) => {
	const {
		name,
		email,
		phone,
		dob,
		gender,
		emergency,
		specialization,
		experience,
		qualification,
		about,
		status,
		available_days: availableDays,
		available_slots: availableSlots,
		monthly_salary: monthlySalary,
	} = req.body || {};
	const userId = req.user?.id;
	const normalizedName = normalizeOptionalText(name);
	const normalizedEmail = normalizeOptionalText(email)?.toLowerCase();
	const normalizedPhone = normalizeOptionalText(phone);
	const normalizedSpecialization = normalizeOptionalText(specialization);
	const normalizedExperience = Number(experience);
	const normalizedGender = normalizeOptionalText(gender);
	const normalizedDob = normalizeOptionalText(dob);
	const normalizedStatus = String(status ?? 'active').trim().toLowerCase();
	const normalizedMonthlySalary = normalizeMonthlySalary(monthlySalary);
	const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	const allowedGenders = ['Male', 'Female', 'Other'];
	const allowedStatuses = ['active', 'inactive'];
	const isValidDate = !normalizedDob || /^\d{4}-\d{2}-\d{2}$/.test(normalizedDob);

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	if (!allowedStatuses.includes(normalizedStatus)) {
		return res.status(400).json({ message: "Please select a valid trainer status", success: false });
	}
	if (normalizedMonthlySalary == null) {
		return res.status(400).json({ message: "Monthly salary must be a non-negative amount with at most two decimal places", success: false });
	}

	if (!normalizedName || !normalizedEmail || !normalizedPhone || !normalizedSpecialization || experience === '' || experience == null || !availableDays?.length || !availableSlots?.length) {
		return res.status(400).json({ message: "Please fill all required fields and select availability", success: false });
	}

	if (!emailPattern.test(normalizedEmail)) {
		return res.status(400).json({ message: "Please enter a valid email address", success: false });
	}

	if (normalizedPhone.length > 20) {
		return res.status(400).json({ message: "Phone number must be 20 characters or fewer", success: false });
	}

	if (!Number.isInteger(normalizedExperience) || normalizedExperience < 0) {
		return res.status(400).json({ message: "Experience must be a non-negative whole number", success: false });
	}

	if (normalizedGender && !allowedGenders.includes(normalizedGender)) {
		return res.status(400).json({ message: "Please select a valid gender", success: false });
	}

	if (!isValidDate) {
		return res.status(400).json({ message: "Date of birth must use YYYY-MM-DD format", success: false });
	}

	if (!Array.isArray(availableDays) || !Array.isArray(availableSlots) || [...availableDays, ...availableSlots].some(value => typeof value !== 'string' || !value.trim())) {
		return res.status(400).json({ message: "Please select valid availability days and time slots", success: false });
	}

	db.query(
		`INSERT INTO trainer (
			user_id, name, email, phone, dob, gender, emergency, specialization,
			experience, qualification, about, available_days, available_slots, status, monthly_salary
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			String(userId),
			normalizedName,
			normalizedEmail,
			normalizedPhone,
			normalizedDob,
			normalizedGender,
			normalizeOptionalText(emergency),
			normalizedSpecialization,
			normalizedExperience,
			normalizeOptionalText(qualification),
			normalizeOptionalText(about),
			JSON.stringify(availableDays),
			JSON.stringify(availableSlots),
			normalizedStatus,
			normalizedMonthlySalary,
		],
		(error, result) => {
			if (error) {
				console.error('Error while registering trainer:', error);
				return res.status(500).json({ message: "Unable to save trainer", success: false });
			}

			return res.status(201).json({
				message: "Trainer registered successfully",
				success: true,
				trainerId: result.insertId,
			});
		},
	);
};

export const UpdateTrainer = (req, res) => {
	const {
		name,
		email,
		phone,
		dob,
		gender,
		emergency,
		specialization,
		experience,
		qualification,
		about,
		status,
		available_days: availableDays,
		available_slots: availableSlots,
		monthly_salary: monthlySalary,
	} = req.body || {};
	const userId = req.user?.id;
	const trainerId = Number(req.params.id);
	const normalizedName = normalizeOptionalText(name);
	const normalizedEmail = normalizeOptionalText(email)?.toLowerCase();
	const normalizedPhone = normalizeOptionalText(phone);
	const normalizedSpecialization = normalizeOptionalText(specialization);
	const normalizedExperience = Number(experience);
	const normalizedGender = normalizeOptionalText(gender);
	const normalizedDob = normalizeOptionalText(dob);
	const normalizedStatus = status == null ? null : String(status).trim().toLowerCase();
	const normalizedMonthlySalary = monthlySalary == null ? null : normalizeMonthlySalary(monthlySalary);
	const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	const allowedGenders = ['Male', 'Female', 'Other'];
	const allowedStatuses = ['active', 'inactive'];

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	if (!Number.isInteger(trainerId) || trainerId <= 0) {
		return res.status(400).json({ message: "A valid trainer ID is required", success: false });
	}

	if (normalizedStatus !== null && !allowedStatuses.includes(normalizedStatus)) {
		return res.status(400).json({ message: "Please select a valid trainer status", success: false });
	}
	if (monthlySalary != null && normalizedMonthlySalary == null) {
		return res.status(400).json({ message: "Monthly salary must be a non-negative amount with at most two decimal places", success: false });
	}

	if (!normalizedName || !normalizedEmail || !normalizedPhone || !normalizedSpecialization || experience === '' || experience == null || !availableDays?.length || !availableSlots?.length) {
		return res.status(400).json({ message: "Please fill all required fields and select availability", success: false });
	}

	if (!emailPattern.test(normalizedEmail)) {
		return res.status(400).json({ message: "Please enter a valid email address", success: false });
	}

	if (normalizedPhone.length > 20) {
		return res.status(400).json({ message: "Phone number must be 20 characters or fewer", success: false });
	}

	if (!Number.isInteger(normalizedExperience) || normalizedExperience < 0) {
		return res.status(400).json({ message: "Experience must be a non-negative whole number", success: false });
	}

	if (normalizedGender && !allowedGenders.includes(normalizedGender)) {
		return res.status(400).json({ message: "Please select a valid gender", success: false });
	}

	if (normalizedDob && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
		return res.status(400).json({ message: "Date of birth must use YYYY-MM-DD format", success: false });
	}

	if (!Array.isArray(availableDays) || !Array.isArray(availableSlots) || [...availableDays, ...availableSlots].some(value => typeof value !== 'string' || !value.trim())) {
		return res.status(400).json({ message: "Please select valid availability days and time slots", success: false });
	}

	db.query(
		`UPDATE trainer SET
			name = ?, email = ?, phone = ?, dob = ?, gender = ?, emergency = ?, specialization = ?,
			experience = ?, qualification = ?, about = ?, available_days = ?, available_slots = ?,
			status = COALESCE(?, status), monthly_salary = COALESCE(?, monthly_salary)
		WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
		[
			normalizedName,
			normalizedEmail,
			normalizedPhone,
			normalizedDob,
			normalizedGender,
			normalizeOptionalText(emergency),
			normalizedSpecialization,
			normalizedExperience,
			normalizeOptionalText(qualification),
			normalizeOptionalText(about),
			JSON.stringify(availableDays),
			JSON.stringify(availableSlots),
			normalizedStatus,
			normalizedMonthlySalary,
			trainerId,
			String(userId),
		],
		(error, result) => {
			if (error) {
				console.error('Error while updating trainer:', error);
				return res.status(500).json({ message: "Unable to update trainer", success: false });
			}

			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Trainer not found", success: false });
			}

			return res.status(200).json({ message: "Trainer updated successfully", success: true });
		},
	);
};

const parseJsonArray = value => {
	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value !== 'string') {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const GetTrainers = (req, res) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	db.query(
		`SELECT id, name, email, phone, dob, gender, emergency, specialization, experience, monthly_salary,
			qualification, about,
			available_days, available_slots, status
		FROM trainer
		WHERE user_id = ? AND deleted_at IS NULL
		ORDER BY name ASC`,
		[String(userId)],
		(error, trainers) => {
			if (error) {
				console.error('Error while fetching trainers:', error);
				return res.status(500).json({ message: "Unable to fetch trainers", success: false });
			}

			return res.status(200).json({
				success: true,
				trainers: trainers.map(trainer => ({
					...trainer,
					available_days: parseJsonArray(trainer.available_days),
					available_slots: parseJsonArray(trainer.available_slots),
				})),
			});
		},
	);
};

const normalizeTrainerIds = values => {
	if (!Array.isArray(values) || !values.length) {
		return null;
	}
	const ids = [...new Set(values.map(Number))];
	return ids.every(id => Number.isSafeInteger(id) && id > 0) ? ids : null;
};

export const GetTrashedTrainers = (req, res) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	db.query(
		`SELECT id, name, deleted_at
		FROM trainer
		WHERE user_id = ? AND deleted_at IS NOT NULL
		ORDER BY deleted_at DESC`,
		[String(userId)],
		(error, trainers) => {
			if (error) {
				console.error('Error while fetching trashed trainers:', error);
				return res.status(500).json({ message: "Unable to fetch trash", success: false });
			}
			return res.status(200).json({ success: true, trainers });
		},
	);
};

export const MoveTrainerToTrash = (req, res) => {
	const userId = req.user?.id;
	const { trainerId, trainerIds } = req.body || {};
	const ids = normalizeTrainerIds(Array.isArray(trainerIds) ? trainerIds : [trainerId]);

	if (!userId || !ids) {
		return res.status(400).json({ message: "Valid trainer IDs are required", success: false });
	}

	const placeholders = ids.map(() => "?").join(", ");
	db.query(
		`UPDATE trainer SET deleted_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND deleted_at IS NULL AND id IN (${placeholders})`,
		[String(userId), ...ids],
		(error, result) => {
			if (error) {
				console.error('Error while moving trainers to trash:', error);
				return res.status(500).json({ message: "Unable to move trainers to trash", success: false });
			}
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Trainer not found", success: false });
			}
			const count = result.affectedRows;
			return res.status(200).json({
				success: true,
				message: count === 1 ? "Trainer moved to trash" : `${count} trainers moved to trash`,
			});
		},
	);
};

export const RestoreTrainer = (req, res) => {
	const userId = req.user?.id;
	const { trainerId, trainerIds } = req.body || {};
	const ids = normalizeTrainerIds(Array.isArray(trainerIds) ? trainerIds : [trainerId]);

	if (!userId || !ids) {
		return res.status(400).json({ message: "Valid trainer IDs are required", success: false });
	}

	const placeholders = ids.map(() => "?").join(", ");
	db.query(
		`UPDATE trainer SET deleted_at = NULL
		WHERE user_id = ? AND deleted_at IS NOT NULL AND id IN (${placeholders})`,
		[String(userId), ...ids],
		(error, result) => {
			if (error) {
				console.error('Error while restoring trainers:', error);
				return res.status(500).json({ message: "Unable to restore trainers", success: false });
			}
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Trainer not found in trash", success: false });
			}
			const count = result.affectedRows;
			return res.status(200).json({
				success: true,
				message: count === 1 ? "Trainer restored successfully" : `${count} trainers restored successfully`,
			});
		},
	);
};

export const DeleteTrainer = (req, res) => {
	const userId = req.user?.id;
	const { trainerId, trainerIds } = req.body || {};
	const ids = normalizeTrainerIds(Array.isArray(trainerIds) ? trainerIds : [trainerId]);

	if (!userId || !ids) {
		return res.status(400).json({ message: "Valid trainer IDs are required", success: false });
	}

	const placeholders = ids.map(() => "?").join(", ");
	db.query(
		`DELETE FROM trainer WHERE user_id = ? AND deleted_at IS NOT NULL AND id IN (${placeholders})`,
		[String(userId), ...ids],
		(error, result) => {
			if (error) {
				console.error('Error while permanently deleting trainers:', error);
				return res.status(500).json({ message: "Unable to permanently delete trainers", success: false });
			}
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Trainer not found in trash", success: false });
			}
			const count = result.affectedRows;
			return res.status(200).json({
				success: true,
				message: count === 1 ? "Trainer permanently deleted" : `${count} trainers permanently deleted`,
			});
		},
	);
};
