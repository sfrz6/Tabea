# Tabea | تابع

Assign work clearly, follow its progress, preserve its history, and know who is responsible.

Tabea is a private task accountability system for a family and the small businesses it runs. It is not a general purpose project management product and does not try to become one. It exists to answer a short list of questions without anybody having to rely on memory or phone calls:

- What do I need to do, and when is it due?
- What did my father assign me?
- What am I waiting for, and why?
- What is overdue?
- What happened with this task, and who changed the deadline?

## Contents

- [What Tabea does](#what-tabea-does)
- [Roles and permissions](#roles-and-permissions)
- [Arabic and English](#arabic-and-english)
- [Designed for an iPhone](#designed-for-an-iphone)
- [Technology](#technology)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Development accounts](#development-accounts)
- [Testing](#testing)
- [Deploying to Vercel](#deploying-to-vercel)
- [Security notes](#security-notes)
- [Future WhatsApp notifications](#future-whatsapp-notifications)
- [Project structure](#project-structure)
- [Writing rule](#writing-rule)

## What Tabea does

**Tasks.** A task carries a title, a person responsible, a priority and a deadline. It can also carry details, a project, a category, a location and extra participants.

**Status.** New, In progress, Waiting, Completed, Cancelled. The first move into In progress stamps the start time. Moving to Waiting requires a written reason, because a blocked task without an explanation is exactly the situation this product exists to prevent. Completing stamps who finished it and when.

**Overdue.** Derived from the deadline every time it is displayed, never stored, so a task can never carry a stale flag. Shown as "Overdue by 3 days" rather than a bare red mark, and Arabic gets its own correct plural forms.

**Progress updates.** Separate from status, so somebody can report what happened without pretending the work moved on. Updates are never removed when the status changes. An author may correct the wording of their own update for fifteen minutes; the previous text is kept and the entry is marked as edited.

**History.** Every meaningful change is recorded with the actor, the time, the old value and the new one: creation, assignment, reassignment, title, details, priority, due date, project, category, location, participants, status, updates, waiting reasons, completion, reopening and cancellation. Nothing important is overwritten silently.

**Notifications.** In app, with an unread count and a direct link to the task. Stored as translation keys plus values rather than finished sentences, so a message created while the sender was using Arabic still reads correctly for somebody whose interface is in English.

**Dashboard.** Built for a phone. Three figures that demand a decision, then the work itself: what needs attention, what is due today, what is coming, what changed recently.

## Roles and permissions

Role and permission are separate concepts.

| Role | Purpose |
| --- | --- |
| `ADMIN` | Manages accounts, sees everything, keeps the system in order. |
| `MANAGER` | Creates and follows up work across the team. Intended for the father. |
| `MEMBER` | Carries out assigned work and reports progress. |

Three permissions are stored per user and are independent of the role:

| Permission | Meaning |
| --- | --- |
| `canViewAllTasks` | Sees every task instead of only their own. Viewing only. |
| `canAssignTasks` | May create work and assign it to other people. |
| `canEditOthersTasks` | May edit tasks that are not their own. |

Two rules are structural and deliberately not configurable:

1. **Only `ADMIN` manages user accounts.** There is no `canManageUsers` permission, no switch for it in the interface, and no way to delegate it. An administrator always holds full visibility and full task rights, and those switches are shown as fixed rather than editable.
2. **Seeing a task and changing a task are separate.** Full visibility grants reading only. A son may be able to see every task in the business and still be unable to edit a worker's task, or even to move it along.

A person is related to a task when it is assigned to them, when they created it, or when they were added as a participant. Somebody restricted to their own tasks sees exactly those.

### Example setup

| Person | Role | Sees all tasks | Can assign | Can edit others |
| --- | --- | --- | --- | --- |
| Father | `MANAGER` | Yes | Yes | Yes |
| Son | `MEMBER` | Yes | Yes | No |
| Worker | `MEMBER` | No | No | No |

### Deactivation, not deletion

A person who has history is never deleted. Deactivating them blocks sign in, ends their open sessions immediately, and stops new work being assigned to them. Their past tasks, updates and activity stay exactly as they were, and their name still reads correctly in old records. An administrator can reactivate them later.

## Arabic and English

Both languages are first class. Arabic was not added on top of an English layout.

- A typed dictionary per language. The English dictionary defines the shape, so a missing Arabic key is a build error rather than a blank label.
- Arabic uses proper right to left layout: the document direction changes, and the interface is built on logical CSS properties, so navigation, forms, cards, timelines, modals and the mobile bar all adapt rather than being mirrored by hand.
- Arabic plural rules are respected. Arabic distinguishes zero, one, two, a few, many and the rest, and the dictionary supplies all of them where the grammar needs them.
- Typography uses IBM Plex Sans Arabic for Arabic and Inter for Latin, in one stack, with a slightly looser line height for Arabic.
- Dates and numbers are formatted per language, with Latin digits in Arabic, which is how they are read in the Gulf.
- The choice is saved to the account, so it follows the person to any device, and is mirrored into a cookie so pages can read it without a database call.

## Designed for an iPhone

Most people use Tabea on an iPhone in Safari, so that is the layout that was designed first.

- A bottom navigation bar with at most five entries, every target a full column at least 56px tall.
- Safe area insets are respected throughout, so nothing sits under the Dynamic Island, the home indicator or the Safari toolbars.
- A floating action button for creating work, placed within thumb reach above the bottom bar.
- Status changes take two taps. Only Waiting adds a step, because it needs its reason.
- Native date, time and select inputs, so iOS opens its own pickers instead of a slower custom imitation.
- A 16px minimum font size on every control, which is what stops Safari zooming when an input is focused. Pinch to zoom is left enabled, because taking it away is an accessibility problem.
- Dialogs are bottom sheets on a phone and centred panels on a desktop, with their own scroll area and a footer that clears the home indicator.
- Correct input types and autocomplete attributes throughout.

The desktop layout is a genuinely different arrangement with a sidebar and multi column sections, not a stretched phone.

### Progressive web app

Tabea ships a web manifest, maskable icons, an Apple touch icon and the right metadata, so it can be added to the home screen and launched like an application. No part of it requires a background server.

## Technology

- Next.js 16, App Router, TypeScript in strict mode
- React 19 with Server Components and Server Actions
- Tailwind CSS v4, with a token based theme and a dark mode that follows the system
- Neon PostgreSQL with Drizzle ORM over the WebSocket driver, so transactions are available
- Zod for validation, on the server for every request
- Session based authentication with bcrypt, HttpOnly cookies and server side sessions
- Vitest for the business rules
- Deploys to Vercel with no persistent background process

Drizzle was chosen over Prisma for the small serverless footprint and for schema definitions that are plain TypeScript, which keeps the query layer and the types in one place.

## Architecture

```
Next.js interface (Server Components, Server Actions)
            |
Permission layer, validation layer, services
            |
      Drizzle ORM
            |
   Neon PostgreSQL
```

One full stack Next.js application. There is no separate backend.

A few decisions are worth knowing before changing anything:

**Authorization lives in one place.** `src/lib/permissions` holds every rule. Pages, server actions and database queries all call the same functions, so a rule cannot pass in the interface and behave differently on the server.

**Visibility is enforced in SQL.** `visibilityCondition` is applied to every list, count, search and detail query. Somebody restricted to their own tasks does not have other tasks filtered out of their screen; those rows are never in their result set. A task they may not see is reported as missing rather than forbidden, so the interface never confirms that a hidden task exists.

**Writes are transactional.** A task change, its history entries and its notifications are written together or not at all.

**History is stored in a neutral form.** Enum names for status and priority, ISO strings for dates, and the person's name as it stood at the time. The sentence is composed at display time, which is how one stored record reads correctly in both languages.

**The database connection is lazy.** It opens on first use rather than on import, so a build needs no database and a page that never queries never pays for a connection.

## Local development

Requires Node 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with one of the [development accounts](#development-accounts).

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serves the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:generate` | Generates a migration from the schema |
| `npm run db:migrate` | Applies pending migrations |
| `npm run db:seed` | Fills a development database |
| `npm run db:studio` | Drizzle Studio |
| `npm run check:no-em-dash` | Verifies the writing rule below |

## Environment variables

Copy `.env.example` to `.env.local`. Nothing secret belongs in the repository.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon connection string. Use the pooled one. |
| `AUTH_SECRET` | Yes | Signs session identifiers. At least 32 characters. |
| `APP_URL` | Yes | Public base URL of the deployment. |
| `SESSION_DAYS` | No | Session lifetime in days. Defaults to 30. |
| `APP_TIMEZONE` | No | Timezone for every displayed date. Defaults to `Asia/Muscat`. |
| `SEED_PASSWORD` | No | Password used by the seed script. Development only. |

Generate a secret with:

```bash
openssl rand -base64 48
```

### Setting up Neon

1. Create a project at [neon.tech](https://neon.tech) and pick a region close to your users.
2. Copy the **pooled** connection string. It contains `-pooler` in the host name.
3. Put it in `DATABASE_URL`, keeping `?sslmode=require`.
4. Run `npm run db:migrate`.

Consider a separate Neon branch for development, so seeding never touches real data.

## Database

Core tables: `users`, `tasks`, `task_updates`, `task_activities`, `notifications`. Supporting tables: `sessions`, `login_attempts`, `task_participants`, `task_update_revisions`, `projects`, `categories`.

Timestamps are stored with a timezone and formatted for the reader in the application timezone, so a deadline chosen as 8 October in Muscat stays 8 October whatever the server clock says.

Indexes cover assignee, creator, status, priority, due date, the task and user foreign keys, and the notification read state.

Migrations live in `drizzle/` and are committed. After changing `src/db/schema.ts`:

```bash
npm run db:generate
npm run db:migrate
```

Migrations are never run automatically during a deployment. A schema change should be a deliberate step, not a side effect of pushing code.

## Development accounts

`npm run db:seed` clears the database and creates five people and a set of tasks that cover every status, an overdue task, a blocked task with a reason, progress updates, full history and unread notifications.

| Username | Person | Role | Sees all | Can assign | Can edit others |
| --- | --- | --- | --- | --- | --- |
| `admin` | System Administrator | `ADMIN` | Yes | Yes | Yes |
| `salim` | Salim Al Harthy, the father | `MANAGER` | Yes | Yes | Yes |
| `mohammed` | Mohammed, son | `MEMBER` | Yes | Yes | No |
| `yousef` | Yousef, son | `MEMBER` | Yes | No | No |
| `rashid` | Rashid, worker | `MEMBER` | No | No | No |

All five use the same development password, printed by the seed script and set by `SEED_PASSWORD`, defaulting to `TabeaDev2026!`.

**These are development credentials. They are fake, they are documented here on purpose, and they must never be used anywhere real.** The seed script refuses to run against a production database unless forced.

To create only the first administrator on a fresh production database:

```bash
SEED_PASSWORD='a-strong-value' npm run db:seed -- --admin
```

Then sign in and change the password immediately.

## Testing

```bash
npm test
```

The suite covers the rules that would be expensive to get wrong:

- **Authorization.** Who may see, edit, assign, update, complete, reopen and cancel; that user management belongs to `ADMIN` alone and cannot be granted by any stored permission; that full visibility never implies edit rights; and that an unauthorized task is reported as missing rather than forbidden.
- **Dates.** Application timezone handling against a UTC server, deadline conversion from form values, and that overdue is derived correctly and never applies to finished work.
- **Validation.** That Waiting is refused without a reason, that identifiers and limits are enforced server side, and that there is no field for managing users to accept.
- **Arabic and English.** Dictionary completeness, matching placeholders, the six Arabic plural categories, and that no English text was left in the Arabic dictionary.
- **Structure.** That no client component reaches a server only module, however indirectly, and that no em dash exists anywhere in the project.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import it in Vercel. The framework is detected automatically.
3. Add `DATABASE_URL`, `AUTH_SECRET` and `APP_URL` as environment variables for Production and Preview.
4. Deploy.
5. Run the migrations against the production database from your own machine, pointing `DATABASE_URL` at it:

   ```bash
   npm run db:migrate
   ```

6. Create the first administrator with `npm run db:seed -- --admin`, sign in, and change the password.

Every page is rendered on demand, because every page depends on who is signed in. There is no build time database access and nothing requires a persistent background server.

## Security notes

- Passwords are hashed with bcrypt at twelve rounds. Plaintext is never stored and a hash is never sent to the browser.
- Sessions are server side. The cookie holds a random 256 bit token; the database holds an HMAC of it keyed with `AUTH_SECRET`, so reading the database alone does not yield a usable session. Cookies are HttpOnly, `SameSite=Lax`, and `Secure` in production.
- Every authorization decision is made on the server. Hiding a button is presentation only; the matching server action repeats the check before it writes.
- Identifiers that arrive from the browser are validated and authorized. A task is loaded through a query that already carries the visibility rule, which is what prevents reaching another person's task by editing a URL.
- Sign in is rate limited per username in a sliding window, counting attempts against accounts that do not exist in exactly the same way. Every failure reports the same message and takes a comparable amount of time, so the form cannot be used to discover which usernames are real or which accounts are deactivated.
- Deactivating somebody, reducing their rights or resetting their password ends their existing sessions immediately.
- Errors are reported to the user as translated messages. Database errors and stack traces stay in the server logs.
- Security headers are set for every response, and the application asks search engines not to index it.

## Future WhatsApp notifications

Version one requires in app notifications only, and OpenWA is deliberately not implemented. The seam for it exists.

Task logic never names a channel. It builds a neutral event and hands it to the notification service, which decides which providers exist:

```
Tabea on Vercel -> NotificationService -> OpenWA provider -> OpenWA VPS -> WhatsApp
```

Adding WhatsApp later means writing one provider with `kind: "external"` and registering it in `src/services/notification/index.ts`. Nothing in the task layer changes. Providers that write to Tabea's own database join the caller transaction; external providers run after it commits, so a delivery failure can never roll back a recorded task change. Phone numbers are already stored in a normalised form for this.

## Project structure

```
src/
  app/                 routes, grouped by (auth) and (app)
  components/
    brand/             the Tabea mark and lockup
    layout/            shell, navigation, language switcher
    ui/                buttons, fields, cards, modal, skeletons
  features/
    auth/              sign in, sign out, language
    tasks/             queries, mutations, server actions, components
    users/             admin and profile
    notifications/
    taxonomy/          projects and categories
    dashboard/
  lib/
    auth/              sessions, passwords, rate limiting
    permissions/       every authorization rule
    i18n/              dictionaries, translator, formatting
    validation/        Zod schemas, limits, messages
    dates.ts           timezone aware date handling
  services/
    notification/      channel abstraction and providers
    activity.ts        history recording
  db/                  schema, client, migrate, seed
drizzle/               generated migrations
tests/                 business rules and structural guards
scripts/               icon generation, writing rule check
public/brand/          logo sources
public/icons/          generated application icons
```

Within a feature, `queries.ts` reads, `mutations.ts` holds the business rules, `actions.ts` is the thin server action boundary, and `components/` is the interface.

## Branding

The Tabea mark is a tracking ring that has almost closed, with a solid head at the leading edge. The ring is the follow up, the head is the responsibility being followed, and the gap at the top is the part still to be done. It is drawn inline as SVG so it stays sharp at any size and can take the surrounding colour.

The brand name is never translated, only written in the script of the active language: **Tabea** and **تابع**.

Sources are in `public/brand/`. Regenerate the PNG icons after changing them:

```bash
npx tsx scripts/generate-icons.ts
```

## Writing rule

This project uses no em dash anywhere: not in the interface, the Arabic or English text, validation messages, notifications, documentation, comments, seed data or tests. Commas, periods, colons, parentheses and standard hyphens are used instead.

```bash
npm run check:no-em-dash
```

The same check runs as part of the test suite. The only file excluded is `Idea.md`, the original brief, whose single occurrence is the character being named as forbidden.
