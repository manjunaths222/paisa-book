# Deployment

## Environment Variables

Set these in `.env.local` for development and in Vercel project environment variables for preview and production:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional local emulator flag:

- `VITE_USE_FIREBASE_EMULATORS=true`

Portfolio Assistant model settings:

- `AI_PROVIDER=openai`, `anthropic`, or `gemini`
- `AI_MODEL` such as `gpt-4o-mini`, `claude-3-5-haiku-latest`, or `gemini-1.5-flash`
- `AI_MAX_OUTPUT_TOKENS`, optional, defaults to `3000`
- `OPENAI_API_KEY` when `AI_PROVIDER=openai`
- `ANTHROPIC_API_KEY` when `AI_PROVIDER=anthropic`
- `GEMINI_API_KEY` when `AI_PROVIDER=gemini`

Keep model API keys in Vercel environment variables. Do not expose them with a `VITE_` prefix.

## Firebase Setup

1. Create separate dev and production Firebase projects.
2. Enable Authentication and Google sign-in.
3. Add `localhost` and the Vercel production domain to Authentication > Settings > Authorized domains.
4. Create Firestore Database in production mode, ideally in `asia-south1`.
5. Replace the project ID in `.firebaserc`.
6. Deploy Firestore rules and indexes before first production sign-in.

```bash
npx firebase-tools deploy --only firestore --project <project-id>
```

You can also use the project script after installing Firebase CLI:

```bash
firebase login
npm run firebase:deploy -- --project <project-id>
```

## Fixing Permission Errors

If sign-in succeeds but the app shows `Missing or insufficient permissions`, Firestore is rejecting the app's first profile write or self-member write.

Check these items:

- Firestore Database has been created for the same Firebase project used in `.env.local`.
- `firestore.rules` and `firestore.indexes.json` have been deployed to that project.
- The authenticated Google account is using the same project configured by `VITE_FIREBASE_PROJECT_ID`.
- The deployed rules include owner-scoped access for `users`, `members`, and `instruments`.

New Firebase projects created in production mode often start with restrictive rules. The app will not work against deny-all rules.

## Vercel

The app is a static SPA with one Vercel serverless function for the Portfolio Assistant. `vercel.json` rewrites browser routes to `index.html` while keeping `/api/*` available for serverless functions. Security headers include CSP, frame protection, content-type protection, referrer policy, and permissions policy.

The assistant deploys with the same Vercel project as the app at:

```text
/api/portfolio-agent
```

To switch model providers, update `AI_PROVIDER`, `AI_MODEL`, and the matching provider API key in Vercel, then redeploy.

The assistant sends only redacted portfolio context to the LLM provider. It removes member names, internal IDs, reference/account IDs, descriptions, PAN, DOB, email, Firebase UID, and institution/security names before model access. The user's typed question is also redacted for known names and references from the portfolio, but users should still avoid typing PAN, account numbers, or other secrets into the chat.

## CI

`.github/workflows/ci.yml` runs:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`

On `main`, it can deploy Firestore rules and indexes when `FIREBASE_TOKEN` and `FIREBASE_PROJECT_ID` are configured as GitHub secrets.
