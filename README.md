# Ball Grab Battle (Vue 3 + Vite + Supabase)

    npm install
    npm run dev

1. Supabase > Authentication > Providers > Email: turn OFF "Confirm email" for instant sign-up.
2. Realtime broadcast and presence work on public channels by default. No tables are needed.
3. Voice uses STUN. For strict networks fill in VITE_TURN_* in `.env`.

Structure: `src/lib/engine.js` (pure rules), `src/composables/` (auth, game + realtime, voice), `src/components/` (views).
