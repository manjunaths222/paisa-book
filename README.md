# Paisa Book

Paisa Book is a React/Vite family finance ledger for tracking deposits, investments, loans, insurance, PPF, SSA, and custom savings across household members. It follows the attached FamilyFinance Ledger MVP specification and uses Firebase Auth + Firestore with Vercel static hosting.

## Features

- Google OAuth sign-in with protected routes and local session persistence.
- First-run onboarding with automatic self profile creation.
- Family member CRUD with relationship, DOB, gender, PAN, avatar colour, and notes.
- Instrument CRUD for all 10 MVP instrument types: FD, RD, stocks, MF lumpsum, MF SIP, loan, term insurance, PPF, SSA, and other savings.
- Zod validation for required fields, ranges, uniqueness, and SSA beneficiary eligibility.
- Dashboard with net worth, summary cards, type/member charts, upcoming obligations, and recent activity.
- Projection page with +3M, +6M, +12M, +24M, +36M, and +60M horizons.
- Portfolio Assistant for grounded portfolio Q&A and what-if affordability analysis using OpenAI, Anthropic, or Gemini.
- Firestore security rules, indexes, Vercel SPA routing, security headers, and GitHub Actions CI.
- Local demo mode when Firebase environment variables are not configured.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

For production auth and persistence, fill `.env.local` with the Firebase web app values and enable Google sign-in in Firebase Authentication.

## Scripts

- `npm run dev` starts Vite.
- `npm run build` type-checks and builds the SPA.
- `npm run lint` runs ESLint.
- `npm run firebase:deploy -- --project <project-id>` deploys Firestore rules and indexes.
- `npm test` runs Vitest.

## Firebase

Enable these services:

- Authentication with Google provider.
- Firestore in production mode, preferably `asia-south1` for Indian users.

Deploy rules and indexes:

```bash
npx firebase-tools deploy --only firestore --project <project-id>
```

If Google sign-in succeeds but the app reports `Missing or insufficient permissions`, deploy the Firestore rules and indexes above to the same Firebase project configured in `.env.local`.

Local emulators are configured in `firebase.json`. Set `VITE_USE_FIREBASE_EMULATORS=true` to connect the app to local Auth and Firestore emulators during development.

## Documentation

Implementation and deployment notes live in `docs/`.
