# META_DEV_CONSOLE.md — Facebook Developer Console setup

This is the ops playbook for configuring your Facebook app so OAuth login works with this deployment. Everything in here is clicked by hand in the Meta Developer Console — none of it is automatable.

Console: [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)

---

## 1. Create the Facebook app (one-time)

1. Developers Console → Create App → pick "Business" use case
2. Name your app (users will see this name on the OAuth consent screen)
3. Link it to a Meta Business Manager (required for ads access)

After creation, note the **App ID** and **App Secret** on App Settings → Basic → these become `FB_APP_ID` and `FB_APP_SECRET` in your deployment's secrets.

---

## 2. Add required products

Under "Add a product" on the left rail:

- **Facebook Login** — required for `/api/auth/callback` to work
- **Marketing API** — required for ads_management, ads_read scopes
- (Optional) Pages API — if you use the Post Booster feature

---

## 3. Configure Facebook Login — OAuth Redirect URIs

**This is the step most deploys fail on.** The `FB_REDIRECT_URI` secret you set during `setup.sh` **must match exactly** what's registered here.

Facebook Login → Settings → Valid OAuth Redirect URIs:

```
https://<your-public-origin>/api/auth/callback
```

Examples:
- Preview deploy: `https://adbot-ai.pages.dev/api/auth/callback`
- Custom domain: `https://adbot.example.com/api/auth/callback`

Exact-match means: protocol, host, port, path, trailing slash — every character identical. Facebook does strict equality, not prefix match.

Save the Facebook Login settings.

---

## 4. Configure Permissions & Features

Some scopes are "Advanced Access" — requires App Review. For a customer self-deploying for their OWN use, Standard Access works in Development mode:

| Scope | Access tier for single-user use |
|-------|---------------------------------|
| `public_profile` | Standard (always granted) |
| `email` | Standard (if requested) |
| `ads_management` | Advanced — requires App Review OR Tester designation |
| `ads_read` | Advanced — requires App Review OR Tester designation |
| `business_management` | Advanced — requires App Review OR Tester designation |
| `pages_read_engagement` | Advanced |
| `pages_show_list` | Advanced |
| `pages_read_user_content` | Advanced |

### Option A — Development mode (fastest for solo self-host)

Stay in Development mode. Add yourself as a **Tester** under App Roles → Roles → Add People. As a tester you get every scope you request without needing App Review.

Works for: single-developer self-host, trying out the app.

Limits: ONLY testers can OAuth-connect. If you share the URL with someone else, their OAuth attempt will fail with "App not active" or "This app is in development mode".

### Option B — Live mode (required for real users other than you)

1. App Dashboard → "App Mode" toggle → Live
2. If you skipped App Review, only the **basic** scopes work after switching — you'll be able to log in but `ads_management` calls will fail.
3. Submit for App Review for the Advanced scopes you need. Review typically takes 2-7 business days.

Review requires:
- Privacy Policy URL (App Settings → Basic)
- Terms of Service URL
- Data Deletion URL (can be a page explaining how users request data deletion)
- App Icon (1024×1024 PNG)
- Business verification completed

### Option C — Business Verification + System User Token

For operating on a specific Business Manager's ad accounts without per-user OAuth, generate a System User Token in the BM → Business Settings → System Users → Add System User → Generate Token with ads_management + business_management. Paste it into the app via your own admin path (this template strips the dev endpoint so you'd wire one yourself or use a migration).

Advanced, skip for first deploy.

---

## 5. App Icon + basic info

App Settings → Basic:
- **App Icon** — 1024×1024 PNG, visible on OAuth consent screen
- **Display Name** — user-facing
- **Category** — "Business and Pages" or similar
- **Privacy Policy URL** — required for Live mode
- **Terms of Service URL** — required for Live mode
- **Data Deletion URL** — required for Live mode

---

## 6. Verify the setup

From your deployed app:

1. Open `https://<your-public-origin>/api/auth/facebook` — you should be redirected to Facebook OAuth consent
2. Grant the requested scopes
3. Facebook redirects back to `/api/auth/callback`
4. You land in the app, logged in, with your ad accounts in the dropdown

If any step fails, see Troubleshooting below.

---

## 7. Adding more users / domains later

Each additional public origin you deploy to (e.g., staging + prod) needs its own OAuth Redirect URI registered. Meta allows multiple URIs on one app — add one per line in the Valid OAuth Redirect URIs field.

Max URIs per app is not publicly documented; in practice ~200 is safe. If you're running a multi-tenant SaaS with hundreds of customer domains, use an OAuth proxy pattern instead (not included in this template).

---

## Troubleshooting

### "This app is in development mode"
- You (the user attempting OAuth) are not listed as a Tester. Add yourself: App Dashboard → App Roles → Roles → Add People → Testers.
- Or switch to Live mode after App Review.

### "Invalid redirect URI"
- `FB_REDIRECT_URI` in your deployment doesn't exactly match what's registered.
- Recheck scheme, host, port, path, trailing slash in both places.

### OAuth succeeds but `ads_management` calls fail with code 100 / subcode 33
- Your app is in Live mode but doesn't have Advanced Access for `ads_management`. Submit for App Review or revert to Development mode + add the user as a Tester.

### "App is restricted" / "App is not active" / app suddenly stops working
- Meta auto-disables apps that spike in API volume, multiple OAuth retries, or violate platform policies. Check App Dashboard → Alerts. Common causes:
  - Too many OAuth retry attempts in short window (common during development)
  - App's Privacy Policy URL returns 404
  - Missing Business Verification
- Mitigation: Dashboard → Support → file an appeal. Typical response time 1-3 business days.

### Token works for reads but can't manage ads
- You have `ads_read` but not `ads_management`. Revoke the token and re-OAuth requesting the full scope set.

### Need to rotate app secret
- App Settings → Basic → "Show" under App Secret → "Reset". Update your deployment's `FB_APP_SECRET` secret with the new value and redeploy. Existing user tokens remain valid.

### I lost access to the app
- App owner (first person who created it) has root. They can transfer ownership via App Dashboard → Roles → Admins. If owner is unreachable, Meta support via form.
