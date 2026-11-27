# Dance studio backend

## Setup

Install dependencies with `npm install`, then configure these environment variables in a local `.env` file:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_NAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `GOOGLE_WEB_CLIENT_ID` (Google OAuth web client ID used to verify Google ID tokens)
- `BREVO_API_KEY` (Brevo API key; `API_KEY` is also accepted for existing setups)
- `BREVO_SENDER_EMAIL` (verified sender address in Brevo)
- `BREVO_SENDER_NAME` (optional sender display name)
- `BACKEND_PORT` (optional; defaults to `3000`)

Start the API with `npm start`.

## Database migration

Attendance records and payment receipts require three additional tables. Apply the additive migration once before using those features:

```powershell
Get-Content .\db\migrations\001_attendance_and_payments.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

The migration is safe to run again because each table uses `CREATE TABLE IF NOT EXISTS`.

Dance-style trash requires one additive schema migration. Apply it once before deploying the updated API:

```powershell
Get-Content .\db\migrations\002_dance_style_trash.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

Dance-style trash moves set `deleted_at` instead of removing records. Trashed styles are available at `GET /api/trash/dance-style`, can be moved to trash with `PUT /api/trash-style`, and restored with `PUT /api/restore-style`. The existing `DELETE /api/delete-style` endpoint remains a permanent delete.

Trainer trash requires the additive schema migration. Apply it once before deploying the updated API:

```powershell
Get-Content .\db\migrations\003_trainer_trash.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

Trashed trainers are available at `GET /api/trash/trainers`, can be moved to trash with `PUT /api/trash-trainer`, restored with `PUT /api/restore-trainer`, and permanently removed with `DELETE /api/delete-trainer`.

Class trash requires the additive schema migration. Apply it once before deploying the updated API:

```powershell
Get-Content .\db\migrations\004_class_trash.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

Trashed classes are available at `GET /api/trash/classes`, can be moved to trash with `PUT /api/trash-class`, restored with `PUT /api/restore-class`, and permanently removed with `DELETE /api/delete-class`.

Student trash requires the additive schema migration. Apply it once before deploying the updated API:

```powershell
Get-Content .\db\migrations\005_student_trash.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

Trashed students are available at `GET /api/trash/students`, can be moved to trash with `PUT /api/trash-student`, restored with `PUT /api/restore-student`, and permanently removed with `DELETE /api/delete-student`.

Trainer payroll requires the additive schema migration. Apply it once before deploying the payroll endpoints:

```powershell
Get-Content .\db\migrations\006_trainer_salary.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

Set each trainer's fixed monthly salary through Add/Edit Trainer. `GET /api/trainer-salaries?month=YYYY-MM` returns monthly salary, paid-to-date, and remaining balances. Record full or partial payments with `POST /api/trainer-salaries/pay`; review transactions with `GET /api/trainer-salaries/history?trainer_id=ID`. The same history endpoint accepts `payment_id=ID` to retrieve a single studio-owned payment for its salary receipt. The first payment for a month snapshots the monthly salary due, so later salary edits do not change that month's balance.

First-login welcome emails require one additive schema migration. Apply it once before deploying the updated authentication endpoints:

```powershell
Get-Content .\db\migrations\007_first_login_welcome_email.sql | mysql --host=localhost --user=YOUR_USER --password YOUR_DATABASE
```

The first successful password or Google sign-in sends a welcome email to the registered address through Brevo. The email is not sent again after Brevo accepts it. If the Brevo request fails, login still succeeds and the email remains eligible for retry on a later sign-in. Configure a verified `BREVO_SENDER_EMAIL`; the API key is only used by the backend.

Google sign-in is available at `POST /api/auth/google-login`. It accepts a Google `idToken`, verifies it against `GOOGLE_WEB_CLIENT_ID`, and signs in an existing registration with a matching verified email. For a new Google account, the endpoint responds with `success: true` and `isNewUser: true` without issuing a session. The app then asks for a studio name, phone number, country, and currency, and submits those details with the same token to this endpoint to create the account and start the session. The new registration stores the verified Google name, email, and profile picture URL.

## Added authenticated endpoints

- `GET` / `api/attendance/students?date=YYYY-MM-DD`
- `GET` / `api/attendance/students/:studentId/history?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST` / `api/attendance/students`
- `GET` / `api/attendance/trainers?date=YYYY-MM-DD`
- `POST` / `api/attendance/trainers`
- `GET` / `api/attendance/report?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET` / `api/payments/summary`
- `GET` / `api/payments/pending`
- `GET` / `api/payments/history`
- `GET` / `api/payments/history/:id`
- `POST` / `api/payments/collect`
- `GET` / `api/trainer-salaries?month=YYYY-MM`
- `GET` / `api/trainer-salaries/history?trainer_id=ID` or `?payment_id=ID`
- `POST` / `api/trainer-salaries/pay`
- `GET` / `api/reports/summary`
- `GET` / `api/reports/enrollment`
- `GET` / `api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD`

Revenue reports preserve `summary.revenue` as gross student-fee collections and additionally include trainer salary expenses by payment date (`summary.salary_expense`, `summary.salary_payment_count`, `summary.net_revenue`, daily salary totals, and `salary_by_trainer`).

All routes require the existing JWT bearer token. Studio ownership is derived from the token rather than a client-supplied studio ID.
