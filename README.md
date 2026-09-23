# Silent Symptom Spotter

Silent Symptom Spotter is a healthcare triage workflow demo for ASHA workers and doctors. The platform helps frontline workers capture patient symptoms, perform AI-assisted triage reasoning, and route cases to doctors for acknowledgement and follow-up.

## Architecture

The project is split into two independent application layers:

- Frontend: React + Vite for UI, routing, role-based dashboards, and client-side forms
- Backend: Express + SQLite for authentication, authorization, case persistence, alerts, and AI triage logic

This separation keeps the UI code, backend logic, and database concerns isolated and easier to work on in parallel.

## Folder structure

```text
silent-symptom-spotter/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── asha/
│   │   │   └── doctor/
│   │   ├── layouts/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── assets/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── triage/
│   │   │   ├── auth/
│   │   │   ├── cases/
│   │   │   ├── alerts/
│   │   │   └── sync/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── database/
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── README.md
├── .gitignore
└── .env.example
```

## Requirements

- Node.js 18+
- npm
- Modern browser

## Environment setup

### Frontend

```bash
cd frontend
cp .env.example .env
```

Example:

```env
VITE_API_URL=https://silent-symptom-spotter.onrender.com/api
```

### Backend

```bash
cd backend
cp .env.example .env
```

Example:

```env
PORT=5001
JWT_SECRET=change-me-to-a-long-random-secret
DATABASE_URL=./src/database/data.sqlite
AI_API_KEY=demo-key
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on port 5173 by default.

## Backend setup

```bash
cd backend
npm install
npm run dev
```

The API runs on port 5001 by default in this setup to avoid the local AirPlay port conflict on macOS, and exposes routes under /api.

## Database setup

The backend uses SQLite and stores the database file in the backend project. The data model includes users, cases, alerts, and case actions.

Seeded demo accounts are created automatically when the backend starts:

- ASHA: asha@demo.com / asha123
- Doctor: doctor@demo.com / doctor123

## Demo accounts

| Role         | Email           | Password  |
| ------------ | --------------- | --------- |
| ASHA worker  | asha@demo.com   | asha123   |
| Doctor / PHC | doctor@demo.com | doctor123 |

## API overview

Core backend endpoints include:

- POST /api/auth/asha/login
- POST /api/auth/doctor/login
- GET /api/auth/me
- GET /api/cases
- GET /api/cases/:id
- POST /api/cases
- PATCH /api/cases/:id
- POST /api/cases/:id/analyze
- GET /api/alerts
- PATCH /api/alerts/:id/read

The frontend should not access the database directly. It should call these endpoints through the centralized API service layer.

## Hackathon demo flow

1. ASHA worker logs in through the ASHA portal.
2. Worker records or imports a patient case.
3. Backend AI service analyzes the case and returns a triage classification.
4. Case becomes visible to the doctor dashboard.
5. Doctor logs in, reviews the case, and acknowledges or escalates it.
6. ASHA worker sees the updated status when reopening the case.

This creates a realistic single-source-of-truth healthcare workflow across both roles.
