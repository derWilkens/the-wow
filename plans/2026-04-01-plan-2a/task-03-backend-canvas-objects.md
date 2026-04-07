# Task 3: Backend — CanvasObjects-Modul

**Files:**
- Create: `backend/src/canvas-objects/dto/upsert-canvas-object.dto.ts`
- Create: `backend/src/canvas-objects/dto/upsert-object-field.dto.ts`
- Create: `backend/src/canvas-objects/canvas-objects.service.ts`
- Create: `backend/src/canvas-objects/canvas-objects.service.spec.ts`
- Create: `backend/src/canvas-objects/canvas-objects.controller.ts`
- Create: `backend/src/canvas-objects/canvas-objects.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Failing tests schreiben**

`backend/src/canvas-objects/canvas-objects.service.spec.ts` erstellen:

```typescript
import { Test } from '@nestjs/testing'
import { CanvasObjectsService } from './canvas-objects.service'
import { DatabaseService } from '../database/database.service'

const mockDb = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

describe('CanvasObjectsService', () => {
  let service: CanvasObjectsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CanvasObjectsService,
        { provide: DatabaseService, useValue: { db: mockDb } },
      ],
    }).compile()
    service = module.get(CanvasObjectsService)
    jest.clearAllMocks()
  })

  it('findByParent returns canvas objects for workspace', async () => {
    mockDb.is.mockResolvedValueOnce({ data: [{ id: 'obj-1' }], error: null })
    const result = await service.findByParent('ws-1', null)
    expect(result).toEqual([{ id: 'obj-1' }])
  })

  it('upsert creates new canvas object', async () => {
    const obj = { id: 'obj-2', name: 'Rechnung', object_type: 'datenobjekt' }
    mockDb.single.mockResolvedValueOnce({ data: obj, error: null })
    const result = await service.upsert('ws-1', {
      name: 'Rechnung',
      object_type: 'datenobjekt',
      position_x: 100,
      position_y: 200,
      parent_activity_id: null,
    })
    expect(result).toEqual(obj)
  })

  it('deleteObject deletes by id', async () => {
    mockDb.eq.mockResolvedValueOnce({ error: null })
    await expect(service.deleteObject('obj-1')).resolves.not.toThrow()
  })

  it('upsertField creates new field', async () => {
    const field = { id: 'field-1', name: 'Betrag', field_type: 'decimal' }
    mockDb.single.mockResolvedValueOnce({ data: field, error: null })
    const result = await service.upsertField('obj-1', {
      name: 'Betrag',
      field_type: 'decimal',
      required: false,
      sort_order: 0,
    })
    expect(result).toEqual(field)
  })

  it('deleteField deletes by id', async () => {
    mockDb.eq.mockResolvedValueOnce({ error: null })
    await expect(service.deleteField('field-1')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd backend && npm test -- --testPathPattern=canvas-objects.service
```

Erwartet: FAIL — Modul existiert nicht.

- [ ] **Step 3: DTOs erstellen**

`backend/src/canvas-objects/dto/upsert-canvas-object.dto.ts`:

```typescript
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpsertCanvasObjectDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  name: string

  @IsEnum(['quelle', 'datenobjekt'])
  object_type: string

  @IsNumber()
  position_x: number

  @IsNumber()
  position_y: number

  @IsOptional()
  @IsUUID()
  parent_activity_id: string | null
}
```

`backend/src/canvas-objects/dto/upsert-object-field.dto.ts`:

```typescript
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class UpsertObjectFieldDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  name: string

  @IsEnum(['text', 'integer', 'decimal', 'date', 'boolean'])
  field_type: string

  @IsBoolean()
  required: boolean

  @IsInt()
  @Min(0)
  sort_order: number
}
```

- [ ] **Step 4: Service erstellen**

`backend/src/canvas-objects/canvas-objects.service.ts`:

```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { UpsertCanvasObjectDto } from './dto/upsert-canvas-object.dto'
import { UpsertObjectFieldDto } from './dto/upsert-object-field.dto'

@Injectable()
export class CanvasObjectsService {
  constructor(private db: DatabaseService) {}

  async findByParent(workspaceId: string, parentId: string | null) {
    let query = this.db.db
      .from('canvas_objects')
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

  async upsert(workspaceId: string, dto: UpsertCanvasObjectDto) {
    const payload = {
      workspace_id: workspaceId,
      name: dto.name,
      object_type: dto.object_type,
      position_x: dto.position_x,
      position_y: dto.position_y,
      parent_activity_id: dto.parent_activity_id ?? null,
    }

    if (dto.id) {
      const { data, error } = await this.db.db
        .from('canvas_objects')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', dto.id)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    } else {
      const { data, error } = await this.db.db
        .from('canvas_objects')
        .insert(payload)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    }
  }

  async deleteObject(id: string) {
    const { error } = await this.db.db
      .from('canvas_objects')
      .delete()
      .eq('id', id)
    if (error) throw new InternalServerErrorException(error.message)
  }

  async findFields(objectId: string) {
    const { data, error } = await this.db.db
      .from('object_fields')
      .select('*')
      .eq('object_id', objectId)
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }

  async upsertField(objectId: string, dto: UpsertObjectFieldDto) {
    const payload = {
      object_id: objectId,
      name: dto.name,
      field_type: dto.field_type,
      required: dto.required,
      sort_order: dto.sort_order,
    }

    if (dto.id) {
      const { data, error } = await this.db.db
        .from('object_fields')
        .update(payload)
        .eq('id', dto.id)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    } else {
      const { data, error } = await this.db.db
        .from('object_fields')
        .insert(payload)
        .select()
        .single()
      if (error) throw new InternalServerErrorException(error.message)
      return data
    }
  }

  async deleteField(fieldId: string) {
    const { error } = await this.db.db
      .from('object_fields')
      .delete()
      .eq('id', fieldId)
    if (error) throw new InternalServerErrorException(error.message)
  }
}
```

- [ ] **Step 5: Controller erstellen**

`backend/src/canvas-objects/canvas-objects.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CanvasObjectsService } from './canvas-objects.service'
import { AuthGuard } from '../auth/auth.guard'
import { UpsertCanvasObjectDto } from './dto/upsert-canvas-object.dto'
import { UpsertObjectFieldDto } from './dto/upsert-object-field.dto'

@Controller('workspaces/:workspaceId/canvas-objects')
@UseGuards(AuthGuard)
export class CanvasObjectsController {
  constructor(private service: CanvasObjectsService) {}

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
    @Body() dto: UpsertCanvasObjectDto,
  ) {
    return this.service.upsert(workspaceId, dto)
  }

  @Delete(':objectId')
  deleteObject(@Param('objectId') objectId: string) {
    return this.service.deleteObject(objectId)
  }

  @Get(':objectId/fields')
  findFields(@Param('objectId') objectId: string) {
    return this.service.findFields(objectId)
  }

  @Post(':objectId/fields')
  upsertField(
    @Param('objectId') objectId: string,
    @Body() dto: UpsertObjectFieldDto,
  ) {
    return this.service.upsertField(objectId, dto)
  }

  @Delete(':objectId/fields/:fieldId')
  deleteField(@Param('fieldId') fieldId: string) {
    return this.service.deleteField(fieldId)
  }
}
```

- [ ] **Step 6: Modul + App registrieren**

`backend/src/canvas-objects/canvas-objects.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { CanvasObjectsController } from './canvas-objects.controller'
import { CanvasObjectsService } from './canvas-objects.service'

@Module({
  controllers: [CanvasObjectsController],
  providers: [CanvasObjectsService],
  exports: [CanvasObjectsService],
})
export class CanvasObjectsModule {}
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ActivitiesModule,
    CanvasObjectsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Tests ausführen — erwartet PASS**

```bash
cd backend && npm test -- --testPathPattern=canvas-objects.service
```

Erwartet: PASS (5 Tests grün).

- [ ] **Step 8: Commit**

```bash
git add backend/src/canvas-objects/ backend/src/app.module.ts
git commit -m "feat: add CanvasObjects backend module (canvas_objects + object_fields CRUD)"
```
