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
- `src/features/assistant` contains the portfolio assistant chat experience.
- `src/features/settings` contains account and display settings.
- `src/lib/agent` builds the sanitized portfolio snapshot sent to the assistant endpoint.
- `src/lib/calc` contains pure finance/projection calculations.
- `src/lib/firestore` contains the Firebase service layer and local development adapter.
- `src/shared` contains UI primitives, hooks, and stores.
- `src/types` contains domain types, catalogs, and Zod schemas.
- `api` contains Vercel serverless functions, including the model-provider adapter for portfolio Q&A.

## Data Model

The production Firestore model uses flat top-level collections:

- `users/{uid}`
- `members/{memberId}` with `uid`
- `instruments/{instrumentId}` with `uid`
- `settings/{uid}` reserved for future expansion

Every document is scoped by `uid`. Firestore rules verify that reads, writes, and deletes are limited to the authenticated owner.

## Local Demo Adapter

When Firebase env vars are absent, the app runs with a localStorage-backed adapter. It mirrors the Firestore service signatures so development and visual QA can happen before Firebase is provisioned.

## Portfolio Assistant

The assistant is intentionally lightweight:

- The browser reads the authenticated user's Firestore-backed members and instruments through the existing hooks.
- `buildPortfolioAgentSnapshot` converts that data into a compact, finance-aware snapshot with totals, projections, maturity values, upcoming events, and instrument details.
- `redactSnapshotForModel` removes PII and sensitive identifiers before model access. The LLM does not receive member names, member IDs, account/reference IDs, descriptions, PAN, DOB, email, Firebase UID, bank names, policy names, fund names, company names, or tickers.
- `redactQuestionForModel` replaces known member names, reference IDs, and instrument identifiers in the user's question with anonymized aliases before sending it.
- The redacted snapshot and redacted question are sent to `/api/portfolio-agent`.
- The Vercel serverless function calls the selected LLM provider with a grounded system prompt and returns the answer.
- The serverless function also performs a defensive scrub of known sensitive keys before the provider call.

The serverless function does not read or write Firestore. This keeps the implementation easy to deploy and avoids a separate backend service. Provider switching is controlled with environment variables:

- `AI_PROVIDER=openai`, `anthropic`, or `gemini`
- `AI_MODEL=<provider model name>`
- `AI_MAX_OUTPUT_TOKENS=<500-8000>` defaults to `3000`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`

LangGraph is not required for the current single-step assistant. If the product later needs multi-step workflows such as goal planning, tool calling, saved action plans, approval gates, or scheduled monitoring, the `/api/portfolio-agent` endpoint is the right place to introduce a LangGraph graph without changing the React page.
