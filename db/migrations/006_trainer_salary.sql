ALTER TABLE trainer ADD COLUMN monthly_salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE trainer_salary_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    st_id BIGINT UNSIGNED NOT NULL,
    trainer_id BIGINT UNSIGNED NOT NULL,
    trainer_name VARCHAR(255) NOT NULL,
    salary_period DATE NOT NULL,
    salary_due DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    receipt_number VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_trainer_salary_receipt (receipt_number),
    KEY idx_trainer_salary_period (st_id, trainer_id, salary_period),
    KEY idx_trainer_salary_payment_date (st_id, payment_date)
);
