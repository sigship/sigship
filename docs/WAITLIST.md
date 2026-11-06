# Waitlist

The Join the waitlist form on sigship.dev posts to `/api/waitlist` in the site Worker (`worker/site.js`).
The Worker checks the entry, drops bots, and forwards it to a Google Sheet through an Apps Script web app.
The Apps Script address is the Worker secret `WAITLIST_URL`, so it never appears in the page or in this repo.
That address is a long, unguessable link, and it acts as the lock. `WAITLIST_SECRET` is an optional second lock.

Until `WAITLIST_URL` is set, the form says the waitlist is not open yet and points to support@sigship.dev.

## Set it up once

1. Create a Google Sheet called **SIGSHIP waitlist**. In row 1, add these headers:
   `Time`, `Email`, `Name`, `Plan`, `Tool`, `Country`.
2. In the Sheet, open **Extensions → Apps Script**, delete what is there, and paste the script below. Save.
3. Click **Deploy → New deployment**, choose **Web app**, set **Execute as: Me** and **Who has access: Anyone**. Deploy, approve access, and copy the web app URL (it ends in `/exec`).
4. In `~/sigship`, run this and paste the URL when asked:
   ```bash
   npx wrangler secret put WAITLIST_URL
   ```
5. Join the waitlist on sigship.dev with your own email and check the row appears.

"Anyone" only means the URL needs no Google login. Keep the URL private: it lives only in the Worker secret.

Optional second lock: make a random string (`openssl rand -hex 24`), add it in Apps Script under **Project Settings → Script properties** as `SECRET`, and run `npx wrangler secret put WAITLIST_SECRET` with the same string. The script then refuses any request without it.

## Apps Script

```js
// Adds one waitlist row and skips repeat emails. If the SECRET script property is set, it also refuses
// any request that doesn't carry it.
function doPost(e) {
  const out = (body) => ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (secret && data.secret !== secret) return out({ ok: false });
  if (!data.email) return out({ ok: false });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const emails = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (!emails.includes(data.email)) {
      sheet.appendRow([data.at, data.email, data.name, data.plan, data.tool, data.country]);
    }
  } finally {
    lock.releaseLock();
  }
  return out({ ok: true });
}
```

To export to Excel: **File → Download → Microsoft Excel (.xlsx)**.
