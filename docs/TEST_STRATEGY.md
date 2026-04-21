# Test Strategy

Stand: 2026-04-21

## Zielbild

Die Teststrategie fuer dieses Projekt folgt einem einfachen Prinzip:

1. kleine, gezielte Regressionen zuerst absichern
2. danach groessere Referenzfluesse verifizieren
3. Unit-, Backend- und Browser-Tests zusammen als Lieferkette betrachten

Der Fokus liegt nicht nur auf Abdeckung, sondern auf **schneller Eingrenzung von Fehlern** und **stabilen E2E-Laeufen gegen den echten lokalen Stack**.

## Testpyramide

### 1. Frontend Unit / Komponententests

Zweck:
- UI-Logik isoliert pruefen
- Rendering, Zustandswechsel und Eingabewege schnell absichern
- Regressionen ohne Browser-Overhead eingrenzen

Typische Ziele:
- Canvas-Komponenten
- direkte Manipulation auf dem Canvas
- Detaildialoge
- Toolbar
- Choice-Listen
- Swimlane-Darstellung
- Activity-/Edge-/Data-Object-Komponenten
- Auth- und Keyboard-Interaktionspfade

Regel:
- neue oder geaenderte UI-Funktion moeglichst mit eigenem Komponenten- oder Unit-Test absichern

### 2. Backend Unit- / Service-Tests

Zweck:
- Persistenzlogik, Rechtepruefungen und Mapping isoliert pruefen
- Snapshot-/Clone-/Normalisierungslogik robust halten

Typische Ziele:
- Activities
- Workspaces
- Templates
- Organization Roles
- Transportmodi
- Activity-Resources
- Auth Guard

Regel:
- wenn ein Fehler klar im Service-/API-Verhalten liegt, zuerst dort reproduzieren

### 3. Browser-E2E

Zweck:
- echte Benutzerpfade gegen den lokalen Stack pruefen
- UI, API, Persistenz und Reload-Verhalten gemeinsam absichern

Typische Ziele:
- Canvas-Interaktion
- Hierarchie / Detailablaeufe
- Vorlagen
- Settings- und Stammdatenfluesse
- Transportmodi
- IT-Tools
- Export
- BIM-Referenzszenario

## Zentrale Arbeitsregel bei E2E-Fehlern

Wenn ein grosser E2E- oder Referenztest fehlschlaegt:

1. Fehler **kurz in `docs/bugs.md` dokumentieren**
2. das konkrete Verhalten in einer **kleinen separaten Repro-Spec** isolieren
3. diese kleine Spec **gruen ziehen**
4. erst danach den grossen Referenztest erneut laufen lassen

Diese Regel ist inzwischen fester Bestandteil der Strategie.

## Warum diese Strategie hier wichtig ist

Das Projekt kombiniert:
- React Flow
- optimistische UI
- mehrstufige Workflow-Hierarchien
- echte Persistenz gegen Backend/Supabase
- komplexe Browserpfade

Wenn man dabei nur grosse End-to-End-Szenarien betrachtet, werden Fehler schwer lokalisierbar. Kleine Repro-Specs halten die Fehlerflaeche klein und machen anschliessende Referenzlaeufe deutlich verlaesslicher.

## Browser-Teststrategie im Detail

### Lokaler Stack

Browsertests sollen gegen den **echten lokalen Stack** laufen:

- Frontend Preview
- lokales Backend

Wichtige Variablen:
- `E2E_EMAIL`
- `E2E_PASSWORD`
- optional `E2E_BASE_URL`
- optional `E2E_API_BASE_URL`

### Playwright-Konfiguration

Grundsaetze:
- `workers: 1`
- echte Login-Flows nur mit expliziten Credentials
- gezielte Runs vor Vollsuite
- Screenshots/Trace bei Fehlern behalten

`workers: 1` ist bewusst gesetzt, weil parallele Browserlaeufe mit gemeinsamem Datenkontext in diesem Projekt zu flakey Seeding-/Cleanup-Verhalten gefuehrt haben.

### Reihenfolge bei Browser-Validierung

Empfohlene Reihenfolge:

1. gezielte Repro-Spec
2. betroffene Feature-Spec
3. groesserer Referenztest
4. erst danach Vollsuite

## Referenztests

### BIM-Referenztest

Datei:
- `frontend/e2e/bim-cyclic-coordination.spec.ts`

Rolle:
- hoechstwertiger fachlicher Referenztest fuer realistische Modellierung
- prueft:
  - Hauptworkflow
  - Detailablaeufe
  - Gateways
  - Merge
  - IT-Tools
  - Datenobjekte
  - Transportmodi
  - Reload
  - Swimlane-Ansicht

Regel:
- diesen Test nicht als ersten Diagnosepunkt fuer kleine UI-Fehler benutzen
- erst nach erfolgreichen Repro-/Feature-Tests erneut laufen lassen

### Fokussierte Repro-Specs

Aktuelle Beispiele:
- `frontend/e2e/group-selection.spec.ts`
  - lasso selection -> group action -> persistent group after reload
  - same focused spec now also covers rename + collapse + reload persistence
- `frontend/e2e/subprocess-entry.spec.ts`
  - submenu-/trigger-bezogenes Verhalten auf dichtem Canvas
- `frontend/e2e/swimlane-visible-roles.spec.ts`
  - echte Lane-Bildung nur fuer auf dem sichtbaren Canvas vorkommende Rollen
- `frontend/e2e/gateway-second-path-label.spec.ts`
  - sequentielle Beschriftung zweier ausgehender Gateway-Kanten
- `frontend/e2e/activity-detail-from-edge-detail.spec.ts`
  - sicherer Wechsel vom offenen Edge-Dialog in die Aktivitaetsdetails
- `frontend/e2e/edge-two-named-data-objects.spec.ts`
  - zwei benannte Datenobjekte nacheinander im selben Edge-Dialog
- `frontend/e2e/settings-master-data.spec.ts`
  - geschaeftsnaher Settings-Flow fuer Firmenname, UI-Praeferenz, Rollen, IT-Tool-Stammdaten und Transportmodus-Stammdaten
- `frontend/e2e/sipoc-view.spec.ts`
  - geschaeftsnaher View-Repro fuer die tabellarische SIPOC-Sicht
  - nutzt API-Setup fuer ein stabiles, gezieltes Tabellen-Sollbild statt langer Canvas-Vormodellierung im Browser
- `frontend/e2e/workflow-details.spec.ts`
  - gezielter Repro fuer den neuen Header-Einstieg in die Details des aktuellen Arbeitsablaufs
  - prueft Oeffnen, Speichern und erneutes Oeffnen nach frischem Login
- `frontend/e2e/view-preferences.spec.ts`
  - gezielter Repro fuer sichtbare/unsichtbare optionale Views im Header
  - prueft Defaults, Aktivierung, Deaktivierung und den aufgeraeumten Header ohne Suche/Export
  - Persistenz laeuft ueber `/user-preferences/ui_preferences`
- `frontend/e2e/activity-type-quick-change.spec.ts`
  - gezielter Repro fuer den direkten Typwechsel am Aktivitaets-Node
  - prueft Tooltip, Popover, sofortiges Speichern und Persistenz ueber eine frische Sitzung
- `frontend/e2e/source-z-layer.spec.ts`
  - gezielter Repro fuer `nach vorne` / `nach hinten` bei ueberlappenden Datenspeichern
  - prueft Persistenz nach Reload
- `frontend/e2e/quick-align.spec.ts`
  - gezielter Repro fuer Mehrfachselektion plus `Links ausrichten`
  - prueft `Links ausrichten`, `Horizontal verteilen` und Persistenz nach Reload
- `frontend/e2e/magnetic-connection-targets.spec.ts`
  - gezielter Repro fuer die UI-Praeferenz `Magnetische Verbindungsziele`
  - prueft ausgeschaltetes und wieder eingeschaltetes Preview-Verhalten nach Reload
- `frontend/e2e/theme-preferences.spec.ts`
  - gezielter Repro fuer benutzerbezogene Theme-Persistenz
  - prueft `System`, `Hell`, `Dunkel` und Reload-Verhalten ueber `/user-preferences/ui_preferences`

Diese Specs sind absichtlich klein und diagnostisch stark.

## Dokumentationsregel bei Fehlern

Wenn ein reproduzierbarer Fehler gefunden wird:

1. kurz in `docs/bugs.md` erfassen
2. Ursache nicht ausschmuecken, sondern knapp beschreiben
3. wenn ein Repro-Test angelegt wurde, die Spec-Datei nennen

So bleiben Bugs, Repro und Fixstrategie nachvollziehbar gekoppelt.

## Cleanup-Regeln fuer E2E

Nach E2E-Laeufen mit echten Daten:
- erstellte Workflows wieder loeschen
- erstellte Organisationen wieder loeschen
- ggf. erstellte Testnutzer wieder loeschen
- wiederverwendbare Katalogdaten gezielt bereinigen

Das ist wichtig, damit Folge-Laeufe nicht durch Altlasten verfaelscht werden.

## Benennungsregel fuer Testdaten

Wenn in Testfaellen Namen oder Bezeichnungen von Entitaeten mit einem Timestamp versehen werden, ist fuer die Unterscheidbarkeit in diesem Projekt in der Regel **ein kurzer Suffix mit den letzten 3 Stellen** ausreichend.

Beispiele:
- `Vorlage 381`
- `BIM Scenario Org 472`
- `Navigation Child 905`

Diese Regel gilt fuer:
- Workflows
- Organisationen
- Vorlagen
- Testdatenobjekte
- andere temporaere Testentitaeten

Ziel:
- Testdaten bleiben eindeutig genug
- Namen bleiben im UI lesbar
- Screenshots, Traces und Fehlerberichte werden leichter auswertbar

Nur wenn eine konkrete Kollision sichtbar wird, sollte ein laengerer Suffix verwendet werden.

## Wann die Vollsuite sinnvoll ist

Die Vollsuite ist sinnvoll:
- vor groesseren Meilensteinen
- nach mehreren verbundenen UI-/API-Aenderungen
- wenn gezielte Feature- und Repro-Tests bereits gruen sind

Bei zusammenhaengenden Verwaltungsfunktionen wie dem zentralen Settings-Dialog gilt zusaetzlich:

1. erst Frontend-Komponenten testen
2. dann Backend-Service-/Rechteverhalten testen
3. dann einen gezielten geschaeftsnahen E2E-Pfad anlegen
4. erst danach eine groessere Gesamtsuite erwägen

Die Vollsuite ist **nicht** das beste erste Diagnosewerkzeug fuer einen frisch gefundenen Einzelbug.

## Dokumente und ihre Rollen

- `docs/TEST_STRATEGY.md`
  - zentrale Teststrategie und Arbeitsregeln
- `docs/FEATURE_AND_TEST_STATUS.md`
  - Status: was umgesetzt und was verifiziert ist
- `docs/WORKING_NOTES.md`
  - praktische Arbeitsnotizen und operative Hinweise
- `docs/ARCHITECTURE_AND_STATUS.md`
  - Architekturueberblick plus Verifikationsstand
- `docs/bugs.md`
  - kurze Liste konkreter Fehlerbilder

## Aktuell bewährte Leitlinien

- erst kleine Repros, dann grosse Referenzszenarien
- Assertions moeglichst auf den relevanten Dialog oder Bereich scopen
- bei alternativen Ansichten wie SIPOC zuerst die reine Ableitungslogik per Unit-Test absichern und erst dann die View-Umschaltung im Browser pruefen
- bei workflowweiten Metadaten zuerst den direkten Update-Pfad im Backend testen, dann den Dialog isoliert als Komponente und erst danach den Header-Einstieg im Browser pruefen
- bei UI-Praeferenzen fuer sichtbare Views zuerst den Header und den Settings-Dialog als Komponenten absichern und dann einen kleinen Browsertest fuer Persistenz und Sichtbarkeit anlegen
- bei benutzerbezogenen UI-Praeferenzen keine `localStorage`-Annahmen mehr in E2E verwenden; produktive Persistenz laeuft ueber `user_preferences`
- bei kleinen Direktinteraktionen auf dem Node zuerst den isolierten Komponentenpfad testen und danach einen schmalen Browser-Repro fuer Speichern plus Persistenz anlegen
- bei neuer Canvas-Direktmanipulation denselben Ablauf verfolgen:
  - Komponentenlogik fuer Selection/Popover
  - danach ein kleiner Browser-Repro fuer echten Pointer-Flow und Reload-Persistenz
- bei neuen Gruppenfunktionen denselben Ablauf verfolgen:
  - zuerst `GroupNode` / `WorkflowCanvas` als Komponente absichern
  - danach einen kleinen Browser-Repro fuer rename/collapse plus Reload-Persistenz anlegen
- bei neuer Z-Layer-Steuerung denselben Ablauf verfolgen:
  - zuerst die persistente Reihenfolge im App-/Canvas-State absichern
  - danach Gruppen- und Datenspeicher-Aktionen isoliert in Canvas-Komponententests pruefen
  - erst dann den Browser-Repro ergaenzen
- wenn dieselbe Erstellungs- oder Auswahlaktion an mehreren Einstiegspunkten existiert, zuerst eine gemeinsame Formular- oder Optionskomponente schaffen und dann beide Einstiege gezielt gegeneinander absichern
- bei visuellen Oberflaechenregeln wie Dialog-/Popover-Transparenz zuerst die gemeinsamen CSS-Surfaces zentralisieren und dann nur gezielt die betroffenen Komponenten gegen Build plus kleine Komponententest-Sets pruefen
- bei React-Flow-Hitbox-Problemen lieber gezielt robust machen als globale Workarounds bauen
- Browsertests gegen den lokalen echten Stack ernst nehmen, nicht gegen zufaellige entfernte Deployments
- Testdaten immer aktiv bereinigen

