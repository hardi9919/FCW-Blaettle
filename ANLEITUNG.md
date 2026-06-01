# FCW-Blättle – Einrichtungsanleitung

## Übersicht
Diese PWA zeigt die FCW-Blättle PDFs als blätterbare Hefte an.
PDFs werden automatisch per E-Mail eingeliefert.

---

## Schritt 1: GitHub Repository anlegen

1. Gehe auf https://github.com → "New Repository"
2. Name: `fcw-blaettle`
3. **Public** auswählen (für kostenloses GitHub Pages)
4. Repository erstellen
5. Diesen Projektordner hochladen:
   ```
   git init
   git add .
   git commit -m "FCW-Blättle Initial"
   git branch -M main
   git remote add origin https://github.com/DEIN-USERNAME/fcw-blaettle.git
   git push -u origin main
   ```

---

## Schritt 2: GitHub Pages aktivieren

1. Repository → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`, Ordner: `/public`
4. Speichern
5. Nach 2-3 Minuten ist die App erreichbar unter:
   `https://DEIN-USERNAME.github.io/fcw-blaettle/`

---

## Schritt 3: Gmail API einrichten

1. Gehe auf https://console.cloud.google.com
2. Neues Projekt erstellen: "FCW-Blaettle"
3. APIs & Dienste → Bibliothek → "Gmail API" → Aktivieren
4. OAuth-Zustimmungsbildschirm → Extern → Deine E-Mail eintragen
5. Anmeldedaten → OAuth-Client-ID → Desktop-App
6. JSON herunterladen → das ist `credentials.json`
7. Einmalig lokal ausführen um Token zu erzeugen:
   ```
   pip install google-api-python-client google-auth-oauthlib
   python scripts/generate_token.py
   ```
   → Browser öffnet sich → Gmail-Konto auswählen → `token.json` wird erstellt

---

## Schritt 4: GitHub Secrets eintragen

GitHub Repository → Settings → Secrets and variables → Actions → New secret

| Name | Wert |
|------|------|
| `GMAIL_CREDENTIALS` | Inhalt der `credentials.json` (komplett) |
| `GMAIL_TOKEN` | Inhalt der `token.json` (komplett) |
| `ONESIGNAL_APP_ID` | Kommt in Schritt 5 |
| `ONESIGNAL_API_KEY` | Kommt in Schritt 5 |

---

## Schritt 5: OneSignal Push-Notifications einrichten

1. Gehe auf https://onesignal.com → Kostenloses Konto erstellen
2. "New App/Website" → Name: "FCW-Blättle"
3. Platform: **Web Push**
4. Site URL: `https://DEIN-USERNAME.github.io/fcw-blaettle/`
5. App ID und API Key kopieren → in GitHub Secrets eintragen (s. Schritt 4)
6. In `public/app.js` Zeile 7: `oneSignalAppId` mit deiner App-ID ersetzen
7. In `scripts/check_email.py` Zeile 75: GitHub Pages URL eintragen

---

## Schritt 6: E-Mail-Adresse für PDFs

Erstelle eine Gmail-Adresse speziell dafür, z.B.:
`fcw.blaettle@gmail.com`

Diese Adresse in Schritt 3 mit der Gmail API verbinden.

**So schickst du eine neue Ausgabe:**
- E-Mail an `fcw.blaettle@gmail.com` schicken
- Betreff: z.B. `FCW-Blättle: Heimspiel vs. SV Musbach – 15.03.2025`
- PDF als Anhang (beliebiger Dateiname)
- Innerhalb von 15 Minuten erscheint die neue Ausgabe in der App
  und alle Nutzer bekommen eine Push-Benachrichtigung

---

## Struktur der App

```
fcw-blaettle/
├── public/               ← Was die App zeigt (GitHub Pages Root)
│   ├── index.html        ← Haupt-App
│   ├── style.css         ← Design (Rot/Weiß FCW)
│   ├── app.js            ← App-Logik, Flipbook, Navigation
│   ├── sw.js             ← Service Worker (Offline, Push)
│   ├── manifest.json     ← PWA-Manifest (Homescreen-Icon etc.)
│   ├── icons/            ← App-Icons (192px und 512px)
│   └── pdfs/
│       ├── index.json    ← Automatisch generierte PDF-Liste
│       └── *.pdf         ← Die eigentlichen Hefte
├── scripts/
│   ├── check_email.py    ← E-Mail prüfen & PDFs speichern
│   ├── update_index.py   ← index.json neu generieren
│   └── generate_token.py ← Einmalig: Gmail-Token erstellen
└── .github/workflows/
    └── email-to-pdf.yml  ← Automatik (alle 15 Min)
```

---

## Icons einfügen

Lege zwei Versionen des FCW-Logos ab:
- `public/icons/icon-192.png` (192×192 Pixel)
- `public/icons/icon-512.png` (512×512 Pixel)

---

## Fertig! 🎉

Die App ist erreichbar unter:
`https://DEIN-USERNAME.github.io/fcw-blaettle/`

Nutzer besuchen diese URL einmal und können die App auf dem
Homescreen installieren. Ab dann funktioniert alles wie eine
native App – inklusive Push-Benachrichtigungen.
