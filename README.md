# Eurolux Doors and Windows, Installation Planner

A self-contained, installable web app for planning installation work: project name, client, scope, start/finish dates, % complete, assigned team, project value, and comments — with each project's install window shown as a highlighted block on a day-by-day calendar that starts July 2026 and automatically grows to cover every project's dates.

No build step. Static files, deployable as-is to GitHub + Vercel.

## Files

| File | Purpose |
|---|---|
| `InstallPlanner.html` | The app itself. |
| `index.html` | Redirects `/` to `InstallPlanner.html` so the root URL works. |
| `firebase-config.js` | Your shared-backend credentials go here (see below). Ships with placeholders. |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | Make it an installable PWA (Add to Home Screen / Install App) with basic offline support. |

## What's in this version

- **Client** and **Project value (AED)** fields, plus a running total value in the stats row.
- **Dynamic calendar** — the day grid starts July 1, 2026 and stretches forward automatically to cover whatever project has the latest finish date (with a 2-month minimum). Edit `BASE_START` near the top of the `<script>` in `InstallPlanner.html` if you ever want to move the floor date.
- **Click to filter** — click a team name in the legend, or a "not started / in progress / complete / unassigned" pill in the stats row, to show only matching projects. Click again (or "clear ×") to reset.
- **Dashboard tab** — KPI cards, projects-by-team and value-by-client charts, a status breakdown bar, and a due-soon/overdue list.
- **Export PDF** — exports a summary table of whatever is currently visible (respects an active filter) as a PDF.
- **Import Excel / CSV** — unchanged, maps common column headers automatically.
- **Bolder day-grid highlighting** — the highlighted block for each project's install window is now a solid, high-contrast colored bar (with a subtle border) instead of a faint tint, and projects with no team assigned yet get their own visible grey color instead of nearly-invisible light grey.
- **Double-booking / conflict detection** — if two projects assigned to the *same team* have overlapping date ranges, the app automatically: shows a red banner above the schedule listing every conflict in plain language ("Mark is booked on both 'X' and 'Y' from Sep 1 – Sep 5 (5 days)."), draws a diagonal red-striped overlay on exactly the overlapping days in the grid for both projects, and pops up a toast notification the moment a *new* conflict is created (e.g. right after you change a start/finish date or reassign a team). Conflicts are recalculated on every edit, so resolving one (changing dates or team) clears the banner and stripe automatically.
- **Team Allocation tab** — a full-page, 3-month view built for "who's doing what, when": team names down the left, each project drawn as a colored Gantt-style bar (with a progress fill and its name on the bar) across the day grid on the right. Overlapping bookings for the same team stack into separate lanes instead of colliding, and any bar involved in a double-booking gets a red outline plus a ⚠ in its label. Use **‹ Prev month / Next month ›** to page through any 3-month window, or **Today** to jump back to the current month.
- **Resizable columns and details panel** — every project-detail column (name, client, scope, dates, % complete, team, value, comments) has a drag handle on its right edge — hover the column border in the header and drag to widen or narrow it (handy for reading a long scope or comments field in full). There's also a dedicated drag handle (the vertical bar just before the day grid starts) that resizes *all* the detail columns at once, so you can shrink the whole details panel down to save room for the calendar — **Project name** and **Assigned team** always stay visible no matter how far you shrink it. Column widths are remembered per-device; **Reset columns** in the toolbar puts everything back to the defaults.
- **Add your own teams** — installation teams aren't limited to the original six. Choose "+ Add new team…" from any project's team dropdown, or click **+ Team** in the legend, type a name, and it's immediately available everywhere (team dropdowns, the legend, the dashboard, and the Team Allocation view) with its own color, for everyone sharing the planner.
- **Search by project name** — a search box at the top-left of the toolbar filters the schedule to projects whose name matches what you type, live as you type. It combines with the team/status filters below it, and "clear ×" (or the × inside the search box) resets it.
- **Full project names, no more truncation** — Project Name is now a wrapping field like Scope and Comments, so a long name wraps onto multiple lines instead of being cut off with "…". Widening the column (drag its right edge) lets more of it sit on one line; anything still too long to fit scrolls inside the box, and hovering still shows the full name as a tooltip.
- **Comments column moved** — it now sits right after Finish Date instead of at the far right, closer to the dates it usually refers to.
- **Click-to-report on the dashboard** — nearly everything on the Dashboard tab is now clickable and opens a read-only report listing the matching projects: a KPI card ("Total projects", "Unassigned"), a row in "Projects by team" or "Value by client", a dot in the status breakdown, or a row in "Due soon / overdue" (which opens that one project). Close the report with the × button, by clicking outside it, or with Esc.
- **"View all projects" report** — a button at the top of the Dashboard tab opens a read-only report listing every project with all nine fields (Project Name, Client, Scope, Start Date, Finish Date, % Complete, Assigned Team, Project Value, Comments) — handy for a quick print-friendly-looking overview or for scanning everything at once without touching the editable schedule.
- **Fixed: date picker closing on its own arrows** — clicking the up/down or month-navigation arrows inside a Start/Finish date field's calendar popup used to immediately close the calendar (because every keystroke triggered a full page refresh). The refresh is now delayed until you're done with that field (or fires right away when you click elsewhere), so the calendar stays open while you use its controls.
- Footer credit: "Developed with love by Uncle Ed, Version 4.20".

## Shared backend setup (everyone sees the same data)

The app now supports two modes, chosen automatically:

1. **Shared (recommended)** — powered by Firebase Firestore's free tier. Once configured, everyone who opens the app sees the same live project list, and edits sync to everyone in under a second.
2. **Local-only (automatic fallback)** — if `firebase-config.js` is left with its placeholder values (or Firestore can't be reached), the app quietly falls back to saving in that one browser's local storage, exactly like before. Nothing breaks either way.

### To turn on shared mode (~5 minutes, free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project (any name).
2. In the project, go to **Build → Firestore Database → Create database**. Choose **Production mode** and any region close to you.
3. Once created, go to the **Rules** tab and replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /installPlanner/shared {
         allow read, write: if true;
       }
     }
   }
   ```
   This keeps the rest of your Firestore project locked down and only opens the one document the planner uses. It's intentionally simple for a small internal tool — anyone with your app's URL can read/write the schedule, but nothing else. If you want proper logins later, Firebase Authentication is a natural next step and I can help wire it up.
4. Go to **Project settings** (gear icon) → **General** → scroll to "Your apps" → click the **Web** icon (`</>`) → register an app (any nickname, no need for Firebase Hosting).
5. Copy the `firebaseConfig` object it shows you into `firebase-config.js`, replacing the placeholder values. It looks like:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
6. Commit and push — Vercel redeploys automatically, and the app now saves to Firestore instead of local storage. The status indicator near the top-right will read "Synced with team" once it's working.

These config values are meant to be public (they identify your project, not a secret key) — Firestore's Rules are what actually control access, which is why step 3 matters.

## Deploy to GitHub

```bash
cd install-planner-site
git init
git add .
git commit -m "Add Eurolux Installation Planner"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(Create the empty repo on GitHub first, or run `gh repo create` if you use the GitHub CLI.)

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo you just pushed.
2. Framework preset: **Other** (static files — no build command, no output directory).
3. Click **Deploy**. HTTPS is required for the "Install App" prompt, offline support, and Firestore to work — Vercel gives you this automatically.
4. Your app is live at `https://<project-name>.vercel.app/`.

Every push to `main` redeploys automatically.

## Updating the app later

If `InstallPlanner.html` changes, bump `CACHE_NAME` in `sw.js` (e.g. `install-planner-v3`) so visitors' browsers pick up the new version instead of an old cached copy.

## Importing your Excel sheet

Use the **Import Excel / CSV** button inside the app itself — it recognizes common header names (Project Name, Client, Scope, Start Date, Finish Date, % Complete, Assigned Team, Project Value, Comments) in any order. If your sheet uses different headers, the closest columns in `HEADER_MAP` (near the top of the script) can be extended to match.
