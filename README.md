# Smart Job API (Express)

## Setup

Create `.env` in `backend/` and set:

PORT=4000
JWT_SECRET=dev_super_secret_change_me
COOKIE_NAME=sj_token
COOKIE_SECURE=false
ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

Then install and run:

cd backend
npm install
npm run dev

API will run on http://localhost:4000

## Routes
- Auth: POST /auth/signup, POST /auth/login, POST /auth/logout, GET /auth/me
- Students: GET /students/me/profile, PUT /students/me/profile
- Jobs: GET /jobs, POST /jobs (recruiter), GET /jobs/mine, DELETE /jobs/:id
- Applications: POST /applications/:jobId (student), GET /applications/job/:jobId (recruiter), PATCH /applications/:id/shortlist
- Admin: GET /admin/users, PATCH /admin/users/:id/status, GET /admin/jobs, PATCH /admin/jobs/:id/status, GET /admin/analytics

Note: In-memory storage for now. Replace `db/memory.js` with a real DB later (Prisma + Postgres).

