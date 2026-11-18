import db from "../db/db.js";

const classLevels = new Set(['Kids', 'Beginner', 'Intermediate', 'Advanced', 'All']);
const statuses = new Set(["Active", "Inactive", "Draft"]);
const frequencies = new Set(["Daily", "Weekly", "Monthly"]);
const feeTypes = new Set(["Monthly", "Weekly", "Daily", "One Time"]);
const weekdays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const isValidDate = value => {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isValidTime = value =>
	typeof value === "string" &&
	/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);

const isMoney = value => {
	if (value === "" || value == null || (typeof value === "string" && !value.trim())) {
		return false;
	}

	const normalized = String(value).trim();
	const amount = Number(normalized);
	return /^\d+(?:\.\d{1,2})?$/.test(normalized) &&
		Number.isFinite(amount) &&
		amount >= 0 &&
		amount <= 99999999.99;
};

const validateClassData = body => {
	const requiredTextFields = [
		["class_name", 150],
		["dance_style", 100],
		["trainer_id", 50],
	];

	for (const [field, maxLength] of requiredTextFields) {
		if (typeof body[field] !== "string" || !body[field].trim() || body[field].trim().length > maxLength) {
			return { error: `${field.replaceAll("_", " ")} is required and must be at most ${maxLength} characters` };
		}
	}

	if (body.short_description != null && (typeof body.short_description !== "string" || body.short_description.length > 150)) {
		return { error: "Short description must be at most 150 characters" };
	}

	if (!classLevels.has(body.class_level) || !statuses.has(body.status) || !frequencies.has(body.frequency) || !feeTypes.has(body.fee_type)) {
		return { error: "Select valid class level, status, frequency, and fee type values" };
	}

	const capacity = Number(body.total_capacity);
	if (!Number.isInteger(capacity) || capacity < 1 || capacity > 2147483647) {
		return { error: "Total capacity must be a positive whole number" };
	}

	if (!Array.isArray(body.class_days) || body.class_days.length === 0 || body.class_days.some(day => !weekdays.has(day)) || new Set(body.class_days).size !== body.class_days.length) {
		return { error: "Select one or more valid class days" };
	}

	if (!isValidTime(body.start_time) || !isValidTime(body.end_time) || body.start_time === body.end_time) {
		return { error: "Enter valid, different class start and end times" };
	}

	if (!isValidDate(body.start_date) || (body.end_date != null && body.end_date !== "" && !isValidDate(body.end_date))) {
		return { error: "Enter valid class dates in YYYY-MM-DD format" };
	}

	const endDate = body.end_date || null;
	if (endDate && endDate < body.start_date) {
		return { error: "Class end date cannot be before its start date" };
	}

	if (body.excluded_dates != null && (!Array.isArray(body.excluded_dates) || body.excluded_dates.some(date => !isValidDate(date)))) {
		return { error: "Excluded dates must be valid dates" };
	}

	if (!isMoney(body.fee_amount) || !isMoney(body.discount) || Number(body.discount) > 100) {
		return { error: "Fee must be a valid amount and discount must be between 0 and 100 percent" };
	}

	if (body.additional_charges != null && (!Array.isArray(body.additional_charges) || body.additional_charges.some(charge =>
		!charge ||
		typeof charge.name !== "string" ||
		!charge.name.trim() ||
		charge.name.trim().length > 100 ||
		!isMoney(charge.amount),
	))) {
		return { error: "Additional charges need a name and a valid non-negative amount" };
	}

	const additionalCharges = (body.additional_charges || []).map(charge => ({
		name: charge.name.trim(),
		amount: Number(charge.amount),
	}));
	const payableAmount = Number((
		Number(body.fee_amount) * (1 - Number(body.discount) / 100) +
		additionalCharges.reduce((total, charge) => total + charge.amount, 0)
	).toFixed(2));

	if (!isMoney(payableAmount)) {
		return { error: "The total payable amount exceeds the supported limit" };
	}

	return {
		data: {
			...body,
			class_name: body.class_name.trim(),
			dance_style: body.dance_style.trim(),
			trainer_id: body.trainer_id.trim(),
			short_description: body.short_description?.trim() || null,
			total_capacity: capacity,
			end_date: endDate,
			fee_amount: Number(body.fee_amount),
			discount: Number(body.discount),
			additional_charges: additionalCharges,
			payable_amount: payableAmount,
		},
	};
};

const validateClassReferences = (classData, userId, callback) => {
	db.query(
		"SELECT id FROM dance_style WHERE user_id = ? AND style = ? AND status = 'active' LIMIT 1",
		[String(userId), classData.dance_style],
		(styleError, styles) => {
			if (styleError) {
				console.error("Error validating class dance style:", styleError);
				return callback(styleError);
			}

			if (!styles.length) {
				return callback(null, "Select an active dance style from your studio");
			}

			db.query(
				"SELECT id FROM trainer WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1",
				[classData.trainer_id, String(userId)],
				(trainerError, trainers) => {
					if (trainerError) {
						console.error("Error validating class trainer:", trainerError);
						return callback(trainerError);
					}

					if (!trainers.length) {
						return callback(null, "Select an active trainer from your studio");
					}

					return callback(null, null);
				},
			);
		},
	);
};

const saveClass = (res, classData, userId) => {
	const {
		class_name,
		dance_style,
		class_level,
		short_description,
		trainer_id,
		total_capacity,
		status,
		frequency,
		class_days,
		start_time,
		end_time,
		start_date,
		end_date,
		excluded_dates,
		fee_type,
		fee_amount,
		discount,
		additional_charges,
	} = classData;
	const normalizedClassName = String(class_name).trim();
	const normalizedDanceStyle = String(dance_style).trim();
	const normalizedTrainerId = String(trainer_id).trim();
	const capacity = Number(total_capacity);
	const amount = Number(fee_amount);
	const discountPercent = Number(discount);
	const chargesTotal = (additional_charges || []).reduce(
		(total, charge) => total + Number(charge.amount),
		0,
	);
	const payableAmount = Number(
		(amount * (1 - discountPercent / 100) + chargesTotal).toFixed(2),
	);

	validateClassReferences({ dance_style: normalizedDanceStyle, trainer_id: normalizedTrainerId }, userId, (referenceError, referenceMessage) => {
		if (referenceError) {
			return res.status(500).json({ message: "Unable to validate class assignments", success: false });
		}

		if (referenceMessage) {
			return res.status(400).json({ message: referenceMessage, success: false });
		}

		db.query(
			`INSERT INTO classes (
				class_name, dance_style, class_level, short_description, trainer_id,
				total_capacity, available_seats, status, frequency, class_days,
				start_time, end_time, start_date, end_date, excluded_dates,
				fee_type, fee_amount, discount, payable_amount, additional_charges
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				normalizedClassName,
				normalizedDanceStyle,
				class_level,
				short_description?.trim() || null,
				normalizedTrainerId,
				capacity,
				capacity,
				status,
				frequency,
				JSON.stringify(class_days),
				start_time,
				end_time,
				start_date,
				end_date || null,
				excluded_dates?.length ? JSON.stringify(excluded_dates) : null,
				fee_type,
				amount,
				discountPercent,
				payableAmount,
				additional_charges?.length ? JSON.stringify(additional_charges) : null,
			],
			(insertError, result) => {
				if (insertError) {
					console.error("Error creating class:", insertError);
					return res.status(500).json({ message: "Unable to save class", success: false });
				}

				return res.status(201).json({
					message: "Class created successfully",
					success: true,
					classId: result.insertId,
				});
			},
		);
	});
};

export const AddClass = (req, res) => {
	const body = req.body || {};
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	const validation = validateClassData(body);
	if (validation.error) {
		return res.status(400).json({ message: validation.error, success: false });
	}

	return saveClass(res, validation.data, userId);
};

export const UpdateClass = (req, res) => {
	const userId = req.user?.id;
	const classId = Number(req.params.id);
	const validation = validateClassData(req.body || {});

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	if (!Number.isInteger(classId) || classId <= 0) {
		return res.status(400).json({ message: "A valid class ID is required", success: false });
	}

	if (validation.error) {
		return res.status(400).json({ message: validation.error, success: false });
	}

	const classData = validation.data;
	const ownershipCondition = `(
		EXISTS (
			SELECT 1 FROM trainer owned_trainer
			WHERE owned_trainer.id = classes.trainer_id AND owned_trainer.user_id = ?
		)
		OR EXISTS (
			SELECT 1 FROM dance_style owned_style
			WHERE owned_style.user_id = ? AND owned_style.style = classes.dance_style
		)
	)`;

	db.query(
		`SELECT total_capacity, available_seats
		FROM classes
		WHERE id = ? AND ${ownershipCondition}
		LIMIT 1`,
		[classId, String(userId), String(userId)],
		(classError, matchingClasses) => {
			if (classError) {
				console.error("Error finding class to update:", classError);
				return res.status(500).json({ message: "Unable to load class for update", success: false });
			}

			if (!matchingClasses.length) {
				return res.status(404).json({ message: "Class not found", success: false });
			}

			const existingClass = matchingClasses[0];
			const currentCapacity = Number(existingClass.total_capacity) || 0;
			const availableSeats = Number(existingClass.available_seats);
			const enrolled = Math.max(
				0,
				currentCapacity - (
					existingClass.available_seats != null && Number.isFinite(availableSeats)
						? availableSeats
						: currentCapacity
				),
			);
			if (classData.total_capacity < enrolled) {
				return res.status(400).json({
					message: `Total capacity cannot be less than the ${enrolled} students already enrolled`,
					success: false,
				});
			}

			validateClassReferences(classData, userId, (referenceError, referenceMessage) => {
				if (referenceError) {
					return res.status(500).json({ message: "Unable to validate class assignments", success: false });
				}

				if (referenceMessage) {
					return res.status(400).json({ message: referenceMessage, success: false });
				}

				db.query(
					`UPDATE classes SET
						class_name = ?, dance_style = ?, class_level = ?, short_description = ?, trainer_id = ?,
						total_capacity = ?, available_seats = ?, status = ?, frequency = ?, class_days = ?,
						start_time = ?, end_time = ?, start_date = ?, end_date = ?, excluded_dates = ?,
						fee_type = ?, fee_amount = ?, discount = ?, payable_amount = ?, additional_charges = ?
					WHERE id = ? AND ${ownershipCondition}`,
					[
						classData.class_name,
						classData.dance_style,
						classData.class_level,
						classData.short_description,
						classData.trainer_id,
						classData.total_capacity,
						classData.total_capacity - enrolled,
						classData.status,
						classData.frequency,
						JSON.stringify(classData.class_days),
						classData.start_time,
						classData.end_time,
						classData.start_date,
						classData.end_date,
						classData.excluded_dates?.length ? JSON.stringify(classData.excluded_dates) : null,
						classData.fee_type,
						classData.fee_amount,
						classData.discount,
						classData.payable_amount,
						classData.additional_charges.length ? JSON.stringify(classData.additional_charges) : null,
						classId,
						String(userId),
						String(userId),
					],
					updateError => {
						if (updateError) {
							console.error("Error updating class:", updateError);
							return res.status(500).json({ message: "Unable to update class", success: false });
						}

						return res.status(200).json({ message: "Class updated successfully", success: true });
					},
				);
			});
		},
	);
};

export const GetClasses = (req, res) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Authenticated user is required", success: false });
	}

	db.query(
		`SELECT classes.*, trainer.name AS trainer_name
		FROM classes
		LEFT JOIN trainer
			ON trainer.id = classes.trainer_id
			AND trainer.user_id = ?
		WHERE trainer.id IS NOT NULL
			OR EXISTS (
				SELECT 1
				FROM dance_style
				WHERE dance_style.user_id = ?
					AND dance_style.style = classes.dance_style
			)
		ORDER BY classes.start_date DESC, classes.id DESC`,
		[String(userId), String(userId)],
		(error, classes) => {
			if (error) {
				console.error("Error fetching classes:", error);
				return res.status(500).json({ message: "Unable to fetch classes", success: false });
			}

			return res.status(200).json({ classes, success: true });
		},
	);
};