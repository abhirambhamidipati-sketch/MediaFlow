# MediaFlow

> A production-grade, full-stack news publishing platform with role-based access control, real-time updates, Google OAuth, and a fully automated CI/CD pipeline.

[![CI/CD](https://github.com/abhirambhamidipati-sketch/MediaFlow/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/abhirambhamidipati-sketch/MediaFlow/actions/workflows/ci.yml)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Diagram](#2-architecture-diagram)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Git Workflow](#4-git-workflow)
5. [Tools Used](#5-tools-used)
6. [Screenshots](#6-screenshots)
7. [Challenges Faced](#7-challenges-faced)
8. [Tech Stack](#8-tech-stack)
9. [API Reference](#9-api-reference)
10. [Local Development Setup](#10-local-development-setup)
11. [Environment Variables](#11-environment-variables)
12. [Security Model](#12-security-model)

---

## 1. Problem Statement

Modern news consumption is fragmented across dozens of platforms, none of which offer a unified experience for both readers and contributors. MediaFlow was built to solve this by providing:

- A **multi-role publishing platform** where anyone can register as a viewer, apply to become a contributor, and contribute news articles subject to an admin approval workflow.
- **Real-time content delivery** — new articles and comments are pushed live to all connected clients via WebSockets, eliminating the need for manual page refreshes.
- **Secure, production-grade authentication** — supporting both traditional email/password login and Google OAuth via Google Identity Services, backed by short-lived JWT access tokens with refresh token rotation.
- **A fully automated DevSecOps pipeline** — every push to the `develop` branch is automatically tested, statically analysed for security vulnerabilities, linted, and deployed to Azure App Service — with zero manual intervention required.

The engineering challenge was not just building the features, but wiring together a React (Vite) frontend on Vercel, a Django ASGI backend on Azure App Service, a GitHub Actions CI/CD pipeline, and Google OAuth — each with their own cross-cutting concerns around CORS, executable permissions, TLS termination, and token validation — into a single coherent, deployable system.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER'S BROWSER                                  │
│                                                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                  React + Vite SPA (Vercel)                           │   │
│   │                                                                      │   │
│   │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│   │  │  LoginPage │  │  HomePage   │  │ NewsDetail   │  │ Dashboard │  │   │
│   │  └────────────┘  └─────────────┘  └──────────────┘  └───────────┘  │   │
│   │                                                                      │   │
│   │  ┌───────────────────────┐   ┌──────────────────────────────────┐   │   │
│   │  │  AuthContext (JWT)    │   │  TanStack Query (HTTP cache)     │   │   │
│   │  └───────────────────────┘   └──────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │  ┌──────────────────┐   ┌──────────────────────────────────────┐   │   │
│   │  │  axios (REST API)│   │  useWebSocket hook (wss://)          │   │   │
│   │  └──────────────────┘   └──────────────────────────────────────┘   │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│              │  HTTPS REST                        │  WSS WebSocket            │
└──────────────┼────────────────────────────────────┼───────────────────────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              Azure App Service  (Central India)                               │
│                                                                               │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │             Daphne ASGI Server  (startup.sh)                           │ │
│   │                                                                        │ │
│   │  ┌──────────────────────────────┐  ┌────────────────────────────────┐ │ │
│   │  │   Django HTTP Handler        │  │  Django Channels WebSocket     │ │ │
│   │  │                              │  │  Consumer (/ws/news/)          │ │ │
│   │  │  CorsMiddleware (first)      │  └────────────────────────────────┘ │ │
│   │  │  SecurityMiddleware          │                                      │ │
│   │  │  WhiteNoiseMiddleware        │  ┌────────────────────────────────┐ │ │
│   │  │  AuthMiddleware              │  │  InMemoryChannelLayer          │ │ │
│   │  │                              │  └────────────────────────────────┘ │ │
│   │  │  ┌──────────────────────┐    │                                      │ │
│   │  │  │  DRF REST API        │    │                                      │ │
│   │  │  │  /api/news/          │    │                                      │ │
│   │  │  │  /api/users/         │    │                                      │ │
│   │  │  │  /api/token/         │    │                                      │ │
│   │  │  │  /api/stats/         │    │                                      │ │
│   │  │  └──────────────────────┘    │                                      │ │
│   │  └──────────────────────────────┘                                      │ │
│   │                                                                        │ │
│   │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│   │  │  SQLite DB          WhiteNoise static      media/ uploads        │ │ │
│   │  └──────────────────────────────────────────────────────────────────┘ │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
               ▲
               │  Google tokeninfo API
               │  (OAuth verification)
┌──────────────┴────────────┐
│  Google OAuth 2.0 / GIS   │
│  oauth2.googleapis.com    │
└───────────────────────────┘

GitHub Repository (develop branch)
         │
         │  git push
         ▼
┌────────────────────────────────────────┐
│   GitHub Actions CI/CD Pipeline        │
│                                        │
│   checkout → python setup →            │
│   pip install → migrate → test →       │
│   bandit → safety → flake8 →           │
│   collectstatic → deploy to Azure      │
└────────────────────────────────────────┘
```

![Architecture Diagram](docs/architecture.png)

### Component Responsibilities

| Component | Role |
|---|---|
| **Vercel (React/Vite)** | Serves the compiled SPA. All routing is client-side; Vercel's rewrite rule forwards every path to `index.html`. |
| **Azure App Service** | Runs the Daphne ASGI server. Terminates HTTP; TLS is handled at the Azure load balancer before traffic reaches Django. |
| **Daphne** | The ASGI entry point. Handles both plain HTTP requests (forwarded to Django's standard request/response cycle) and WebSocket upgrade requests (forwarded to Django Channels consumers). |
| **Django Channels** | Manages persistent WebSocket connections. Broadcasts `new_news` and `new_comment` events to all connected clients via the in-memory channel layer. |
| **WhiteNoise** | Serves compressed, content-hash-fingerprinted static files directly from the Django process with long-lived `Cache-Control` headers, eliminating the need for a separate CDN for static assets. |
| **GitHub Actions** | Orchestrates the full CI/CD pipeline on every push to `develop`. Tests are a hard gate; security tools report findings but do not block deployment. |
| **Google OAuth** | The frontend uses Google Identity Services (GIS) one-tap. The resulting ID token is sent to the Django backend, which verifies it against Google's `tokeninfo` endpoint and returns a JWT pair. |

---

## 3. CI/CD Pipeline

The pipeline is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and triggers on every `push` or `pull_request` targeting the `develop` branch.

```
git push origin develop
         │
         ▼
┌────────────────────────┐
│  1. Checkout           │  actions/checkout@v4
├────────────────────────┤
│  2. Python 3.11 Setup  │  actions/setup-python@v5
├────────────────────────┤
│  3. Install Deps       │  pip install -r requirements.txt
├────────────────────────┤
│  4. Set Env Vars       │  SECRET_KEY from GitHub Secrets
├────────────────────────┤
│  5. Migrations         │  makemigrations + migrate
├────────────────────────┤
│  6. ██ RUN TESTS ██    │  python manage.py test  ← BLOCKING
│     (75 tests)         │  Pipeline halts on failure
├────────────────────────┤
│  7a. Bandit (SAST)     │  bandit -r . -x ./venv || true
│  7b. Safety (CVEs)     │  safety check --full-report || true
│  7c. Flake8 (Lint)     │  flake8 . || true
│                        │  (NON-BLOCKING — reported only)
├────────────────────────┤
│  8. collectstatic      │  python manage.py collectstatic --noinput
├────────────────────────┤
│  9. Deploy to Azure    │  azure/webapps-deploy@v2
│     (only on develop,  │  Conditional: github.ref == develop
│      only if step 6    │             && success()
│      passed)           │
└────────────────────────┘
```

### Step-by-Step Explanation

#### Step 1 — Code Checkout
Uses `actions/checkout@v4` to clone the repository at the commit SHA that triggered the workflow. This gives the runner access to all source files, the test suite, and the `requirements.txt`.

#### Step 2 — Python 3.11 Setup
Uses `actions/setup-python@v5` to install Python 3.11 on the Ubuntu runner. Python version is pinned to match the Azure App Service runtime, ensuring that there are no interpreter-level divergences between CI and production.

#### Step 3 — Dependency Installation
Runs `pip install -r requirements.txt`. The `requirements.txt` is a fully-pinned, UTF-8 encoded flat file (all versions exact) to guarantee deterministic builds. Every package installed in CI is the same version that runs on Azure.

#### Step 4 — Environment Variables
Injects `SECRET_KEY` from GitHub repository secrets into the runner's environment via `$GITHUB_ENV`. This means Django's `settings.py` (`SECRET_KEY = os.getenv('SECRET_KEY', ...)`) picks it up correctly for the test run without any plaintext credentials in source control.

#### Step 5 — Database Migrations
Runs `makemigrations` then `migrate` against a fresh SQLite database on the runner. This serves two purposes: it validates that the migration graph is consistent, and it creates the test database schema needed by the test suite.

#### Step 6 — Test Suite (BLOCKING GATE)
Runs `python manage.py test`, which executes all 75 unit and integration tests covering:
- Authentication endpoints (register, login, token refresh, Google OAuth)
- News CRUD (create, read, update, delete) with permission checks
- Engagement endpoints (like, bookmark, comment)
- Role-based access (viewer, contributor, admin) for each route
- Contributor application workflow (submit, approve, reject)
- Analytics endpoints (trending, per-user stats, global stats)

**If any test fails, the pipeline halts immediately.** Steps 7–9 do not execute. No broken code ever reaches Azure.

#### Steps 7a–7c — DevSecOps Scanning (NON-BLOCKING)
Three security tools run after the test gate, each with `|| true` to prevent them from blocking deployment:

- **Bandit** — Static Application Security Testing (SAST). Performs AST-level analysis of the Python source code, flagging patterns like hardcoded passwords, use of `assert` in security-critical code, dangerous `subprocess` calls, and insecure deserialization. Excludes the `./venv` directory to avoid false positives from third-party packages.
- **Safety** — Dependency vulnerability scanner. Checks every installed package against the Safety DB (a curated list of known CVEs in Python packages). Outputs a full report listing affected packages, CVE identifiers, and remediation versions.
- **Flake8** — PEP 8 style linter. Enforces line length, unused imports, undefined names, and other code quality rules. Non-blocking because style violations should not prevent a working system from deploying.

The rationale for making these non-blocking is pragmatic: third-party packages frequently carry advisory-level CVEs that have no available patch or are not exploitable in the project's context. Blocking the entire deployment pipeline over an unfixable advisory would create unnecessary friction. The findings are visible in the Actions log and can be triaged separately.

#### Step 8 — Static File Collection
Runs `python manage.py collectstatic --noinput`. This step validates that WhiteNoise's `CompressedManifestStaticFilesStorage` can successfully compress and fingerprint all static assets. If any static file reference is broken (e.g. a missing image referenced in a template), this step will fail before deployment.

#### Step 9 — Azure Deployment (Conditional)
Uses `azure/webapps-deploy@v2` with two explicit conditions:
1. `github.ref == 'refs/heads/develop'` — only deploy from the `develop` branch, not from pull request workflows
2. `success()` — only deploy if all preceding steps (including the test gate) passed

The deploy action uses `AZURE_WEBAPP_PUBLISH_PROFILE` from GitHub secrets to authenticate with Azure. It packages the entire repository root (Django project) and pushes it to the `mediaflow-backend-abhiram` App Service. Azure then executes `startup.sh` which runs `pip install`, `collectstatic`, `migrate`, and starts Daphne.

### GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `SECRET_KEY` | Django `SECRET_KEY` for CI test run |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure App Service publish credentials for `azure/webapps-deploy@v2` |

---

## 4. Git Workflow

```
main  ──────────────────────────────────────────────────────────► (stable releases)
         │
         └── develop ──────────────────────────────────────────► (primary dev + CI/CD)
                │         │          │          │
                └─ feat/  └─ fix/    └─ fix/    └─ chore/
                   jwt       cors       vite       readme
```

### Branch Strategy

- **`develop`** is the integration branch. All feature branches merge here. Every push to `develop` triggers the full GitHub Actions pipeline and, if tests pass, deploys to Azure.
- **Feature branches** (`feat/`, `fix/`, `chore/`) are created for isolated work — a single feature, bug fix, or infrastructure change. They are merged into `develop` via pull request once complete.
- **`main`** tracks stable, production-verified state. Merges from `develop` are made manually after confirming the Azure deployment is healthy.

### Commit Convention

Commits follow a descriptive format that encodes both the type of change and the reason:

```
fix: remove committed node_modules/dist, add vercel.json for SPA deployment
feat: JWT authentication — token endpoints + test suite
fix: CORS — add django-cors-headers, set CORS_ALLOW_ALL_ORIGINS=True
chore: requirements.txt rewritten as UTF-8 (was UTF-16 LE, pip silently failed)
```

### CI/CD Trigger Points

| Event | Branch | CI runs? | Deploys? |
|---|---|---|---|
| `git push` | `develop` | ✅ | ✅ (if tests pass) |
| Pull request opened | `develop` | ✅ | ❌ |
| `git push` | any other | ❌ | ❌ |
| Vercel | `develop` (frontend changes) | — | ✅ (automatic) |

---

## 5. Tools Used

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI component framework |
| **Vite** | 8.x | Build tool and development server with HMR |
| **@vitejs/plugin-react** | 6.x | Vite plugin for React JSX transform and Fast Refresh |
| **TanStack Query** | 5.x | Server state management, request caching, background refetching |
| **axios** | 1.x | HTTP client with JWT interceptor and automatic 401 handling |
| **React Router DOM** | 7.x | Client-side routing with lazy-loaded pages |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **PostCSS / Autoprefixer** | 8.x / 10.x | CSS transformation pipeline |

### Backend

| Tool | Version | Purpose |
|---|---|---|
| **Django** | 5.1.12 | Web framework — ORM, admin, middleware, auth |
| **Django REST Framework** | 3.17.x | RESTful API toolkit — serializers, viewsets, permissions |
| **drf-spectacular** | 0.27.x | OpenAPI 3 schema generation and Swagger UI |
| **djangorestframework-simplejwt** | 5.5.x | JWT access/refresh token authentication |
| **django-cors-headers** | 4.6.0 | CORS middleware — required for browser cross-origin requests |
| **Django Channels** | 4.2.0 | WebSocket support via ASGI protocol |
| **Daphne** | 4.2.1 | ASGI server supporting HTTP + WebSocket on a single port |
| **WhiteNoise** | 6.12.0 | Compressed, fingerprinted static file serving from Django |
| **django-filter** | 24.3 | URL parameter-based queryset filtering |
| **Pillow** | 12.x | Image upload processing (news cover images, application docs) |
| **requests** | 2.33.x | HTTP client used by the Google OAuth `tokeninfo` verifier |

### DevOps & Cloud

| Tool | Purpose |
|---|---|
| **GitHub Actions** | CI/CD orchestration — test, scan, deploy on every push to `develop` |
| **Azure App Service** | PaaS hosting for the Django ASGI backend (Central India region) |
| **Vercel** | Frontend hosting with automatic deployments, preview environments, edge CDN |
| **gunicorn** | Included as a WSGI fallback (not used in production; Daphne handles everything) |

### Security & Quality

| Tool | Type | Blocking? |
|---|---|---|
| **Bandit** | SAST — Python source code vulnerability scanner | No (reports only) |
| **Safety** | SCA — Python dependency CVE scanner | No (reports only) |
| **Flake8** | Linter — PEP 8 and code quality enforcement | No (reports only) |
| **Django security middleware** | Runtime — HSTS, CSP nosniff, X-Frame-Options | Yes (always active) |
| **Simple JWT** | Short-lived access tokens (60 min), rotating refresh tokens (1 day) | Yes |

### Authentication

| Tool | Purpose |
|---|---|
| **Google Identity Services (GIS)** | Frontend one-tap and popup OAuth flow |
| **Google tokeninfo API** | Backend verification of Google ID tokens (`oauth2.googleapis.com/tokeninfo`) |
| **djangorestframework-simplejwt** | JWT pair generation after successful authentication |

---

## 6. Screenshots

### CI/CD Pipeline — Successful Run

![CI/CD Pipeline Success](docs/screenshots/cicd-pipeline-success.png)

*GitHub Actions workflow showing all 9 steps passing: checkout, Python setup, dependency installation, environment configuration, database migrations, 75 test cases passing, Bandit SAST scan, Safety dependency scan, Flake8 linting, static file collection, and Azure deployment.*

### Azure App Service — Deployment Output

![Azure Deployment Output](docs/screenshots/azure-deployment.png)

*Azure App Service deployment log showing `startup.sh` execution: pip install, collectstatic (154 files processed), database migrations applied, and Daphne ASGI server started on port 8000.*

### Vercel — Frontend Deployment

![Vercel Deployment](docs/screenshots/vercel-deployment.png)

*Vercel deployment dashboard showing the React/Vite build completing successfully (`node node_modules/vite/bin/vite.js build`), output directory `dist/` generated, and deployment promoted to production.*

---

## 7. Challenges Faced

This section documents every significant engineering obstacle encountered during development, the debugging process followed, and the root cause + resolution for each.

---

### 7.1 — CORS: "Network Error" on All API Calls

**Symptom**
Every API call from the React frontend returned a "Network Error" in axios with zero response status. The backend was reachable directly (returning HTTP 401 from `curl`), but any browser-initiated request failed silently.

**Why it was non-obvious**
A 401 Unauthorized from `curl` confirmed the backend was live. The "Network Error" in axios is deceptive — it does not mean the server is unreachable; it means the browser received a response but **rejected it at the network layer** before JavaScript could read it. This is the browser's CORS enforcement: when `Access-Control-Allow-Origin` is absent from the response, the browser discards the response entirely and surfaces it as a network failure.

**Root Cause**
`django-cors-headers` was not installed. The backend had no CORS middleware, so no `Access-Control-Allow-Origin` header was ever emitted. When the React frontend (running at `http://localhost:4173` or on Vercel) made requests to the Azure backend (`https://...azurewebsites.net`), the browser sent a CORS preflight OPTIONS request. Django returned a standard 200 response with no CORS headers. The browser refused to forward the actual request.

A compounding issue: the `requirements.txt` file was encoded as UTF-16 LE (Windows Byte Order Mark `FF FE`). `pip install -r requirements.txt` silently parsed nothing on Linux, meaning even after adding `django-cors-headers` to the file, it was never actually installed on Azure.

**Fix**
1. Rewrote `requirements.txt` as UTF-8 (verified via byte inspection of the BOM).
2. Added `django-cors-headers==4.6.0` to `requirements.txt`.
3. Added `'corsheaders'` to `INSTALLED_APPS`.
4. Added `'corsheaders.middleware.CorsMiddleware'` as the **first** entry in `MIDDLEWARE` — it must precede `SecurityMiddleware` and any other middleware capable of generating a response, otherwise preflight OPTIONS requests get intercepted and responded to without CORS headers.
5. Set `CORS_ALLOW_ALL_ORIGINS = True` with `CORS_ALLOW_CREDENTIALS = True`. The `CORS_ALLOW_CREDENTIALS` flag causes `django-cors-headers` to reflect the exact request `Origin` in the response header instead of the wildcard `*`, which is required for browsers to forward the `Authorization: Bearer` JWT header.

**Key lesson**
`CORS_ALLOW_ALL_ORIGINS = True` combined with `CORS_ALLOW_CREDENTIALS = True` is internally safe in `django-cors-headers` — the library never emits `Access-Control-Allow-Origin: *` when credentials are enabled, instead reflecting the origin. The CORS spec forbids credentials with a wildcard origin; `django-cors-headers` complies by switching to origin reflection automatically.

---

### 7.2 — Google OAuth: `origin_mismatch` and Broken Token Validation

**Symptom**
Clicking "Continue with Google" showed no popup, or the popup appeared but submitted credentials that the backend rejected with 400.

**Root Cause (Frontend)**
Google Identity Services validates the JavaScript origin making the request against the OAuth client's Authorized JavaScript Origins in Google Cloud Console. `localhost:5173` (Vite dev server) and `localhost:4173` (Vite preview server) were not registered. The GIS SDK silently suppressed the prompt and reported `origin_mismatch` via its notification callback.

**Root Cause (Backend)**
The Google `tokeninfo` endpoint (`https://oauth2.googleapis.com/tokeninfo?id_token=...`) was called correctly, but the `GOOGLE_CLIENT_ID` environment variable was not set in Azure App Service's Application Settings. Without it, the `aud` claim validation was skipped entirely, meaning any valid Google token would be accepted regardless of which client issued it — a security hole. Additionally, the CORS issue (7.1) meant the credential POST from the browser never reached Django in the first place.

**Fix**
1. Registered `http://localhost:5173`, `http://localhost:4173`, and the Vercel production URL in Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized JavaScript Origins.
2. Set `GOOGLE_CLIENT_ID` in Azure App Service → Configuration → Application Settings to match `VITE_GOOGLE_CLIENT_ID` in the frontend `.env`.
3. Refactored `GoogleLoginButton.jsx` to replace the hardcoded `localhost:5173` in error messages with `window.location.origin`, so the diagnostic message is always accurate regardless of environment.
4. Used a module-level singleton flag (`let _gsiInitialized = false`) to prevent React StrictMode's intentional double-mount from calling `google.accounts.id.initialize()` twice, which silently breaks the GIS SDK.

---

### 7.3 — Vercel Build Failure: `Permission denied` (exit code 126)

**Symptom**
```
sh: /node_modules/.bin/vite: Permission denied
Error: Command "npm run build" exited with 126
```

**Root Cause**
`frontend/node_modules` (6,530 files) was committed to the git repository from a Windows development machine. On Windows, the NTFS filesystem has no Unix executable bit concept — git stores all files without the execute permission flag. When Vercel clones the repository on its Linux infrastructure and attempts to execute `node_modules/.bin/vite` (a symlink to the actual Vite binary), Linux enforces permission checks. The file has mode `644` (rw-r--r--), not `755` — execution is denied. Exit code 126 is the POSIX standard for "permission denied on exec".

The `node_modules/.bin/` directory also contained Windows-specific wrappers (`.cmd` and `.ps1` files) that are meaningless on Linux, but the more critical issue was the missing executable bit on the Unix binary.

**Why `npx vite build` is also insufficient**
`npx vite build` still resolves through `node_modules/.bin/vite` via PATH lookup — it does not bypass the symlink. It would hit the same permission error.

**Fix (two-part)**

*Part 1 — Remove committed `node_modules` from git:*
```bash
git rm -r --cached frontend/node_modules
git rm -r --cached frontend/dist
```
This removes 6,530 files from git's object store while leaving them intact on disk. The `.gitignore` (`node_modules`, `dist`) prevents them from being re-added. After this commit, Vercel clones a clean repository with no `node_modules` and runs `npm install` itself on Linux, producing a correctly-permissioned install.

*Part 2 — Change the build script to bypass `.bin/` entirely:*
```json
"build": "node node_modules/vite/bin/vite.js build"
```
This invokes Node.js directly on Vite's JS entry point (`node_modules/vite/bin/vite.js`). A `.js` file requires no executable bit — Node reads it as text. This approach is completely immune to any file permission issue, regardless of how the repository was cloned or what OS created the `node_modules`.

---

### 7.4 — Azure Deployment: HTTP 301 Loops Breaking the Test Suite

**Symptom**
After setting `DEBUG=False` in the Azure environment, the entire test suite (75 tests) began failing with HTTP 301 responses instead of the expected 200/201/403. Locally with `DEBUG=True`, all tests passed.

**Root Cause**
`SECURE_SSL_REDIRECT = True` was set conditionally on `_PROD = not DEBUG`. Django's `SecurityMiddleware` intercepts every plain HTTP request and issues a 301 redirect to the HTTPS equivalent. The Django test client issues plain HTTP requests internally (no TLS). With `SECURE_SSL_REDIRECT = True` and `DEBUG=False`, every test request received a 301, causing every assertion like `self.assertEqual(response.status_code, 200)` to fail.

**Why this is also wrong on Azure**
Azure App Service terminates TLS at the Azure load balancer, not at the Django process. Traffic arriving at Daphne is always plain HTTP, regardless of whether the client connected via HTTPS. If Django emits a 301 redirect to HTTPS, the load balancer forwards that redirect back to the browser, which connects to the same load balancer over HTTPS, which again strips TLS and sends plain HTTP to Django — creating an infinite redirect loop or causing the client to hit Azure's "too many redirects" limit.

**Fix**
`SECURE_SSL_REDIRECT` is permanently set to `False`. HTTPS enforcement is handled at the Azure infrastructure level via the App Service's "HTTPS Only" toggle, which is the correct layer. HSTS headers (`Strict-Transport-Security`) are still emitted by Django when `DEBUG=False`, instructing browsers to use HTTPS for all future requests — this provides the same browser-level enforcement without the redirect loop.

```python
SECURE_SSL_REDIRECT = False          # Django must never redirect — Azure handles it
SECURE_HSTS_SECONDS = 31536000 if _PROD else 0   # Browsers remember HTTPS
```

---

### 7.5 — Azure Startup: `requirements.txt` UTF-16 Encoding

**Symptom**
`pip install -r requirements.txt` produced no output and installed nothing on Azure, but ran without error locally on Windows.

**Root Cause**
The `requirements.txt` file was saved with a UTF-16 LE BOM (`FF FE 61 00 ...`). On Windows, `pip` and most text editors handle UTF-16 transparently. On Linux (Azure App Service's Ubuntu environment), `pip` reads the file as binary, sees the BOM as an invalid package specifier, and silently exits with 0 packages installed. No error is raised because pip treats an unrecognisable line as a comment or skips it. The result: Azure was running Django with only its built-in packages, with no DRF, no JWT library, no CORS headers, no Channels — nothing.

**Detection**
```bash
python -c "
with open('requirements.txt', 'rb') as f:
    print(f.read()[:4].hex())
"
# Output: fffe6100  ← FF FE is the UTF-16 LE BOM
```

**Fix**
```python
with open('requirements.txt', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
```
Verified by checking the new BOM (`61 73 67 69` = `asgi` in ASCII — no BOM, correct UTF-8).

---

### 7.6 — ASGI vs WSGI: WebSocket Support

**Symptom**
WebSocket connections (`wss://`) closed immediately after the initial handshake when the backend was started with `gunicorn mediaflow.wsgi:application`.

**Root Cause**
Gunicorn is a WSGI server. WSGI is a synchronous, request/response protocol defined by PEP 3333. It has no concept of a persistent, bidirectional connection. WebSocket requires the ASGI (Asynchronous Server Gateway Interface) protocol, which supports long-lived connections with an explicit connect/disconnect/receive lifecycle.

**Fix**
Replaced `gunicorn` with `daphne` in `startup.sh`:
```bash
exec python -m daphne -b 0.0.0.0 -p $PORT mediaflow.asgi:application
```
Daphne is the reference ASGI server for Django Channels. It handles both regular HTTP requests (forwarded to Django's standard ASGI application) and WebSocket upgrade requests (forwarded to the Channels router and consumers) on the same port. `gunicorn` remains in `requirements.txt` as a documented fallback for non-WebSocket deployments.

---

## 8. Tech Stack

### Frontend

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 19 | Concurrent rendering, `useTransition`, Suspense boundaries |
| Build Tool | Vite 8 | ESM-native, sub-second HMR, Rollup-based production build |
| State — Server | TanStack Query 5 | Automatic background refetching, stale-while-revalidate, query invalidation on WebSocket events |
| State — Auth | React Context (AuthContext) | JWT stored in `localStorage`; 401 interceptor clears tokens and redirects to `/login` |
| Routing | React Router DOM 7 | Lazy-loaded routes, `RequireAuth` guard, SPA fallback via `vercel.json` rewrites |
| HTTP | axios 1.x | Configured with `VITE_API_BASE_URL` base URL, `Authorization: Bearer` injection interceptor |
| WebSocket | Custom `useWebSocket` hook | Auto-reconnect (max 10 attempts, 3 s delay), `wss://` derived from `VITE_API_BASE_URL` |
| Styling | Tailwind CSS 3 | Dark theme (`#09090f` background), blue accent (`#3B82F6`), card hover animations |
| OAuth | Google Identity Services | One-tap prompt flow; credential posted to `/api/users/auth/google/` |

### Backend

| Layer | Technology | Notes |
|---|---|---|
| Framework | Django 5.1.12 | ORM, admin, middleware, password validation, management commands |
| API | Django REST Framework 3.17 | ModelViewSets, custom permissions, pagination (page size 5), filtering |
| Auth | Simple JWT 5.5 | 60 min access tokens, 1-day refresh tokens, `Bearer` scheme |
| WebSocket | Django Channels 4.2 | `InMemoryChannelLayer`; `NewsConsumer` broadcasts `new_news` and `new_comment` |
| ASGI Server | Daphne 4.2.1 | HTTP + WebSocket on single port; started by `startup.sh` |
| Static Files | WhiteNoise 6.12 | `CompressedManifestStaticFilesStorage`; gzip + content-hash fingerprinting |
| CORS | django-cors-headers 4.6 | `CORS_ALLOW_ALL_ORIGINS=True`, credentials reflected per origin |
| Schema | drf-spectacular 0.27 | Auto-generated OpenAPI 3.0 schema; Swagger UI at `/api/docs/` |
| Filtering | django-filter 24.3 | URL-param filtering on category, source, author |

### DevOps

| Layer | Technology | Notes |
|---|---|---|
| Version Control | Git + GitHub | `develop` branch as integration target |
| CI/CD | GitHub Actions | 9-step pipeline; tests block, security tools report |
| Backend Hosting | Azure App Service | Central India region; `startup.sh` bootstrap |
| Frontend Hosting | Vercel | Edge CDN; automatic preview deployments per branch |
| Process Manager | Daphne (via `startup.sh`) | `exec` replaces the shell process for correct signal handling |

### Security

| Layer | Technology | Notes |
|---|---|---|
| SAST | Bandit | Run in CI; AST-level Python vulnerability detection |
| SCA | Safety | Run in CI; CVE database scan of all installed packages |
| Linting | Flake8 | Run in CI; PEP 8 enforcement |
| Transport | HSTS (1 year) | `Strict-Transport-Security` emitted in production |
| Cookies | Secure flag | `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_SECURE` in production |
| Headers | Django SecurityMiddleware | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` |
| Secrets | GitHub Secrets + Azure App Settings | `SECRET_KEY`, `GOOGLE_CLIENT_ID`, publish profile never in source |

---

## 9. API Reference

All endpoints are prefixed with `/api/`. Authentication required unless marked public.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/token/` | Public | Obtain JWT access + refresh token pair |
| `POST` | `/api/token/refresh/` | Public | Exchange refresh token for new access token |
| `POST` | `/api/users/register/` | Public | Create new user account |
| `POST` | `/api/users/auth/google/` | Public | Exchange Google ID token for JWT pair |
| `GET` | `/api/users/me/` | JWT | Fetch authenticated user's profile |

### News

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/news/` | JWT | Paginated list; filterable by category, source, author, search |
| `POST` | `/api/news/` | JWT (contributor+) | Create news article (multipart/form-data with image) |
| `GET` | `/api/news/{id}/` | JWT | Fetch single article with engagement counts |
| `PATCH` | `/api/news/{id}/` | JWT (owner/admin) | Update article |
| `DELETE` | `/api/news/{id}/` | JWT (owner/admin) | Delete article |
| `GET` | `/api/news/trending/` | JWT | Top 10 articles by combined views + likes (cached) |

### Engagement

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/news/{id}/like/` | JWT | Toggle like on article |
| `POST` | `/api/news/{id}/bookmark/` | JWT | Toggle bookmark on article |
| `GET` | `/api/news/{id}/comments/` | JWT | List comments on article |
| `POST` | `/api/news/{id}/comments/` | JWT | Add comment to article |
| `DELETE` | `/api/comments/{id}/` | JWT (owner/admin) | Delete comment |

### User & Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me/bookmarks/` | JWT | List authenticated user's bookmarked articles |
| `GET` | `/api/users/me/stats/` | JWT (contributor+) | Per-user article analytics |
| `GET` | `/api/stats/` | JWT (admin) | Platform-wide statistics |

### Contributor Workflow

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/contributor/apply/` | JWT | Submit contributor application with document upload |
| `GET` | `/api/admin/applications/` | JWT (admin) | List all pending/reviewed applications |
| `PATCH` | `/api/admin/applications/{id}/` | JWT (admin) | Approve or reject application |

### Documentation

| Endpoint | Description |
|---|---|
| `GET /api/docs/` | Swagger UI (interactive API explorer) |
| `GET /api/schema/` | Raw OpenAPI 3.0 JSON schema |

---

## 10. Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Git

### Backend

```bash
# Clone the repository
git clone https://github.com/abhirambhamidipati-sketch/MediaFlow.git
cd MediaFlow

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
# Backend is now at http://localhost:8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create frontend/.env with:
# VITE_API_BASE_URL=            ← leave blank to use Vite proxy → localhost:8000
# VITE_GOOGLE_CLIENT_ID=<your-client-id>

# Start the development server
npm run dev
# Frontend is now at http://localhost:5173
```

### Running Tests

```bash
# From the project root with venv activated
python manage.py test --verbosity=2
# Expected output: Ran 75 tests in ~33s ... OK
```

---

## 11. Environment Variables

### Backend (Azure App Service → Configuration → Application Settings)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | Django secret key. Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | ✅ | Set to `False` in production |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID — must match `VITE_GOOGLE_CLIENT_ID`. Used to validate the `aud` claim in ID tokens. |
| `FRONTEND_URL` | Optional | Your Vercel production URL (e.g. `https://mediaflow.vercel.app`). Added to `CORS_ALLOWED_ORIGINS` if set. |

### Frontend (Vercel → Project Settings → Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Full Azure backend URL: `https://mediaflow-backend-abhiram-hfa8h6auhjg5fybr.centralindia-01.azurewebsites.net` |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID. Omit or leave blank to hide the Google Sign-In button. |

> **Note:** Frontend `.env` file is listed in `.gitignore` and is never committed. Vercel injects these values at build time; they are baked into the compiled `dist/` bundle as `import.meta.env.VITE_*` replacements.

---

## 12. Security Model

### JWT Token Lifecycle

```
Login / Google OAuth
       │
       ▼
POST /api/token/  or  /api/users/auth/google/
       │
       ▼
Django returns { access: "...", refresh: "..." }
       │
       ├── access token  → localStorage  → Authorization: Bearer <token>
       │   Lifetime: 60 minutes
       │   Used on every API request via axios interceptor
       │
       └── refresh token → localStorage
           Lifetime: 24 hours
           Used only at POST /api/token/refresh/
           to obtain a new access token without re-login
```

### Role-Based Access Control

| Role | Registration | Capabilities |
|---|---|---|
| `viewer` | Default on signup | Read-only access to news, comments, bookmarks, likes |
| `contributor` | Requires admin approval of application | All viewer permissions + create/edit/delete own articles |
| `admin` | Superuser created via `createsuperuser` | All permissions + review applications + access `/api/stats/` + delete any content |

### Security Headers (Production)

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Blocks clickjacking via iframes |
| `Access-Control-Allow-Origin` | Reflected request origin | CORS — set per-request by `django-cors-headers` |
| `Access-Control-Allow-Credentials` | `true` | Required for `Authorization` header forwarding |

### What is NOT in Source Control

- `SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `AZURE_WEBAPP_PUBLISH_PROFILE`
- `frontend/.env` (contains `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`)
- `db.sqlite3`
- `venv/`
- `node_modules/`
- `dist/`
