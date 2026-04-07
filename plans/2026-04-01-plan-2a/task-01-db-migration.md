# Task 1: DB-Migration 003

**Files:**
- Create: `supabase/migrations/003_activity_metadata.sql`

- [ ] **Step 1: Migrationsdatei erstellen**

```sql
-- supabase/migrations/003_activity_metadata.sql

-- Activity type enum
CREATE TYPE activity_type_enum AS ENUM (
  'erstellen',
  'transformieren_aktualisieren',
  'pruefen_freigeben',
  'weiterleiten_ablegen'
);

-- Extend activities
ALTER TABLE activities
  ADD COLUMN activity_type    activity_type_enum,
  ADD COLUMN description      text,
  ADD COLUMN notes            text,
  ADD COLUMN duration_minutes integer;

-- Canvas objects (Quelle + Datenobjekt)
CREATE TABLE canvas_objects (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id       uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  object_type        text NOT NULL CHECK (object_type IN ('quelle', 'datenobjekt')),
  name               text NOT NULL DEFAULT '',
  position_x         float NOT NULL DEFAULT 0,
  position_y         float NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Object fields (Datenobjekt-Schema)
CREATE TABLE object_fields (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id   uuid NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  field_type  text NOT NULL CHECK (field_type IN ('text', 'integer', 'decimal', 'date', 'boolean')),
  required    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0
);

-- Unified edges (ersetzt ports + connections)
CREATE TABLE canvas_edges (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_activity_id  uuid REFERENCES activities(id) ON DELETE CASCADE,
  from_node_type      text NOT NULL CHECK (from_node_type IN ('activity', 'canvas_object')),
  from_node_id        uuid NOT NULL,
  to_node_type        text NOT NULL CHECK (to_node_type IN ('activity', 'canvas_object')),
  to_node_id          uuid NOT NULL,
  label               text
);

-- Sollzustand-Referenzen
CREATE TABLE activity_check_sources (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id      uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  canvas_object_id uuid NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  notes            text
);

-- Tools / Systeme
CREATE TABLE activity_tools (
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tool_name   text NOT NULL,
  PRIMARY KEY (activity_id, tool_name)
);

-- Alte Tabellen entfernen (keine Daten vorhanden)
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS ports;

-- RLS aktivieren
ALTER TABLE canvas_objects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_fields           ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_edges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_check_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_tools          ENABLE ROW LEVEL SECURITY;

-- canvas_objects: Workspace-Owner hat vollen Zugriff
CREATE POLICY "canvas_objects workspace owner access"
  ON canvas_objects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = canvas_objects.workspace_id
        AND workspaces.created_by = auth.uid()
    )
  );

-- object_fields: Zugriff über canvas_objects
CREATE POLICY "object_fields via canvas_object owner"
  ON object_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canvas_objects
      JOIN workspaces ON workspaces.id = canvas_objects.workspace_id
      WHERE canvas_objects.id = object_fields.object_id
        AND workspaces.created_by = auth.uid()
    )
  );

-- canvas_edges: Workspace-Owner hat vollen Zugriff
CREATE POLICY "canvas_edges workspace owner access"
  ON canvas_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = canvas_edges.workspace_id
        AND workspaces.created_by = auth.uid()
    )
  );

-- activity_check_sources: Activity-Owner hat vollen Zugriff
CREATE POLICY "check_sources activity owner access"
  ON activity_check_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_check_sources.activity_id
        AND activities.owner_id = auth.uid()
    )
  );

-- activity_tools: Activity-Owner hat vollen Zugriff
CREATE POLICY "activity_tools activity owner access"
  ON activity_tools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_tools.activity_id
        AND activities.owner_id = auth.uid()
    )
  );

-- updated_at-Trigger für canvas_objects
CREATE TRIGGER canvas_objects_updated_at
  BEFORE UPDATE ON canvas_objects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Migration in Supabase anwenden**

```bash
supabase db push
```

Erwartet: Migration wird ohne Fehler ausgeführt.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_activity_metadata.sql
git commit -m "feat: add migration 003 — activity metadata, canvas objects, edges"
```
