# NayePankh Foundation — Volunteer Backend API

Node.js + Express + MongoDB REST API for the Volunteer Information Management System.

## Setup

```bash
npm install
cp .env.example .env    # add your MONGO_URI and JWT_SECRET
npm run dev             # development with nodemon
npm start               # production
```

## Redis Cache

The admin stats endpoint uses Redis as an optional cache. If Redis is not running,
the API falls back to MongoDB automatically.

Local Redis with Docker:

```bash
docker run --name volunteer-redis -p 6379:6379 -d redis
```

Environment variables:

```bash
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

Set `REDIS_ENABLED=false` to disable Redis without changing code.

## Project Structure

```
volunteer-backend/
├── server.js
├── config/
│   └── db.js
├── models/
│   ├── User.js
│   ├── Volunteer.js
│   └── Event.js
├── controllers/
│   ├── authController.js
│   ├── volunteerController.js
│   ├── eventController.js
│   └── statsController.js
├── middleware/
│   └── authMiddleware.js
└── routes/
    ├── authRoutes.js
    ├── volunteerRoutes.js
    ├── eventRoutes.js
    └── statsRoutes.js
```

## API Endpoints

### Auth

| Method | Endpoint              | Access | Description        |
| ------ | --------------------- | ------ | ------------------ |
| POST   | /api/v1/auth/register | Public | Register user      |
| POST   | /api/v1/auth/login    | Public | Login + get token  |
| GET    | /api/v1/auth/me       | Any    | Get logged-in user |

### Volunteers

| Method | Endpoint                     | Access | Description          |
| ------ | ---------------------------- | ------ | -------------------- |
| GET    | /api/v1/volunteers           | Any    | List (filter/search) |
| POST   | /api/v1/volunteers           | Any    | Register volunteer   |
| GET    | /api/v1/volunteers/:id       | Any    | Get volunteer        |
| PUT    | /api/v1/volunteers/:id       | Any    | Update volunteer     |
| DELETE | /api/v1/volunteers/:id       | Admin  | Delete volunteer     |
| PATCH  | /api/v1/volunteers/:id/hours | Admin  | Add hours            |

### Events

| Method | Endpoint                    | Access | Description        |
| ------ | --------------------------- | ------ | ------------------ |
| GET    | /api/v1/events              | Any    | List events        |
| POST   | /api/v1/events              | Admin  | Create event       |
| GET    | /api/v1/events/:id          | Any    | Get event          |
| PUT    | /api/v1/events/:id          | Admin  | Update event       |
| DELETE | /api/v1/events/:id          | Admin  | Delete event       |
| POST   | /api/v1/events/:id/enroll   | Any    | Enroll volunteer   |
| DELETE | /api/v1/events/:id/unenroll | Any    | Unenroll volunteer |

### Stats

| Method | Endpoint      | Access | Description          |
| ------ | ------------- | ------ | -------------------- |
| GET    | /api/v1/stats | Admin  | Dashboard statistics |

## Auth Header

All protected routes require:

```
Authorization: Bearer <your_jwt_token>
```
