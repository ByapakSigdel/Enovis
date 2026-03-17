# Enovis - Productivity Management System

A comprehensive monorepo for the Productivity Management System with web, server, and future mobile applications.

## 📁 Monorepo Structure

```
Enovis/
├── apps/
│   ├── web/              # Next.js web application
│   ├── server/           # Express.js backend API
│   ├── android/          # Future Android app (placeholder)
│   └── ios/              # Future iOS app (placeholder)
├── packages/
│   ├── shared-types/     # Shared TypeScript types and interfaces
│   ├── shared-utils/     # Shared utility functions
│   └── ui-components/    # Shared UI components for web and mobile
├── Designs/              # Design assets and mockups
└── docker-compose.yml    # Docker services configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (for database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Enovis
```

2. Install dependencies for all workspaces:
```bash
npm install
```

3. Start the database:
```bash
docker-compose up -d cassandra
```

4. Initialize the database:
```bash
npm run server:db:init
```

## 🛠️ Development

### Run all apps in development mode:
```bash
npm run dev
```

### Run individual apps:

**Web app:**
```bash
npm run web:dev
```

**Server:**
```bash
npm run server:dev
```

### Build all apps:
```bash
npm run build
```

### Build individual apps:

**Web app:**
```bash
npm run web:build
```

**Server:**
```bash
npm run server:build
```

## 🐳 Docker

Start all services (database, server, web):
```bash
docker-compose up -d
```

Stop all services:
```bash
docker-compose down
```

## 📦 Workspaces

This monorepo uses npm workspaces to manage multiple packages:

- **apps/web**: Next.js frontend application
- **apps/server**: Express.js backend API with Cassandra
- **packages/shared-types**: Shared TypeScript types
- **packages/shared-utils**: Shared utility functions
- **packages/ui-components**: Shared React components

## 🔮 Future Apps

Placeholders for future mobile applications:

- **apps/android**: Android application (React Native/Flutter/Kotlin)
- **apps/ios**: iOS application (React Native/Flutter/Swift)

## 🧹 Clean Dependencies

Remove all node_modules:
```bash
npm run clean
```

## 📝 License

Private - All rights reserved
