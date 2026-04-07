# Task 4: Backend — CanvasEdges-Modul

**Files:**
- Create: `backend/src/canvas-edges/dto/upsert-canvas-edge.dto.ts`
- Create: `backend/src/canvas-edges/canvas-edges.service.ts`
- Create: `backend/src/canvas-edges/canvas-edges.service.spec.ts`
- Create: `backend/src/canvas-edges/canvas-edges.controller.ts`
- Create: `backend/src/canvas-edges/canvas-edges.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Failing tests schreiben**

`backend/src/canvas-edges/canvas-edges.service.spec.ts` erstellen:

```typescript
import { Test } from '@nestjs/testing'
import { CanvasEdgesService } from './canvas-edges.service'
import { DatabaseService } from '../database/database.service'

const mockDb = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

describe('CanvasEdgesService', () => {
  let service: CanvasEdgesService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CanvasEdgesService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile()
    service = module.get(CanvasEdgesService)
    jest.clearAllMocks()
  })

  it('findByParent returns edges for workspace with null parent', async () => {
    mockDb.is.mockResolvedValueOnce({ data: [{ id: 'edge-1' }], error: null })
    const result = await service.findByParent('ws-1', null)
    expect(result).toEqual([{ id: 'edge-1' }])
    expect(mockDb.is).toHaveBeenCalledWith('parent_activity_id', null)
  })

  it('upsert creates new edge', async () => {
    const edge = { id: 'edge-2', from_node_id: 'act-1', to_node_id: 'obj-1' }
    mockDb.single.mockResolvedValueOnce({ data: edge, error: null })
    const result = await service.upsert('ws-1', {
      from_node_type: 'activity',
      from_node_id: 'act-1',
      to_node_type: 'canvas_object',
      to_node_id: 'obj-1',
      parent_activity_id: null,
    })
    expect(result).toEqual(edge)
  })

  it('deleteEdge deletes by id', async () => {
    mockDb.eq.mockResolvedValueOnce({ error: null })
    await expect(service.deleteEdge('edge-1')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd backend && npm test -- --testPathPattern=canvas-edges.service
```

Erwartet: FAIL — Modul existiert nicht.

- [ ] **Step 3: DTO erstellen**

`backend/src/canvas-edges/dto/upsert-canvas-edge.dto.ts`:

```typescript
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertCanvasEdgeDto {
  @IsEnum(['activity', 'canvas_object'])
  from_node_type: string

  @IsUUID()
  from_node_id: string

  @IsEnum(['activity', 'canvas_object'])
  to_node_type: string

  @IsUUID()
  to_node_id: string

  @IsOptional()
  @IsUUID()
  parent_activity_id: string | null

  @IsOptional()
  @IsString()
  label?: string | null
}
```

- [ ] **Step 4: Service erstellen**

`backend/src/canvas-edges/canvas-edges.service.ts`:

```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { UpsertCanvasEdgeDto } from './dto/upsert-canvas-edge.dto'

@Injectable()
export class CanvasEdgesService {
  constructor(private db: DatabaseService) {}

  async findByParent(workspaceId: string, parentId: string | null) {
    let query = this.db.db
      .from('canvas_edges')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (parentId === null) {
      query = query.is('parent_activity_id', null)
    } else {
      query = query.eq('parent_activity_id', parentId)
    }

    const { data, error } = await query
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async upsert(workspaceId: string, dto: UpsertCanvasEdgeDto) {
    const payload = {
      workspace_id: workspaceId,
      from_node_type: dto.from_node_type,
      from_node_id: dto.from_node_id,
      to_node_type: dto.to_node_type,
      to_node_id: dto.to_node_id,
      parent_activity_id: dto.parent_activity_id ?? null,
      label: dto.label ?? null,
    }

    const { data, error } = await this.db.db
      .from('canvas_edges')
      .insert(payload)
      .select()
      .single()
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async deleteEdge(id: string) {
    const { error } = await this.db.db
      .from('canvas_edges')
      .delete()
      .eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
```

- [ ] **Step 5: Controller erstellen**

`backend/src/canvas-edges/canvas-edges.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CanvasEdgesService } from './canvas-edges.service'
import { AuthGuard } from '../auth/auth.guard'
import { UpsertCanvasEdgeDto } from './dto/upsert-canvas-edge.dto'

@Controller('workspaces/:workspaceId/canvas-edges')
@UseGuards(AuthGuard)
export class CanvasEdgesController {
  constructor(private service: CanvasEdgesService) {}

  @Get()
  findByParent(
    @Param('workspaceId') workspaceId: string,
    @Query('parentId') parentId?: string,
  ) {
    const parent = parentId === 'null' || !parentId ? null : parentId
    return this.service.findByParent(workspaceId, parent)
  }

  @Post()
  upsert(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertCanvasEdgeDto,
  ) {
    return this.service.upsert(workspaceId, dto)
  }

  @Delete(':edgeId')
  deleteEdge(@Param('edgeId') edgeId: string) {
    return this.service.deleteEdge(edgeId)
  }
}
```

- [ ] **Step 6: Modul + App registrieren**

`backend/src/canvas-edges/canvas-edges.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { CanvasEdgesController } from './canvas-edges.controller'
import { CanvasEdgesService } from './canvas-edges.service'

@Module({
  controllers: [CanvasEdgesController],
  providers: [CanvasEdgesService],
  exports: [CanvasEdgesService],
})
export class CanvasEdgesModule {}
```

`backend/src/app.module.ts` vollständig ersetzen:

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'
import { WorkspacesModule } from './workspaces/workspaces.module'
import { ActivitiesModule } from './activities/activities.module'
import { CanvasObjectsModule } from './canvas-objects/canvas-objects.module'
import { CanvasEdgesModule } from './canvas-edges/canvas-edges.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ActivitiesModule,
    CanvasObjectsModule,
    CanvasEdgesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Tests ausführen — erwartet PASS**

```bash
cd backend && npm test -- --testPathPattern=canvas-edges.service
```

Erwartet: PASS (3 Tests grün).

- [ ] **Step 8: Commit**

```bash
git add backend/src/canvas-edges/ backend/src/app.module.ts
git commit -m "feat: add CanvasEdges backend module (canvas_edges CRUD)"
```
