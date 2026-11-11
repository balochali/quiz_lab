# QuizLab

QuizLab is a local Next.js and SQLite application for university lab assessments.

## Set up

Use Node.js 22 or later. In PowerShell, from the project folder:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

If SESSION_SECRET in .env is blank, fill it with the generated value. Then initialize the database and create a lecturer account:

```powershell
npx prisma generate
npx prisma migrate deploy
$env:ADMIN_EMAIL = Read-Host 'Lecturer email'
$quizPassword = Read-Host 'Lecturer password (at least 12 characters)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $quizPassword).Password
node --env-file=.env scripts/create-admin.mjs
Remove-Item Env:ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000/admin/login. Add a subject, create a quiz, set its total to the sum of the question marks, publish it, and share the student link. To use it across a lab network, run on a reachable host and share its network URL instead of localhost. Use HTTPS with production mode, which sets Secure cookies.

## Lecturer signup and subjects

Self-service signup at /admin/signup requires these settings in .env:

- APP_URL is the base URL lecturers can reach. Use HTTPS for a shared installation.
- SMTP_URL is the SMTP connection URL from your email provider, including credentials if required. Percent-encode special characters in credentials. Use a TLS connection for a shared installation.
- SMTP_FROM is a sender address authorized by your email provider.

Restart QuizLab after changing .env. The confirmation link is single use and expires after one hour. The lecturer sets a password after opening that link. For local development, use a local SMTP capture server to inspect messages without delivering them to real inboxes. The create-admin script above can still provision a verified account when SMTP is unavailable.

Each lecturer manages their own subjects under Subjects. Choose a subject in the quiz wizard and filter the quiz library by subject. Existing lecturer accounts, default lab subjects, and quizzes are retained by the migration.

Use Delete in the quiz library and confirm to remove a quiz and its attempts, results, and student link.

## Schedule quizzes and release scores

Pick a lab subject in Quiz information. In Publish, leave the opening time blank for immediate access or set a date and time in Pakistan time. The published link shows a countdown until then, and the server blocks early attempts. You can also set an optional link expiration in Pakistan time. To stop new attempts immediately, go to Quizzes → Link & leaderboard → Close link now. Students who have already started can finish within their original attempt time.

In Settings, choose immediate scores after each attempt or manual release. Open the quiz’s Leaderboard from the quiz library to rank finalized attempts and release held scores. Students who keep their result page open see their individual score when it is released. The leaderboard is available only to the lecturer.

## Examination behavior

Fullscreen is requested before the browser starts a new attempt when required. The server owns the deadline, attempt cookie, scoring, and final status. A reload retains saved answers and does not reset the timer. The browser reports tab visibility and fullscreen changes. Blur is logged as an informational signal. These browser signals cannot provide OS lockdown or independently prove that the student remained in fullscreen.

The automatic submission setting controls whether the browser proactively requests a result at zero. In all cases, the server stops accepting answers at the deadline and finalizes expired attempts on the next attempt or lecturer results request. Content and policy are locked once a quiz has attempts to preserve the basis for grading.

## Checks

```powershell
npx tsc --noEmit
npm run lint
npm run build
```


With the development server running and the schema initialized, run the API smoke test:

```powershell
node --env-file=.env scripts/smoke-test.mjs
```

The smoke test creates and removes its own quiz and attempts. For browser QA, publish a disposable quiz and use different roll numbers to test a normal submission, switching tabs, leaving fullscreen, and refreshing while an attempt is active.


## Vercel deployment

Set the project Root Directory to quiz-platform if the Git repository includes its parent folder. The included vercel.json runs npm run vercel-build.

Create a hosted PostgreSQL database (for example through Vercel's database integrations). Set DATABASE_URL to its PostgreSQL connection URL in Vercel's environment settings. The app also recognizes QUIZ_LAB_POSTGRES_URL (or QUIZ_LAB_PRISMA_DATABASE_URL) injected by the Prisma Postgres integration, during both installation and runtime. Use a URL that supports migrations as well as Prisma queries. The build generates the PostgreSQL Prisma client and applies migrations from prisma/postgresql/migrations. Keep preview deployments connected to a separate preview database.

Also set SESSION_SECRET, SMTP_URL, SMTP_FROM, and APP_URL. APP_URL must be the public HTTPS origin, such as https://quizlab-e269.vercel.app. Vercel does not load your computer's .env file. Redeploy after changing these settings.

Local development continues to use the SQLite schema and migrations under prisma/. The PostgreSQL schema is derived by scripts/prisma-setup.mjs. When changing models, add matching PostgreSQL migrations as well as SQLite migrations. Existing local records are not copied to the hosted database automatically.

Signup records a sanitized database error code in server logs. If signup fails after deployment, check Vercel's function logs for "Signup database operation failed". Email delivery also needs a reachable SMTP server with valid credentials.
