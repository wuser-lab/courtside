# Contributing

Small, useful changes are welcome. Describe a real player or coach workflow, the current friction, and the proposed improvement. For scoring changes, include the exact sequence or score that exposes the issue.

Use Node.js 20+. Run `npm start` for the app, `npm test` for the pure engine, and `npm run check` for syntax checks. There is no dependency install or build step.

Keep scoring in `dist/engine.js` and UI behavior in `dist/app.js`. Derive statistics from point history. Add meaningful tests for scoring or analysis changes, especially server changes, set boundaries, and empty denominators. Update the methodology when definitions change.

Check desktop and narrow mobile layouts. Preserve keyboard operation, visible focus states, optional location tagging, reduced-motion support, and the ability to use the app without Google Fonts. Never add telemetry or remote uploads of match data without an explicit opt-in design.

For a pull request, explain the user problem, resulting behavior, and what you checked. Include a screenshot when the interface changes. Do not include real players’ private match data; use the deterministic demo or a fictional fixture.
