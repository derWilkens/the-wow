# Task 5: Backend — Activity Sub-Resources (Tools + Check Sources)

**Files:**
- Create: `backend/src/activities/dto/add-tool.dto.ts`
- Create: `backend/src/activities/dto/add-check-source.dto.ts`
- Modify: `backend/src/activities/activities.service.ts`
- Modify: `backend/src/activities/activities.service.spec.ts`
- Modify: `backend/src/activities/activities.controller.ts`

- [ ] **Step 1: Failing tests schreiben**

In `backend/src/activities/activities.service.spec.ts` am Ende hinzufügen:

```typescript
describe('tools', () => {
  it('findTools returns tools for activity', async () => {
    mockDb.eq.mockResolvedValueOnce({ data: [{ tool_name: 'SAP' }], error: null })
    const result = await service.findTools('act-1')
    expect(result).toEqual([{ tool_name: 'SAP' }])
  })

  it('addTool inserts a tool', async () => {
    const tool = { activity_id: 'act-1', tool_name: 'Excel' }
    mockDb.single.mockResolvedValueOnce({ data: tool, error: null })
    const result = await service.addTool('act-1', 'Excel')
    expect(result).toEqual(tool)
  })

  it('removeTool deletes by activity_id + tool_name', async () => {
    mockDb.eq.mockReturnValueOnce(mockDb)
    mockDb.eq.mockResolvedValueOnce({ error: null })
    await expect(service.removeTool('act-1', 'Excel')).resolves.not.toThrow()
  })
})

describe('check sources', () => {
  it('findCheckSources returns check sources for activity', async () => {
    mockDb.eq.mockResolvedValueOnce({ data: [{ id: 'cs-1' }], error: null })
    const result = await service.findCheckSources('act-1')
    expect(result).toEqual([{ id: 'cs-1' }])
  })

  it('addCheckSource inserts a check source', async () => {
    const cs = { id: 'cs-2', activity_id: 'act-1', canvas_object_id: 'obj-1' }
    mockDb.single.mockResolvedValueOnce({ data: cs, error: null })
    const result = await service.addCheckSource('act-1', { canvas_object_id: 'obj-1', notes: null })
    expect(result).toEqual(cs)
  })

  it('removeCheckSource deletes by id', async () => {
    mockDb.eq.mockResolvedValueOnce({ error: null })
    await expect(service.removeCheckSource('cs-1')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd backend && npm test -- --testPathPattern=activities.service
```

Erwartet: FAIL — `findTools`, `addTool` etc. nicht vorhanden.

- [ ] **Step 3: DTOs erstellen**

`backend/src/activities/dto/add-tool.dto.ts`:

```typescript
import { IsString } from 'class-validator'

export class AddToolDto {
  @IsString()
  tool_name: string
}
```

`backend/src/activities/dto/add-check-source.dto.ts`:

```typescript
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class AddCheckSourceDto {
  @IsUUID()
  canvas_object_id: string

  @IsOptional()
  @IsString()
  notes: string | null
}
```

- [ ] **Step 4: Service-Methoden hinzufügen**

In `backend/src/activities/activities.service.ts` am Ende der Klasse ergänzen:

```typescript
async findTools(activityId: string) {
  const { data, error } = await this.db.db
    .from('activity_tools')
    .select('*')
    .eq('activity_id', activityId)
  if (error) throw new InternalServerErrorException(error.message)
  return data
}

async addTool(activityId: string, toolName: string) {
  const { data, error } = await this.db.db
    .from('activity_tools')
    .insert({ activity_id: activityId, tool_name: toolName })
    .select()
    .single()
  if (error) throw new InternalServerErrorException(error.message)
  return data
}

async removeTool(activityId: string, toolName: string) {
  const { error } = await this.db.db
    .from('activity_tools')
    .delete()
    .eq('activity_id', activityId)
    .eq('tool_name', toolName)
  if (error) throw new InternalServerErrorException(error.message)
}

async findCheckSources(activityId: string) {
  const { data, error } = await this.db.db
    .from('activity_check_sources')
    .select('*')
    .eq('activity_id', activityId)
  if (error) throw new InternalServerErrorException(error.message)
  return data
}

async addCheckSource(activityId: string, dto: { canvas_object_id: string; notes: string | null }) {
  const { data, error } = await this.db.db
    .from('activity_check_sources')
    .insert({ activity_id: activityId, canvas_object_id: dto.canvas_object_id, notes: dto.notes })
    .select()
    .single()
  if (error) throw new InternalServerErrorException(error.message)
  return data
}

async removeCheckSource(id: string) {
  const { error } = await this.db.db
    .from('activity_check_sources')
    .delete()
    .eq('id', id)
  if (error) throw new InternalServerErrorException(error.message)
}
```

- [ ] **Step 5: Controller-Routen hinzufügen**

`backend/src/activities/activities.controller.ts` vollständig ersetzen:

```typescript
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ActivitiesService } from './activities.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/current-user.decorator'
import { UpsertActivityDto } from './dto/upsert-activity.dto'
import { AddToolDto } from './dto/add-tool.dto'
import { AddCheckSourceDto } from './dto/add-check-source.dto'

@Controller('workspaces/:workspaceId/activities')
@UseGuards(AuthGuard)
export class ActivitiesController {
  constructor(private service: ActivitiesService) {}

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
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertActivityDto,
  ) {
    return this.service.upsert(workspaceId, user.id, dto)
  }

  @Get(':activityId/tools')
  findTools(@Param('activityId') activityId: string) {
    return this.service.findTools(activityId)
  }

  @Post(':activityId/tools')
  addTool(
    @Param('activityId') activityId: string,
    @Body() dto: AddToolDto,
  ) {
    return this.service.addTool(activityId, dto.tool_name)
  }

  @Delete(':activityId/tools/:toolName')
  removeTool(
    @Param('activityId') activityId: string,
    @Param('toolName') toolName: string,
  ) {
    return this.service.removeTool(activityId, toolName)
  }

  @Get(':activityId/check-sources')
  findCheckSources(@Param('activityId') activityId: string) {
    return this.service.findCheckSources(activityId)
  }

  @Post(':activityId/check-sources')
  addCheckSource(
    @Param('activityId') activityId: string,
    @Body() dto: AddCheckSourceDto,
  ) {
    return this.service.addCheckSource(activityId, dto)
  }

  @Delete(':activityId/check-sources/:sourceId')
  removeCheckSource(@Param('sourceId') sourceId: string) {
    return this.service.removeCheckSource(sourceId)
  }
}
```

- [ ] **Step 6: Tests ausführen — erwartet PASS**

```bash
cd backend && npm test -- --testPathPattern=activities.service
```

Erwartet: PASS (alle 10 Tests grün).

- [ ] **Step 7: Commit**

```bash
git add backend/src/activities/
git commit -m "feat: add tools and check-sources sub-resources to activities"
```
