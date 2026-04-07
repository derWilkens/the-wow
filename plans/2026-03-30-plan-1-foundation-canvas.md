# Way of Working — Plan 1: Foundation + Activity Canvas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working app with Supabase auth, workspace list, and a React Flow canvas where users can create, rename, and drill into activities — with auto-save to the backend.

**Architecture:** Vite+React frontend talking to a NestJS REST API, both connected to Supabase PostgreSQL. Auth is handled by Supabase Auth; the NestJS backend validates JWTs. The frontend uses TanStack Query for server state and Zustand for canvas navigation state.

**Tech Stack:** React 18, Vite, TypeScript, React Flow, Zustand, TanStack Query, Tailwind CSS, NestJS, Supabase JS v2, Jest (backend), Vitest + React Testing Library (frontend)

---

## File Map

```
wayofworking/
├── frontend/                          ← Vite React app
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                    ← routing root
│   │   ├── types/
│   │   │   └── index.ts               ← shared TS types (Activity, Workspace, …)
│   │   ├── lib/
│   │   │   ├── supabase.ts            ← Supabase browser client
│   │   │   └── queryClient.ts         ← TanStack Query client instance
│   │   ├── store/
│   │   │   └── canvasStore.ts         ← Zustand: breadcrumb path, active workspace
│   │   ├── api/
│   │   │   ├── workspaces.ts          ← useWorkspaces, useCreateWorkspace hooks
│   │   │   └── activities.ts          ← useActivities, useUpsertActivity hooks
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── WorkspaceListPage.tsx
│   │   │   └── CanvasPage.tsx         ← hosts WorkflowCanvas
│   │   └── components/
│   │       ├── canvas/
│   │       │   ├── WorkflowCanvas.tsx     ← React Flow wrapper
│   │       │   ├── ActivityNode.tsx       ← custom React Flow node
│   │       │   ├── TriggerIcon.tsx        ← SVG trigger icons
│   │       │   ├── SubprocessMarker.tsx   ← BPMN sub-process marker
│   │       │   ├── Breadcrumb.tsx         ← workspace › activity navigation
│   │       │   └── CreateActivityForm.tsx ← popover on double-click empty canvas
│   │       └── layout/
│   │           └── AppShell.tsx           ← nav bar + page wrapper
│
├── backend/                           ← NestJS app
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── database.service.ts    ← Supabase server client wrapper
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.guard.ts          ← validates Supabase JWT
│   │   │   └── current-user.decorator.ts
│   │   ├── workspaces/
│   │   │   ├── workspaces.module.ts
│   │   │   ├── workspaces.controller.ts
│   │   │   ├── workspaces.service.ts
│   │   │   ├── workspaces.controller.spec.ts
│   │   │   ├── workspaces.service.spec.ts
│   │   │   └── dto/
│   │   │       └── create-workspace.dto.ts
│   │   └── activities/
│   │       ├── activities.module.ts
│   │       ├── activities.controller.ts
│   │       ├── activities.service.ts
│   │       ├── activities.controller.spec.ts
│   │       ├── activities.service.spec.ts
│   │       └── dto/
│   │           ├── create-activity.dto.ts
│   │           └── upsert-activity.dto.ts
│   └── test/
│       └── app.e2e-spec.ts
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `frontend/` (Vite React TS)
- Create: `backend/` (NestJS)
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold frontend with Vite**

```bash
cd C:/Users/ms/workspace/wayofworking
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

Expected: `frontend/src/App.tsx` exists.

- [ ] **Step 2: Install frontend dependencies**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npm install @supabase/supabase-js @tanstack/react-query zustand reactflow tailwindcss postcss autoprefixer
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Init Tailwind**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx tailwindcss init -p
```

- [ ] **Step 4: Configure Tailwind**

Replace `frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

Replace `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure Vitest**

Add to `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

Create `frontend/src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Scaffold backend with NestJS CLI**

```bash
cd C:/Users/ms/workspace/wayofworking
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend && npm install @supabase/supabase-js @nestjs/config class-validator class-transformer
```

Expected: `backend/src/app.module.ts` exists.

- [ ] **Step 7: Update .gitignore**

Add to `C:/Users/ms/workspace/wayofworking/.gitignore`:
```
# Frontend
frontend/node_modules/
frontend/dist/

# Backend
backend/node_modules/
backend/dist/

# Environment
frontend/.env
frontend/.env.local
backend/.env
backend/.env.local
```

- [ ] **Step 8: Verify both apps start**

```bash
# Terminal 1
cd C:/Users/ms/workspace/wayofworking/frontend && npm run dev
# Expected: http://localhost:5173 shows Vite default page

# Terminal 2
cd C:/Users/ms/workspace/wayofworking/backend && npm run start:dev
# Expected: NestJS listening on port 3000
```

- [ ] **Step 9: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking
git add frontend/ backend/ .gitignore
git commit -m "chore: scaffold frontend (Vite+React) and backend (NestJS)"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type trigger_type_enum as enum ('email', 'schedule', 'manual', 'webhook', 'file_drop');
create type activity_status_enum as enum ('draft', 'ready_for_review', 'reviewed');
create type node_type_enum as enum ('activity', 'start_event', 'end_event');
create type port_direction_enum as enum ('in', 'out');
create type permission_level_enum as enum ('read', 'edit', 'delegate');

-- Workspaces
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Activities (self-referencing for drill-down; also covers start/end events)
create table activities (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references activities(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  node_type node_type_enum not null default 'activity',
  label text not null default '',
  trigger_type trigger_type_enum,  -- only set when node_type = 'start_event'
  position_x float not null default 0,
  position_y float not null default 0,
  status activity_status_enum not null default 'draft',
  updated_at timestamptz not null default now()
);

-- Ports
create table ports (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid not null references activities(id) on delete cascade,
  direction port_direction_enum not null,
  file_types text[] not null default '{}',
  destination_types text[] not null default '{}',
  attributes jsonb not null default '[]'
);

-- Connections
create table connections (
  id uuid primary key default uuid_generate_v4(),
  source_port_id uuid not null references ports(id) on delete cascade,
  target_port_id uuid not null references ports(id) on delete cascade,
  label text,
  has_warning boolean not null default false
);

-- Activity roles (explicit permissions)
create table activity_roles (
  activity_id uuid not null references activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission permission_level_enum not null,
  primary key (activity_id, user_id)
);

-- BPMN drafts
create table bpmn_drafts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  version integer not null default 1,
  xml text not null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Interview questions
create table interview_questions (
  id uuid primary key default uuid_generate_v4(),
  bpmn_draft_id uuid not null references bpmn_drafts(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  bpmn_attribute text not null,
  question_text text not null,
  answer text,
  answered_at timestamptz
);

-- Row Level Security (enabled; policies added per feature)
alter table workspaces enable row level security;
alter table activities enable row level security;
alter table ports enable row level security;
alter table connections enable row level security;
alter table activity_roles enable row level security;
alter table bpmn_drafts enable row level security;
alter table interview_questions enable row level security;

-- RLS: workspaces — visible to creator and members
create policy "workspace owner access"
  on workspaces for all
  using (created_by = auth.uid());

-- RLS: activities — visible to owner and users with any role
create policy "activity owner access"
  on activities for all
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from activity_roles
      where activity_roles.activity_id = activities.id
        and activity_roles.user_id = auth.uid()
    )
  );

-- RLS: activity_roles — readable by activity owner
create policy "roles readable by owner"
  on activity_roles for select
  using (
    exists (
      select 1 from activities
      where activities.id = activity_roles.activity_id
        and activities.owner_id = auth.uid()
    )
  );

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger activities_updated_at
  before update on activities
  for each row execute function set_updated_at();
```

- [ ] **Step 2: Run migration in Supabase dashboard**

1. Open [supabase.com](https://supabase.com) → your project → SQL Editor
2. Paste the contents of `001_initial_schema.sql` and click **Run**
3. Expected: no errors; tables visible in Table Editor

- [ ] **Step 3: Note your Supabase credentials**

From Supabase dashboard → Settings → API:
- `Project URL` → save as `VITE_SUPABASE_URL` (frontend) and `SUPABASE_URL` (backend)
- `anon public key` → save as `VITE_SUPABASE_ANON_KEY` (frontend)
- `service_role secret key` → save as `SUPABASE_SERVICE_ROLE_KEY` (backend)

- [ ] **Step 4: Create env files**

Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

Create `backend/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
PORT=3000
```

(JWT secret is under Settings → API → JWT Secret in Supabase dashboard)

- [ ] **Step 5: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking
git add supabase/
git commit -m "chore: add initial Supabase schema migration"
```

---

## Task 3: Frontend types + Supabase client

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/lib/queryClient.ts`

- [ ] **Step 1: Write type tests**

Create `frontend/src/types/index.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Activity, Workspace, TriggerType } from './index'

describe('types', () => {
  it('TriggerType covers all variants', () => {
    const t: TriggerType = 'email'
    expectTypeOf(t).toMatchTypeOf<TriggerType>()
  })

  it('Activity has required fields', () => {
    expectTypeOf<Activity>().toHaveProperty('id')
    expectTypeOf<Activity>().toHaveProperty('parent_id')
    expectTypeOf<Activity>().toHaveProperty('node_type')
    expectTypeOf<Activity>().toHaveProperty('trigger_type')
  })

  it('NodeType covers all variants', () => {
    const n: NodeType = 'start_event'
    expectTypeOf(n).toMatchTypeOf<NodeType>()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/types/index.test.ts
```
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Create types**

Create `frontend/src/types/index.ts`:
```typescript
export type TriggerType = 'email' | 'schedule' | 'manual' | 'webhook' | 'file_drop'
export type ActivityStatus = 'draft' | 'ready_for_review' | 'reviewed'
export type NodeType = 'activity' | 'start_event' | 'end_event'
export type PortDirection = 'in' | 'out'
export type PermissionLevel = 'read' | 'edit' | 'delegate'

export interface Workspace {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface Activity {
  id: string
  workspace_id: string
  parent_id: string | null
  owner_id: string
  node_type: NodeType
  label: string
  trigger_type: TriggerType | null  // only set for start_event
  position_x: number
  position_y: number
  status: ActivityStatus
  updated_at: string
}

export interface Port {
  id: string
  activity_id: string
  direction: PortDirection
  file_types: string[]
  destination_types: string[]
  attributes: Array<{ name: string; type: string }>
}

export interface Connection {
  id: string
  source_port_id: string
  target_port_id: string
  label: string | null
  has_warning: boolean
}

export interface ActivityRole {
  activity_id: string
  user_id: string
  permission: PermissionLevel
}

// React Flow node data — wraps an Activity
export interface ActivityNodeData {
  activity: Activity
  hasChildren: boolean
  ownerColor?: string  // hex color from Supabase Auth metadata
  onLabelChange?: (id: string, newLabel: string) => void
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/types/index.test.ts
```
Expected: PASS

- [ ] **Step 5: Create Supabase client**

Create `frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Create TanStack Query client**

Create `frontend/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/types/ src/lib/
git commit -m "feat(frontend): add shared types and Supabase/Query clients"
```

---

## Task 4: Backend — database + auth modules

**Files:**
- Create: `backend/src/database/database.module.ts`
- Create: `backend/src/database/database.service.ts`
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.guard.ts`
- Create: `backend/src/auth/current-user.decorator.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write auth guard test**

Create `backend/src/auth/auth.guard.spec.ts`:
```typescript
import { AuthGuard } from './auth.guard'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js')

describe('AuthGuard', () => {
  let guard: AuthGuard

  beforeEach(() => {
    guard = new AuthGuard()
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn(),
      },
    })
  })

  it('throws UnauthorizedException when no bearer token', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('returns true when token is valid', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    })

    const mockReq: any = { headers: { authorization: 'Bearer valid-token' } }
    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
    } as unknown as ExecutionContext

    const result = await guard.canActivate(ctx)
    expect(result).toBe(true)
    expect(mockReq.user).toEqual(mockUser)
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- auth.guard
```
Expected: FAIL — `Cannot find module './auth.guard'`

- [ ] **Step 3: Create DatabaseService**

Create `backend/src/database/database.service.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class DatabaseService {
  private client: SupabaseClient

  constructor(private config: ConfigService) {
    this.client = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    )
  }

  get db(): SupabaseClient {
    return this.client
  }
}
```

Create `backend/src/database/database.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common'
import { DatabaseService } from './database.service'

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

- [ ] **Step 4: Create AuthGuard**

Create `backend/src/auth/auth.guard.ts`:
```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private config?: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader: string | undefined = request.headers['authorization']

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.slice(7)
    const supabaseUrl = this.config?.get('SUPABASE_URL') ?? process.env.SUPABASE_URL!
    const serviceKey = this.config?.get('SUPABASE_SERVICE_ROLE_KEY') ?? process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token')
    }

    request.user = data.user
    return true
  }
}
```

Create `backend/src/auth/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface AuthUser {
  id: string
  email: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
```

Create `backend/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { AuthGuard } from './auth.guard'

@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 5: Update AppModule**

Replace `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- auth.guard
```
Expected: PASS (2 tests)

- [ ] **Step 7: Enable global validation pipe in main.ts**

Replace `backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' })

  const port = process.env.PORT ?? 3000
  await (await app).listen(port)
  console.log(`Backend running on port ${port}`)
}
bootstrap()
```

- [ ] **Step 8: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
git add src/
git commit -m "feat(backend): add database service and auth guard"
```

---

## Task 5: Backend — workspaces module

**Files:**
- Create: `backend/src/workspaces/workspaces.module.ts`
- Create: `backend/src/workspaces/workspaces.service.ts`
- Create: `backend/src/workspaces/workspaces.controller.ts`
- Create: `backend/src/workspaces/workspaces.service.spec.ts`
- Create: `backend/src/workspaces/dto/create-workspace.dto.ts`

- [ ] **Step 1: Write service tests**

Create `backend/src/workspaces/workspaces.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { WorkspacesService } from './workspaces.service'
import { DatabaseService } from '../database/database.service'

const mockDb = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

describe('WorkspacesService', () => {
  let service: WorkspacesService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile()
    service = module.get(WorkspacesService)
    jest.clearAllMocks()
  })

  it('findAll returns workspaces for user', async () => {
    mockDb.eq.mockResolvedValueOnce({ data: [{ id: 'ws-1', name: 'Test' }], error: null })
    const result = await service.findAll('user-1')
    expect(result).toEqual([{ id: 'ws-1', name: 'Test' }])
    expect(mockDb.from).toHaveBeenCalledWith('workspaces')
    expect(mockDb.eq).toHaveBeenCalledWith('created_by', 'user-1')
  })

  it('create inserts workspace and returns it', async () => {
    const ws = { id: 'ws-2', name: 'New WS', created_by: 'user-1', created_at: '' }
    mockDb.single.mockResolvedValueOnce({ data: ws, error: null })
    const result = await service.create('user-1', 'New WS')
    expect(result).toEqual(ws)
    expect(mockDb.insert).toHaveBeenCalledWith({ name: 'New WS', created_by: 'user-1' })
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- workspaces.service
```
Expected: FAIL — `Cannot find module './workspaces.service'`

- [ ] **Step 3: Create DTO**

Create `backend/src/workspaces/dto/create-workspace.dto.ts`:
```typescript
import { IsString, MinLength } from 'class-validator'

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  name: string
}
```

- [ ] **Step 4: Create WorkspacesService**

Create `backend/src/workspaces/workspaces.service.ts`:
```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class WorkspacesService {
  constructor(private db: DatabaseService) {}

  async findAll(userId: string) {
    const { data, error } = await this.db.db
      .from('workspaces')
      .select('*')
      .eq('created_by', userId)
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async create(userId: string, name: string) {
    const { data, error } = await this.db.db
      .from('workspaces')
      .insert({ name, created_by: userId })
      .select()
      .single()
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }
}
```

- [ ] **Step 5: Create WorkspacesController**

Create `backend/src/workspaces/workspaces.controller.ts`:
```typescript
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { WorkspacesService } from './workspaces.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser, AuthUser } from '../auth/current-user.decorator'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(user.id, dto.name)
  }
}
```

Create `backend/src/workspaces/workspaces.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { WorkspacesController } from './workspaces.controller'
import { WorkspacesService } from './workspaces.service'

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
```

- [ ] **Step 6: Register in AppModule**

Add `WorkspacesModule` to `backend/src/app.module.ts` imports:
```typescript
import { WorkspacesModule } from './workspaces/workspaces.module'
// ...
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  DatabaseModule,
  AuthModule,
  WorkspacesModule,  // add this
],
```

- [ ] **Step 7: Run tests — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- workspaces.service
```
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
git add src/workspaces/ src/app.module.ts
git commit -m "feat(backend): add workspaces module (GET, POST)"
```

---

## Task 6: Backend — activities module

**Files:**
- Create: `backend/src/activities/activities.module.ts`
- Create: `backend/src/activities/activities.service.ts`
- Create: `backend/src/activities/activities.controller.ts`
- Create: `backend/src/activities/activities.service.spec.ts`
- Create: `backend/src/activities/dto/create-activity.dto.ts`
- Create: `backend/src/activities/dto/upsert-activity.dto.ts`

- [ ] **Step 1: Write service tests**

Create `backend/src/activities/activities.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { ActivitiesService } from './activities.service'
import { DatabaseService } from '../database/database.service'

const mockDb = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

describe('ActivitiesService', () => {
  let service: ActivitiesService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile()
    service = module.get(ActivitiesService)
    jest.clearAllMocks()
  })

  it('findByParent returns top-level activities when parentId is null', async () => {
    mockDb.is.mockResolvedValueOnce({ data: [{ id: 'act-1' }], error: null })
    const result = await service.findByParent('ws-1', null)
    expect(result).toEqual([{ id: 'act-1' }])
    expect(mockDb.is).toHaveBeenCalledWith('parent_id', null)
  })

  it('findByParent returns children when parentId is given', async () => {
    mockDb.eq.mockResolvedValueOnce({ data: [{ id: 'act-2' }], error: null })
    const result = await service.findByParent('ws-1', 'act-1')
    expect(result).toEqual([{ id: 'act-2' }])
  })

  it('upsert creates new activity', async () => {
    const act = { id: 'act-3', label: 'Test', workspace_id: 'ws-1' }
    mockDb.single.mockResolvedValueOnce({ data: act, error: null })
    const result = await service.upsert('ws-1', 'user-1', {
      label: 'Test',
      trigger_type: 'manual',
      position_x: 0,
      position_y: 0,
      parent_id: null,
    })
    expect(result).toEqual(act)
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- activities.service
```
Expected: FAIL

- [ ] **Step 3: Create DTOs**

Create `backend/src/activities/dto/create-activity.dto.ts`:
```typescript
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateActivityDto {
  @IsString()
  label: string

  @IsEnum(['email', 'schedule', 'manual', 'webhook', 'file_drop'])
  trigger_type: string

  @IsNumber()
  position_x: number

  @IsNumber()
  position_y: number

  @IsOptional()
  @IsUUID()
  parent_id: string | null
}
```

Create `backend/src/activities/dto/upsert-activity.dto.ts`:
```typescript
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertActivityDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  label: string

  @IsEnum(['email', 'schedule', 'manual', 'webhook', 'file_drop'])
  trigger_type: string

  @IsNumber()
  position_x: number

  @IsNumber()
  position_y: number

  @IsOptional()
  @IsUUID()
  parent_id: string | null
}
```

- [ ] **Step 4: Create ActivitiesService**

Create `backend/src/activities/activities.service.ts`:
```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { UpsertActivityDto } from './dto/upsert-activity.dto'

@Injectable()
export class ActivitiesService {
  constructor(private db: DatabaseService) {}

  async findByParent(workspaceId: string, parentId: string | null) {
    let query = this.db.db
      .from('activities')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', parentId)
    }

    const { data, error } = await query
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async upsert(workspaceId: string, ownerId: string, dto: UpsertActivityDto) {
    const payload: any = {
      workspace_id: workspaceId,
      owner_id: ownerId,
      label: dto.label,
      trigger_type: dto.trigger_type,
      position_x: dto.position_x,
      position_y: dto.position_y,
      parent_id: dto.parent_id ?? null,
    }

    if (dto.id) {
      // Update existing
      const { data, error } = await this.db.db
        .from('activities')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', dto.id)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    } else {
      // Insert new
      const { data, error } = await this.db.db
        .from('activities')
        .insert(payload)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    }
  }

  async hasChildren(activityId: string): Promise<boolean> {
    const { count, error } = await this.db.db
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', activityId)
    if (error) throw new InternalServerErrorException(error.message)
    return (count ?? 0) > 0
  }
}
```

- [ ] **Step 5: Create ActivitiesController**

Create `backend/src/activities/activities.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ActivitiesService } from './activities.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser, AuthUser } from '../auth/current-user.decorator'
import { UpsertActivityDto } from './dto/upsert-activity.dto'

@Controller('workspaces/:workspaceId/activities')
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private service: ActivitiesService) {}

  // GET /workspaces/:workspaceId/activities?parentId=<uuid>|null
  @Get()
  findByParent(
    @Param('workspaceId') workspaceId: string,
    @Query('parentId') parentId?: string,
  ) {
    const parent = parentId === 'null' || !parentId ? null : parentId
    return this.service.findByParent(workspaceId, parent)
  }

  // POST /workspaces/:workspaceId/activities  (create or update)
  @Post()
  upsert(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertActivityDto,
  ) {
    return this.service.upsert(workspaceId, user.id, dto)
  }
}
```

Create `backend/src/activities/activities.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { ActivitiesController } from './activities.controller'
import { ActivitiesService } from './activities.service'

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
```

- [ ] **Step 6: Register in AppModule**

Add to `backend/src/app.module.ts`:
```typescript
import { ActivitiesModule } from './activities/activities.module'
// add to imports array:
ActivitiesModule,
```

- [ ] **Step 7: Run tests — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test -- activities.service
```
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
git add src/activities/ src/app.module.ts
git commit -m "feat(backend): add activities module (GET by parent, POST upsert)"
```

---

## Task 7: Frontend — auth pages + routing

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/WorkspaceListPage.tsx`
- Create: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Write LoginPage test**

Create `frontend/src/pages/LoginPage.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginPage } from './LoginPage'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument()
  })

  it('calls signInWithPassword on submit', async () => {
    const { supabase } = await import('../lib/supabase')
    render(<LoginPage />)
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/passwort/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /anmelden/i }))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/pages/LoginPage.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create LoginPage**

Create `frontend/src/pages/LoginPage.tsx`:
```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <form onSubmit={handleSubmit} className="bg-slate-900 p-8 rounded-lg w-full max-w-sm space-y-4 border border-slate-700">
        <h1 className="text-xl font-bold text-white">Way of Working</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-sm text-slate-300 mb-1">E-Mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-slate-300 mb-1">Passwort</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Wird angemeldet…' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/pages/LoginPage.test.tsx
```
Expected: PASS

- [ ] **Step 5: Create AppShell**

Create `frontend/src/components/layout/AppShell.tsx`:
```tsx
import { supabase } from '../../lib/supabase'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-sm tracking-wide">Way of Working</span>
        <button
          onClick={handleSignOut}
          className="text-slate-400 hover:text-white text-sm"
        >
          Abmelden
        </button>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 6: Create WorkspaceListPage (placeholder)**

Create `frontend/src/pages/WorkspaceListPage.tsx`:
```tsx
import { AppShell } from '../components/layout/AppShell'

export function WorkspaceListPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Workspaces</h2>
        <p className="text-slate-400">Wird in Task 8 implementiert.</p>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 7: Wire up routing in App.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { queryClient } from './lib/queryClient'
import { LoginPage } from './pages/LoginPage'
import { WorkspaceListPage } from './pages/WorkspaceListPage'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading

  return (
    <QueryClientProvider client={queryClient}>
      {session ? <WorkspaceListPage /> : <LoginPage />}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 8: Update main.tsx**

Replace `frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 9: Verify in browser**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npm run dev
```
Open http://localhost:5173 — expect: Login form appears.

- [ ] **Step 10: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/
git commit -m "feat(frontend): add auth flow, login page and app shell"
```

---

## Task 8: Frontend — workspace list page + API hooks

**Files:**
- Create: `frontend/src/api/workspaces.ts`
- Modify: `frontend/src/pages/WorkspaceListPage.tsx`

- [ ] **Step 1: Write API hook test**

Create `frontend/src/api/workspaces.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useWorkspaces } from './workspaces'

const mockFetch = vi.fn()
global.fetch = mockFetch

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)

describe('useWorkspaces', () => {
  it('fetches workspaces from API', async () => {
    const mockToken = 'test-token'
    vi.mock('../lib/supabase', () => ({
      supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: mockToken } } }) } },
    }))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'ws-1', name: 'Test WS' }],
    })

    const { result } = renderHook(() => useWorkspaces(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'ws-1', name: 'Test WS' }])
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/api/workspaces.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create workspaces API hooks**

Create `frontend/src/api/workspaces.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Workspace } from '../types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Not authenticated')
  return data.session.access_token
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => apiFetch('/workspaces'),
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export { apiFetch }
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/api/workspaces.test.ts
```
Expected: PASS

- [ ] **Step 5: Build WorkspaceListPage**

Replace `frontend/src/pages/WorkspaceListPage.tsx`:
```tsx
import { useState } from 'react'
import { useCanvasStore } from '../store/canvasStore'
import { useWorkspaces, useCreateWorkspace } from '../api/workspaces'
import { AppShell } from '../components/layout/AppShell'

export function WorkspaceListPage() {
  const { data: workspaces, isLoading } = useWorkspaces()
  const createMutation = useCreateWorkspace()
  const [newName, setNewName] = useState('')
  const navigateTo = useCanvasStore(s => s.navigateTo)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createMutation.mutateAsync(newName.trim())
    setNewName('')
  }

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Workspaces</h2>

        <form onSubmit={handleCreate} className="flex gap-2 mb-6">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Neuer Workspace…"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Erstellen
          </button>
        </form>

        {isLoading && <p className="text-slate-400">Wird geladen…</p>}

        <ul className="space-y-2">
          {workspaces?.map(ws => (
            <li key={ws.id}>
              <button
                onClick={() => navigateTo(ws.id, ws.name, null)}
                className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded px-4 py-3 text-white text-sm transition-colors"
              >
                {ws.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/api/workspaces.ts src/pages/WorkspaceListPage.tsx
git commit -m "feat(frontend): workspace list page with create and navigate"
```

---

## Task 9: Frontend — Zustand canvas store + routing

**Files:**
- Create: `frontend/src/store/canvasStore.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/CanvasPage.tsx`

- [ ] **Step 1: Write store test**

Create `frontend/src/store/canvasStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from './canvasStore'

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({ breadcrumb: [], workspaceId: null, parentActivityId: null })
  })

  it('navigateTo sets workspaceId and adds breadcrumb entry', () => {
    useCanvasStore.getState().navigateTo('ws-1', 'My WS', null)
    const state = useCanvasStore.getState()
    expect(state.workspaceId).toBe('ws-1')
    expect(state.parentActivityId).toBeNull()
    expect(state.breadcrumb).toEqual([{ label: 'My WS', workspaceId: 'ws-1', parentActivityId: null }])
  })

  it('drillInto appends to breadcrumb', () => {
    useCanvasStore.getState().navigateTo('ws-1', 'My WS', null)
    useCanvasStore.getState().drillInto('act-1', 'Activity A')
    const state = useCanvasStore.getState()
    expect(state.parentActivityId).toBe('act-1')
    expect(state.breadcrumb).toHaveLength(2)
    expect(state.breadcrumb[1].label).toBe('Activity A')
  })

  it('navigateToBreadcrumb truncates path', () => {
    useCanvasStore.getState().navigateTo('ws-1', 'My WS', null)
    useCanvasStore.getState().drillInto('act-1', 'Activity A')
    useCanvasStore.getState().drillInto('act-2', 'Activity B')
    useCanvasStore.getState().navigateToBreadcrumb(0)
    const state = useCanvasStore.getState()
    expect(state.breadcrumb).toHaveLength(1)
    expect(state.parentActivityId).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/store/canvasStore.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create canvasStore**

Create `frontend/src/store/canvasStore.ts`:
```typescript
import { create } from 'zustand'

interface BreadcrumbEntry {
  label: string
  workspaceId: string
  parentActivityId: string | null
}

interface CanvasState {
  workspaceId: string | null
  parentActivityId: string | null
  breadcrumb: BreadcrumbEntry[]
  navigateTo: (workspaceId: string, label: string, parentActivityId: string | null) => void
  drillInto: (activityId: string, label: string) => void
  navigateToBreadcrumb: (index: number) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  workspaceId: null,
  parentActivityId: null,
  breadcrumb: [],

  navigateTo: (workspaceId, label, parentActivityId) => {
    set({
      workspaceId,
      parentActivityId,
      breadcrumb: [{ label, workspaceId, parentActivityId }],
    })
  },

  drillInto: (activityId, label) => {
    const { workspaceId, breadcrumb } = get()
    if (!workspaceId) return
    set({
      parentActivityId: activityId,
      breadcrumb: [...breadcrumb, { label, workspaceId, parentActivityId: activityId }],
    })
  },

  navigateToBreadcrumb: (index) => {
    const { breadcrumb } = get()
    const entry = breadcrumb[index]
    if (!entry) return
    set({
      workspaceId: entry.workspaceId,
      parentActivityId: entry.parentActivityId,
      breadcrumb: breadcrumb.slice(0, index + 1),
    })
  },
}))

// Convenience re-export matching WorkspaceListPage usage
export function useNavigate() {
  return {
    navigateTo: useCanvasStore.getState().navigateTo,
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/store/canvasStore.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Create CanvasPage (placeholder)**

Create `frontend/src/pages/CanvasPage.tsx`:
```tsx
import { AppShell } from '../components/layout/AppShell'
import { useCanvasStore } from '../store/canvasStore'
import { Breadcrumb } from '../components/canvas/Breadcrumb'

export function CanvasPage() {
  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <Breadcrumb />
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Canvas wird in Task 10 implementiert
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 6: Create Breadcrumb component**

Create `frontend/src/components/canvas/Breadcrumb.tsx`:
```tsx
import { useCanvasStore } from '../../store/canvasStore'

export function Breadcrumb() {
  const { breadcrumb, navigateToBreadcrumb } = useCanvasStore()

  if (breadcrumb.length === 0) return null

  return (
    <nav className="flex items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-700 text-sm">
      {breadcrumb.map((entry, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-600">›</span>}
          <button
            onClick={() => navigateToBreadcrumb(i)}
            className={i === breadcrumb.length - 1
              ? 'text-white font-medium cursor-default'
              : 'text-slate-400 hover:text-white transition-colors'
            }
          >
            {entry.label}
          </button>
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 7: Wire CanvasPage into App.tsx**

Replace `frontend/src/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { queryClient } from './lib/queryClient'
import { LoginPage } from './pages/LoginPage'
import { WorkspaceListPage } from './pages/WorkspaceListPage'
import { CanvasPage } from './pages/CanvasPage'
import { useCanvasStore } from './store/canvasStore'

function Router() {
  const { workspaceId } = useCanvasStore()
  return workspaceId ? <CanvasPage /> : <WorkspaceListPage />
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <QueryClientProvider client={queryClient}>
      {session ? <Router /> : <LoginPage />}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 8: Run all frontend tests**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run
```
Expected: all PASS

- [ ] **Step 9: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/
git commit -m "feat(frontend): canvas store with drill-down navigation and breadcrumb"
```

---

## Task 10: Frontend — activities API hooks

**Files:**
- Create: `frontend/src/api/activities.ts`

- [ ] **Step 1: Write hook test**

Create `frontend/src/api/activities.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useActivities } from './activities'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } },
}))

const wrapper = ({ children }: any) =>
  createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)

describe('useActivities', () => {
  it('fetches activities by parentId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'act-1', label: 'Test' }],
    })

    const { result } = renderHook(() => useActivities('ws-1', null), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'act-1', label: 'Test' }])
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/api/activities.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create activities API hooks**

Create `frontend/src/api/activities.ts`:
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './workspaces'
import type { Activity } from '../types'

interface UpsertActivityInput {
  id?: string
  label: string
  trigger_type: string
  position_x: number
  position_y: number
  parent_id: string | null
}

export function useActivities(workspaceId: string | null, parentId: string | null) {
  const parentParam = parentId ?? 'null'
  return useQuery<Activity[]>({
    queryKey: ['activities', workspaceId, parentId],
    queryFn: () => apiFetch(`/workspaces/${workspaceId}/activities?parentId=${parentParam}`),
    enabled: !!workspaceId,
  })
}

export function useUpsertActivity(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertActivityInput) =>
      apiFetch<Activity>(`/workspaces/${workspaceId}/activities`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['activities', workspaceId, vars.parent_id] })
    },
  })
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/api/activities.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/api/activities.ts
git commit -m "feat(frontend): activities API hooks (useActivities, useUpsertActivity)"
```

---

## Task 11: Frontend — ActivityNode component

**Files:**
- Create: `frontend/src/components/canvas/TriggerIcon.tsx`
- Create: `frontend/src/components/canvas/SubprocessMarker.tsx`
- Create: `frontend/src/components/canvas/ActivityNode.tsx`

- [ ] **Step 1: Write ActivityNode render test**

Create `frontend/src/components/canvas/ActivityNode.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActivityNode } from './ActivityNode'
import type { ActivityNodeData } from '../../types'

const baseData: ActivityNodeData = {
  activity: {
    id: 'act-1',
    workspace_id: 'ws-1',
    parent_id: null,
    owner_id: 'u-1',
    label: 'Rechnungen prüfen',
    trigger_type: 'email',
    position_x: 0,
    position_y: 0,
    status: 'draft',
    updated_at: '',
  },
  hasChildren: false,
}

describe('ActivityNode', () => {
  it('renders activity label', () => {
    render(<ActivityNode data={baseData} selected={false} />)
    expect(screen.getByText('Rechnungen prüfen')).toBeInTheDocument()
  })

  it('shows filled subprocess marker when hasChildren is true', () => {
    render(<ActivityNode data={{ ...baseData, hasChildren: true }} selected={false} />)
    // Subprocess marker with + icon
    expect(screen.getByTitle('Subprozess öffnen')).toBeInTheDocument()
  })

  it('shows empty subprocess marker when hasChildren is false', () => {
    render(<ActivityNode data={baseData} selected={false} />)
    expect(screen.getByTitle('Subprozess anlegen')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/components/canvas/ActivityNode.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create TriggerIcon**

Create `frontend/src/components/canvas/TriggerIcon.tsx`:
```tsx
import type { TriggerType } from '../../types'

interface Props { type: TriggerType }

const configs: Record<TriggerType, { bg: string; border: string; path: JSX.Element }> = {
  email: {
    bg: '#1e3a5f', border: '#3b82f6',
    path: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>,
  },
  schedule: {
    bg: '#78350f', border: '#f59e0b',
    path: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></>,
  },
  manual: {
    bg: '#1a3d2e', border: '#34d399',
    path: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></>,
  },
  webhook: {
    bg: '#2d1a3d', border: '#a855f7',
    path: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  },
  file_drop: {
    bg: '#1c2a3a', border: '#64748b',
    path: <><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/></>,
  },
}

export function TriggerIcon({ type }: Props) {
  const { bg, border, path } = configs[type]
  return (
    <div
      style={{ background: bg, border: `2px solid ${border}`, borderRadius: '50%', width: 28, height: 28 }}
      className="absolute -top-3 -left-3 flex items-center justify-center z-10"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={border} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Create SubprocessMarker**

Create `frontend/src/components/canvas/SubprocessMarker.tsx`:
```tsx
interface Props {
  hasChildren: boolean
  onClick: (e: React.MouseEvent) => void
}

export function SubprocessMarker({ hasChildren, onClick }: Props) {
  if (hasChildren) {
    return (
      <div
        title="Subprozess öffnen"
        onClick={onClick}
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: 18, height: 18, borderRadius: 3,
          background: '#1e3a5f', border: '1.5px solid #3b82f6',
          boxShadow: '0 0 6px #3b82f666',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
    )
  }

  return (
    <div
      title="Subprozess anlegen"
      onClick={onClick}
      className="flex items-center justify-center cursor-pointer transition-opacity hover:opacity-75"
      style={{
        width: 18, height: 18, borderRadius: 3,
        background: 'transparent', border: '1.5px solid #2a3a4d', opacity: 0.4,
      }}
    />
  )
}
```

- [ ] **Step 5: Create ActivityNode**

Create `frontend/src/components/canvas/ActivityNode.tsx`:
```tsx
import { useCallback, useState } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { TriggerIcon } from './TriggerIcon'
import { SubprocessMarker } from './SubprocessMarker'
import { useCanvasStore } from '../../store/canvasStore'
import type { ActivityNodeData } from '../../types'

export function ActivityNode({ data, selected }: NodeProps<ActivityNodeData>) {
  const { activity, hasChildren } = data
  const { drillInto } = useCanvasStore()
  const [editing, setEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(activity.label)

  const handleDoubleClick = useCallback(() => {
    setDraftLabel(activity.label)
    setEditing(true)
  }, [activity.label])

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Auto-save is handled by parent via onLabelChange prop (added in Task 12)
      setEditing(false)
    }
    if (e.key === 'Escape') {
      setDraftLabel(activity.label)
      setEditing(false)
    }
  }, [activity.label])

  const handleSubprocessClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    drillInto(activity.id, activity.label)
  }, [activity.id, activity.label, drillInto])

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="relative"
      style={{
        background: '#1e293b',
        border: `2px solid ${selected ? '#60a5fa' : '#3b82f6'}`,
        borderRadius: 8,
        padding: '8px 16px 10px',
        minWidth: 152,
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <TriggerIcon type={activity.trigger_type} />

      <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Aktivität
      </div>

      {editing ? (
        <input
          autoFocus
          value={draftLabel}
          onChange={e => setDraftLabel(e.target.value)}
          onKeyDown={handleLabelKeyDown}
          onBlur={() => setEditing(false)}
          className="mt-0.5 w-full bg-slate-950 border border-green-500 rounded px-1 text-white text-sm font-semibold text-center outline-none"
          data-label-input={activity.id}
        />
      ) : (
        <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.88rem', marginTop: 2 }}>
          {activity.label || <span style={{ color: '#475569', fontStyle: 'italic' }}>Kein Name</span>}
        </div>
      )}

      <div className="flex justify-center mt-1.5">
        <SubprocessMarker hasChildren={hasChildren} onClick={handleSubprocessClick} />
      </div>

      <Handle type="target" position={Position.Left} style={{ background: '#0f172a', border: '2px solid #3b82f6', width: 14, height: 14 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#0f172a', border: '2px solid #34d399', width: 14, height: 14 }} />
    </div>
  )
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/components/canvas/ActivityNode.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/components/canvas/
git commit -m "feat(frontend): ActivityNode with trigger icon and subprocess marker"
```

---

## Task 12: Frontend — WorkflowCanvas with React Flow

**Files:**
- Create: `frontend/src/components/canvas/CreateActivityForm.tsx`
- Create: `frontend/src/components/canvas/WorkflowCanvas.tsx`
- Modify: `frontend/src/pages/CanvasPage.tsx`

- [ ] **Step 1: Write WorkflowCanvas test**

Create `frontend/src/components/canvas/WorkflowCanvas.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { WorkflowCanvas } from './WorkflowCanvas'

vi.mock('../../api/activities', () => ({
  useActivities: () => ({ data: [], isLoading: false }),
  useUpsertActivity: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../store/canvasStore', () => ({
  useCanvasStore: () => ({
    workspaceId: 'ws-1',
    parentActivityId: null,
    breadcrumb: [],
    drillInto: vi.fn(),
    navigateToBreadcrumb: vi.fn(),
  }),
}))

const wrapper = ({ children }: any) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children)

describe('WorkflowCanvas', () => {
  it('renders without crashing', () => {
    render(<WorkflowCanvas />, { wrapper })
    // React Flow canvas renders
    expect(document.querySelector('.react-flow')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/components/canvas/WorkflowCanvas.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create CreateActivityForm**

Create `frontend/src/components/canvas/CreateActivityForm.tsx`:
```tsx
import { useState } from 'react'
import type { TriggerType } from '../../types'

interface Props {
  position: { x: number; y: number }
  onConfirm: (label: string, triggerType: TriggerType) => void
  onCancel: () => void
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'manual', label: 'Manuell' },
  { value: 'email', label: 'E-Mail' },
  { value: 'schedule', label: 'Zeitplan' },
  { value: 'webhook', label: 'Webhook / API' },
  { value: 'file_drop', label: 'Ablage / Server' },
]

export function CreateActivityForm({ position, onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('manual')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    onConfirm(label.trim(), triggerType)
  }

  return (
    <div
      style={{ position: 'absolute', left: position.x, top: position.y, zIndex: 100 }}
      className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl w-64"
      onMouseDown={e => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Name der Aktivität</label>
          <input
            autoFocus
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="z.B. Rechnungen prüfen"
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Trigger</label>
          <select
            value={triggerType}
            onChange={e => setTriggerType(e.target.value as TriggerType)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-white text-sm"
          >
            {TRIGGER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-sm font-medium">
            Erstellen
          </button>
          <button type="button" onClick={onCancel} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-3 py-1.5 text-sm">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Create WorkflowCanvas**

Create `frontend/src/components/canvas/WorkflowCanvas.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ActivityNode } from './ActivityNode'
import { CreateActivityForm } from './CreateActivityForm'
import { useCanvasStore } from '../../store/canvasStore'
import { useActivities, useUpsertActivity } from '../../api/activities'
import type { Activity, ActivityNodeData, TriggerType } from '../../types'

const nodeTypes = { activity: ActivityNode }

function activityToNode(activity: Activity, hasChildren: boolean): Node<ActivityNodeData> {
  return {
    id: activity.id,
    type: 'activity',
    position: { x: activity.position_x, y: activity.position_y },
    data: { activity, hasChildren },
  }
}

export function WorkflowCanvas() {
  const { workspaceId, parentActivityId } = useCanvasStore()
  const { data: activities = [] } = useActivities(workspaceId, parentActivityId)
  const upsert = useUpsertActivity(workspaceId ?? '')

  const initialNodes = useMemo(
    () => activities.map(a => activityToNode(a, false)),
    [activities],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [createForm, setCreateForm] = useState<{ x: number; y: number } | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges],
  )

  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.react-flow__node')) return
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setCreateForm({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }, [])

  async function handleCreateActivity(label: string, triggerType: TriggerType) {
    if (!workspaceId || !createForm) return
    await upsert.mutateAsync({
      label,
      trigger_type: triggerType,
      position_x: createForm.x,
      position_y: createForm.y,
      parent_id: parentActivityId,
    })
    setCreateForm(null)
  }

  // Sync nodes when activities data changes
  useEffect(() => {
    setNodes(activities.map(a => activityToNode(a, false)))
  }, [activities])

  return (
    <div className="w-full h-full relative" style={{ background: '#0f172a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDoubleClick={onPaneDoubleClick}
        fitView
        deleteKeyCode="Delete"
        style={{ background: '#0f172a' }}
      >
        <Background color="#1e293b" gap={24} />
        <Controls />
        <MiniMap nodeColor="#3b82f6" style={{ background: '#1e293b' }} />
      </ReactFlow>

      {createForm && (
        <CreateActivityForm
          position={createForm}
          onConfirm={handleCreateActivity}
          onCancel={() => setCreateForm(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Update CanvasPage to use WorkflowCanvas**

Replace `frontend/src/pages/CanvasPage.tsx`:
```tsx
import { AppShell } from '../components/layout/AppShell'
import { Breadcrumb } from '../components/canvas/Breadcrumb'
import { WorkflowCanvas } from '../components/canvas/WorkflowCanvas'

export function CanvasPage() {
  return (
    <AppShell>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
        <Breadcrumb />
        <div className="flex-1">
          <WorkflowCanvas />
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/components/canvas/WorkflowCanvas.test.tsx
```
Expected: PASS

- [ ] **Step 7: Verify manually**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend && npm run dev
# Also start backend:
cd C:/Users/ms/workspace/wayofworking/backend && npm run start:dev
```

1. Log in → click a workspace → canvas opens
2. Double-click empty canvas → CreateActivityForm appears
3. Enter label + trigger → click Erstellen → node appears
4. Double-click node label → inline edit activates

- [ ] **Step 8: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/
git commit -m "feat(frontend): WorkflowCanvas with React Flow, create activity form"
```

---

## Task 13: Frontend — auto-save node positions + label edits

**Files:**
- Modify: `frontend/src/components/canvas/WorkflowCanvas.tsx`
- Modify: `frontend/src/components/canvas/ActivityNode.tsx`

- [ ] **Step 1: Write auto-save test**

Create `frontend/src/components/canvas/auto-save.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// Unit test for the debounce helper we'll use for auto-save
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

describe('debounce', () => {
  it('calls function after delay', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced('a')
    debounced('b')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test — expect pass**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run src/components/canvas/auto-save.test.ts
```
Expected: PASS

- [ ] **Step 3: Add onNodeDragStop auto-save to WorkflowCanvas**

In `frontend/src/components/canvas/WorkflowCanvas.tsx`, add after the existing `onConnect` callback:

```tsx
const onNodeDragStop = useCallback(
  async (_event: React.MouseEvent, node: Node<ActivityNodeData>) => {
    if (!workspaceId) return
    await upsert.mutateAsync({
      id: node.data.activity.id,
      label: node.data.activity.label,
      trigger_type: node.data.activity.trigger_type,
      position_x: node.position.x,
      position_y: node.position.y,
      parent_id: parentActivityId,
    })
  },
  [workspaceId, parentActivityId, upsert],
)
```

And add `onNodeDragStop={onNodeDragStop}` to the `<ReactFlow>` element.

- [ ] **Step 4: Add label auto-save callback to ActivityNode**

Update `ActivityNode.tsx` to accept and call `onLabelChange` — add `onLabelChange` to `ActivityNodeData`:

In `frontend/src/types/index.ts`, update `ActivityNodeData`:
```typescript
export interface ActivityNodeData {
  activity: Activity
  hasChildren: boolean
  onLabelChange?: (id: string, newLabel: string) => void
}
```

In `ActivityNode.tsx`, update `handleLabelKeyDown`:
```tsx
const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    setEditing(false)
    data.onLabelChange?.(activity.id, draftLabel)
  }
  if (e.key === 'Escape') {
    setDraftLabel(activity.label)
    setEditing(false)
  }
}, [activity.id, draftLabel, data])
```

In `WorkflowCanvas.tsx`, add label change handler and pass it in node data:
```tsx
const handleLabelChange = useCallback(async (activityId: string, newLabel: string) => {
  const activity = activities.find(a => a.id === activityId)
  if (!activity || !workspaceId) return
  await upsert.mutateAsync({
    id: activityId,
    label: newLabel,
    trigger_type: activity.trigger_type,
    position_x: activity.position_x,
    position_y: activity.position_y,
    parent_id: parentActivityId,
  })
}, [activities, workspaceId, parentActivityId, upsert])

// In useMemo where nodes are built:
setNodes(activities.map(a => activityToNode(a, false, handleLabelChange)))
```

Update `activityToNode` signature:
```tsx
function activityToNode(
  activity: Activity,
  hasChildren: boolean,
  onLabelChange?: (id: string, label: string) => void,
): Node<ActivityNodeData> {
  return {
    id: activity.id,
    type: 'activity',
    position: { x: activity.position_x, y: activity.position_y },
    data: { activity, hasChildren, onLabelChange },
  }
}
```

- [ ] **Step 5: Run all tests**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run
```
Expected: all PASS

- [ ] **Step 6: Manual verification**

1. Drag a node → position saves (check Supabase table)
2. Double-click label → edit → press Enter → label saves

- [ ] **Step 7: Commit**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
git add src/
git commit -m "feat(frontend): auto-save node positions and label edits"
```

---

## Task 14: Run all tests + deploy check

- [ ] **Step 1: Run all backend tests**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm test
```
Expected: all PASS (auth guard, workspaces service, activities service)

- [ ] **Step 2: Run all frontend tests**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npx vitest run
```
Expected: all PASS

- [ ] **Step 3: Backend build check**

```bash
cd C:/Users/ms/workspace/wayofworking/backend
npm run build
```
Expected: `dist/` directory created, no TypeScript errors

- [ ] **Step 4: Frontend build check**

```bash
cd C:/Users/ms/workspace/wayofworking/frontend
npm run build
```
Expected: `dist/` directory created, no TypeScript errors

- [ ] **Step 5: Final commit + push**

```bash
cd C:/Users/ms/workspace/wayofworking
git add -A
git status  # verify nothing sensitive is staged
git commit -m "feat: Plan 1 complete — foundation and activity canvas"
git push origin feat/initial-design-spec
```

---

## What Plan 2 will cover

Once Plan 1 is merged, the next plan implements:

- **Ports** — input/output per activity, file type badges, destination icons
- **Connections** — port-to-port edges, edge label editing (OK/Rejected)
- **Compatibility checking** — warning triangle when port attributes mismatch
- **Excel import** — upload `.xlsx`, parse header row, populate port attributes

## What Plans 3–5 will cover

- **Plan 3:** Permissions & scope (activity_roles, dimmed foreign nodes, delegation)
- **Plan 4:** AI suggestions (LLM integration, suggestion panel)
- **Plan 5:** BPMN generation & interview engine (bpmn.js viewer/editor, gateway inference, interview questions)
