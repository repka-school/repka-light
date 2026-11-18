.PHONY: start test test-e2e

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

# Run the site locally (dev server). Analytics is never added here.
start: node_modules
	env -u ANALYTICS npm run dev

test: node_modules
	npm test

# The built site in a real browser. The first run needs the browsers:
# npx playwright install chromium webkit
test-e2e: node_modules
	npm run test:e2e
