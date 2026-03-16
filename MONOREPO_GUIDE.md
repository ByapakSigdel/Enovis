# Monorepo Development Guide

## Directory Structure Philosophy

This monorepo follows a clear separation between applications and shared packages:

### Apps (`apps/`)
Independent applications that can be deployed separately:
- **web**: Next.js frontend (Port 3000)
- **server**: Express backend API (Port 3001)
- **android**: Future Android app
- **ios**: Future iOS app

### Packages (`packages/`)
Shared code used across multiple apps:
- **shared-types**: Common TypeScript types/interfaces
- **shared-utils**: Utility functions (date formatting, validation, etc.)
- **ui-components**: Reusable React components

## Working with Workspaces

### Installing Dependencies

**For the entire monorepo:**
```bash
npm install
```

**For a specific workspace:**
```bash
npm install <package> --workspace=apps/web
npm install <package> --workspace=apps/server
npm install <package> --workspace=packages/shared-types
```

**Add a local package as dependency:**
```bash
# In apps/web/package.json, add:
"dependencies": {
  "@prms/shared-types": "*"
}
```

### Running Scripts

**Run in all workspaces:**
```bash
npm run <script> --workspaces
```

**Run in specific workspace:**
```bash
npm run dev --workspace=apps/web
# or use the shortcuts defined in root package.json
npm run web:dev
npm run server:dev
```

## Shared Packages Usage

### Using Shared Types

```typescript
// In apps/web or apps/server
import { YourType } from '@prms/shared-types';
```

### Using Shared Utils

```typescript
// In apps/web or apps/server
import { yourUtility } from '@prms/shared-utils';
```

### Using UI Components

```typescript
// In apps/web (or future mobile apps)
import { YourComponent } from '@prms/ui-components';
```

## Adding a New App

1. Create directory in `apps/`
2. Add `package.json` with proper name
3. The workspace will be automatically detected
4. Add convenience scripts to root `package.json` if needed

## Adding a New Package

1. Create directory in `packages/`
2. Add `package.json` with scoped name: `@prms/package-name`
3. Add `tsconfig.json` if TypeScript
4. Export from `src/index.ts`
5. Reference in apps using the scoped name

## Port Allocation

- **3000**: Web frontend
- **3001**: Backend API
- **3002**: Cassandra Web UI
- **9042**: Cassandra database

## Best Practices

1. **Keep packages small and focused**: Each package should have a single responsibility
2. **Use TypeScript**: All packages should be TypeScript for better type safety
3. **Version together**: All packages share the same version (0.1.0)
4. **Private by default**: Mark packages as private unless publishing to npm
5. **Test locally**: Changes to packages are immediately reflected in apps
6. **Document exports**: Always maintain clear index files

## Troubleshooting

### Changes to shared packages not reflected

```bash
# Clean and reinstall
npm run clean
npm install
```

### Port conflicts

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Docker issues

```bash
# Restart all services
docker-compose down
docker-compose up -d

# View logs
docker-compose logs -f
```
