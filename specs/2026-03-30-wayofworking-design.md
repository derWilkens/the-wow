# Way of Working — Design Spec

**Datum:** 2026-03-30
**Status:** Approved

Historische Einordnung (2026-04-05):
- Dieses Dokument beschreibt weiterhin die grobe Produktvision.
- Mehrere Themen daraus sind im aktuellen Produkt noch nicht umgesetzt und muessen deshalb als offene Zielthemen gelesen werden:
  - BPMN-Generierung
  - Interview-Engine
  - KI-Vorschlaege
  - Excel-Import
  - feinere aktivitaetsbezogene Delegation und Rechte

---

## 1. Problem & Ziel

In vielen Unternehmen sind Verantwortlichkeiten und Arbeitsabläufe unklar — trotz ISO-9001-Zertifikat und modellierten Geschäftsprozessen. Die bestehenden Prozessmodelle sind oft zu abstrakt, zu weit von der gelebten Realität entfernt oder zu komplex für Business User.

**Way of Working** ist ein kollaboratives Web-Tool, mit dem Business User ihre tatsächliche Arbeitsweise schrittweise auf einem virtuellen Whiteboard beschreiben. Das System wächst von einer groben Skizze bis zu einem formal korrekten BPMN-Modell — ohne dass der Business User BPMN kennen muss.

---

## 2. Architektur

**Ansatz:** Lean Monolith

```
Browser (React)  →  NestJS API (Railway)  →  Supabase (PostgreSQL)
                                           →  LLM API (OpenAI / Anthropic)
```

### Tech Stack

| Schicht | Technologie |
|---|---|
| Frontend | React 18, React Flow, bpmn.js, Zustand, TanStack Query, Tailwind CSS |
| Backend | NestJS (Node.js) |
| Datenbank | Supabase (PostgreSQL, gehostet) |
| Auth | Supabase Auth |
| Deployment Frontend | Vercel (kostenfrei) |
| Deployment Backend | Railway (~5–20 $/Monat) |
| LLM | OpenAI oder Anthropic (per Umgebungsvariable konfigurierbar) |
| BPMN-Viewer/Editor | bpmn.js |

**On-premise (optional, nachrüstbar):** NestJS in Docker-Container + Supabase self-hosted via Docker Compose. Kein Code-Änderung nötig — nur andere Umgebungsvariablen.

### NestJS-Module

| Modul | Verantwortung |
|---|---|
| `GraphModule` | CRUD für Activities, Ports, Connections; Kompatibilitätsprüfung |
| `AIModule` | LLM-Integration, on-demand Vorschläge pro Element |
| `BpmnExportModule` | Activity-Baum → BPMN 2.0 XML, Gateway-Inferenz |
| `AuthModule` | Supabase Auth-Integration, JWT-Validierung |
| `PermissionsModule` | Scope-Filterung, Rollen-Prüfung |
| `InterviewModule` | Lücken-Analyse, Fragen-Generierung, Antwort-Verarbeitung |

---

## 3. Datenmodell

### `users` (Supabase Auth — keine eigene Tabelle)
User-Management wird vollständig von Supabase Auth übernommen. Die `auth.users`-Tabelle ist intern; Fremdschlüssel in anderen Tabellen referenzieren `auth.users.id`. Rollen (Business User, Architect, Admin) sowie die **Owner-Farbe** (`color`: Hex-Wert, z.B. `#3b82f6`) werden als User-Metadaten in Supabase Auth gespeichert.

### `workspaces`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Name des Projekts |
| `created_by` | uuid → users | |
| `created_at` | timestamptz | |

### `activities`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid → workspaces | |
| `parent_id` | uuid → activities | NULL = Top-Level; sonst Subprozess |
| `owner_id` | uuid → users | Verantwortlicher Business User |
| `node_type` | enum | `activity \| start_event \| end_event` |
| `label` | text | Anzeigename auf dem Canvas |
| `trigger_type` | enum nullable | `email \| schedule \| manual \| webhook \| file_drop` — nur wenn `node_type = start_event` |
| `position_x` | float | Canvas-Position |
| `position_y` | float | Canvas-Position |
| `status` | enum | `draft \| ready_for_review \| reviewed` |
| `updated_at` | timestamptz | Basis für Auto-Save-Konflikt-Erkennung |

### `ports`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `activity_id` | uuid → activities | |
| `direction` | enum | `in \| out` |
| `file_types` | text[] | z.B. `["pdf", "xlsx"]` |
| `destination_types` | text[] | z.B. `["email", "sharepoint"]` — mehrere Ziele möglich, nur Output-Ports |
| `attributes` | jsonb | Flache Attributliste: `[{name, type}]` — aus Excel-Import oder manuell |

### `connections`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `source_port_id` | uuid → ports | Output-Port der Quell-Aktivität |
| `target_port_id` | uuid → ports | Input-Port der Ziel-Aktivität |
| `label` | text nullable | z.B. „OK", „Abgelehnt" — signalisiert Entscheidungspfad |
| `has_warning` | boolean | true = Port-Attribute inkompatibel → Warndreieck |

### `activity_roles`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `activity_id` | uuid → activities | |
| `user_id` | uuid → users | |
| `permission` | enum | `read \| edit \| delegate` |

### `bpmn_drafts`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `workspace_id` | uuid → workspaces | |
| `version` | integer | Hochzählen bei jedem Export |
| `xml` | text | Vollständiges BPMN 2.0 XML |
| `is_complete` | boolean | Alle Pflichtattribute gefüllt? |
| `created_at` | timestamptz | |

### `interview_questions`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `bpmn_draft_id` | uuid → bpmn_drafts | |
| `activity_id` | uuid → activities | Betroffene Aktivität |
| `bpmn_attribute` | text | Fehlendes BPMN-Attribut (z.B. `"performer"`) |
| `question_text` | text | Frage in einfacher Sprache |
| `answer` | text nullable | NULL = noch offen |
| `answered_at` | timestamptz | |

---

## 4. Frontend — Canvas & Activity Node

### Canvas (React Flow)

- **Neues Element anlegen:** Doppelklick auf leere Canvas-Fläche öffnet ein Formular zur Auswahl des Node-Typs (Start-Event, Aktivität, End-Event) + Label.
- **Label bearbeiten:** Doppelklick auf einen bestehenden Node aktiviert Inline-Editing. `Enter` speichert, `Escape` bricht ab.
- **Subprozess:** Aktivitäts-Nodes (nicht Start/End) zeigen unten mittig ein kleines Quadrat (BPMN Collapsed Sub-Process Marker):
  - **Blau mit `+`:** Subprozess vorhanden → Klick öffnet inneres Canvas.
  - **Leer, gedimmt:** Noch kein Subprozess → Hover + Tooltip „Subprozess anlegen" → Klick legt leeres inneres Canvas an.
- **Drill-down:** Klick auf das Subprozess-Quadrat öffnet das innere Canvas. Breadcrumb-Navigation oben links zeigt den Pfad. Browser-Back funktioniert.
- **Kanten beschriften:** Klick auf eine Kante öffnet ein kleines Textfeld. Beschriftete Kanten → XOR-Gateway (Entscheidung). Mehrere unbeschriftete Kanten → AND-Split.
- **Auto-Save:** Änderungen werden automatisch per REST-Call gespeichert. Andere User sehen Änderungen nach manuellem Refresh.

### Node-Typen

#### Start-Event
```
   ╭───╮
  ( ✉️  )   ← dünner grüner Kreis, Trigger-Icon innen
   ╰───╯
        ●   ← nur Output-Port (rechts)
```
Dünner Kreis (2px Border), grün. Trigger-Icon (SVG) im Inneren. Nur ein Output-Port. Bildet den **Eingang des Superprozesses**. Pro inneres Canvas genau ein Start-Event empfohlen.

#### Aktivität
```
         [👤 Owner-Farbe]    ← farbiger Kreis + Person-Icon, oben rechts
┌──────────────────────┐
│  Aktivität            │   ← Label (klein, uppercase)
│  Rechnungen prüfen    │   ← Name (fett)
│         [☐]           │   ← Subprozess-Marker unten mittig
└──────────────────────┘
●                      ●
↑ Input-Port           ↑ Output-Port
[XLS]                 [PDF][✉]
```

#### End-Event
```
   ╭════╮
  (  ●  )   ← dicker roter Kreis (4px), gefüllter Kreis innen
   ╰════╯
●           ← nur Input-Port (links)
```
Dicker Kreis (4px Border), rot. Gefüllter innerer Kreis. Nur ein Input-Port. Bildet den **Ausgang des Superprozesses**.

### Owner-Badge (Aktivitäts-Nodes)

Kleiner farbiger Kreis oben rechts am Node mit Person-SVG-Icon. Farbe = die vom User selbst gewählte Farbe (gespeichert in Supabase Auth Metadaten). Mehrere Aktivitäten desselben Users → gleiche Farbe.

### Trigger-Icons (nur im Start-Event, SVG im Kreisinneren)

| Trigger | Icon |
|---|---|
| E-Mail | Briefumschlag |
| Zeitplan / Polling | Uhr |
| Manuell | Person |
| Webhook / API | Kettenglied |
| Ablage / Server | Ordner-Grid |

### Dateiformat-Badges (an Ports)

Kompakte farbige Labels: **PDF** (rot), **XLS** (grün), **DOC** (blau), **PPT** (orange), **CSV** (grau).

### Output-Ziel-Icons (rechts am Output-Port)

SVG-Icons in dunklen Quadraten: E-Mail, SharePoint, DMS, Server, API.

**⚠️ Warndreieck** erscheint am Input-Port wenn:
- Verbundener Output-Port hat inkompatible Attribute, oder
- Aktivität erwartet Input, hat aber keine eingehende Verbindung.

---

## 5. Scope & Berechtigungen

- Jeder User sieht beim Öffnen nur **seine eigenen Aktivitäten** (owner) sowie Aktivitäten mit expliziter Rollenzuweisung.
- **Fremde Aktivitäten** werden abgedimmt dargestellt (nicht editierbar) — Kontext bleibt sichtbar.
- **Delegation:** Owner → Rechtsklick → „Delegieren" → anderen User als Bearbeiter setzen.
- Berechtigungen: `read | edit | delegate` pro Aktivität in `activity_roles`.

---

## 6. KI-Vorschläge (on-demand)

- Jede Aktivität und jeder Port hat einen **„✦ KI-Vorschlag"-Button**.
- Klick → Backend sendet Kontext (Label, benachbarte Aktivitäten, vorhandene Ports) an LLM.
- Frontend zeigt ein **Auswahl-Panel** mit 3–5 Vorschlägen.
- User wählt per Checkbox aus → **Übernehmen**. Kein automatisches Einfügen.

---

## 7. Excel-Import für Port-Schema

1. Port öffnen → **„XLS importieren"** → Datei-Upload.
2. Backend liest Datei mit `xlsx` (Node.js). Erkennt erste Zeile als Header automatisch — oder zeigt erste 3 Zeilen zur Auswahl (*„In welcher Zeile stehen die Überschriften?"*).
3. Spalten werden als Port-Attribute vorgeschlagen (flache Liste: Name + erkannter Typ).
4. User kann einzelne Attribute abwählen oder umbenennen → **Übernehmen**.
5. Schema wird für Port-Kompatibilitätsprüfung genutzt.

---

## 8. BPMN-Generierung & Interview-Engine

### Phase 1 — Business User modelliert
Business User beschreibt Aktivitäten auf dem Canvas. Wenn fertig: **„Bereit für Review"** setzen → Architect wird benachrichtigt.

### Phase 2 — Architect generiert BPMN
- Klick auf **„BPMN generieren"** → Backend traversiert den Activity-Baum.
- **Gateway-Inferenz:**
  - Mehrere **beschriftete** Ausgangskanten → XOR-Gateway (Entscheidung).
  - Mehrere **unbeschriftete** Ausgangskanten → AND-Gateway (paralleler Split).
  - Bei unbeschrifteten Mehrfach-Kanten fragt die Interview-Engine nach: *„Passiert beides gleichzeitig, oder hängt es von einer Entscheidung ab?"*
- BPMN-Entwurf wird auf **syntaktische Vollständigkeit** (BPMN 2.0 Pflichtattribute) geprüft. Fehlende Attribute werden als `interview_questions` registriert.
- Architect sieht Entwurf im **bpmn.js Viewer** (readonly). Unvollständige Elemente sind orange markiert.

### Phase 3 — Interview-Engine
- Startet automatisch wenn offene `interview_questions` vorhanden sind.
- Stellt Business User **eine Frage nach der anderen** in einfacher Sprache (kein BPMN-Jargon).
- Beispiele:
  - *„Kann die Aktivität ‚Zahlung freigeben' von mehreren Personen gleichzeitig bearbeitet werden?"*
  - *„Gibt es eine maximale Bearbeitungszeit für ‚Rechnungen prüfen'?"*
- Fortschritt: **„X von Y Fragen beantwortet"**.
- Antworten werden als BPMN-Attribute gespeichert (Performer, Timer-Event, etc.).

### Phase 4 — Review & Export
- Architect öffnet vollständiges BPMN im **bpmn.js Editor** (read/write) für manuelle Korrekturen.
- Export als `.bpmn` (XML) → gespeichert in Supabase Storage mit Versionsnummer.

---

## 9. Deployment

### Entwicklung & SaaS
| Service | Plattform | Kosten |
|---|---|---|
| Frontend | Vercel | Kostenfrei |
| Backend (NestJS) | Railway | ~5–20 $/Monat |
| Datenbank | Supabase Cloud | Free Tier / Pay-as-you-go |
| LLM | OpenAI / Anthropic API | Pay-per-use |

### On-premise (nachrüstbar)
Docker Compose mit zwei Services:
- `app`: NestJS-Container
- `db`: Supabase self-hosted (PostgreSQL)

Kein Code-Änderung notwendig — ausschließlich Umgebungsvariablen unterscheiden sich.

---

## 10. Offene Punkte / Nicht im Scope

- **ER-Diagramm-Generierung:** Konzeptionell vorgesehen (Port-Attribute als Entities), aber nicht im initialen MVP.
- **Echtzeit-Kollaboration:** Bewusst nicht enthalten. Auto-Save + manueller Refresh ist ausreichend.
- **Mobile-Optimierung:** Desktop-first. Canvas-Interaktion setzt Maus voraus.
- **Notification-System:** Benachrichtigung des Architects bei „Bereit für Review" — Implementierungsdetail (E-Mail via Supabase Edge Functions oder einfaches Polling).
