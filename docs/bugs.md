##UI
- [x] #1 beim ziehen einer neuen verbindung rastet bei einem bestimmten abstand zum ziel connctor das ende der Linie ein. Wenn dann losgelassen wird, funktioniert die Verbindung. Zieht man noch weiter auf die Aktivität, sodass der Cursor  zum Kreuz wird und die Aktivität gehighlited wird, funktioniert die verbindung nicht

- [x] #2 Anlegen aus Vorlage schlägt fehl: {"statusCode":500,"message":"Internal server error"}, Arbeitsablauf wird aber angelegt, jedoch nicht geöffnet

- [x] #3 die Aktivitäten des Arbeitsablaufs, der aus der Vorlage erstellt wurde, sind nicht miteinander verbunden

- [x] #4 Vorlagen können nicht bearbeitet werden

- [x] #5 BIM-Referenztest: Der Subprocess-Trigger auf spaeteren Aktivitaeten war im dichten Canvas nicht stabil oeffenbar, weil der Activity-Node-Subtree Pointer-Events abgefangen hat. Repro-Test angelegt in `frontend/e2e/subprocess-entry.spec.ts`.

- [x] #6 BIM-Referenztest: Die Assertions fuer `Koordinationsbericht` / `BCF-Rueckmeldungen` im Aktivitaetsdetail sind aktuell zu breit und kollidieren mit gleichnamigen Edge-Datenobjekt-Chips. Die Pruefung muss konsequent auf den Detaildialog gescoped werden.

- [x] #7 BIM-Referenztest: In der Swimlane-Ansicht wurden Lanes fuer `TGA` und `Tragwerk` auf dem Hauptcanvas erwartet, obwohl dort auf dieser Ebene keine sichtbaren Aktivitaeten dieser Rollen liegen. Es braucht einen separaten Repro fuer das tatsaechliche Lane-Bildungsverhalten pro sichtbarem Canvas.

- [x] #8 Gateway-E2E: Beim sequentiellen Labeln zweier ausgehender Entscheidungskanten blieb gelegentlich die erste Kante selektiert oder der Dialog hing am alten Edge. Behoben durch Repro `frontend/e2e/gateway-second-path-label.spec.ts`, Edge-Dialog-Reset bei Edge-Wechsel und robustere Edge-Selection im Helper.

- [ ] #9 Check-Source-E2E: Der Wechsel vom offenen Edge-Dialog zur Aktivitaetsdetailansicht ist in `activity-detail-check-sources.spec.ts` nicht robust genug. Das konkrete Verhalten muss als kleiner Repro abgesichert werden, bevor der Check-Source-Flow erneut breit geprueft wird.

- [ ] #10 Edge-Dialog: Beim schnellen zweiten Anlegen eines benannten Datenobjekts auf derselben Kante bleibt der erste Inline-Rename zu lange offen. Dadurch kann der zweite Name in die erste Zeile geschrieben werden. Repro: `frontend/e2e/edge-two-named-data-objects.spec.ts`.

- [x] #11 E2E-Landing: `ensurePostLoginLanding()` war auf dem Organisations-Auswahlbildschirm bei Mehrfirmen-Nutzern nicht robust genug und fiel trotz sichtbarer Firmenkarten in den finalen Workflow-Expect. Behoben durch API-gestuetztes Setzen der aktiven Firma plus erneuten UI-Fallback.

