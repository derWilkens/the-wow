# Screenshot Index

Stand: 2026-04-06

Dieser Ordner sammelt UI-Screenshots fuer die wichtigsten Featurebereiche. Die Dateien werden durch einen lokalen Capture-Lauf erzeugt.

## Erwartete Dateien

- `01-workspace-list.png` -> Arbeitsablauf-Uebersicht mit Karten, Explorer und Vorlagenstart
- `02-template-save-dialog.png` -> Dialog "Als Vorlage speichern"
- `03-canvas-free.png` -> Canvas ohne Gruppierung
- `04-canvas-role-lanes.png` -> Canvas mit Rollen-Swimlanes
- `05-activity-detail.png` -> Aktivitaetsdetails mit Ausfuehrenden, IT-Tools und Kommentaren
- `06-edge-detail.png` -> Verbindungsdetails mit Transport und Datenobjekten
- `07-data-object-detail.png` -> Datenobjekt-Details
- `08-transport-mode-settings.png` -> Einstellungen fuer Transportmodi
- `09-gateways-and-labels.png` -> Entscheidung, Zusammenfuehrung und sichtbare Pfadlabels
- `10-bim-cyclic-coordination.png` -> Referenzablauf fuer BIM zyklische Modellkoordination

## Aktueller Stand

- Vorhanden: `01` bis `10`
- Alle geplanten Screenshot-Dateien sind lokal erzeugt

## Erzeugung

Die Screenshots werden lokal unter Windows ueber Playwright mit dem Capture-Spec in

- `frontend/e2e/screenshots.spec.ts`

gegen den lokalen Stack erzeugt und direkt in diesen Ordner geschrieben.
