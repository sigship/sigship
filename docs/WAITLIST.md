# Waitlist

The Join the waitlist form on sigship.dev posts to `/api/waitlist` in the site Worker (`worker/site.js`).
The Worker checks the entry, drops bots, and forwards it to a Google Sheet through an Apps Script web app.
The Sheet's address and a shared secret are Worker secrets, so they never appear in the page or in this repo.

Until both secrets are set, the form says the waitlist is not open yet and points to support@sigship.dev.

## Set it up once

1. Create a Google Sheet called **SIGSHIP waitlist**. In row 1, add these headers:
   `Time`, `Email`, `Name`, `Plan`, `Tool`, `Country`.
2. In the Sheet, open **Extensions → Apps Script**, delete what is there, and paste the script below. Save.
3. Make a shared secret: a long random string. On a Mac, `openssl rand -hex 24` prints one.
4. In Apps Script, open **Project Settings → Script properties**, and add `SECRET` with that string.
5. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Deploy, approve access, and copy the web app URL.
6. In `~/sigship`, run these and paste the values when asked:
   ```bash
   npx wrangler secret put WAITLIST_URL
   ```
   ```bash
   npx wrangler secret put WAITLIST_SECRET
   ```
7. Join the waitlist on sigship.dev with your own email and check the row appears.

"Anyone" only means the URL needs no Google login. Without the secret, the script refuses every request.

## Apps Script

```js
// Adds one waitlist row. Refuses anything without the shared secret, and skips repeat emails.
function doPost(e) {
  const out = (body) => ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || data.secret !== secret) return out({ ok: false });

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
