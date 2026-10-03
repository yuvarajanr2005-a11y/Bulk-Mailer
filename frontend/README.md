# Postmail frontend

## Local development

1. In `backend`, run `npm install` and `npm run dev`.
2. In `frontend`, run `npm install` and `npm run dev`.

Vite proxies `/api` requests to `http://localhost:5000` during local development. Start the backend as well as the frontend to load email history or send messages.

## Deployment

The production frontend defaults to `https://bulk-mailer-1-gs93.onrender.com/api`. To use another API, set the frontend build environment variable `VITE_API_URL` to its public URL ending in `/api` and rebuild/redeploy. Set the backend's `FRONTEND_ORIGIN` to the frontend's public origin so the API permits browser requests from that site.
