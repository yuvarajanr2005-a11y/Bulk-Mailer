# Bulk Mail backend

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and SMTP credentials. For Gmail, use an app password rather than your account password.
3. Start MongoDB, then run `npm run dev` for development or `npm start` for production.
4. Start the frontend with `npm run dev` from the `frontend` folder. Set `VITE_API_URL` there only if the API is not at `http://localhost:5000/api`.

The API accepts `POST /api/emails` with `subject`, `body`, and `recipients` (a comma-, semicolon-, or newline-separated string). Recipients are validated, deduplicated, and mailed individually. Campaign outcomes are stored in MongoDB. `GET /api/emails` returns the latest 50 campaigns; `GET /api/health` checks API/database status.

Keep `.env` private and never commit real mail or database credentials.
