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
- `BACKEND_PORT` (optional; defaults to `3000`)

Start the API with `npm start`.

## Database migration

The existing database schema remains unchanged. Attendance records and payment receipts require three additional tables. Apply the additive migration once before using those features:

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
- `GET` / `api/reports/summary`
- `GET` / `api/reports/enrollment`
- `GET` / `api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD`

All routes require the existing JWT bearer token. Studio ownership is derived from the token rather than a client-supplied studio ID.
