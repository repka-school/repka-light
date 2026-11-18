.PHONY: start test

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

# Run the site locally (dev server). Analytics is never added here.
start: node_modules
	env -u ANALYTICS npm run dev

test: node_modules
	npm test
