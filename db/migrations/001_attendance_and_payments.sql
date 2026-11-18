CREATE TABLE IF NOT EXISTS student_attendance (
    id INT(11) NOT NULL AUTO_INCREMENT,
    st_id INT(11) NOT NULL,
    student_id INT(11) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL,
    notes VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_attendance_day (st_id, student_id, attendance_date),
    KEY idx_student_attendance_date (st_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS trainer_attendance (
    id INT(11) NOT NULL AUTO_INCREMENT,
    st_id INT(11) NOT NULL,
    trainer_id INT(11) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL,
    notes VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_trainer_attendance_day (st_id, trainer_id, attendance_date),
    KEY idx_trainer_attendance_date (st_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS student_payments (
    id INT(11) NOT NULL AUTO_INCREMENT,
    st_id INT(11) NOT NULL,
    student_id INT(11) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type ENUM('Monthly', 'Quarterly', 'Half Yearly', 'Yearly') NOT NULL,
    payment_method ENUM('Cash', 'Online', 'Upi') NOT NULL,
    receipt_number VARCHAR(40) NOT NULL,
    notes VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_student_payment_receipt (st_id, receipt_number),
    KEY idx_student_payment_date (st_id, payment_date),
    KEY idx_student_payment_student (st_id, student_id)
);
