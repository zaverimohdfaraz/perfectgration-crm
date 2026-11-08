# Going live: database, file storage, hosting and domain

This guide takes the CRM from demo mode to the real system. Follow the steps in order. It takes about 1 to 2 hours the first time.

You will set up four things:

| Piece | Service | What it holds | Cost |
|---|---|---|---|
| Database | MongoDB Atlas, free M0 cluster | Every record (people, clients, cases, messages…). No files. | Free (512 MB) |
| File storage | Amazon S3, one private bucket | The PDFs and images. The database keeps only each file's key. | About $1–3 a month at this size |
| Hosting | Vercel | Runs the app and the API | Free on Hobby; **Pro ($20/month) is required for commercial use** |
| Domain | Hostinger | `crm.yourdomain.com` | Your existing domain |

> **Vercel plan:** Vercel's Hobby plan is for personal, non-commercial projects. A CRM for a paying client is commercial use, so plan for Vercel Pro. Everything else in this guide is the same on both plans.

---

## 0. Before you start

- Install **Node.js 22** and **Git** on your computer.
- Unzip the project, open a terminal in the folder and run `npm install`.
- Run `npm run dev` and open http://localhost:3000. You should see the demo. Stop it with Ctrl + C.
- Copy `.env.example` to a new file called `.env.local`. You will fill it in as you go. **Never** commit or share `.env.local`.
- Make the sign-in secret now and paste it into `JWT_SECRET` in `.env.local`:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

---

## 1. MongoDB Atlas (database)

### 1.1 Create the cluster
1. Sign up at https://www.mongodb.com/cloud/atlas/register.
2. Create a project called **Perfectgration CRM**.
3. Click **Create** → choose **M0 (Free)**.
4. Provider **AWS**. Pick the region closest to Saudi Arabia that the free tier offers (for example Bahrain or Frankfurt). Remember it: Vercel should run in the same area (step 3.4).
5. Name it `Cluster0` and create it.

### 1.2 Create the database user
1. Left menu **Database Access** → **Add New Database User**.
2. Method: **Password**. Username: `crm_app`. Click **Autogenerate Secure Password** and copy it somewhere safe.
3. Built-in role: **Read and write to any database**. Save.

### 1.3 Allow Vercel to connect
Vercel's servers do not have fixed addresses, so Atlas must accept connections from anywhere. The long random password is what protects the database.
1. Left menu **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.

### 1.4 Get the connection string
1. **Database** → your cluster → **Connect** → **Drivers** → Node.js.
2. Copy the string. It looks like
   `mongodb+srv://crm_app:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
3. Replace `<db_password>` with the password from 1.2.
4. Add the database name **`perfectgration`** right after `.net/`:
   `mongodb+srv://crm_app:PASSWORD@cluster0.abcde.mongodb.net/perfectgration?retryWrites=true&w=majority&appName=Cluster0`
5. Paste it into `MONGODB_URI` in `.env.local`.

> If the password contains `@ : / ? # [ ]` or `%`, it must be URL-encoded. The easiest fix is to generate a new password with only letters and numbers.

### 1.5 The 13 collections
You do not create these by hand. Step 4 creates them, with their indexes.

| # | Collection | One record is… | Key fields |
|---|---|---|---|
| 1 | `users` | a person who can sign in | `email` (unique), `role`, `workTeam`, `teams`, `lastActiveAt` (for lead sharing), `passwordHash` (bcrypt, never the password), `mustChangePassword`, `failedLogins`, `lockedUntil`, `sessionVersion` |
| 2 | `clients` | a client | `name`, `phone`, `email`, `nationality` |
| 3 | `cases` | a whole case | `ref` (unique, PG-26-0001), `clientId`, `stage`, `status`, who holds it, deadlines, fees, commission (admin only), and embedded: `history`, `notes`, `issues` (problems and holds), `submissionLog`, `assessment` |
| 4 | `documents` | one document on a case | `caseId`, `name`, `status`, `storageKey` (the S3 key, **not** the file), `fileName`, `size`, `contentType`, `source` (team or client link) |
| 5 | `uploadlinks` | a link sent to a client | `token` (unique, random), `caseId`, `expiresAt`, `terminatedAt`, `requested`, `uploads` |
| 6 | `messages` | a Team Notepad message | `fromId`, `toAll`, `toUserIds`, `toTeams`, `toDepartments`, `readBy`, `pinned` |
| 7 | `todos` | a to-do item | `ownerId`, `title`, `due`, `done` |
| 8 | `partnertasks` | work waiting on a third party | `caseId`, `partner`, `assigneeId`, `deadline`, `progress` |
| 9 | `agents` | a referral agent | `name`, commission terms |
| 10 | `settings` | one record, `_id: "main"` | company details, step deadlines (SLA), default handlers, message templates |
| 11 | `counters` | a running number | case references (PG-26-0001), and the lock that stops two lead-sharing runs at once |
| 12 | `adinsights` | one campaign on one day (Meta or Google Ads) | `platform`, `campaignName`, `date`, `spend`, `clicks`, `leads`. Empty until the ad keys are added (optional, see docs/ADS_SETUP.md) |
| 13 | `logins` | one person on one day (the sign-in record) | `userId`, `day`, `firstAt`, `lastActiveAt`, `signedOutAt`, `signIns`, `activeMinutes`, `failed`, `device`. Filled automatically; read by the administrator on the Dashboard and the Sign-in record page |

Why problems, notes and history live **inside** the case: they always belong to exactly one case and are always read with it, so one read gives the whole case. Documents live in their own collection because files are added and checked separately.

Dates are stored as ISO text in UTC (for example `2026-10-21T06:00:00.000Z`), which sorts correctly. The app shows them in Riyadh time.

**Free tier size:** 512 MB holds hundreds of thousands of cases, because no files are stored in the database.

**Backups:** the free tier has no automatic backups. Once a week, run this on your computer (install the MongoDB Database Tools first) and keep the folder somewhere safe:
```bash
mongodump --uri="YOUR_MONGODB_URI" --out=backup-$(date +%F)
```

---

## 2. Amazon S3 (file storage)

Files are uploaded straight from the browser to S3 with a link that works for 5 minutes, and opened the same way. The bucket is **never public**.

### 2.1 AWS account
1. Sign up at https://aws.amazon.com and add a payment card.
2. Top-right, pick a region near Saudi Arabia, for example **Middle East (UAE) `me-central-1`**. (Some Middle East regions must be enabled first under Account → AWS Regions.) Write the code into `AWS_REGION`.
3. Recommended: in **Billing → Budgets**, create a monthly budget of $5 with an email alert.

### 2.2 Create the bucket
1. Open **S3** → **Create bucket**.
2. Name: something unique, for example `perfectgration-crm-files` → put it in `S3_BUCKET`.
3. Region: the one from 2.1.
4. **Object Ownership:** ACLs disabled.
5. **Block all public access: ON** (all four boxes ticked). Do not change this, ever.
6. **Bucket Versioning:** Enable (lets you recover a file that was replaced by mistake).
7. **Default encryption:** SSE-S3. Create the bucket.

### 2.3 Create a user that can only use this bucket
1. Open **IAM** → **Policies** → **Create policy** → **JSON**, and paste (change the bucket name in both places):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CrmFiles",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::perfectgration-crm-files/*"
    },
    {
      "Sid": "CrmBucketCheck",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketCORS"],
      "Resource": "arn:aws:s3:::perfectgration-crm-files"
    }
  ]
}
```
2. Name it `PerfectgrationCrmFiles` and create it.
3. **IAM → Users → Create user**, name `perfectgration-crm-app`. Do **not** give console access.
4. Permissions: **Attach policies directly** → tick `PerfectgrationCrmFiles` → create.
5. Open the user → **Security credentials** → **Create access key** → "Application running outside AWS".
6. Copy the **Access key** into `AWS_ACCESS_KEY_ID` and the **Secret access key** into `AWS_SECRET_ACCESS_KEY`. The secret is shown only once.

### 2.4 Decide your site address
Pick it now, for example `https://crm.yourdomain.com`. Put it in `APP_URL` (no slash at the end).

### 2.5 Allow the browser to upload (CORS)
Bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → Edit, paste and save:

```json
[
  {
    "AllowedOrigins": ["https://crm.yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
Use your real address. Remove `http://localhost:3000` when you no longer test on your computer.

### 2.6 Optional: clean up abandoned uploads
If someone closes the page halfway through an upload, a file can arrive without being recorded. To remove those automatically, you can later add a lifecycle rule; it is not needed to go live.

---

## 3. Vercel (hosting)

### 3.1 Put the code on GitHub
1. Create a **private** repository on GitHub.
2. In the project folder:
```bash
git init
git add .
git commit -m "Perfectgration CRM v9"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/perfectgration-crm.git
git push -u origin main
```
`.env.local` is ignored by Git, so your secrets are not uploaded. Check on GitHub that it is not there.

### 3.2 Import into Vercel
1. Sign in at https://vercel.com with GitHub → **Add New → Project** → import the repository.
2. Framework: Next.js (detected). Leave build settings as they are.

### 3.3 Environment variables
Before the first deploy, open **Environment Variables** and add each of these for **Production** (and Preview if you use it):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_DATA_MODE` | `api` |
| `APP_URL` | `https://crm.yourdomain.com` |
| `MONGODB_URI` | from 1.4 |
| `JWT_SECRET` | from step 0 |
| `AWS_REGION` | from 2.1 |
| `AWS_ACCESS_KEY_ID` | from 2.3 |
| `AWS_SECRET_ACCESS_KEY` | from 2.3 |
| `S3_BUCKET` | from 2.2 |

Optional, any time later: the Meta and Google Ads keys and `CRON_SECRET` (see **docs/ADS_SETUP.md**). Without them the app works normally.

Do **not** add `ADMIN_PASSWORD` to Vercel. If you change any variable later, redeploy (Deployments → ⋯ → Redeploy), because `NEXT_PUBLIC_DATA_MODE` is fixed when the app is built.

### 3.4 Run the functions near the database
Project → **Settings → Functions → Function Region**: pick the region closest to your Atlas cluster (for example Frankfurt `fra1` if Atlas is in Frankfurt). This makes every page faster.

### 3.5 Deploy
Click **Deploy**. When it finishes you get an address like `perfectgration-crm.vercel.app`.

---

## 4. Create the collections and the first administrator

Run this **once**, on your computer, after `.env.local` is complete:

1. In `.env.local`, set `ADMIN_NAME`, `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (10+ characters, with letters and numbers).
2. Run:
```bash
npm run db:seed
```
You should see a ✓ for each of the 13 collections, the default settings and the administrator.
3. Check everything at once:
```bash
npm run check:setup
```
Every line should be ✓. If not, the message says what to fix.
4. Delete `ADMIN_PASSWORD` from `.env.local`.

Running `db:seed` again is safe; it never overwrites anything.

---

## 5. Domain from Hostinger

1. Vercel → Project → **Settings → Domains** → add `crm.yourdomain.com`. Vercel shows the record it needs (normally a **CNAME** to `cname.vercel-dns.com`; use the exact value Vercel shows).
2. Hostinger → **Domains** → your domain → **DNS / Nameservers** → **DNS records**:
   - Type **CNAME**, Name **crm**, Target the value Vercel showed, TTL default. Save.
   - If a record for `crm` already exists, delete it first.
3. Wait 5 to 60 minutes. Vercel shows **Valid Configuration** and issues the HTTPS certificate automatically.
4. Make sure `APP_URL` in Vercel and the S3 CORS origin both use exactly this address, then redeploy.

Using the main domain (`yourdomain.com`) instead works too: Vercel will show an **A** record for `@` to add in Hostinger.

---

## 6. First sign-in and adding the team

1. Open `https://crm.yourdomain.com` and sign in with the administrator email and password.
2. **Team → Add team member**. Choose their team (Social Media, Sales or Case Manager) and visa departments. The screen shows a **temporary password once**: send it to the person privately.
3. On first sign-in they must choose their own password.
4. **Reset password** (Team → Edit access) gives a new temporary password and signs them out everywhere. **Deactivate** stops them signing in at once; their cases stay as they are.

---

## 7. Automatic lead sharing (Sales)

Settings → **Lead sharing**. On by default.

- A lead passed to the whole Sales team (or to one visa team) goes straight to a Sales member **who is online**, the one with the fewest new leads.
- When another Sales member signs in, untouched leads move to them so everyone stays even: 40 leads and 4 people gives 10 each; a 5th person gives 8 each; a 6th gives 7, 7, 7, 7, 6, 6.
- "Online" means the CRM is open: every open CRM pings the server once a minute. Someone who signs out, or has not had the CRM open for 10 minutes (changeable), counts as offline, and their untouched leads go to the people still online.
- A lead **never** moves once its holder has done anything with it (a note, a problem, moving it forward) or pressed **Keep this lead**. Leads passed to one named person are never shared.
- If no Sales member is online, leads wait in the pool; the first person to sign in (or to press Accept) gets them.
- Every move is written in the case history ("Shared automatically", "Moved from … to … to keep leads even").

Switch it off to go back to "the first person to accept gets the lead".

## 8. How the client upload links work

1. The person holding a case opens **Documents → New upload link**, lists the files needed and picks how long the link stays open (24 hours, 3 days, 7 days or a date, up to 30 days).
2. They copy the link or share it on WhatsApp. The link looks like `https://crm.yourdomain.com/u/` followed by a long random code.
3. The client opens it on their phone. No sign-in. They see only their first name, the list of files and your message, never anything else from the CRM.
4. Each file goes straight to S3. The server checks it arrived, is a PDF, JPG, PNG or WEBP and is at most 10 MB, then records it on the case. If it matches a requested document that is waiting, it is attached to that document.
5. The link stops working when it expires or when someone presses **End link now**. Files already received stay.

**Security choices to know about:**
- The code in the link is 32 random bytes; it cannot be guessed. Anyone who has the link can upload files to that case (and only upload) until it closes. That is why links expire and can be ended.
- Each link accepts at most 40 files.
- Files are opened only by signed-in staff who may see that case, through a link that works for 5 minutes.

---

## 9. Day-to-day

- **Updates:** change code, `git push`, Vercel deploys automatically.
- **Logs:** Vercel → Project → Logs (server errors show as `[api]`).
- **Costs to watch:** AWS Billing (S3), Atlas (storage used, under 512 MB).
- **Secrets:** if a key ever leaks, create a new one (AWS access key, Atlas password, or `JWT_SECRET`) and update Vercel. Changing `JWT_SECRET` signs everyone out.

## 10. If something goes wrong

| What you see | Likely cause | Fix |
|---|---|---|
| Sign-in page shows the demo accounts | `NEXT_PUBLIC_DATA_MODE` is not `api` | Set it in Vercel, then **Redeploy** |
| "Something went wrong on the server" everywhere | Database not reachable | Check `MONGODB_URI`, the user password, and Network Access `0.0.0.0/0` |
| File upload fails with "could not be sent" | S3 CORS | The origin in 2.5 must match the site address exactly (https, no slash at the end) |
| Upload fails with "did not arrive" or Access Denied | IAM policy | Bucket name in the policy must match `S3_BUCKET` |
| "Request blocked." | The site was opened from an address not in `APP_URL` | Use the real address, or update `APP_URL` |
| Everyone is signed out | `JWT_SECRET` changed | Expected; sign in again |
| Upload links show the wrong address | `APP_URL` not set | Set it and redeploy |
