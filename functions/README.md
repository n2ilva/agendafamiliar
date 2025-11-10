# Cloud Functions for AgendaFamiliar

This folder contains a single Cloud Function that ensures newly created `family_tasks` documents have safe defaults.

Deploy:

1. Install deps:
   cd functions
   npm install

2. Deploy:
   npx firebase deploy --only functions:ensureTaskDefaults

Local emulation:

1. Install deps and run emulator:
   cd functions
   npm install
   npx firebase emulators:start --only functions,firestore

Notes:
- Function will set `private: false` if missing and will add server timestamps for `createdAt`/`updatedAt`.
- The function deletes `repeatDays` if it's not an array to avoid malformed fields.
