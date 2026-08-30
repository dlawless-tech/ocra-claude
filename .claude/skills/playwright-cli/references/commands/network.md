# Network commands

Intercept and mock network traffic. To read requests after they happen, see `diagnostics.md`.

## Route (mock and intercept)

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
playwright-cli route "**/api/**" --content-type=application/json --header="x-test=1" --remove-header=etag
playwright-cli route-list
playwright-cli unroute "**/*.jpg"     # one pattern
playwright-cli unroute                  # all routes
```

## URL patterns

```
**/api/users        exact path
**/api/*/details    wildcard segment
**/*.{png,jpg,jpeg} file extensions
**/search?q=*       query parameters
```

## Advanced mocking with run-code

Plain `route` covers status, body, and headers. For conditional responses, request-body inspection, response modification, or delays, use `run-code` (see [../running-code.md](../running-code.md) for the contract):

```bash
# Conditional response on request body
playwright-cli run-code "async page => { await page.route('**/api/login', async route => {
  const body = route.request().postDataJSON();
  if (body.user === 'admin') return route.fulfill({ json: { role: 'admin' } });
  return route.fulfill({ status: 401 }); }); }"

# Modify the real response
playwright-cli run-code "async page => { await page.route('**/api/me', async route => {
  const response = await route.fetch(); const json = await response.json();
  json.isPremium = true; await route.fulfill({ response, json }); }); }"

# Simulate a network failure
playwright-cli run-code "async page => page.route('**/api/**', r => r.abort('internetdisconnected'))"
# options: connectionrefused, timedout, connectionreset, internetdisconnected

# Delay a response
playwright-cli run-code "async page => { await page.route('**/api/**', async route => {
  await new Promise(r => setTimeout(r, 3000)); await route.fulfill({ json: {} }); }); }"
```
