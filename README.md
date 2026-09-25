# app

Phase 1 foundation for a client-only web application.

## Overview

This application is a static, client-only Single Page Application (SPA) built with React, TypeScript, and Vite.

- Arabic + RTL is the primary and default language and direction.
- English is secondary and switchable via a typed i18n system.
- Strict design tokens and self-hosted Cairo typography.
- Low-level reusable UI primitives (Button, Card, Toggle, Slider).
- Client-only architecture: **no backend/server, no external API keys, and no environment variables**.

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or bun

### Installation

```bash
npm install
```

### Development

Start the local Vite development server:

```bash
npm run dev
```

### Production Build

Build static assets for deployment:

```bash
npm run build
```

### Smoke Tests & Lint

```bash
npm test
npm run lint
```
