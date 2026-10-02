# Deploying Tabea

A practical walkthrough from an empty Neon project to a working deployment. The [README](README.md) covers what the application does and how it is built.

## Before you start

You need:

- A [Neon](https://neon.tech) account
- A [Vercel](https://vercel.com) account
- A GitHub repository holding this code
- Node 20.9 or newer on your own machine, for the migration and bootstrap steps

## 1. Create the database

1. Create a Neon project and choose a region close to the people who will use Tabea. For Oman, Frankfurt or Bahrain are both reasonable.
2. Open **Connection Details** and copy the **pooled** connection string. The host name contains `-pooler`. It looks like this:

   ```
   postgresql://user:password@ep-example-123456-pooler.eu-central-1.aws.neon.tech/tabea?sslmode=require
   ```

   Keep `?sslmode=require`.

3. Consider creating a second Neon branch named `development` and using its connection string locally. Seeding clears the database, so this keeps real data out of reach of a mistyped command.

## 2. Apply the schema

Migrations are never run automatically during a deployment, on purpose: a schema change should be a deliberate step rather than a side effect of pushing code.

From your own machine, with `DATABASE_URL` pointing at the production database:

```bash
npm install
npm run db:migrate
```

The command prints each migration as it is applied.

## 3. Create the first administrator

Still pointing at the production database:

```bash
SEED_PASSWORD='choose-a-strong-value' npm run db:seed -- --admin
```

This creates one account, `admin`, and nothing else. It does not clear the database and does not add sample data.

Sign in as `admin` once the application is live and change the password from the profile page.

Never run `npm run db:seed` without `--admin` against a database that holds real work. It clears every table first and refuses to run when `NODE_ENV` is `production` unless forced.

## 4. Deploy to Vercel

1. In Vercel, choose **Add New** and then **Project**, and import the GitHub repository.
2. Leave the build settings alone. Next.js is detected automatically.
3. Add the environment variables below for **Production** and **Preview**.
4. Deploy.

### Environment variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The pooled Neon connection string |
| `AUTH_SECRET` | A fresh random value, at least 32 characters |
| `APP_URL` | The deployment URL, for example `https://tabea.example.com` |
| `SESSION_DAYS` | Optional. Session lifetime in days, default 30 |
| `APP_TIMEZONE` | Optional. Default `Asia/Muscat` |

Generate the secret with:

```bash
openssl rand -base64 48
```

Use a different `AUTH_SECRET` for Preview than for Production. Changing it signs everybody out, which is the intended behaviour if it is ever exposed.

## 5. Check the deployment

Sign in as the administrator and confirm:

- [ ] Sign in works and a wrong password is refused
- [ ] The dashboard loads
- [ ] A user can be created from **Admin** and then **Users**
- [ ] A task can be created and assigned
- [ ] The status can be changed, and Waiting asks for a reason
- [ ] A progress update appears on the task and in its history
- [ ] Switching to Arabic flips the layout and translates everything
- [ ] The application looks right on an iPhone in Safari
- [ ] **Add to Home Screen** installs it with the Tabea icon

## 6. Set up the people

As the administrator, create the accounts and set each person's rights.

| Person | Role | Sees all tasks | Can assign | Can edit others |
| --- | --- | --- | --- | --- |
| Father | `MANAGER` | Yes | Yes | Yes |
| Son who helps run things | `MEMBER` | Yes | Yes | No |
| Son | `MEMBER` | Yes | No | No |
| Worker or outside helper | `MEMBER` | No | No | No |

Remember that account management cannot be delegated. Only an administrator can create or change accounts, by design.

Add phone numbers with the country code, for example `+96891234567`. They are not used yet, and are stored ready for WhatsApp notifications later.

Projects and categories are optional and live under **Admin** and then **Settings**. Start with a few, such as Farm, Building and Shop, and Maintenance, Government, Payment, Purchase and Follow-up.

## Later changes

### Schema changes

```bash
npm run db:generate   # writes a new file into drizzle/
npm run db:migrate    # applies it
```

Commit the generated migration. Apply it to production before or alongside the deployment that needs it.

### Rotating the session secret

Change `AUTH_SECRET` in Vercel and redeploy. Every existing session stops working and everybody signs in again. Do this if the value is ever exposed.

### Somebody leaves

Deactivate them from **Admin** and then **Users**. Sign in is blocked at once, their open sessions end, and no new work can be assigned to them. Their past tasks, updates and history stay exactly as they were, with their name intact. Do not delete the account.

### Backups

Neon keeps point in time history on its paid plans. On the free plan, take a periodic dump:

```bash
pg_dump "$DATABASE_URL" > tabea-backup-$(date +%F).sql
```

## Troubleshooting

**The build fails with a message about the environment.** `DATABASE_URL` or `AUTH_SECRET` is missing in Vercel, or `AUTH_SECRET` is shorter than 32 characters.

**Pages load but every query fails.** The connection string is probably the direct one rather than the pooled one. Use the host containing `-pooler`.

**Everybody was signed out at once.** `AUTH_SECRET` changed. This is expected.

**Dates look wrong by a few hours.** Check `APP_TIMEZONE`. Timestamps are stored with a timezone and formatted for the reader, so this setting controls what people see without touching stored data.

**A person cannot see a task you expect them to see.** Check their visibility setting under **Admin** and then **Users**. Without `canViewAllTasks` they see only tasks assigned to them, created by them, or where they were added as a participant.

**A person can see a task but cannot edit it.** That is the design. Viewing and editing are separate, and editing the tasks of others needs `canEditOthersTasks`.
