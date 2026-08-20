# NFL Squads 2026 — v2

This version makes the owner experience functional against the live Supabase database.

## Working now
- Email/password login
- Protected owner pages
- Owner's assigned NFL team is matched automatically to its next 2026 NFL game
- Dashboard shows upcoming NFL matchup and pick status
- My Pick page displays game, kickoff, spread, and one-minute-before-kickoff deadline
- Owner can submit or update a pick before the deadline
- Pick upsert is limited to one pick per squad/game
- Supabase RLS remains the final security layer
- Standings render as four separate division blocks

## Run
1. Copy `.env.local.example` to `.env.local`
2. Insert the Supabase publishable key
3. `npm install`
4. `npm run dev`
5. Open `http://localhost:3000`

## Still to build
- Commissioner owner setup UI
- Closing-line entry / odds feed
- Automated ATS grading
- Pick-reveal league page
- Week 16-18 playoff bracket
- Special playoff total tiebreaker
- Deployment

## v3 Commissioner Setup

Added:
- First-account commissioner bootstrap
- Automatic public profile creation on Supabase Auth signup
- Create-account screen
- Commissioner-only league setup page
- Assign owner account + custom squad name + NFL team + division
- Prevent duplicate owner or NFL-team assignments for a season
- Remove assignments
- 32-team visual draft board showing Available / Assigned
- Dashboard commissioner shortcut

### First run
1. Create the first account at `/signup`.
2. If email confirmation is enabled in Supabase, confirm the email and log in.
3. Open `/commissioner/setup` and claim the initial commissioner role if needed.
4. Assign your own 2026 squad.
5. Have the other owners create accounts; their emails will appear in Commissioner Setup.


## v4 — Automatic ATS Grading

The live Supabase database now grades picks automatically whenever a game is marked `final` and has:
- closing spread
- home score
- away score

### Spread convention
`games.spread` is the HOME TEAM closing spread:
- Home favorite by 3.5 → `-3.5`
- Home underdog by 3.5 → `+3.5`
- Pick'em → `0`

### ATS math
Home ATS margin = `(home score - away score) + home spread`
Away ATS margin = exact inverse.

Positive margin = Win, zero = Push, negative = Loss.

### Standings
Only Weeks 1–15 count toward regular-season standings.
Standings rebuild automatically after grading and rank by:
1. Winning percentage
2. Season ATS margin

### Commissioner page
`/commissioner/results` lets the commissioner enter the closing home spread, final scores and mark games Final. The database trigger then grades all related picks and updates standings immediately.


## v5 — Live Playoff Bracket

Added a complete 16-owner playoff engine for Weeks 16–18.

### Week 16
Each division creates:
- #1 vs #2
- #3 vs #4

### Week 17 placement bands
- Winners of #1/#2 → Places 1–4
- Losers of #1/#2 → Places 5–8
- Winners of #3/#4 → Places 9–12
- Losers of #3/#4 → Places 13–16

Every Week 17 band is fixed:
- Division 1 representative vs Division 2 representative
- Division 3 representative vs Division 4 representative

### Week 18
Each band creates two final-placement games so all 16 squads finish with one exact place.

### Payouts
1: $250
2: $200
3: $175
4: $150
5: $125
6: $100
7: $75
8: $50
9: -$50
10: -$75
11: -$100
12: -$125
13: -$150
14: -$175
15: -$200
16: -$250

### Playoff tiebreaking
The engine compares weekly ATS outcomes first. If both owners have the same ATS outcome, season ATS margin is the normal tiebreaker.

If the two playoff opponents' owned NFL teams are playing one another in the actual NFL game, the matchup is flagged `needs_tiebreaker` and the Over/Under entry workflow becomes available.

### Commissioner workflow
`/commissioner/playoffs`
1. Initialize after Week 15
2. Grade Week 16
3. Build Week 17
4. Grade Week 17
5. Build Week 18
6. Grade Week 18
7. Finalize placements & payouts

### Owner view
`/playoffs` shows a clean bracket using squad names only.


## v8 — Schedule tab

Added a league-wide Schedule & Results page available to every authenticated owner.

- New Schedule tab in main navigation
- Week 1–18 dropdown with immediate switching
- One row for every NFL Squads team each week
- Owner name
- Custom squad name
- Assigned NFL team
- Home/away opponent
- Spread shown from the assigned team's perspective
- Kickoff date/time
- Scheduled, live, or final NFL result
- Uses the same live odds and results data already synced into Supabase


## v9 — Cleaner Schedule

Schedule columns are now:
Owner | Squad | Opponent | Spread | Kickoff | Result

- NFL Team column removed.
- Owner column shows first name only.
- When the NFL opponent belongs to another NFL Squads owner, the Opponent column shows that owner's custom squad name instead of the NFL franchise name.
- If the opponent NFL team is not owned in NFL Squads, the actual NFL team name is shown.
