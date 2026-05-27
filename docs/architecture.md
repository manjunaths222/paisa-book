# Architecture

## Stack

- React 18 + Vite 5 + TypeScript.
- Tailwind CSS for styling.
- React Router for SPA routing.
- React Hook Form + Zod for forms and validation.
- Firebase Auth + Firestore for production identity and persistence.
- Zustand for lightweight UI state such as toasts and navigation.
- Recharts for dashboard and projection charts.
- Framer Motion for route transitions.

## Source Layout

- `src/app` contains the route composition.
- `src/features/auth` contains login and route protection.
- `src/features/dashboard` contains dashboard widgets and onboarding.
- `src/features/instruments` contains instrument listing, form configuration, and add/edit form.
- `src/features/members` contains family member CRUD.
- `src/features/projections` contains projection charts and tables.
- `src/features/settings` contains account and display settings.
- `src/lib/calc` contains pure finance/projection calculations.
- `src/lib/firestore` contains the Firebase service layer and local development adapter.
- `src/shared` contains UI primitives, hooks, and stores.
- `src/types` contains domain types, catalogs, and Zod schemas.

## Data Model

The production Firestore model uses flat top-level collections:

- `users/{uid}`
- `members/{memberId}` with `uid`
- `instruments/{instrumentId}` with `uid`
- `settings/{uid}` reserved for future expansion

Every document is scoped by `uid`. Firestore rules verify that reads, writes, and deletes are limited to the authenticated owner.

## Local Demo Adapter

When Firebase env vars are absent, the app runs with a localStorage-backed adapter. It mirrors the Firestore service signatures so development and visual QA can happen before Firebase is provisioned.
