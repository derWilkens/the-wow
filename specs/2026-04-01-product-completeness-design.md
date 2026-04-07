# Product Completeness — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Builds on:** `2026-03-30-wayofworking-design.md`, `2026-03-31-activity-data-model-canvas-objects-design.md`, `2026-03-31-canvas-toolbar-status-design.md`

Historical note (2026-04-05):
- This backlog is partially implemented already.
- Several items that were still P2/P3 here are now live in the product, for example:
  - Gateways
  - Swimlanes / Rollenbahnen
  - Ausfuehrenden-/User-Picker
  - Kommentare
  - Suche im Canvas
- Use `docs/FEATURE_AND_TEST_STATUS.md` as the current implementation ledger.

---

## Übersicht

Dieses Dokument beschreibt die Features, die nach Plan 2a noch fehlen, um aus dem Tool ein produktreifes Prozessmodellierungswerkzeug zu machen. Die Themen sind nach Dringlichkeit geordnet.

| Priorität | Feature | Kurzbeschreibung |
|---|---|---|
| P1 | Löschen von Knoten | Aktivitäten, Quellen, Datenobjekte entfernen |
| P1 | Kantenbeschriftungen (UI) | `label`-Feld an Kanten editierbar machen |
| P1 | Export (PNG / PDF) | Prozess drucken und teilen |
| P1 | Entscheidungsgateways | XOR- und AND-Gateways als eigener Node-Typ |
| P2 | Swimlanes / Rollen | Visuelle Zuordnung von Aktivitäten zu Rollen |
| P2 | Workspace-Mitglieder & Rechte | Andere Nutzer einladen, Berechtigungen verwalten |
| P2 | Ausführende(r) — User-Picker | Nutzer aus Workspace-Mitgliedern auswählen |
| P2 | Undo / Redo | Letzte Aktion rückgängig machen |
| P2 | Mehrfachauswahl | Mehrere Knoten gemeinsam verschieben / löschen |
| P3 | Prozessversionen | Snapshots eines Workspaces |
| P3 | Kommentare | Diskussions-Thread an Aktivitäten |
| P3 | Suche | Aktivitäten, Tools, Datenobjekte finden |
| P3 | Prozessübersicht & Metriken | Dashboard über alle Prozesse eines Workspaces |

---

## P1 — Löschen von Knoten

### Problem
Es gibt aktuell kein UI zum Löschen von Aktivitäten, Quellen oder Datenobjekten. Nur Kanten können über die Delete-Taste entfernt werden.

### Lösung

**Kontextmenü (Rechtsklick auf Knoten):**
```
┌──────────────────────────┐
│  Umbenennen              │
│  Duplizieren             │  ← optional, P3
│  ──────────────────────  │
│  🗑 Löschen              │  ← rot hervorgehoben
└──────────────────────────┘
```

**Alternativ:** Selektierter Knoten + `Delete`-Taste (analog zu Kanten, die bereits so gelöscht werden können).

**Bestätigung:** Knoten, die eingehende oder ausgehende Kanten haben, zeigen einen Bestätigungsdialog:
> „Diese Aktivität hat 2 Verbindungen. Trotzdem löschen?"

Knoten ohne Verbindungen werden ohne Bestätigung gelöscht.

### Datenbankverhalten
Die bestehenden `ON DELETE CASCADE`-Constraints decken alle Abhängigkeiten ab:
- Aktivität löschen → `canvas_edges`, `activity_tools`, `activity_check_sources`, `object_fields` auf dieser Aktivität werden automatisch entfernt
- Canvas-Objekt löschen → `canvas_edges`, `object_fields`, `activity_check_sources` werden entfernt

### API
```
DELETE /workspaces/:wid/activities/:id
DELETE /workspaces/:wid/canvas-objects/:id
```
Beide Endpoints existieren noch nicht. Sie prüfen per RLS, dass der anfragende User Eigentümer des Workspaces ist.

---

## P1 — Kantenbeschriftungen (UI)

### Problem
Das Datenbankfeld `canvas_edges.label` existiert bereits, hat aber kein Bearbeitungs-UI. Beschriftete Kanten sind notwendig, um Entscheidungspfade darzustellen (z.B. „Genehmigt", „Abgelehnt").

### Lösung

**Doppelklick auf eine Kante** öffnet ein kleines In-Place-Textfeld direkt auf der Kantenmitte:
```
  ────── [Genehmigt    ×] ──────
```
- `Enter` oder Klick außerhalb speichert den Text und persistiert via `PATCH /workspaces/:wid/canvas-edges/:id`
- `Escape` verwirft
- Leeres Textfeld entfernt das Label

**Rendering:** Bestehende ReactFlow-Edge-Label-Infrastruktur (`label`-Prop) wird genutzt. Labeled edges erhalten einen kleinen weißen Hintergrund hinter dem Text (ReactFlow Standard).

### Neue API
```
PATCH /workspaces/:wid/canvas-edges/:id   { label: string | null }
```

---

## P1 — Export (PNG / PDF)

### Problem
Prozesse können nicht ausgedruckt oder geteilt werden.

### Lösung

**Export-Button** im AppHeader, rechts neben den Toolbar-Buttons:
```
[▶ Start] [⬜ Aktivität] [● Ende] [⊞ Quelle] [▭ Datenobjekt]  ·  [↓ Export]  Abmelden
```

Klick öffnet ein kleines Dropdown:
```
┌────────────────────┐
│  Als PNG speichern │
│  Als PDF drucken   │
└────────────────────┘
```

**PNG-Export:**
- Nutzt `html-to-image` (npm) oder ReactFlow's eingebaute `getViewport` + Canvas API
- Exportiert den sichtbaren Canvas-Bereich + 40px Rand
- Dateiname: `<workspace-name>-<datum>.png`

**PDF-Export:**
- Öffnet Browser-Druckdialog (`window.print()`)
- `@media print`-CSS: Header und Controls ausblenden, Canvas auf Seitenbreite skalieren
- Nutzer kann im Druckdialog „Als PDF speichern" wählen

### Kein Backend erforderlich
Beide Varianten laufen vollständig im Browser.

---

## P1 — Entscheidungsgateways

### Problem
Reale Prozesse haben Verzweigungen (wenn/dann). Aktuell gibt es keine Möglichkeit, Entscheidungspunkte darzustellen.

### Lösung

Neuer Node-Typ `gateway` auf der `activities`-Tabelle (`node_type = 'gateway'`).

**Zwei Gateway-Typen** (gespeichert als `gateway_type`-Spalte auf `activities`):

| Typ | Symbol | Bedeutung |
|---|---|---|
| `xor` | ◇ mit X | Exklusiv-Oder: genau ein Pfad wird ausgeführt |
| `and` | ◇ mit + | Und-Split: alle Pfade werden parallel ausgeführt |

**Visuals:**
```
    ◇          ◇
   / \         |  \
  X   X       +    +
```
- Diamond-Form (BPMN-Standard), 52×52px
- XOR: X-Symbol innen, blaue Border
- AND: +-Symbol innen, grüne Border
- Handles: links (target), rechts (source), oben (source), unten (source) — mehrere Ausgänge möglich

**Toolbar:** Neuer Button `[⬡ Gateway]` im Header (nach Ende, vor Trennstrich).

**Automatische Inferenz (optional, Phase 2):** Wenn eine Aktivität mehrere ausgehende Kanten hat, die alle beschriftet sind → Backend schlägt vor, ein XOR-Gateway einzufügen.

### Datenbankänderung

```sql
ALTER TABLE activities
  ADD COLUMN gateway_type text
  CHECK (gateway_type IN ('xor', 'and'));

-- node_type um 'gateway' erweitern:
ALTER TABLE activities
  DROP CONSTRAINT activities_node_type_check;
ALTER TABLE activities
  ADD CONSTRAINT activities_node_type_check
  CHECK (node_type IN ('activity', 'start_event', 'end_event', 'gateway'));
```

---

## P2 — Swimlanes / Rollen

### Problem
Es ist nicht erkennbar, welche Rolle oder Abteilung eine Aktivität ausführt. Business-Prozesse ohne Rollenzuordnung sind schwer zu validieren.

### Konzept

Swimlanes sind horizontale (oder vertikale) Streifen auf dem Canvas, denen Aktivitäten zugeordnet sind. Eine Lane entspricht einer Rolle/Abteilung (z.B. „Einkauf", „Controlling", „IT").

```
╔═══════════════════════════════════════════════════╗
║ Einkauf     │ [Start] ──→ [Bestellung anlegen] ──→│
╠═════════════╪═══════════════════════════════════════╣
║ Controlling │              ──→ [Rechnung prüfen]  │
╠═════════════╪═══════════════════════════════════════╣
║ IT          │                    [SAP-Buchung] ──→│
╚═══════════════════════════════════════════════════╝
```

### Datenmodell

```sql
CREATE TABLE lanes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Neue Rolle',
  color           text NOT NULL DEFAULT '#334155',  -- Hex
  sort_order      integer NOT NULL DEFAULT 0
);

-- Aktivität einer Lane zuordnen
ALTER TABLE activities
  ADD COLUMN lane_id uuid REFERENCES lanes(id) ON DELETE SET NULL;
```

### UI-Interaktion

- **Lane erstellen:** Button „+ Rolle hinzufügen" links am Canvas-Rand
- **Lane umbenennen:** Doppelklick auf Lane-Header → Inline-Edit
- **Lane neu anordnen:** Drag & Drop auf Lane-Header
- **Aktivität zuordnen:** Aktivität in eine Lane ziehen → `lane_id` wird gesetzt
- **Lane löschen:** Löscht Lane, setzt `lane_id` aller enthaltenen Aktivitäten auf NULL (keine Kaskade auf Aktivitäten)

Swimlanes sind **optional** — ein Canvas ohne Lanes sieht wie bisher aus.

---

## P2 — Workspace-Mitglieder & Rechte

### Problem
Workspaces können nicht geteilt werden. Die `activity_roles`-Tabelle existiert bereits, hat aber kein UI.

### Datenmodell (Erweiterung)

```sql
CREATE TABLE workspace_members (
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'editor'
                CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by    uuid REFERENCES auth.users(id),
  accepted_at   timestamptz,
  PRIMARY KEY (workspace_id, user_id)
);
```

**Rollen auf Workspace-Ebene:**
| Rolle | Kann lesen | Kann bearbeiten | Kann einladen | Kann löschen |
|---|---|---|---|---|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `editor` | ✓ | ✓ | — | — |
| `viewer` | ✓ | — | — | — |

### UI

**Workspace-Einstellungen** (erreichbar über Menüpunkt im Header):

1. **Mitglieder-Tab:** Liste aller Mitglieder mit Rolle, Datum der Einladung, Entfernen-Button
2. **Einladen:** E-Mail-Adresse eingeben → Einladungsmail über Supabase Auth (`supabase.auth.admin.inviteUserByEmail`)

**Sichtbarkeit von Workspaces:**
- Workspace-Liste zeigt nur Workspaces, in denen der User `owner` oder Mitglied ist
- RLS-Policy: `workspace_members`-Tabelle steuert Zugriff auf alle abhängigen Tabellen

---

## P2 — Ausführende(r) — User-Picker

### Problem
Das Feld „Ausführende(r)" im ActivityDetailPopup zeigt aktuell nur die ersten 8 Zeichen der UUID an. Benutzer können keine sinnvolle Zuweisung vornehmen.

### Lösung

Das Feld wird zu einem **Dropdown der Workspace-Mitglieder**:

```
Ausführende(r)
┌─────────────────────────────┐
│ 🔵 Anna Müller (Einkauf)    ▾│
└─────────────────────────────┘
```

**Datenfluss:**
1. Frontend lädt Workspace-Mitglieder via `GET /workspaces/:id/members`
2. Backend liest `workspace_members` + User-Metadaten aus Supabase Auth (`admin.listUsers`)
3. Dropdown zeigt: Profilbild (wenn vorhanden) + Vor-/Nachname + E-Mail-Kürzel

**Datenbankänderung:** Keine — `activities.owner_id` referenziert bereits `auth.users`.

---

## P2 — Undo / Redo

### Problem
Versehentliches Löschen oder Verschieben kann nicht rückgängig gemacht werden.

### Lösung

**Client-seitiger Undo-Stack** (kein Server-Roundtrip):

- Implementiert als Zustand-Stack in Zustand (`undoStack: CanvasSnapshot[]`, `redoStack: CanvasSnapshot[]`)
- Ein Snapshot enthält: aktuelle `nodes`-Array + `edges`-Array
- Maximale Stack-Tiefe: 50 Einträge

**Auslöser für Snapshot:**
- Knoten löschen
- Kante löschen
- Knoten hinzufügen (via Toolbar oder Drag-from-Connector)
- Knoten verschieben (beim `onNodeDragStop`, nicht während des Ziehens)

**Nicht im Stack:**
- Label-/Namensänderungen (diese werden im Popup gespeichert und sind über die Popup-eigene Cancel-Funktion rückgängig zu machen)
- Status-Icon-Änderungen

**Tastaturkürzel:**
- `Ctrl+Z` / `Cmd+Z` → Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` → Redo

**Verhalten bei Server-Sync:**
Undo stellt den lokalen Canvas-Zustand wieder her und sendet sofort die entsprechenden DELETE/POST-Requests an den Server.

---

## P2 — Mehrfachauswahl

### Problem
Mehrere Knoten können nicht gemeinsam verschoben oder gelöscht werden.

### Lösung

ReactFlow unterstützt Mehrfachauswahl nativ:

- **Box-Select:** Maus auf leere Fläche halten + ziehen → Auswahlrahmen
- **Shift+Klick:** Einzelne Knoten zur Auswahl hinzufügen
- Ausgewählte Knoten: blau hervorgehobene Border

**Operationen auf Mehrfachauswahl:**
- **Verschieben:** Drag auf einen der ausgewählten Knoten → alle bewegen sich mit. Positionen werden bei `onNodeDragStop` für alle selektierten Knoten persistiert.
- **Löschen:** `Delete`-Taste → Bestätigungsdialog wenn ≥1 Knoten Verbindungen hat: „N Knoten und M Verbindungen löschen?"

ReactFlow-Konfiguration:
```tsx
<ReactFlow
  multiSelectionKeyCode="Shift"
  selectionKeyCode="Shift"
  selectionOnDrag={true}
  ...
/>
```

---

## P3 — Prozessversionen

### Problem
Es gibt keine Möglichkeit, einen Stand des Prozesses einzufrieren und später zu vergleichen.

### Konzept

**Manueller Snapshot** — kein automatisches Versionieren.

```sql
CREATE TABLE process_snapshots (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  label         text NOT NULL,         -- z.B. "Version 1.0 — vor SAP-Einführung"
  snapshot_data jsonb NOT NULL,        -- serialisierter Zustand aller activities + canvas_objects + edges
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**UI:**
- Button „Snapshot erstellen" → Eingabe eines Labels → sofortige Persistierung
- Liste aller Snapshots in den Workspace-Einstellungen
- Klick auf Snapshot → Read-only-Canvas-Ansicht des eingefrorenen Stands
- Kein automatisches Diff / Vergleich (zu komplex für erstes Release)

---

## P3 — Kommentare

### Problem
Reviewer können keine Anmerkungen an einzelnen Aktivitäten hinterlassen.

### Datenmodell

```sql
CREATE TABLE activity_comments (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES auth.users(id),
  body         text NOT NULL,
  resolved     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### UI

- Kleines **Kommentar-Icon** oben rechts am ActivityNode (erscheint beim Hover oder wenn Kommentare vorhanden sind)
- Klick öffnet einen Thread im rechten Sidebar (ähnlich wie ActivityDetailPopup)
- Kommentare können als „Erledigt" markiert werden (`resolved = true` → ausgegraut)
- Ungelöste Kommentare: oranges Punkt-Badge am Node-Icon

---

## P3 — Suche

### Problem
In großen Workspaces ist es schwer, eine bestimmte Aktivität, ein Tool oder ein Datenobjekt zu finden.

### UI

**Globale Suchleiste** im Header (erreichbar via `Ctrl+K` / `Cmd+K`):

```
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Aktivitäten, Tools, Datenobjekte suchen …                │
│                                                              │
│ Aktivitäten                                                  │
│   📋 Rechnung prüfen          Workspace: Buchhaltung Q2      │
│   📋 Zahlung freigeben        Workspace: Buchhaltung Q2      │
│                                                              │
│ Tools                                                        │
│   🔧 SAP                      2 Aktivitäten                  │
│                                                              │
│ Datenobjekte                                                  │
│   📄 Rechnung (Betrag: decimal)  Workspace: Buchhaltung Q2   │
└──────────────────────────────────────────────────────────────┘
```

- Suche läuft client-seitig auf den TanStack-Query-Cache-Daten (kein neuer Backend-Endpoint für Phase 1)
- Klick auf ein Ergebnis: springt zur Aktivität auf dem Canvas (ReactFlow `fitBounds`)
- Suche über alle Workspaces, die der Nutzer sehen darf

---

## P3 — Prozessübersicht & Metriken

### Problem
Es gibt keine aggregierte Sicht auf alle Prozesse oder auf die Vollständigkeit der Modellierung.

### UI

**Dashboard-Tab** in der Workspace-Ansicht (neben der Canvas-Ansicht):

```
Workspace: Buchhaltung Q2
─────────────────────────────────────────────────────
Übersicht
  Aktivitäten:     12   (8 beschriftet, 4 ohne Typ)
  Datenobjekte:     3
  Quellen:          2
  Verbindungen:    14
  Offene Kommentare: 3

Status
  ✅ OK:           5
  🔵 In Bearbeitung: 4
  🔴 Unklar:        2
  ⚪ Kein Status:   1

Tools / Systeme (top 5)
  SAP          ████████████████ 6 Aktivitäten
  E-Mail       ████████         4 Aktivitäten
  SharePoint   ████             2 Aktivitäten
```

Berechnung läuft vollständig client-seitig aus den TanStack-Query-Daten.

---

## Nicht im Scope dieser Spec

- **Echtzeit-Kollaboration** (Concurrent Editing, CRDTs) — bewusst ausgeschlossen, vgl. ursprüngliches Design
- **BPMN-Import** (aus Visio/Signavio) — zu aufwändig für Phase 1
- **Mobile-Optimierung** — Desktop-first bleibt
- **RACI-Matrix** (Responsible, Accountable, Consulted, Informed) — für späteres Release
- **Prozess-Simulation** (Durchlaufzeiten berechnen) — eigenständiges Feature, nicht Teil der Modellierung

---

## Implementierungsreihenfolge (Empfehlung)

```
Plan 3a (MVP-Vervollständigung):
  1. Löschen von Knoten          ← größter Schmerzpunkt
  2. Kantenbeschriftungen (UI)   ← bereits in DB vorhanden
  3. Export PNG/PDF              ← kein Backend nötig
  4. Entscheidungsgateways       ← notwendig für reale Prozesse

Plan 3b (Kollaboration):
  5. Workspace-Mitglieder & Rechte
  6. Ausführende(r) User-Picker
  7. Swimlanes / Rollen

Plan 3c (UX-Qualität):
  8. Undo / Redo
  9. Mehrfachauswahl

Plan 4 (Mehrwert-Features):
  10. Prozessversionen
  11. Kommentare
  12. Suche
  13. Prozessübersicht & Metriken
```
