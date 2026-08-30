# Storage commands

Cookies, localStorage, sessionStorage, and whole-browser storage state.

## Storage state (save and restore)

Save the full browser state (cookies plus each origin's storage) to a file, then restore it to skip login.

```bash
playwright-cli state-save              # auto-named storage-state-{timestamp}.json
playwright-cli state-save auth.json
playwright-cli state-load auth.json    # then open or reload the page to apply
```

The file holds `cookies` and `origins` (each origin's `localStorage`):

```json
{ "cookies": [ { "name": "session_id", "value": "abc123", "domain": "example.com", "path": "/", "httpOnly": true, "secure": true, "sameSite": "Lax" } ],
  "origins": [ { "origin": "https://example.com", "localStorage": [ { "name": "theme", "value": "dark" } ] } ] }
```

Security: never commit a state file that holds auth tokens. Add it to `.gitignore` and delete it after the run. In-memory sessions (the default) are safer for secrets.

## Cookies

```bash
playwright-cli cookie-list [--domain=example.com] [--path=/api]
playwright-cli cookie-get session_id
playwright-cli cookie-set session abc123
playwright-cli cookie-set session abc123 --domain=example.com --path=/ --httpOnly --secure --sameSite=Lax
playwright-cli cookie-set remember_me tok --expires=1893456000   # Unix timestamp
playwright-cli cookie-delete session_id
playwright-cli cookie-clear
```

Set several at once with `run-code`:

```bash
playwright-cli run-code "async page => { await page.context().addCookies([
  { name: 'session_id', value: 'sess_abc', domain: 'example.com', path: '/', httpOnly: true },
  { name: 'prefs', value: JSON.stringify({ theme: 'dark' }), domain: 'example.com', path: '/' } ]); }"
```

## localStorage

```bash
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark
playwright-cli localstorage-set user_settings '{"theme":"dark","language":"en"}'   # JSON value
playwright-cli localstorage-delete theme
playwright-cli localstorage-clear
```

## sessionStorage

```bash
playwright-cli sessionstorage-list
playwright-cli sessionstorage-get step
playwright-cli sessionstorage-set step 3
playwright-cli sessionstorage-delete step
playwright-cli sessionstorage-clear
```

## IndexedDB

No dedicated commands; use `run-code`:

```bash
playwright-cli run-code "async page => page.evaluate(() => indexedDB.databases())"
playwright-cli run-code "async page => page.evaluate(() => indexedDB.deleteDatabase('myDatabase'))"
```

## Pattern: reuse an authenticated session

```bash
# Log in once, save state
playwright-cli open https://app.example.com/login
playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "password123"
playwright-cli click e3
playwright-cli state-save auth.json

# Later: restore and skip login
playwright-cli state-load auth.json
playwright-cli open https://app.example.com/dashboard
```
