# Agent Rules

## Browser / Playwright

Do NOT use Playwright or any browser automation tools to verify UI changes. The Playwright MCP instance is connected to a different application and cannot access this app. Instead:
- Verify correctness via `npx tsc --noEmit`
- Check the dev server log for runtime errors
- Report what was implemented and ask the user to verify visually
