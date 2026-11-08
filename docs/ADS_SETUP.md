# Connecting Meta Ads and Google Ads (optional)

The CRM reads campaign results **directly** from Meta and Google once a day and shows them on the **Social Media** page beside the CRM's own leads: spend, clicks, leads reported by the ads, leads actually created in the CRM from each campaign, and the real cost per CRM lead.

**Nothing is required.** Without these keys the Social Media page shows "Not connected" and the rest of the CRM works exactly the same. You can connect one platform, both, or neither, and add the keys at any time.

> Ask the SEO / social media team for access to the ad accounts. Do not take passwords: everything below uses tokens that can be switched off at any time without changing anyone's password.

---

## How it works

1. Once a day (and whenever someone opens the Social Media page and the data is more than a day old) the server fetches the last 30 days from each connected platform.
2. Results are saved in the `adinsights` collection: one row per campaign per day. Only numbers are stored: no personal data comes from the ad platforms.
3. A lead in the CRM is matched to a campaign when the **Ad campaign** typed on the lead is the campaign's name in Meta or Google (capital letters do not matter). The New lead form suggests names already used.
4. Admins and managers can press **Sync now** on the Social Media page. If a platform fails (for example an expired token), its error shows there and the other platform keeps working.

---

## Meta Ads (Facebook and Instagram)

You need a **System User token**. It never expires and belongs to the business, not to a person.

1. Go to https://business.facebook.com → **Business settings**. You must be an admin of the Business that owns the ad account.
2. **Accounts → Apps → Add → Create a new app ID** (or open https://developers.facebook.com/apps → Create app → type **Business**). Name it `Perfectgration CRM`. Add the **Marketing API** product.
3. In Business settings → **Users → System users → Add**. Name `crm-reader`, role **Employee**.
4. Select the system user → **Assign assets** → **Ad accounts** → choose the account(s) → permission **View performance** only. Also assign the app from step 2.
5. Click **Generate new token** → choose the app → tick only **ads_read** → Generate. Copy the token.
6. Find the ad account ID: Ads Manager → the account menu, or Business settings → Ad accounts (a number like `1234567890`).
7. Add to the environment (Vercel → Settings → Environment Variables, and `.env.local` for testing):

```
META_ACCESS_TOKEN=EAAG...            # the system user token
META_AD_ACCOUNT_IDS=1234567890       # several accounts: separate with commas
META_APP_SECRET=                     # optional: App settings → Basic → App secret (needed only if "Require app secret" is on)
# META_API_VERSION=v25.0             # optional; change when Meta retires this version
```

Using only your own ad account in development mode needs no app review. If Meta asks for review of `ads_read`, use **Standard access**, which is enough for reading your own accounts.

---

## Google Ads

You need four things: a **developer token**, an **OAuth client**, a **refresh token** and the **customer ID**.

### 1. Developer token
1. Sign in to the **manager account (MCC)** that manages the client's Google Ads account. If there is none, create one free at https://ads.google.com/home/tools/manager-accounts/ and link the client's account to it.
2. In the manager account: **Admin → API Center**. Fill the form and accept the terms. Copy the **developer token**.
3. Apply for **Basic access** (the form is on the same page). Until it is approved, the token works only with test accounts and the CRM shows "Developer token not approved".

### 2. OAuth client
1. Go to https://console.cloud.google.com → create a project `perfectgration-crm`.
2. **APIs & Services → Library** → enable **Google Ads API**.
3. **APIs & Services → OAuth consent screen** → External → fill the app name and your email → add your Google account as a test user → then **Publish app** (so the refresh token does not expire after 7 days).
4. **Credentials → Create credentials → OAuth client ID** → type **Web application**. Under *Authorized redirect URIs* add `https://developers.google.com/oauthplayground`. Copy the **Client ID** and **Client secret**.

### 3. Refresh token
1. Open https://developers.google.com/oauthplayground.
2. Click the gear (top right) → tick **Use your own OAuth credentials** → paste the Client ID and secret.
3. In *Input your own scopes* type `https://www.googleapis.com/auth/adwords` → **Authorize APIs** → sign in with a Google account that has access to the ad account → Allow.
4. Click **Exchange authorization code for tokens**. Copy the **Refresh token**.

### 4. Customer IDs
The 10-digit number at the top of Google Ads (like `123-456-7890`) for the client's account, and the manager account's number.

```
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=1//...
GOOGLE_ADS_CUSTOMER_IDS=123-456-7890        # several: separate with commas
GOOGLE_ADS_LOGIN_CUSTOMER_ID=111-222-3333   # the manager account; leave empty if you sign in directly to the ad account
# GOOGLE_ADS_API_VERSION=v26                # optional; Google retires versions about once a year
```

"Leads reported by ads" for Google is the campaign's **Conversions** column, so make sure lead form or call conversions are set up in Google Ads.

---

## The daily sync

`vercel.json` runs `/api/cron/ads-sync` every night (02:30 Riyadh time). To protect it, add a random secret:

```
CRON_SECRET=   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Vercel sends it automatically. Without `CRON_SECRET` the nightly job does nothing, and the Social Media page still syncs by itself when the data is more than a day old.

After adding or changing any of these variables in Vercel, **redeploy**. Then open the Social Media page as an administrator and press **Sync now**.

## When something goes wrong

| Message on the Social Media page | Fix |
|---|---|
| Meta: `190: Error validating access token` | The token was removed or the system user lost access. Generate a new token (step 5). |
| Meta: `(#100) ... ads_read` or `(#200)` | The system user is not assigned to the ad account, or the token lacks `ads_read`. |
| Meta: `appsecret_proof` | Add `META_APP_SECRET`. |
| Google: `Developer token not approved` | Basic access is still pending, or the token belongs to a different manager account. |
| Google: `invalid_grant` | The refresh token expired (the consent screen was left in Testing) or access was removed. Publish the consent screen and make a new refresh token. |
| Google: `USER_PERMISSION_DENIED` | Set `GOOGLE_ADS_LOGIN_CUSTOMER_ID` to the manager account, or check the Google account used for the refresh token has access. |
| Google: `version ... is not supported` / Meta: `version is deprecated` | Set `GOOGLE_ADS_API_VERSION` / `META_API_VERSION` to the current version and redeploy. |
