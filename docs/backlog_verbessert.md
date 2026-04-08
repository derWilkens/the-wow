# Backlog - Verbesserungen UI/UX

## 1. ALLGEMEINE VERBESSERUNGEN

### 1.1 Elementmarkierung und Connector-Sichtbarkeit
**Priorität:** Hoch  
**User Story:** Als Benutzer möchte ich Connectoren nur bei markierten Elementen sehen, um eine übersichtliche Darstellung zu erhalten.

**Anforderungen:**
- Connectoren von Elementen sind nur sichtbar, wenn das Element markiert ist
- Ein Klick markiert das Element
- Verhalten: Klick auf anderes Element demarkiert vorheriges Element
- Visuelles Feedback: Markierung deutlich erkennbar (z.B. Hervorhebung, Rahmen)

**Akzeptanzkriterien:**
- [ ] Connectoren werden ausgeblendet bei nicht markierten Elementen
- [ ] Connectoren werden sichtbar bei markierten Elementen
- [ ] Einzelklick markiert/demarkiert Element korrekt
- [ ] Performance bleibt auch bei vielen Elementen erhalten

---

### 1.2 Inline-Textbearbeitung
**Priorität:** Hoch  
**User Story:** Als Benutzer möchte ich Texte direkt durch einfachKlick bearbeiten können.

**Anforderungen:**
- Einmaliger Klick auf Textfeld eines markierten Elements = Inline-Textbearbeitung aktiviert
- Bearbeitung beenden durch: Enter-Taste oder Klick außerhalb des Feldes
- Escape-Taste bricht Bearbeitung ab

**Akzeptanzkriterien:**
- [ ] Einmaliger Klick aktiviert Textbearbeitungsmodus eines markierten Elements
- [ ] Text kann inline bearbeitet werden
- [ ] Enter und klick außerhalb des Elements speichert Änderung
- [ ] Escape bricht ab ohne zu speichern

---

### 1.3 Login Dialog - Enter-Bestätigung
**Priorität:** Mittel  
**User Story:** Als Benutzer möchte ich mich mit Enter-Taste im Login Dialog anmelden können.

**Anforderungen:**
- Enter-Taste im Login Dialog bestätigt den Login Button
- Gilt für alle Eingabefelder im Dialog
- Button muss aktiviert sein (nicht deaktiviert), damit Enter funktioniert

**Akzeptanzkriterien:**
- [ ] Enter in Benutzername-Feld: Login wird ausgelöst (falls Passwort eingegeben)
- [ ] Enter in Passwort-Feld: Login wird ausgelöst
- [ ] Button-State wird beachtet (disabled → kein Login via Enter)

---

## 2. AKTIVITÄT NODE

### 2.1 Layout und Styling der Aktivität Node
**Priorität:** Hoch  
**User Story:** Als Benutzer möchte ich eine übersichtlichere Aktivität Node mit Icon und Rolle auf einen Blick sehen.

**Anforderungen:**
- **Inhalt:** Nur Name anzeigen (nicht "Aktivität" + Name)
- **Aktivitätstyp:** Als Icon stilisiert, oben links in der Ecke platziert
- **Rolle:** Als kleiner Text oben rechts in der Ecke
- **Swimlane:** Im gruppierten Modus wird die Beschriftung der Swimlane als Rolle definiert
- **Entfernen:** Das Wort "Aktivität" 

**Akzeptanzkriterien:**
- [ ] Node zeigt nur Aktivitätsnamen an
- [ ] Aktivitätstyp-Icon korrekt positioniert (oben links)
- [ ] Rollentextraktion korrekt (oben rechts)
- [ ] "Aktivität"-Präfix ist entfernt
- [ ] Design ist konsistent mit anderen Node-Typen

---

### 2.2 Tooltip auf Plus-Button
**Priorität:** Niedrig  
**User Story:** Als Benutzer möchte ich verstehen, was der Plus-Button tut.

**Anforderungen:**
- Mouse Over auf dem **+** Button zeigt Tooltip: "Detailablauf anlegen"
- Tooltip-Sichtbarkeit: nach ~500ms, Dauer: solange Maus über Button

**Akzeptanzkriterien:**
- [ ] Tooltip wird nach kurzer Verzögerung angezeigt
- [ ] Text ist lesbar und positioniert korrekt
- [ ] Tooltip verschwindet wenn Maus den Button verlässt

---

## 3. DETAILDIALOG AKTIVITÄT

### 3.1 Aktivitätstypen als Radiobuttons
**Priorität:** Hoch  
**User Story:** Als Benutzer möchte ich den Aktivitätstyp schnell durch Radiobuttons wählen können.

**Anforderungen:**
- Aktivitätstypen nicht als Buttons, sondern als **Radiobuttons**
- **Icons:** Links neben dem Text darstellen
- Layout: Vertikal
- Einzelauswahl: Nur ein Typ gleichzeitig möglich

**Akzeptanzkriterien:**
- [ ] Radiobuttons statt Buttons implementiert
- [ ] Icons werden links neben dem Typtext angezeigt
- [ ] Nur ein Typ wählbar
- [ ] Kein Wert ist vorgewählt 

---

### 3.2 Ausführender als Freitext
**Priorität:** Mittel  
**User Story:** Als Benutzer möchte ich den Ausführenden frei eingeben, ohne Bindung an die Benutzerverwaltung.

**Anforderungen:**
- **Entfernen:** User-Verknüpfung (Lookup zu Benutzerdatenbank)
- **Implementieren:** Reines Textfeld
- Kann beliebiger Text eingegeben werden (z.B. "Externe Agentur", "Abteilung X")

**Akzeptanzkriterien:**
- [ ] User-Verknüpfung ist entfernt
- [ ] Textfeld akzeptiert beliebige Eingabe
- [ ] Keine Validierung gegen Benutzerdatenbank
- [ ] Wert wird gespeichert und geladen

---

### 3.3 Rolle als Workspace-übergreifender Wert
**Priorität:** Hoch  
**User Story:** Als User möchte ich Rollen workspace-übergreifend definieren (wie IT-Tools).

**Anforderungen:**
- **Scope:** Rollen sind Workspace-übergreifend (nicht pro Workflow)
- **Dialog:** Analog zur IT-Tools Verlinkung implementieren
  - Dropdown zur Auswahl bestehender Rollen
  - Button "Verlinken" / "Zuordnen"
  - Option zum Erstellen neuer Rollen (oder separat verwalten?)
- **Persistierung:** Rollen zentral verwaltbar

**Akzeptanzkriterien:**
- [ ] Rollen können workspace-übergreifend definiert werden
- [ ] Verlinkungsdialog existiert und funktioniert analog zu IT-Tools
- [ ] Bestehende Rollen sind auswählbar
- [ ] Rolle wird korrekt gespeichert
- [ ] Rolle ist in anderen Workflows verfügbar

---

### 3.4 Sollzustand bei "Prüfen"-Typ
**Priorität:** Mittel  
**User Story:** Als Benutzer möchte ich bei Prüfungsaktivitäten den Sollzustand nicht ausfüllen müssen.

**Anforderungen:**
- **Bedingung:** Wenn Aktivitätstyp = "Prüfen"
- **Verhalten:** Sollzustand-Feld wird ausgeblendet
- **Pflichtfeld:** Sollzustand ist nicht erforderlich
- **Andere Typen:** Sollzustand bleibt sichtbar und erforderlich

**Akzeptanzkriterien:**
- [ ] Sollzustand wird ausgeblendet bei Typ "Prüfen"
- [ ] Sollzustand-Eingabe ist nicht erforderlich bei "Prüfen"
- [ ] Sollzustand ist sichtbar bei anderen Typen
- [ ] Validierung greift korrekt

---

### 3.5 Dauer und Verbindung ausblenden
**Priorität:** Mittel  
**User Story:** Als Benutzer möchte ich weniger überflüssige Felder in diesem Dialog sehen.

**Anforderungen:**
- **Ausblenden:** Felder "Dauer" und "Verbindung" in diesem Dialog
- **Frage:** Sind diese Felder in anderen Dialogen relevant oder ganz entfernen?

**Akzeptanzkriterien:**
- [ ] Felder "Dauer" und "Verbindung" sind nicht sichtbar
- [ ] Andere Dialoge sind nicht betroffenenen
- [ ] Ggf. Validierung angepasst

---

### 3.6 IT-Tools Rahmen vereinfachen
**Priorität:** Niedrig  
**User Story:** Als Benutzer möchte ich weniger visuelles Clutter bei IT-Tools sehen.

**Anforderungen:**
- **Entfernen:**
  - IT-Tools Rahmen (Border/Container)
  - Beschriftung "Bestehendes IT-Tool verlinken"
- **Behalten:**
  - Dropdown-Feld
  - Button "Verlinken"
- **Layout:** Minimal, inline-ähnlich

**Akzeptanzkriterien:**
- [ ] Rahmen ist entfernt
- [ ] Beschriftung ist entfernt
- [ ] Dropdown und Button sind noch vorhanden
- [ ] Design bleibt funktional

---

## 4. DETAILDIALOG VERBINDUNG

### 4.1 Transparenz des Transportmodus-Dialogs
**Priorität:** Hoch (Usability-Issue)  
**User Story:** Als Benutzer kann ich Text im Transportmodus-Dialog nicht lesen.

**Anforderungen:**
- **Problem:** Dialog ist zu transparent
- **Lösung:** Transparenz auf 0 setzen (vollständig opak)
- **Überprüfen:** Hintergrund und Text sind gut lesbar

**Akzeptanzkriterien:**
- [ ] Dialog-Hintergrund hat Transparenz = 0
- [ ] Text ist lesbar
- [ ] Kontrast erfüllt WCAG-Standards
- [ ] Andere Dialog-Funktionen nicht beeinträchtigt

---

## 5. POPUP DIALOG "DETAILABLAUF ANLEGEN"

### 5.1 Transparenz reduzieren
**Priorität:** Mittel (Usability-Issue)  
**User Story:** Als Benutzer möchte ich den PopUp Dialog besser lesen können.

**Anforderungen:**
- **Problem:** Transparenz ist zu hoch
- **Lösung:** Transparenz **reduzieren** 
- **Ziel:** Bessere Lesbarkeit bei Beibehaltung von Kontext

**Akzeptanzkriterien:**
- [ ] Dialog-Transparenz ist angepasst
- [ ] Lesbarkeit ist verbessert
- [ ] Hintergrund ist noch sichtbar (aber nicht störend)
- [ ] Kontrast erfüllt Standards

---


