ALTER TABLE registration
    ADD COLUMN first_login_email_status ENUM('pending', 'sending', 'sent')
    NOT NULL DEFAULT 'pending';