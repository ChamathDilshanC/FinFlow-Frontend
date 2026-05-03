# FinFlow — Frontend

Client application for **FinFlow** (personal finance / subscription tracking). This folder is set up as its **own Git repository**, paired with the backend API and the umbrella **Main** repo that uses Git submodules.

## Current status

The repository contains a minimal scaffold (`package.json`, `.gitignore`). Add your UI stack when ready (e.g. React, Next.js, Flutter web, or Vite).

## Prerequisites

- **Node.js** LTS (when you add a JS/TS framework)  
- Or your chosen mobile/web toolchain

## Setup (placeholder)

```bash
cd frontend
# After you add a framework:
# npm install
# npm run dev
```

Point the client at your API base URL (e.g. `http://localhost:8000/api/v1`) and align **CORS** on the backend with your dev origin (`CORS_ORIGINS` in backend `.env`).

## Related repositories

- **FinFlow — Backend** — FastAPI service and database migrations.  
- **FinFlow — Main Repo** — clones both apps via submodules for a single-folder workflow.

Repository URLs appear on your GitHub account after the repos are created.

## Contributing & attribution

**Human maintainer:** Chamath Dilshan (GitHub: account used for this organization/user).  

Tools such as **Cursor** / automated agents may assist during development; they are **not** GitHub contributors to this project. Contribution policy is at the maintainer’s discretion.

## License

Add a `LICENSE` file when you publish (e.g. MIT).
