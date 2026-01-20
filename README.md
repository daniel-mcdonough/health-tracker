# Health Tracker

A web application for tracking daily symptoms and food intake to identify correlations between diet and medical issues.

## Quick Start

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Authentication Setup

Before first use, you need to configure authentication:

1. **Generate a password hash:**
   ```bash
   cd server
   npm run generate-password
   ```

2. **Create a `.env` file** in the server directory with your credentials:
   ```bash
   cp .env.example .env
   # Edit .env and add your AUTH_PASSWORD_HASH
   ```

3. **Default username is `user`** (customizable via `AUTH_USERNAME` in `.env`)

## Project Structure

```
health-tracker/
├── client/          # React frontend (Vite)
├── server/          # Express.js backend
├── shared/          # Shared types and utilities
├── docs/            # Documentation
└── PROJECT_PLAN.md  # Detailed project specification
```

## Development

- Frontend: React + Vite + Tailwind CSS (http://localhost:3000)
- Backend: Express.js + TypeScript + SQLite (http://localhost:3001)
- Charts: Recharts for data visualization

## Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm run test` - Run tests for both client and server
- `npm run lint` - Run ESLint on the entire project

## Features

- Daily symptom tracking with severity scales
- Food intake logging with meal timing
- Correlation analysis between food and symptoms
- Visual charts and data export
- Mobile-responsive design