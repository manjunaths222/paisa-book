# Requirements Mapping

This implementation is based on `FamilyFinance_Ledger_Documentation.docx` MVP release, May 2026.

## Implemented MVP Surface

- `REQ-AUTH`: Google OAuth is wired through Firebase Auth, with route protection and local persistence. A local demo mode is available only when Firebase env vars are missing.
- `REQ-MEM`: Family profiles support required name and relationship plus DOB, PAN, colour, gender, and notes. The self profile is auto-created and cannot be deleted.
- `REQ-INS`: All 10 instrument types are supported with owner member, unique type-local reference IDs, status, optional description, inline errors, edit, delete, and list filtering.
- `REQ-DASH`: Dashboard includes net worth, asset breakdown by type, family-member bar chart, obligations in the next 30 days, global member filter, stat cards, and recent activity.
- `REQ-PROJ`: Projection horizons are +3M, +6M, +12M, +24M, +36M, and +60M, with grouped bar chart, net-worth line chart, type breakdown table, member/type filters, liability treatment, and disclaimer.
- `REQ-SET`: Currency display setting, family member shortcut, account details, sign out, app version, and build date are shown in Settings.
- `REQ-UX`: The UI uses responsive cards, mobile bottom navigation, skeleton placeholders, empty states, confirmation modals, toasts, Indian currency formatting, and DD MMM YYYY dates.

## Deferred Or Partial Items

- Projection cache writes are invalidated on update, but cache persistence can be expanded after real production usage patterns are known.
- Virtualized instrument lists are not included yet because the MVP list cards remain simple; add `react-window` when list sizes exceed 50 instruments.
- Firestore emulator integration tests and security rule tests are documented but not fully added in this first implementation pass.
- PWA, export, reminders, audit trail, App Check, market price integrations, and tax reports remain V2 scope as specified.
