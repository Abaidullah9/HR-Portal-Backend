# HR Portal — Backend

REST API for the HR Portal: employees, attendance, leave, payroll, recruitment, performance, and organization settings. Built with Express 5, MongoDB (Mongoose), and TypeScript.

Pairs with the [HR Portal Frontend](https://github.com/Abaidullah9/HR-Portal-Frontend) (Next.js).

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose 9
- **Auth:** JWT in httpOnly cookies
- **Testing:** Jest + Supertest (58 tests)

## Deployment

A `Dockerfile` builds the API into a slim production image, and the workspace's
`docker-compose.yml` runs it with MongoDB and the frontend. See `DEPLOYMENT.md`
beside both repositories for the commands and the production checklist (cookie
mode for split hostnames, mail provider, object storage, proxy settings).

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB running locally (or a connection string for a remote cluster)

### Setup

```bash
cp .env.example .env   # then fill in real values
npm install
```

Create a `.env` file in the project root (or copy the committed template):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/HR-DB
JWT_SECRET=replace-with-a-long-random-string
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Seed the database with sample data (optional):

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev
```

The API is now available at `http://localhost:5000/api/v1`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `3001`; typically set to `5000` in `.env`) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign auth tokens — use a long random value (see `.env.example` for a generator command) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | No | Allowed CORS origin (default `http://localhost:3000`) |

> `.env` is gitignored. Never commit real secrets.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (`node dist/server.js`) |
| `npm run seed` | Seed the database with sample data |
| `npm test` | Run the Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |

## API Overview

**Base URL:** `http://localhost:<PORT>/api/v1`

### Authentication

JWT is returned in an httpOnly `accessToken` cookie on login — the browser handles it automatically; no `Authorization` header is needed. CORS is configured for the frontend origin with `credentials: true`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/users/register` | — | Create a user account |
| `POST` | `/users/login` | — | Log in, sets httpOnly cookie (rate-limited: 5 attempts / 15 min) |
| `POST` | `/users/logout` | — | Clear the auth cookie |
| `GET` | `/users/me` | ✅ | Current authenticated user |
| `PATCH` | `/users/:_id/status` | ✅ RBAC | Update user status |
| `PATCH` | `/users/:_id/role` | ✅ RBAC | Update user role |
| `GET` | `/health` | — | Server uptime + MongoDB connection status (503 if DB is down) |

### Resource Endpoints

All resources follow the same CRUD pattern under `/api/v1`. Most routes require authentication (`isAuthenticated`) and check action-based permissions (`authorize("read_X")`, `"create_X"`, `"update_X"`, `"delete_X"`).

| Resource | Base path |
|---|---|
| Employees | `/employees` |
| Attendance | `/attendance` |
| Leave requests | `/leave-requests` |
| Leave balances | `/leave-balances` |
| Payroll | `/payroll` |
| Departments | `/departments` |
| Teams | `/teams` |
| Roles | `/roles` |
| Job postings | `/job-postings` |
| Candidates | `/candidates` |
| Interviews | `/interviews` |
| Appraisals | `/appraisals` |
| Performance cycles | `/performance-cycles` |
| Feedback | `/feedback` |
| Documents | `/documents` |
| Reports | `/reports` |
| Organization settings | `/organization-settings` |
| Actions | `/actions` |
| Users | `/users` |

### Response Shape

Every response follows a consistent envelope:

```json
{
  "success": true,
  "message": "…",
  "data": { },
  "pagination": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
}
```

`pagination` is present on paginated list endpoints only.

### Rate Limiting

- Global: 1000 requests / 15 min per IP on `/api/*`
- Login: 5 attempts / 15 min per IP

## Project Structure

```
src/
├── server.ts          # Entry point — connects DB, starts Express
├── app.ts             # Express app: CORS, rate limit, cookies, routes
├── config/            # DB connection
├── routes/            # Route definitions per resource
├── controllers/       # Request handling
├── services/          # Business logic + DB queries
├── models/            # Mongoose schemas
├── middlewares/       # Auth, RBAC, validation, error handler
├── utils/
│   ├── dtos/          # Request body types
│   └── helper/        # AppError, sendError, validation, constants, ownership
└── __tests__/         # Jest unit + integration tests
```

## Testing

```bash
npm test
```

The suite covers auth middleware, RBAC authorization, validation utils, error handling, user controller, the health endpoint, and full request/response cycles via Supertest.
