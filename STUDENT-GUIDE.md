# EntabladoTanaw: Project Guide

You are a **developer**. Your instructor is the **project manager (PM)**.
You build your assigned system in this repo; the PM reviews and releases it.

| Branch | Goes live at | Who controls it |
|---|---|---|
| `dev` | **Staging**: `https://SUBDOMAIN-dev.aws-deployhost.online` | You. Push anytime; it updates automatically within ~10 minutes. |
| `main` | **Production**: `https://SUBDOMAIN.aws-deployhost.online` | The PM. Changes arrive by pull request and go live when the PM releases them. |

Your SUBDOMAIN, project status and deploy history: **https://aws-deployhost.online**
Your deploy log and PHP errors: the **private log link** your instructor sends you (don't share it).

---

## 1. Folder layout (don't rename these)

```
frontend/            React app (Vite)
  src/               your React code
  dist/              BUILT app. You must commit this!
api/                 PHP JSON API and session authentication
  auth.php           first-admin setup, sign-in, and sign-out
  auth_helpers.php   session, authorization, and CSRF helpers
  rehearsals.php     rehearsal schedule API
  users.php          administrator-only account management
  groups.php         theater-group management
  db.php             database connection + helpers
database.sql         your tables + sample data
```

## 2. First-time setup on your laptop (XAMPP)

1. Clone the repo **into XAMPP's htdocs**:
   - Windows: `C:\xampp\htdocs\`
   - Mac: `/Applications/XAMPP/xamppfiles/htdocs/`
   ```bash
   git clone https://github.com/yan123212/it304-3c-nacaytuna-orlando-lance.git
   cd it304-3c-nacaytuna-orlando-lance
   git checkout dev
   ```
2. Start **Apache** and **MySQL** in XAMPP.
3. In **phpMyAdmin** (http://localhost/phpmyadmin): create a database named `it304_local`, then **Import** `database.sql`.
4. Copy `api/config.local.example.php` to `api/config.local.php`. Edit it only if your MySQL password isn't empty.
5. Check the API: open `http://localhost/it304-3c-nacaytuna-orlando-lance/api/health.php`. You should see `"db":"ok"`.
6. Run the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open the link it shows (usually http://localhost:5173). The first visitor creates the theater's administrator account.
7. Sign in as the administrator and add theater members, assign them to groups, and schedule rehearsals.

## 3. Daily workflow

```bash
git checkout dev            # always work on dev
# ...code...
cd frontend && npm run build && cd ..     # REQUIRED before every push
git add .
git commit -m "Add request form"
git push
```
Within ~10 minutes your **staging** link shows the new version. Test it there.

### Ready for the PM to review?
1. On GitHub: **Pull requests → New pull request → base: `main` ← compare: `dev`**
2. Fill in the checklist and click **Create pull request**.
3. The PM reviews it. If there are comments, fix them on `dev` and push; the PR updates by itself.
4. After approval and merge, the PM **releases** it to production.

## 4. Rules that make deployment work

- **Always build before pushing:** `npm run build` inside `frontend/`, then commit `frontend/dist`. No `dist` means a failed deploy.
- **Call your API with relative paths only:** `fetch('/api/requests.php')` or use `api.get('requests.php')` from `src/api.js`.
  Never write `http://localhost/...` in React code.
- **Start every PHP file in `api/` with** `require __DIR__ . '/db.php';` and use `db()` for queries.
  Always use **prepared statements**: `db()->prepare('... WHERE id = ?')->execute([$id])`.
- **Put every table and sample row in `database.sql`.**
  - No `CREATE DATABASE` and no `USE` lines; the server picks your database.
  - When `database.sql` changes, the server **resets your tables** and imports it again.
- **Never commit passwords.** `api/config.local.php` is already in `.gitignore`. On the server, a separate config is provided for you.
- **React Router works:** any non-file URL serves `index.html`.
- **Store passwords with** `password_hash()` / `password_verify()`, never as plain text.
- **Member access is group-based:** administrators assign theater members to groups; members can only view rehearsals for those groups.
- **Schedule conflicts are checked by PHP:** overlapping times are rejected even when requests bypass the React interface. Conflicts include the same group, venue, or assigned member.
- **Protect API changes:** mutating requests use a session CSRF token. Keep session cookies enabled and deploy over HTTPS.
- **Bootstrap the administrator:** the first account is created through the app and receives the administrator role; later visitors cannot repeat setup.

## 5. When something breaks

| Symptom | Where to look / fix |
|---|---|
| Status page says *"No built frontend found"* | You forgot `npm run build` or didn't commit `frontend/dist` |
| Page loads but data doesn't | Open `/api/health.php` on your staging link; check **PHP errors** on your private log page |
| `database.sql import failed` | SQL error in `database.sql`; test-import it in phpMyAdmin first |
| Sign-in returns a server error | Confirm `database.sql` was imported and `api/config.local.php` has the right database settings |
| A member sees no rehearsals | Assign the member to the rehearsal's theater group in the administrator's Members page |
| A rehearsal is rejected | Check for an overlapping rehearsal for its group, venue, or an assigned member |
| Works locally, not on staging | A `localhost` URL in your code, or a table missing from `database.sql` |
| Staging didn't update | Did you push to **dev**? Wait 10 minutes, then check the status page |
| Blank page | Open the browser console (F12). Usually a JS error, or `dist` not rebuilt |

## 6. Roles and permissions

| Action | Administrator | Theater member |
|---|---:|---:|
| View rehearsals | All groups | Assigned groups only |
| Create, edit, or delete rehearsals | Yes | No |
| Manage accounts and group assignments | Yes | No |
| Manage theater groups | Yes | No |

New member accounts are created by an administrator. Passwords must be between 10 and 72 bytes and are stored as password hashes.
