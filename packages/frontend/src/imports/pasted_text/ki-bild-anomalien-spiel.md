KI-Bild-Anomalien-Spiel


🎯 Kern-Ziel
Webanwendung, in der Spieler**innen KI-generierte Bilder betrachten, innerhalb einer begrenzten Zeit Anomalien erkennen und durch Klick markieren. Nach jeder Runde wird gezeigt, welche Fehler vorhanden waren.

Kontext: Festival-Stand, Zielgruppe Kinder & Erwachsene (humorvolle Avatar-Auswahl statt expliziter Altersabfrage)

Ausgabe: Desktop-First 


📱 Screenflows (für Prototyp)
1. Startseite
Titel: „KI im Visier"
Illustration (Fuchs KI Avatar) und Erklärungstext
1 große Button (Primary): Spiel starten | 
Secundärer Button: Admin
Einfaches, visuelles Design
2. Name + Avatar-Auswahl
Textfeld: Spielername eingeben
2 Fuchs-Avatar-Varianten auswählen (humorvolle Namen: z.B. Jungfuchs → Erzfuchs)
Funktion: bestimmt später die Bildauswahl (Level-Filter)
Visuell: große Avatar-Icons mit Label
- Spiel Level Auswahl: 1 einfach + 1 mittel + 1 schwer
Spiel starten Button (nur aktiv wenn Name + Avatar gewählt)
3. Spielbildschirm – Obere Leiste
[Treffer: 1/3]  [⏱️ 0:45 Uhr]  [Fehlversuche: 2/6]

Treffer-Status: gefunden / insgesamt
Countdown-Timer (wird rot bei wenig Zeit)
Fehlversuch-Counter
3. Spielbildschirm – Bildbereich
Bild zentriert und skaliert
Klickbare freie Formen (Polygone) 
Markierter Bereich bleibt nach Auswahl bestehen (3 AuswahlPunke können gesetzt werden) 
Ausgewählte Bereiche könen vom Nutzer so lange verschoben (verändert) werden, solange der Nutzer nicht zum n#chsten Bild übergeht oder der Timer abgelaufen ist.

Feedback nach Ablauf des Times pro Bild oder durch Abschließen der ersten Aufgabe (erstes) Bild:
Korrekter Treffer: grünes Check Haken Icon → Bereich wird mit grüner Umrandung/Pin markiert
Fehlende Bereiche: oranges Info Icon → Bereich wird mit oranger Umrandung/Pin markiert


5. Rundenende – Automatische Auslöser
Alle Fehler gefunden
Zeit abgelaufen
Max. Fehlversuche erreicht
Spieler klickt Fertig 

6. Ergebnisansicht nach einer Runde
Bild mit allen Anomalien sichtbar:
✅ Gefundene Bereiche: grün hinterlegt
❌ Nicht gefundene Bereiche: orange hinterlegt
Pro Bereich: Erklärungstext angezeigt
Score dieser Runde: große, prominente Zahl
Button: Weiter zum nächsten Bild  oder Zur Gesamtauswertung (je nach Runde)
7. Gesamtauswertung (nach 3 Aufgaben)
Spielername + Avatar (oben)
Statistik:
Gesamtpunktzahl (großes Highlight)
Gefundene Fehler gesamt (z.B. 8/9)
Score pro Aufgabe (Balken oder kleine Tabelle)
Leaderboard-Platzierung: „Du bist #5 von 42 Spieler:innen"
Button: erneut versuchen
8. Admin-Screen
Tabelle oder Liste:
Rang (1, 2, 3, …)
Spielername
Avatar (Icon)
Gesamtpunktzahl
(Optional: Datum, Zeit)
Bild einfügen/hochladen
Kritische Bereiche als freie Formen einzeichnen
Pro Bereich: Pflicht-Erklärtext
Speichern/Veröffentlichen nur wenn vollständig:
Bild vorhanden
Kategorie gewählt
Eignungs-Tag gewählt (kinderfreundlich / allgemein)
mind. 1 kritischer Bereich
Erklärung je Bereich
max. Fehlversuche festgelegt
Zeitlimit festgelegt
keine überlappenden Fehlerbereiche
Fertig-Button speichert Bild + Bereiche + Erklärungen + Einstellungen
Pro Bild ca. 3 Fehlerbereiche; Anzahl Bereiche = Anzahl zu findender Fehler
Überlappungsprüfung beim Zeichnen oder spätestens beim Speichern
Bearbeitung veröffentlichter Bilder möglich (Recheck Editor + Schwierigkeit, Löschen/Hinzufügen)
Alte Scores bleiben unverändert, wenn ein Bild nachträglich geändert wird
Status: draft / published / archived




🎮 Kernmechaniken (Prototyp-fokussiert)
Aufbau eines Spiels
Exakt 3 Aufgaben, nacheinander
Pro Aufgabe: 1 Bild mit ~3 Anomalie-Bereichen
Avatar-Level beeinflusst Bildmotive: (kinderfreundlich vs. allgemein) – Backend-Detail, visuell nicht wichtig für Prototyp
Klick-Erkennung
Klick wird gegen freie Polygon-Formen geprüft
Hit: Klick liegt innerhalb eines unmarkierten Fehlerbereichs → grüne Markierung, Score aktualisieren
Duplicate: Klick auf bereits markiertem Bereich → ignorieren
Miss: Klick außerhalb aller Bereiche → rotes Feedback, Fehlversuch +1
Timer & Rundenende
Timer countdown von oben herab (z.B. 60 Sekunden)
Runde endet bei: Alle gefunden ODER Zeit 0 ODER Max. Fehlversuche ODER Überspringen
Scoring (vereinfacht für Prototyp)
hitRatio = gefundene / insgesamt (z.B. 2/3 = 0,67)

baseScore = 1000 * hitRatio

timeBonus = 250 * hitRatio * (time_left / time_limit)

wrongPenalty = 300 * (wrong / maxWrong)

finalScore = baseScore + timeBonus - wrongPenalty

(clamped auf 0–1000)

Beispiel: 2/3 gefunden, 20s von 60s übrig, 1 Fehler von 6 → ~674 Punkte


✨ Must-Haves für Prototyp
✅ Startseite mit Buttons
✅ Name + Avatar-Auswahl
✅ 3 Spielrunden (leicht/mittel/schwer)
✅ Bild-Canvas mit interaktiven Polygon-Trefferbereichen
✅ Timer (Countdown sichtbar)
✅ Treffer/Fehlversuch-Anzeige (obere Leiste)
✅ Feedback-Popups (Haken/X)
✅ Rundenende-Auslöser
✅ Ergebnisansicht mit Auflösung (grün/rot) + Erklärungen
✅ Gesamtauswertung mit Leaderboard-Platzierung
✅ Einfaches Leaderboard



🎨 UX/UI-Highlights
Klare Hierarchie: Name/Avatar → Spielfeld → Ergebnisse → Leaderboard

Responsive: Bilder skalieren auf Bildschirmgröße, Klick-Bereiche passen sich an
Humorvolle Ton: Avatar-Namen (Jungfuchs, Waldmeister-Fuchs, Erzfuchs) schaffen Leichtigkeit
Farbcodierung:
🟢 Grün = Treffer
🔴 Orange = Fehler/Nicht gefunden
⏱️ Countdown: grün → gelb → rot
Große Touch-Ziele: Avatar, Buttons, Timer gut erkennbar (Festival-Stand, auch Kinder)


🔄 Prototyp-Iterationen
Phase 1: Grundgerüst
3 Screens: Start → NameAvatar → Game → Result → Leaderboard
Statische Mock-Daten (3 Bilder)
Timer funktioniert
Klick-Erkennung auf Polygone (react-konva o.ä.)
Phase 2: Feedback & Interaktion
Popups (Haken/X) bei Hit/Miss
Obere Leiste aktualisiert in Echtzeit
Rundenende-Logik
Scoring-Berechnung
Phase 3: Polish & Leaderboard
Ergebnisansicht mit grün/rot
Leaderboard mit Mock-Daten
Styling/Responsive Design
Fehlerbehandlung (z.B. Timer läuft ab, alle gefunden etc.)




