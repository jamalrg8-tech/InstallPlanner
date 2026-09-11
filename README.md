# Eurolux Doors and Windows, Installation Planner

A self-contained, installable web app for planning installation work: project name, client, scope, glass/frame delivery dates (each with its own delivery comments field), start/finish dates, % complete, assigned team, comments, and whether bonding is required. Each project's install window is also shown as a highlighted block on a day-by-day calendar that starts July 2026 and automatically grows to cover every project's dates — open it from the Dashboard's **View schedule grid** button.

No build step. Static files, deployable as-is to GitHub + Vercel.

## Files

| File | Purpose |
|---|---|
| `InstallPlanner.html` | The main app — project schedule, Team Allocation, Dashboard, and the WA Tracker tab. |
| `wa-tracker.html` | The standalone **factory link** — shows and edits only the WA production tracker, nothing else. See "Sharing the WA tracker with the factory" below. |
| `wa-shared.js` | The WA tracker's data model and row/header rendering, shared by both pages above so they always agree on what a row looks like. |
| `index.html` | Redirects `/` to `InstallPlanner.html` so the root URL works. |
| `firebase-config.js` | Your shared-backend credentials go here (see below). Ships with placeholders. |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | Make it an installable PWA (Add to Home Screen / Install App) with basic offline support. |

## What's in this version

- **Helper teams — assign more than one team to a project.** Each project still has a single primary **Assigned team** dropdown (used for the day-grid coloring, conflict detection, and the dashboard/allocation views), but now also has a **Helper teams** column right next to it, showing small colored chips for any extra teams also tagged onto that project. Click the cell to open a checklist of every other team, tick/untick as needed, and click **Done** or click away to close it — there's no limit to how many helper teams a project can have. Picking a team as the primary automatically removes it from that project's helper list if it was tagged there before, so it's never listed twice. Helper teams import/export too — see "Importing your Excel sheet" below.
- **WA production tracker — a second, separate board for glass/frame/coating fabrication status.** It's its own full-screen tab on the main toolbar (**WA Tracker**, right alongside Schedule / Team Allocation / Dashboard) — not a popup, so it behaves just like the other tabs: switch to it, work in it, switch away, and it's still there when you come back. It tracks its own list of line-items — No., Job #, Project Name, **Eurolux Required Delivery Date**, **Frame Delivery Date**, **Shutter Delivery Date**, Delivered Yes/No, Description, Item Qty, Scope, ETA Coating, ETA Fabrication Frame, ETA Fabrication Shutter, and **Remarks** — every field is editable directly, the same way the main schedule's fields are. The **No.** column is the only row-numbering column here (it's the job/project number from the source spreadsheet — several line-items commonly share the same No. when they're on the same job); there's no second, separate row counter. Use **+ Add row** to add a blank line-item, the ✕ on the left of each row (always visible, not just on hover — this board is meant to work from a factory tablet too) to delete one (with the same confirm-and-Undo safety net as deleting a project), and **Import Excel / CSV** to bring in a sheet shaped like the tracker (matches header names such as "Eurolux Required Delivery Date", "Frame Delivery Date", "ETA Fabrication Frame", etc. — a delivery-date cell containing the word "Delivered" is read as Delivered = Yes with the date left blank). This is entirely separate data from the project schedule — it has no dates on the calendar, no team assignment, and doesn't participate in conflict detection — but it saves and syncs through the same shared/local backend as everything else, so everyone sharing the planner sees the same tracker. See "Sharing the WA tracker with the factory" below for giving it to people who shouldn't see the rest of the planner.
- **WA tracker: Export Excel / Export PDF** — buttons right in the WA Tracker toolbar (and on the factory link) export the current list of rows exactly as they stand — all 15 columns, dates in the same d/mm/yyyy format shown on screen — as either a downloadable `.xlsx` workbook or a landscape PDF table, for sending on to someone who doesn't use the planner at all.
- **WA tracker: resizable columns, adjustable row height, and an always-reachable scrollbar** — every WA column has a drag handle on its right edge (hover the header border, same as the main schedule's columns) so you can widen or narrow any of them, and a **Row height** dropdown (Compact / Comfortable / Expanded) in the toolbar sets how tightly rows pack together — shrinking a row only ever removes empty space, since every field still grows taller than that floor if its own text needs more room, so nothing is ever clipped or hidden. **Reset columns** puts both back to the defaults. With 15 columns the board is wider than most screens, so it scrolls sideways — previously that meant scrolling all the way down through every row just to reach the horizontal scrollbar at the bottom of a long list; there's now a second, slim scrollbar pinned directly under the table at all times (drag it, or two-finger swipe sideways anywhere over the table) so you can always get to any column without hunting for it. Like the main schedule's own column widths, these are a per-device preference (not synced) — resizing on the office computer doesn't change how it looks on the factory tablet.
- **Client** field for each project.
- **Glass Delivery Date field** — sits between Project Scope and Glass Delivery Comments, using the same calendar picker as the other dates. It's a free date field with no restriction — pick any date you like, in any order relative to Start.
- **Glass Delivery Comments field** — a free-text field right next to Glass Delivery Date, for any notes about that delivery (supplier, ETA, special handling, etc.). Grows to fit whatever you type, same as the main Comments field.
- **Frame Delivery Date field** — sits after Glass Delivery Comments. Like Glass Delivery, it's a free date field with no restriction — pick any date you like, in any order relative to Start or anything else.
- **Frame Delivery Comments field** — a free-text field right next to Frame Delivery Date, for any notes about that delivery, exactly like Glass Delivery Comments.
- **Bonding Required field** — a simple Yes/No dropdown near the end of the row (next to Assigned Team), for flagging whether a project needs bonding. Defaults to "No" for new projects.
- **Schedule tab is now a plain project list** — the day-by-day Gantt grid used to run alongside the project details on the main page; it's now reached separately (see "Schedule grid moved to the Dashboard" below), so the main list is just the project details, one row per project.
- **Scope and Comments are always shown in full** — these two fields used to be small fixed-height boxes that clipped long text and needed an inner scrollbar to read the rest. They now grow the whole row to fit whatever you've typed, so the full text is always visible without scrolling.
- **Schedule grid moved to the Dashboard** — the day-by-day Gantt view (each project's install window as a colored bar on a calendar) is no longer on the main page. Open it any time from the **View schedule grid** button at the top of the Dashboard tab; it opens in a large popup with its own Compact view toggle, and closes with the × button, Esc, or a click outside it.
- **Dynamic calendar** — the schedule grid starts July 1, 2026 and stretches forward automatically to cover whatever project has the latest finish date (with a 2-month minimum). Edit `BASE_START` near the top of the `<script>` in `InstallPlanner.html` if you ever want to move the floor date.
- **Click to filter** — click a team name in the legend, or a "not started / in progress / complete / unassigned" pill in the stats row, to show only matching projects. Click again (or "clear ×") to reset.
- **Dashboard tab** — KPI cards, a projects-by-team chart and a projects-by-client chart, a status breakdown bar, a due-soon/overdue list, and a Settings panel (see "Clear all" below).
- **Export PDF** — exports a summary table of whatever is currently visible (respects an active filter) as a PDF.
- **Import Excel / CSV** — unchanged, maps common column headers automatically.
- **Bolder day-grid highlighting** — the highlighted block for each project's install window is now a solid, high-contrast colored bar (with a subtle border) instead of a faint tint, and projects with no team assigned yet get their own visible grey color instead of nearly-invisible light grey.
- **Double-booking / conflict detection, as a clickable notification** — if two projects assigned to the *same team* have overlapping date ranges, a small red pill appears above the schedule stating only how many conflicts exist right now (e.g. "⚠ 2 scheduling conflicts detected") — never the details, and it doesn't auto-dismiss. Click it to open a popup listing every conflict in plain language ("Mark is booked on both 'X' and 'Y' from Sep 1 – Sep 5 (5 days)."), and close that popup with its × button, Esc, or a click outside it whenever you're done reading. The grid still draws a diagonal red-striped overlay on exactly the overlapping days for both projects. Conflicts are recalculated on every edit, so resolving one (changing dates or team) removes it from the count and the pill disappears once none remain.
- **Team Allocation tab** — a full-page, 3-month view built for "who's doing what, when": team names down the left, each project drawn as a colored Gantt-style bar (with a progress fill and its name on the bar) across the day grid on the right. Overlapping bookings for the same team stack into separate lanes instead of colliding, and any bar involved in a double-booking gets a red outline plus a ⚠ in its label. Use **‹ Prev month / Next month ›** to page through any 3-month window, or **Today** to jump back to the current month.
- **Resizable columns and details panel** — every project-detail column (name, client, scope, dates, % complete, team, comments) has a drag handle on its right edge — hover the column border in the header and drag to widen or narrow it (handy for reading a long scope or comments field in full). There's also a dedicated drag handle (the vertical bar just before the day grid starts) that resizes *all* the detail columns at once, so you can shrink the whole details panel down to save room for the calendar — **Project name** and **Assigned team** always stay visible no matter how far you shrink it. Column widths are remembered per-device; **Reset columns** in the toolbar puts everything back to the defaults.
- **Add your own teams** — installation teams aren't limited to the original six. Choose "+ Add new team…" from any project's team dropdown, or click **+ Team** in the legend, type a name, and it's immediately available everywhere (team dropdowns, the legend, the dashboard, and the Team Allocation view) with its own color, for everyone sharing the planner.
- **Search by project name** — a search box at the top-left of the toolbar filters the schedule to projects whose name matches what you type, live as you type. It combines with the team/status filters below it, and "clear ×" (or the × inside the search box) resets it.
- **Full project names, no more truncation** — Project Name is now a wrapping field like Scope and Comments, so a long name wraps onto multiple lines instead of being cut off with "…". Widening the column (drag its right edge) lets more of it sit on one line; anything still too long to fit scrolls inside the box, and hovering still shows the full name as a tooltip.
- **Comments column moved** — it now sits right after Finish Date instead of at the far right, closer to the dates it usually refers to.
- **Click-to-report on the dashboard** — nearly everything on the Dashboard tab is now clickable and opens a read-only report listing the matching projects: a KPI card ("Total projects", "In progress", "Unassigned"), a row in "Projects by team" or "Projects by client", a dot in the status breakdown, or a row in "Due soon / overdue" (which opens that one project). Close the report with the × button, by clicking outside it, or with Esc.
- **"View all projects" report** — a button at the top of the Dashboard tab opens a read-only report listing every project with all fourteen fields (Project Name, Client, Scope, Glass/Frame Delivery Date and Comments, Start Date, Finish Date, % Complete, Assigned Team, Helper Teams, Bonding Required, Comments) — handy for a quick print-friendly-looking overview or for scanning everything at once without touching the editable schedule.
- **Start/Finish dates now use our own calendar picker, not the browser's** — the previous versions used the browser's native date field, and that caused three separate rounds of problems: its calendar popup would close itself while scrolling past a "frozen" column, its up/down navigation arrows closed it too, and its displayed format is controlled by the browser/OS, which is why Safari and Chrome disagreed on dd/mm vs mm/dd. Clicking a Start or Finish date now opens a small calendar dropdown built entirely into the app, with ‹ › buttons to move between months and Clear/Today shortcuts — it behaves identically in every browser, stays open until you pick a date or click away, and always displays as **d/m/yyyy** (e.g. 5 July 2026 shows as `5/07/2026` — day without a leading zero, month with one, four-digit year), matching what's stored and shown everywhere else in the app (dashboard reports, Team Allocation tooltips, the exported PDF).
- **Projects are now numbered** — the leftmost column shows each project's position (1, 2, 3, …) in the current view, so the last number tells you at a glance how many projects are listed (or how many match, if a filter or search is active). Hover that number (or tab to it) to reveal the delete "✕" button in its place, exactly where it always was.
- **Delete now asks for confirmation first** — clicking "✕" no longer deletes immediately; it opens a small dialog naming the project and asking you to confirm, with Cancel and Delete buttons (Esc also cancels). The "Undo" toast after a confirmed delete is still there as a second safety net.
- **"Clear all" button, for starting over with a fresh import** — moved into the Dashboard tab's **Settings** panel (it used to sit in the main toolbar). It asks you to confirm (it names how many projects will be removed and reminds you this affects everyone sharing the planner, since the schedule is synced live), then empties the whole list in one go, with an Undo toast right after in case it was a mistake. See "Clearing everything and importing fresh" below for the full steps.
- **Date filter, with any date range you like** — a "Date filter" button next to the search box opens a small panel with two ranges: "Starting between" and "Finishing between," each with its own From/To calendar picker (the same one used for a project's Start/Finish date, including Clear and Today shortcuts). Leave a side blank for an open-ended range (e.g. only "Finishing between → 30/09/2026" means "finishing on or before that date"), set only one range, or set both together — a project has to match every range you've set to appear. "Show results" opens a read-only report — Project Name, Assigned Team, Start Date, Finish Date, and Comments — for just the matching projects. Handy for anything from "what's due to finish next month?" to "what starts between the 10th and the 20th?".
- **A visible sync status + "Sync now" button** — the toolbar now shows a clear badge ("Synced with team" with a green dot, or "Saved on this device only" with a grey dot) instead of small, easy-to-miss text, so it's obvious whether your data is shared. Syncing to the shared database is still fully automatic on every edit — the new **Sync now** button is there for reassurance and for retrying the connection (e.g. right after finishing the Firebase setup below) without reloading the page.
- **Fixed: connecting Firestore for the first time no longer discards existing data** — if you'd already been using the app in local-only mode and then set up the shared backend, turning it on used to wipe your device's projects and reseed the three examples into the shared database. It now seeds the shared database from whatever's already on your device instead.
- **Fixed: typing in Comments (or any field) could drop characters on a shared/synced planner** — with the shared backend on, a live update echoing back from Firestore could land while you were still typing and briefly overwrite the field with the last-saved (now stale) text, silently swallowing whatever you'd typed since. The app now recognizes when you have an edit still waiting to be saved and skips applying an incoming update until that save has gone out, so a live sync in progress can no longer interrupt or clobber what you're typing.
- **Fixed: typing anywhere in the WA production tracker kept getting interrupted, especially with the shared backend on** — the moment your device's own save round-tripped back through Firestore (which can happen within a fraction of a second of you pausing to think), the app treated it as a fresh update and re-drew the whole board, silently kicking the field out of focus — you'd have to click back in to keep typing, which is what made it feel like it was "continuously trying to sync." Two fixes: the app now correctly recognizes its own save as still in flight (not just "waiting to send") right up until it's fully round-tripped, so it no longer treats it as an incoming change; and separately, any re-render that does need to happen while a field is focused (e.g. an update from a teammate editing at the same time) now restores focus and cursor position afterwards instead of dropping it. This applies to the WA Tracker tab, the standalone factory link, and every field in the main project schedule.
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

If `InstallPlanner.html`, `wa-tracker.html`, or `wa-shared.js` changes, bump `CACHE_NAME` in `sw.js` (e.g. `install-planner-v28`) so visitors' browsers pick up the new version instead of an old cached copy.

## Importing your Excel sheet

Use the **Import Excel / CSV** button inside the app itself — it recognizes common header names (Project Name, Client, Scope, Glass/Frame Delivery Date, Glass/Frame Delivery Comments, Start Date, Finish Date, % Complete, Assigned Team, Helper Teams, Comments, Bonding Required) in any order. Helper Teams accepts a comma- or semicolon-separated list of team names (e.g. "Alex; Angelo"); any name that doesn't match an existing team is noted in Comments instead of silently dropped. If your sheet uses different headers, the closest columns in `HEADER_MAP` (near the top of the script) can be extended to match.

Note that **Import adds to whatever's already there** — it doesn't replace it. Importing the same sheet twice, or two different sheets, gives you both sets of rows together. To bring in a fresh list without adding it to what's already on screen, clear first (see below).

The **WA production tracker** has its own separate **Import Excel / CSV** button inside that board, matched against the `HEADER_MAP` inside `wa-shared.js` rather than the main schedule's `HEADER_MAP` — the two boards' imports are independent, and importing into one never touches the other. This applies whether you're importing from the main app's **WA Tracker** tab or from the standalone factory link below — both use the same import logic.

## Sharing the WA tracker with the factory

If you want your factory to be able to see and update the WA production tracker directly — without giving them access to the project schedule, dashboard, or anything else in the planner — send them the standalone **factory link** instead of the main app link.

1. Open the **WA Tracker** tab in the main app.
2. Click **Share factory link** in its toolbar. This copies a link to your clipboard (if your browser blocks clipboard access, it shows the link in a box you can copy manually instead).
3. Send that link to the factory — text, email, WhatsApp, whatever's easiest. It points at `wa-tracker.html` instead of `InstallPlanner.html`.

Anyone who opens that link sees **only** the WA production tracker — the same rows, in the same layout, with full ability to add rows, edit any field, delete rows, import a spreadsheet, and export the list to Excel or PDF. There are no tabs, no project schedule, no dashboard, no team allocation, and no way to navigate to any of them from that page — it's a separate, self-contained page, not a restricted view inside the main app.

Under the hood, both pages read and write the *same* shared document in Firestore (when shared mode is set up — see above), but the factory page only ever touches the `waRows` part of it. Every save it makes is scoped to just that field, so it's not technically possible for someone using the factory link to see or overwrite your projects, teams, or dashboard settings, even by accident. If you haven't set up the shared backend, the factory link still works — it saves to that device's local storage instead, the same fallback the main app uses, which is fine for a single shared tablet in the factory but won't sync to your office copy.

One thing worth knowing: because both pages can save at nearly the same moment, in the rare case where someone edits the main app and the factory page within the same second, whichever save lands last "wins" for anything outside the WA tracker (the factory page's save never includes those fields, so this really only matters between two edits to the main schedule happening at the same instant — it's the same eventual-consistency behavior the rest of the app already has, not something new introduced by the factory link).

### Clearing everything and importing fresh

1. Go to the **Dashboard** tab and click **Clear all projects** in the Settings panel.
2. Confirm in the dialog that appears — it tells you how many projects will be removed. This affects everyone sharing the planner, on every device, since the schedule syncs live, so it's worth a moment's pause if others are using it too.
3. The schedule now shows "No projects yet." Click **Import Excel / CSV** and choose your file — since the list is empty, it becomes a clean, exact copy of the sheet rather than being added to anything.
4. If you clicked Clear all by mistake, the **Undo** link in the toast that appears right after brings everything back — but only until you leave or refresh the page, so use it right away.
