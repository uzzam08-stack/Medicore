# MediCore Frontend

React + Vite frontend inspired by the supplied purple/lavender/white hospital website template.

## Included
- Overview dashboard
- Patient directory with search and add-patient modal
- Doctor directory with specialization filters
- Appointment listing with status filter, booking modal and cancel action
- Responsive sidebar and mobile layout
- `src/api.js` placeholder for future backend connection

## Run
Requires Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

Build check:

```bash
npm run build
```

## Important
This is a frontend-first prototype. Records are fictional demo data held in React state. Changes do not persist after refresh, and no backend is connected yet. Do not enter real patient information.

The current C++ console program does not expose HTTP endpoints by itself. To connect the UI, first provide an HTTP API for the C++ business logic, then implement requests in `src/api.js`. Set `VITE_API_BASE_URL` in `.env`, for example `VITE_API_BASE_URL=http://localhost:8080/api`.
