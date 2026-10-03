# Postmail frontend

## Local development

1. In `backend`, run `npm install` and `npm run dev`.
2. In `frontend`, run `npm install` and `npm run dev`.

Vite proxies `/api` requests to `http://localhost:5000` during local development. Start the backend as well as the frontend to load email history or send messages.

## Deployment

Set the frontend build environment variable `VITE_API_URL` to the deployed backend's public URL, including `/api` (for example, `https://your-backend.onrender.com/api`). Rebuild/redeploy the frontend after changing it. Set the backend's `FRONTEND_ORIGIN` to the frontend's public origin so the API permits browser requests from that site.
