# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js tool for generating WhatsApp wedding invitation messages. Currently in early setup — no source files exist yet.

## Package Configuration

- **Module system:** CommonJS (`"type": "commonjs"`) — use `require()`/`module.exports`, not ESM `import`/`export`
- **Entry point:** `index.js` (to be created)

## Commands

```bash
# Install dependencies (once added)
npm install

# Run the tool
node index.js

# Run tests (once a test framework is configured)
npm test
```

## Architecture Notes

No source code exists yet. When building this out, document:
- How invitation templates are structured
- How recipient data is loaded (CSV, JSON, manual input, etc.)
- How WhatsApp sending is triggered (WhatsApp Web API, Baileys, whatsapp-web.js, etc.)
