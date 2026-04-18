Du bist eine hochmoderne KI für Softwareentwicklung mit Fokus auf UX/UI-Design und Human-Computer-Interaction (HCI). Entwickle ein Konzept für **direkte Manipulationsfunktionen** grafischer Knoten (Nodes) in einer Modellierungssoftware (z. B. BPMN-, Diagramm- oder Whiteboard-Tool wie Miro/Mural), das die **neuesten wissenschaftlichen Erkenntnisse zu Interaktion und Affordanzen** (Stand 2026) vollständig umsetzt. Berücksichtige dabei Erkenntnisse aus HCI-Forschung, Eye-Tracking-Studien, Gestaltungsgestalt-Theorie, Embodied Cognition und modernen Input-Modi (Multimodalität: Touch, Maus, Gesten, Voice, AR/VR-Integration).

## Kernanforderungen (direkte Manipulation der Knoten):
Implementiere diese grundlegenden Interaktionen als nahtlose, intuitive Features:
- **Verschieben** (Drag & Drop mit Physik-Simulation)
- **Vergrößern/Skalieren** (Pinch/Drag mit proportionaler Anpassung)
- **Verlinken/Verbinden** (Magnetische Snapping, Auto-Routing)
- **Gruppieren** (Multi-Select mit Containern)
- **Ausrichten** (Auto-Layout, Grid/Snap-to-Grid)
- **Drehen, Duplizieren, Löschen, Locken** (inkl. Undo/Redo mit Zeitreise)
- **Z-Layer-Management** (Send to Back/Front mit visueller Hierarchie)

## Wissenschaftliche Basis (neueste Erkenntnisse integrieren):
1. **Affordanzen (Gibson, Norman 2023+)**: Mach jede Aktion **visuell vorhersagbar** durch dynamische Cues (Schatten bei Hover, Glowing bei Drag-Start, Pfeile für Verlinkung, Bounding-Box bei Gruppierung). Nutze **implizite Affordanzen** (Form folgt Funktion) und **kulturelle Affordanzen** (Icons + Tooltips).
2. **Gestaltprinzipien (2025-Studien)**: **Nähe, Ähnlichkeit, Kontinuität, Abschluss** für automatische Gruppierungserkennung via ML (z. B. Cluster-Ausrichtung bei Drag).
3. **Fitts's Law & Steering Law (optimierte Versionen)**: Minimiere **Zielgröße** und **Distanz** – Targets dynamisch vergrößern bei Proximity (Progressive Disclosure).
4. **Embodied Interaction (2026-Papers)**: **Physikbasierte Animationen** (Inertia, Bouncing, Friction) für natürliches Feedback. Integriere **Haptics** (Vibration bei Snap) und **Spatial Audio** (Sound-Cues bei Aktionen).
5. **Multimodale Eingabe (CVI 2025)**: Unterstütze **Simultane Modi**:
   - Maus/Touch: Präzise Manipulation
   - Gesten: Swipe zum Löschen, Pinch zum Zoomen
   - Voice: "Verbinde Knoten A mit B", "Gruppe auswählen"
   - Keyboard-Shortcuts: Contextual (z. B. G=Gruppieren)
6. **Predictive Interaction (AI-gestützt, NeurIPS 2025)**: **KI-Vorhersage** von Aktionen (z. B. Auto-Verlinkung vorschlagen, basierend auf User-History und Modell-Semantik). Context-Aware Undo („Meintest du das?“).
7. **Accessibility (WCAG 3.0, 2026)**: Screenreader-kompatibel (ARIA-Live-Regions), High-Contrast-Modi, Reduced-Motion-Option, Keyboard-Navigation (Rotor-ähnlich).
8. **Performance & Responsiveness (60fps Regel)**: **Sub-16ms Latency** für Drag-Feedback. Progressive Rendering für große Canvas.

## Deliverables:
Erstelle ein **vollständiges UI/UX-Spec**:

1. **Feature-Liste** mit Pseudocode für jede Interaktion (z. B. Drag-Handler mit Snap-Logic).
2. **Animierungs-Spezifikation** (GSAP/Framer-Motion-Style).
3. **Test-Szenarien** (basierend auf SUS, NASA-TLX für Usability).
4. **Benchmark** gegen Miro/Mural: "Wie übertrifft das den State-of-the-Art?"

**Ziel**: Die Software muss so intuitiv sein, dass **neue Nutzer in <2 Minuten** komplexe Modelle bauen können, mit **Zero Learning Curve** und **Zero Frustration**. Optimiere für **Flow-State** (Csikszentmihalyi). Keine Tutorials nötig – die Affordanzen **lehren selbst**.

Generiere den vollständigen Prototypen-Code oder ein detailliertes Entwicklungs-Backlog.