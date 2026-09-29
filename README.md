# Boomdrive Automotive — Vehicle Logbook

A private logbook for tracking vehicles bought, expenses, partner deals, and
profit settlement when a vehicle is sold.

## What it does

- **Vehicles** — add a vehicle by registration number, purchase price/date.
- **Partners** — a reusable list of people you sometimes co-invest with.
- **Per-vehicle partners** — attach any partners involved in a specific deal.
  You are always an implicit equal share-holder; if no partners are attached,
  you keep 100% of the profit.
- **Expenses** — log expenses against a vehicle, and mark who actually paid
  (you, or a specific partner out of pocket).
- **Sale & settlement** — once you mark a vehicle sold with its sale price,
  the app computes:
  - `net_profit = sold_price - purchase_price - total_expenses`
  - `share_per_person = net_profit / (1 + number_of_partners)`
  - For each partner: `balance_owed_to_them = share_per_person + expenses_they_fronted`
    (positive = you owe them, negative = they owe you)
- Only you log in (Supabase email/password auth). Partners never need an
  account — you add everything on their behalf.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase/schema.sql`. This creates
   all tables and locks them down with Row Level Security so only a signed-in
   user can read/write.
3. Go to **Authentication → Users** and manually create yourself a user
   (email + password) — this is the only login the app has.
4. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with
the user you created in Supabase.

## 4. Deploy

Easiest path is [Vercel](https://vercel.com):

```bash
npm i -g vercel
vercel
```

Add the same two environment variables in the Vercel project settings, then
deploy. Since RLS restricts everything to authenticated users, it's safe to
have this publicly reachable — no one can read or write data without your
login.

## Extending it later

- `lib/calculations.ts` holds all the settlement math in one place if you
  ever want to change the split logic (e.g. unequal shares, a management fee
  off the top before splitting, etc.).
- The schema comments in `supabase/schema.sql` explain the settlement formula.
- To add things like uploading vehicle photos or RC documents, add a
  Supabase Storage bucket and a file input on the vehicle detail page.
