# Task 2: Backend — Activity DTO + Service erweitern

**Files:**
- Modify: `backend/src/activities/dto/upsert-activity.dto.ts`
- Modify: `backend/src/activities/activities.service.ts`
- Modify: `backend/src/activities/activities.service.spec.ts`

- [ ] **Step 1: Failing test schreiben**

In `backend/src/activities/activities.service.spec.ts` am Ende hinzufügen:

```typescript
it('upsert persists activity_type, description, notes, duration_minutes', async () => {
  const act = {
    id: 'act-4',
    label: 'Prüfen',
    activity_type: 'pruefen_freigeben',
    description: 'Rechnung prüfen',
    notes: 'Interner Hinweis',
    duration_minutes: 30,
    workspace_id: 'ws-1',
  }
  mockDb.single.mockResolvedValueOnce({ data: act, error: null })
  const result = await service.upsert('ws-1', 'user-1', {
    label: 'Prüfen',
    position_x: 0,
    position_y: 0,
    parent_id: null,
    activity_type: 'pruefen_freigeben',
    description: 'Rechnung prüfen',
    notes: 'Interner Hinweis',
    duration_minutes: 30,
  })
  expect(result).toEqual(act)
  expect(mockDb.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      activity_type: 'pruefen_freigeben',
      description: 'Rechnung prüfen',
      notes: 'Interner Hinweis',
      duration_minutes: 30,
    }),
  )
})
```

- [ ] **Step 2: Test ausführen — erwartet FAIL**

```bash
cd backend && npm test -- --testPathPattern=activities.service
```

Erwartet: FAIL — `activity_type` nicht im DTO bekannt.

- [ ] **Step 3: DTO erweitern**

`backend/src/activities/dto/upsert-activity.dto.ts` vollständig ersetzen:

```typescript
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator'

export class UpsertActivityDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  label: string

  @IsOptional()
  @IsEnum(['email', 'schedule', 'manual', 'webhook', 'file_drop'])
  trigger_type?: string

  @IsNumber()
  position_x: number

  @IsNumber()
  position_y: number

  @IsOptional()
  @IsUUID()
  parent_id: string | null

  @IsOptional()
  @IsEnum(['activity', 'start_event', 'end_event'])
  node_type?: string

  @IsOptional()
  @ValidateIf(o => o.status_icon !== null)
  @IsEnum(['unclear', 'ok', 'in_progress', 'blocked'])
  status_icon?: string | null

  @IsOptional()
  @IsEnum(['erstellen', 'transformieren_aktualisieren', 'pruefen_freigeben', 'weiterleiten_ablegen'])
  activity_type?: string | null

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  notes?: string | null

  @IsOptional()
  @IsInt()
  @Min(0)
  duration_minutes?: number | null
}
```

- [ ] **Step 4: Service erweitern**

`backend/src/activities/activities.service.ts` — `upsert`-Methode vollständig ersetzen:

```typescript
async upsert(workspaceId: string, ownerId: string, dto: UpsertActivityDto) {
  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    owner_id: ownerId,
    label: dto.label,
    trigger_type: dto.trigger_type ?? null,
    position_x: dto.position_x,
    position_y: dto.position_y,
    parent_id: dto.parent_id ?? null,
    node_type: dto.node_type ?? 'activity',
  }

  if ('status_icon' in dto) {
    payload.status_icon = dto.status_icon ?? null
  }
  if ('activity_type' in dto) {
    payload.activity_type = dto.activity_type ?? null
  }
  if ('description' in dto) {
    payload.description = dto.description ?? null
  }
  if ('notes' in dto) {
    payload.notes = dto.notes ?? null
  }
  if ('duration_minutes' in dto) {
    payload.duration_minutes = dto.duration_minutes ?? null
  }

  if (dto.id) {
    const { data, error } = await this.db.db
      .from('activities')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', dto.id)
      .select()
      .single()
    if (error) throw new InternalServerErrorException(error.message)
    return data
  } else {
    const { data, error } = await this.db.db
      .from('activities')
      .insert(payload)
      .select()
      .single()
    if (error) throw new InternalServerErrorException(error.message)
    return data
  }
}
```

- [ ] **Step 5: Tests ausführen — erwartet PASS**

```bash
cd backend && npm test -- --testPathPattern=activities.service
```

Erwartet: PASS (alle 4 Tests grün).

- [ ] **Step 6: Commit**

```bash
git add backend/src/activities/dto/upsert-activity.dto.ts \
        backend/src/activities/activities.service.ts \
        backend/src/activities/activities.service.spec.ts
git commit -m "feat: extend activity DTO and service with metadata fields"
```
