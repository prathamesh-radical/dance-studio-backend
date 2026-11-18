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
