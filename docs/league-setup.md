# Homeside league — backend setup (one-time)

The login + leaderboard run on **Supabase** (free tier). The app code is already
shipped and **dormant** until these two env vars exist:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

With them blank, there's no Sign-in button and no League tab — the app behaves
exactly as before. The moment they're set, login + the league light up.

Sign-in is **Google only**. Scores are never stored: each browser recomputes
everyone's points from the public ESPN results, so the leaderboard can never
disagree with the Predict/Fantasy screens. Only the raw picks are saved.

---

## 1. Create the project
1. Go to <https://supabase.com> → **New project** (free tier is plenty for ~10 people).
2. Pick a name + a strong database password (you won't need it day-to-day).
3. Wait ~1 minute for it to provision.

## 2. Grab the two public keys
**Project Settings → API**:
- **Project URL** → this is `VITE_SUPABASE_URL`
- **Project API keys → `anon` `public`** → this is `VITE_SUPABASE_ANON_KEY`

> ⚠️ Never copy the **`service_role`** key into the app or any `VITE_` var — it
> bypasses all security. We don't use it.

## 3. Create the tables + security
**SQL Editor → New query** → paste the contents of [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
This creates `members` + `picks`, the row-level-security policies, and seeds the
roster with your email.

## 4. Add your friends to the roster
In the same `schema.sql`, edit the final `insert into public.members …` block:
add one row per friend with the **exact Google email** they'll sign in with, then
re-run just that statement. (Only people on this roster can save picks / appear on
the board — that's what keeps it private.) You can also add people later:

```sql
insert into public.members (email, display_name) values
  ('newfriend@gmail.com', 'New Friend')
on conflict (email) do update set display_name = excluded.display_name;
```

## 5. Turn on Google sign-in
**A. Google Cloud Console** (<https://console.cloud.google.com>):
1. Create/select a project → **APIs & Services → OAuth consent screen** →
   External → fill app name + your email → add yourself (and friends) as test
   users (or publish the app).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Under **Authorized redirect URIs** add the callback Supabase shows you in the
   next step (looks like `https://<your-ref>.supabase.co/auth/v1/callback`).
4. Copy the **Client ID** and **Client secret**.

**B. Supabase → Authentication → Providers → Google**: enable it, paste the
Client ID + secret, save.

## 6. Set the redirect URLs in Supabase
**Authentication → URL Configuration**:
- **Site URL**: your production URL (e.g. `https://homeside.vercel.app`).
- **Redirect URLs**: add both
  - `http://localhost:5173` (local dev)
  - your production URL (and any Vercel preview URL you use).

## 7. Add the env vars
**Local** — create/edit `.env.local` (gitignored):
```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```
**Vercel** — Project → Settings → Environment Variables: add the same two for
**Production, Preview, and Development**, then redeploy.

## 8. Try it
- `npm run dev`, open the app → a **Sign in** button appears top-right and a
  **League** tab appears in the nav.
- Sign in with Google → your existing local picks upload automatically, and you
  show up on the leaderboard.
- Have a friend (on the roster) sign in → you both see each other ranked.

That's it. Adding/removing friends later is just editing the `members` table.
