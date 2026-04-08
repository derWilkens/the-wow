# Feature And Test Status

Stand: 2026-04-08

Diese Liste konsolidiert die Features aus den Specs in `specs/` und aus den Entscheidungsrunden im Chat. Status:

- `[x]` erledigt
- `[ ]` offen oder nur teilweise umgesetzt

Die uebergeordnete Teststrategie ist in `docs/TEST_STRATEGY.md` dokumentiert.

## Features

### Aus Ursprungsspec noch offen
- [ ] BPMN-Generierung aus dem modellierten Ablauf
- [ ] BPMN-Review-/Editor-Flow
- [ ] Interview-Engine fuer fehlende BPMN-Angaben
- [ ] KI-Vorschlaege an Aktivitaeten und Ports/Objekten
- [ ] Excel-Import fuer Daten-/Port-Schemata
- [ ] Aktivitaetsbezogene Delegation und feinere Rechte auf Aktivitaetsebene

### Produktkern und Navigation
- [x] Anmeldung und Registrierung
- [x] Self-Service-Onboarding fuer neue Firmen
- [x] Multi-Tenant-Datenmodell mit `organizations` und `organization_members`
- [x] Zentraler Einstellungsdialog fuer Firma, UI und Stammdaten
- [x] Firmenweiter Rollenkatalog fuer fachliche Swimlanes
- [x] Arbeitsablaeufe pro Firma isoliert
- [x] IT-Tools pro Firma isoliert
- [x] Arbeitsablaeufe als Karten auf der Uebersicht
- [x] Hierarchischer Explorer fuer viele Detailablaeufe
- [x] Suche in der Ablaufhierarchie
- [x] Breadcrumb-/Trail-Navigation zwischen Ober- und Detailablaeufen
- [x] Oeffnen verlinkter Detailablaeufe aus der Hierarchie
- [x] Reload stellt Ablaufkontext und Breadcrumb wieder her
- [ ] Mehrmandanten-Auswahl jenseits des aktuellen Single-Context-Stands weiter ausbauen

### Arbeitsablaeufe und Detailablaeufe
- [x] Hauptarbeitsablauf anlegen
- [x] Arbeitsablauf loeschen
- [x] Detailablauf aus Aktivitaet heraus neu anlegen
- [x] Bestehenden Arbeitsablauf an Aktivitaet verlinken
- [x] Verlinkten Arbeitsablauf oeffnen
- [x] Verknuepfung loesen
- [x] Aktivitaet zeigt sichtbar, dass ein Detailablauf verknuepft ist
- [x] Gefuehrter Wizard fuer neuen Detailablauf

### Canvas-Grundinteraktion
- [x] Floating-Toolbar links mit Hover-/Focus-Expand
- [x] Start, Aktivitaet, Entscheidung, Zusammenfuehrung, Ende und Datenspeicher per Toolbar einfuegen
- [x] Toolbar-Klick fuegt in der Mitte des aktuellen Viewports ein
- [x] Toolbar-Drag-and-Drop fuegt am Drop-Ort ein
- [x] Kein Detaildialog beim Einfuegen
- [x] Smart Insert fuer lineare Sequenzen
- [x] Smart-Insert-Fallback auf View-Mitte bei unpassendem Kontext
- [x] Standard-Zoom-Controls sichtbar und unten links verankert
- [x] Panning auf freier Flaeche wieder moeglich
- [x] Viewport springt bei Delete/Drag nicht mehr auf `defaultViewport`
- [x] Optimistische Inserts erscheinen sofort
- [x] Sofortiges Draggen nach Insert springt nicht mehr zurueck
- [x] Undo/Redo fuer Canvas-Aenderungen
- [x] Umschaltbarer Canvas-Modus `Ohne Gruppierung` / `Nach Rollen gruppieren`
- [x] Swimlane-Hintergruende fuer Rollenansicht
- [x] Canvas-Suche fuer Aktivitaeten, Gateways und Datenspeicher
- [x] Status-Icon an Aktivitaeten
- [x] Ruecksprung von SIPOC in den Zeichenmodus fokussiert die Aktivitaet und ist durch Klick/Pan/Drag abbrechbar

### Verbindungen und Kanten
- [x] Verbindung zwischen bestehenden Aktivitaeten
- [x] Verbindung zwischen Datenspeicher und Aktivitaet
- [x] Verbindung durch Drop auf Node-Koerper robuster gemacht
- [x] Regression: Verbindung bleibt auch beim Loslassen auf gehighlightetem Ziel-Node-Koerper stabil
- [x] Optimistische Kantenanzeige beim Verbinden
- [x] Kantenmarkierung
- [x] Kanten per `Delete`/`Backspace` loeschen
- [x] Beim Loeschen einer Aktivitaet werden verbundene Kanten mit entfernt
- [x] Verbindung auf freie Flaeche erzeugt neue Aktivitaet
- [x] Neue Aktivitaet wird beim Connection-Drop passend zum Connector positioniert
- [x] Sichtbare Kantenlabels fuer Gateway-Pfade/Bedingungen

### Datenobjekte und Datenspeicher
- [x] UI-Begriff `Quelle` in `Datenspeicher` umbenannt
- [x] Datenspeicher als eigenstaendiger Knoten
- [x] Datenobjekte nur noch auf Kanten, nicht als freier Node
- [x] Datenobjekte bleiben Backend-Datensaetze mit `edge_id`
- [x] Einzelnes Datenobjekt wird direkt auf der Kante mit Namen angezeigt
- [x] Mehrere Datenobjekte auf einer Kante werden als Sammel-Icon mit Anzahl dargestellt
- [x] Hover zeigt Namen mehrerer Datenobjekte
- [x] Klick auf Sammel-Icon oeffnet Popover
- [x] Klick auf einzelnes Datenobjekt oeffnet ebenfalls das Management-Popover
- [x] Doppelklick auf Datenobjekt oeffnet den Detaildialog
- [x] Neues Datenobjekt auf markierter Kante anlegen
- [x] Bestehendes Datenobjekt aus demselben Arbeitsablauf an anderer Kante wiederverwenden
- [x] Doppelte Wiederverwendung auf derselben Kante verhindern
- [x] `Delete` auf selektiertem Datenobjekt loescht nur dieses Datenobjekt
- [x] Beim Loeschen einer Kante werden ihre Datenobjekte mit entfernt
- [x] Aktivitaets-Input aus eingehenden Kanten-Datenobjekten ableiten
- [x] Aktivitaets-Output aus ausgehenden Kanten-Datenobjekten ableiten
- [x] Verzweigte ausgehende Kanten bleiben fachlich unabhaengig
- [x] Direkte und indirekte Uebergaben ueber Datenspeicher modellierbar
- [x] Standardname neuer Kanten-Datenobjekte verbessert auf `Datenobjekt n`
- [x] Dummy-Startfeld fuer neue Datenobjekte entfernt
- [x] Optimistisches Schliessen des Datenobjekt-Dialogs bei Save/Delete
- [ ] Weitere UX-Politur fuer sehr volle Kanten mit vielen Datenobjekten

### Kantenattribute und Transportmodi
- [x] Hinweise/Notizen direkt an Verbindungen speicherbar
- [x] Transportmodus in Verbindungsdetails einstellbar
- [x] Transportmodi nicht mehr hart im Edge-Panel verdrahtet
- [x] Transportmodi als eigene mandantenweite Entitaet `transport_modes`
- [x] Default-Transportmodi bei neuer Firma
- [x] Transportmodus-Konfiguration im zentralen Einstellungsdialog
- [x] Transportmodus-Konfiguration nicht auf der Arbeitsablauf-Startseite
- [x] Nur `owner`/`admin` duerfen Transportmodi konfigurieren
- [x] `member` kann Transportmodi verwenden
- [x] Deaktivierte, bereits genutzte Modi bleiben an alten Kanten sichtbar
- [x] Einheitliche Custom-Choice-Liste mit Inline-Beschreibungen fuer Transportmodi
- [ ] E2E-Abdeckung fuer Member-spezifische Rechte auf Transportmodi noch offen

### Aktivitaetsdetails und Ressourcen
- [x] Aktivitaetsdetails bearbeiten
- [x] Aktivitaetstyp
- [x] Default-Aktivitaetstyp `Unbestimmt` mit Fragezeichen-Icon
- [x] Sollzustand fuer `pruefen_freigeben`
- [x] Ausfuehrenden-Freitext in Aktivitaetsdetails
- [x] Swimlane-Rolle aus der an der Aktivitaet gesetzten Rolle ableiten
- [x] Kommentare an Aktivitaeten
- [x] Rollen-Chip direkt auf Aktivitaetsknoten
- [x] IT-Tools als wiederverwendbarer Katalog
- [x] Bestehendes IT-Tool verlinken
- [x] Neues IT-Tool anlegen und direkt verlinken
- [x] Bereits verlinkte Tools nicht erneut anbieten
- [x] Verknuepfung eines Tools von Aktivitaet loesen
- [x] Dasselbe IT-Tool in mehreren Aktivitaeten und Arbeitsablaeufen wiederverwenden
- [x] Einheitliche Custom-Choice-Liste mit Inline-Beschreibungen fuer IT-Tools, Rollen und Sollzustand
- [x] Firmenweite IT-Tool-Stammdatenverwaltung im zentralen Einstellungsdialog

### Firma, UI und Stammdaten
- [x] Firmenname im Einstellungsdialog bearbeiten
- [x] Firmenname wird nach Save sofort im UI aktualisiert
- [x] UI-Praeferenzstruktur fuer Canvas-Gruppierung vorbereitet
- [x] Default-Gruppierung im Einstellungsdialog speicherbar
- [x] Transportmodi im zentralen Stammdatenbereich verwaltbar
- [x] IT-Tools im zentralen Stammdatenbereich anlegen, bearbeiten und loeschen
- [x] Loeschen verknuepfter IT-Tools wird fachlich blockiert
- [x] Rollen im zentralen Stammdatenbereich anlegen, bearbeiten und loeschen
- [x] Loeschen verknuepfter Rollen wird fachlich blockiert

### UI/UX-Backlog Phase 1
- [x] Activity Node verdichtet: Typ-Icon links oben, Rolle rechts oben, kein `Aktivitaet`-Praefix
- [x] `+`-Button an Aktivitaeten mit Tooltip `Detailablauf anlegen`
- [x] Inline-Umbenennung des Aktivitaetsnamens auf markiertem Knoten
- [x] Connectoren nur an markierten Elementen sichtbar
- [x] Login per `Enter`, wenn das Formular gueltig ist
- [x] Verbindungsdialog voll opak
- [x] Detailablauf-Dialog weniger transparent

### Zusätzliche Workflow-Views
- [x] Umschaltung zwischen Zeichenmodus und tabellarischer SIPOC-View
- [x] SIPOC-View als read-only Zweitansicht
- [x] SIPOC zeigt je Aktivitaet Supplier, Input, Prozess, Prozessrolle, Output und Consumer
- [x] Supplier/Consumer werden aus vor- und nachgelagerten Rollen abgeleitet
- [x] Input/Output werden aus kantengebundenen Datenobjekten inklusive Transportmodus abgeleitet
- [x] Prozesszelle fuehrt zur Aktivitaet im Zeichenmodus zurueck

### Arbeitsablauf-Vorlagen
- [x] Typische Standardvorlagen pro Firma
- [x] Beliebigen Arbeitsablauf als Vorlage speichern
- [x] Neuen Arbeitsablauf aus Vorlage starten
- [x] Vorlagen sind firmenweit sichtbar
- [x] Vorlagen verwenden einen Snapshot statt Live-Referenzen
- [x] Vorlagen koennen bearbeitet werden
- [x] Template-Instanzierung erzeugt keine `500` mehr
- [x] Template-Instanzierung oeffnet den neuen Arbeitsablauf wieder korrekt
- [x] Aktivitaeten und Kanten bleiben beim Erzeugen aus Vorlage korrekt verbunden
- [x] Legacy-Default-Template-Snapshots mit altem `from`/`to`-Kantenformat werden beim Instanziieren kompatibel normalisiert
- [x] Admin-SQL zum Leeren aller Fachdaten und erneuten Seeden der Default-Templates vorhanden
- [x] E2E fuer Vorlagenfluss gegen echtes Backend verifiziert

### Spec-Abweichungen / bewusst ueberholt
- [x] Datenobjekte nicht mehr als freie Canvas-Nodes, sondern bewusst nur noch kantengebunden
- [x] Transportmodus nicht mehr als einfacher Freitext/Enum an der Kante, sondern als konfigurierbare mandantenweite Entitaet
- [x] Swimlanes nicht frei manuell gepflegt, sondern in v1 aus der an der Aktivitaet gesetzten fachlichen Rolle abgeleitet
- [x] Kommentare in v1 als einfache Aktivitaets-Kommentare ohne `resolved`-Thread-Modell

### Doku-Screenshots
- [x] Screenshot-Ordner unter `docs/screenshots`
- [x] UI-Screenshots fuer Arbeitsablauf-Uebersicht, Vorlagen, Canvas, Aktivitaetsdetails, Verbindungsdetails, Datenobjekt-Dialog und Transportmodus-Einstellungen
- [x] Gateway-/Pfadlabel-Screenshot gegen echtes Backend
- [x] BIM-Referenz-Screenshot fuer zyklische Modellkoordination

### Export und Darstellung
- [x] PNG-Export
- [x] PDF-Export
- [x] Exportmenue nach Reload weiter verfuegbar
- [ ] Bundle-/Chunk-Groesse optimieren

### SaaS und Organisation
- [x] Firma anlegen
- [x] Firmenkontext ueber Reload erhalten
- [x] Isolation zwischen verschiedenen Firmen
- [x] Einladungs-API fuer Mitglieder vorhanden
- [ ] Mail-/Einladungs-Flow bewusst nicht als Pflicht-E2E abgedeckt

### Aus dem Vollstaendigkeits-Backlog noch offen
- [x] Gateways / Entscheidungsknoten
- [x] Swimlanes / Rollenbahnen, umschaltbar/toggle -> Lane ergibt sich aus fachlicher Rolle
- [x] Kommentare
- [ ] Versionsverwaltung fuer Arbeitsablaeufe
- [x] Suche innerhalb des Canvas
- [ ] Mehrfachauswahl-UX weiter ausbauen
- [x] Ausfuehrenden-Freitext plus firmenweite Rolle fuer die Swimlanes
- [ ] Metriken / Uebersichten

## Testfaelle

### Frontend Unit / Komponenten
- [x] `src/components/workspace/workspaceTree.test.ts`
- [x] `src/components/workspace/WorkspaceList.test.tsx`
- [x] `src/components/canvas/ActivityNode.test.tsx`
- [x] `src/components/canvas/WorkflowEdge.test.tsx`
- [x] `src/components/canvas/EdgeDetailPanel.test.tsx`
- [x] `src/components/canvas/canvasData.test.ts`
- [x] `src/components/canvas/ActivityDetailPopup.test.tsx`
- [x] `src/components/canvas/DataObjectPopup.test.tsx`
- [x] `src/components/canvas/GatewayNode.test.tsx`
- [x] `src/components/canvas/FloatingCanvasToolbar.test.tsx`
- [x] `src/components/canvas/WorkflowCanvas.test.tsx`
- [x] `src/components/canvas/WorkflowSipocTable.test.tsx`
- [x] `src/components/auth/AuthScreen.test.tsx`
- [x] `src/components/settings/TransportModeSettingsDialog.test.tsx`
- [x] `src/components/settings/SettingsDialog.test.tsx`
- [x] `src/components/layout/AppHeader.test.tsx`
- [x] `src/components/organization/OrganizationAccessScreen.test.tsx`
- [x] `src/components/ui/CustomChoiceList.test.tsx`
- [x] `src/App.test.tsx`

### Backend Unit
- [x] `backend/src/activities/activities.service.spec.ts`
- [x] `backend/src/organization-roles/organization-roles.service.spec.ts`
- [x] `backend/src/transport-modes/transport-modes.service.spec.ts`
- [x] `backend/src/activity-resources/activity-resources.service.spec.ts`
- [x] `backend/src/workspaces/workspaces.service.spec.ts`
- [x] `backend/src/workflow-templates/workflow-templates.service.spec.ts`
- [x] `backend/src/auth/auth.guard.spec.ts`
- [x] `backend/src/organizations/organizations.service.spec.ts`

### E2E mit vorhandenem Login-User
- [x] `e2e/activity-detail-check-sources.spec.ts`
- [x] `e2e/activity-detail-from-edge-detail.spec.ts`
- [x] `e2e/bim-cyclic-coordination.spec.ts`
- [x] `e2e/subprocess-entry.spec.ts`
- [x] `e2e/swimlane-visible-roles.spec.ts`
- [x] `e2e/edge-two-named-data-objects.spec.ts`
- [x] `e2e/gateway-second-path-label.spec.ts`
- [x] `e2e/gateways.spec.ts`
- [x] `e2e/canvas-view.spec.ts`
- [x] `e2e/connections.spec.ts`
- [x] `e2e/data-object-edge.spec.ts`
- [x] `e2e/edge-attributes.spec.ts`
- [x] `e2e/export.spec.ts`
- [x] `e2e/insertion.spec.ts`
- [x] `e2e/it-tools.spec.ts`
- [x] `e2e/smart-insert.spec.ts`
- [x] `e2e/toolbar-dnd.spec.ts`
- [x] `e2e/transport-modes.spec.ts`
- [x] `e2e/workflow-hierarchy.spec.ts`
- [x] `e2e/workspace-navigation.spec.ts`
- [x] `e2e/template-regressions.spec.ts`
- [x] `e2e/settings-master-data.spec.ts`
- [x] `e2e/sipoc-view.spec.ts`

Hinweis: Die Login-gebundene Suite laeuft mit `E2E_EMAIL`/`E2E_PASSWORD` gegen die lokale Preview. `playwright.config.ts` zeigt standardmaessig auf `http://127.0.0.1:4174`; die aktuellen verifizierten Browserlaeufe wurden gegen `http://127.0.0.1:4175` ausgefuehrt. Der letzte komplette Vollsuiten-Stand in dieser Session ist jetzt `54 passed / 1 skipped`.
Zusaetzlich ist ein eigener headed Referenztest fuer `BIM zyklische Modellkoordination` vorhanden, inklusive Detailablaeufen, IT-Tools, Datenobjekten, Transportmodi, Gateway-Labels und expliziter Merge-Variante. Zwei kleine Repro-Specs haerten jetzt die zuletzt gefundenen Problemstellen vor dem Gesamtszenario:
- `e2e/subprocess-entry.spec.ts`
- `e2e/swimlane-visible-roles.spec.ts`
- Weitere gezielte Repro-Specs haerten die juengsten Edge-/Dialog-Regressionsstellen:
  - `e2e/gateway-second-path-label.spec.ts`
  - `e2e/activity-detail-from-edge-detail.spec.ts`
  - `e2e/edge-two-named-data-objects.spec.ts`
- E2E-Testdaten mit Timestamp-Suffix verwenden jetzt einheitlich `testSuffix()` aus `frontend/e2e/helpers.ts`; fuer Namen und fachliche Bezeichnungen reichen die letzten `3` Stellen.

### E2E ohne vorhandene Login-Credentials
- [x] `e2e/saas-organizations.spec.ts` -> Self-Service Signup, Firmenanlage, erster Arbeitsablauf
- [x] `e2e/saas-organizations.spec.ts` -> Isolation zwischen Firmen
- [x] `e2e/saas-organizations.spec.ts` -> Reload behaelt Firmenkontext
- [ ] `e2e/saas-organizations.spec.ts` -> Einladungs-/Mitgliedsflow bewusst deaktiviert

## Letzter verifizierter Stand

- [x] Frontend Build
- [x] Frontend Unit-Tests
  - `68 / 68` gruen
- [x] Backend Build
- [x] Backend Tests
  - `22 / 22` gruen
- [x] Admin-Reset-SQL fuer komplettes Leeren der Fachdaten und erneutes Seeden von Default-Templates
- [x] Mock-/Fallback-Services fuer `assignee`, `activity_comments` und `workflow_templates`
- [x] Self-Service-/SaaS-E2E ohne Mail-Einladung
- [x] Canvas-View-E2E gegen lokale Preview
- [x] Transportmodus-E2E fuer Settings-Flow
- [x] Zentraler Settings-/Stammdaten-E2E
  - `e2e/settings-master-data.spec.ts`: `1 passed`
- [x] Rollen-/Ausfuehrenden-Modell lokal auch ohne eingespielte Migration `013` per Fallback verifiziert
- [x] Vorlagen-Regressionen gegen echten lokalen Stack
- [x] Lokaler Screenshot-Capture fuer `01` bis `10`
- [x] Credential-gebundene E2E-Gesamtsuite in dieser Session komplett durchgelaufen
  - `54 passed`
  - `1 skipped`
- [x] BIM-Referenzblock erneut gruen
  - `e2e/bim-cyclic-coordination.spec.ts`: `2 passed`
  - `e2e/subprocess-entry.spec.ts`: `1 passed`
  - `e2e/swimlane-visible-roles.spec.ts`: `1 passed`
- [x] Junger Edge-/Dialog-Stabilitaetsblock erneut gruen
  - `e2e/gateway-second-path-label.spec.ts`: `1 passed`
  - `e2e/activity-detail-from-edge-detail.spec.ts`: `1 passed`
  - `e2e/edge-two-named-data-objects.spec.ts`: `1 passed`
  - `e2e/activity-detail-check-sources.spec.ts`: `1 passed`
