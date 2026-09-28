# FCW-Blättle – Projektinformation

---

## Was ist das?

Eine Progressive Web App (PWA) für den FC Weisingen 1921.
Nutzer können das FCW-Blättle (Stadionheft als PDF) direkt am Handy oder Browser lesen.
Neue Ausgaben erscheinen automatisch nach dem Einschicken per E-Mail.

---

## Dienste & Zugänge

### GitHub (Hosting + Automatisierung)
- **Repository:** https://github.com/hardi9919/FCW-Blaettle
- **Live-App:** https://hardi9919.github.io/FCW-Blaettle/
- **GitHub Account:** hardi9919
- **Zweites Repo (für OneSignal):** https://github.com/hardi9919/hardi9919.github.io
  - Enthält nur: `OneSignalSDKWorker.js` und `index.html` (Weiterleitung)

### Gmail (E-Mail-Eingang für PDFs)
- Das Gmail-Konto das mit der Google Cloud Console verbunden wurde
- **Gmail-Label:** `FCW/FCW-Blaettle`
- Neue PDFs müssen in dieses Label verschoben werden (per Gmail-Filter automatisch)
- Der GitHub Actions Workflow (`pdf-checker.yml`) prüft per Zeitplan auf neue **ungelesene** E-Mails in diesem Label
- ⚠️ Zeitplan ist `*/15`, GitHub drosselt aber stark: real läuft er nur ca. alle 2–6 Stunden (Median ~4 h).
  Eine neue Mail kann also bis zu ~6 Stunden liegen bleiben. Sofort verarbeiten: Actions → "E-Mail zu PDF verarbeiten" → "Run workflow".
- ⚠️ Mail nicht vorher in Gmail öffnen/als gelesen markieren, sonst wird sie übersprungen (Suche: `is:unread`)

### Google Cloud Console
- **Projekt:** fcw-blaettle
- **API:** Gmail API (aktiviert)
- **OAuth Client:** "FCW-Blaettle-Web" (Webanwendung)
- **Client ID:** `917042639034-viu7me0jvevpvqf0hbbhcbdpdq9smtjs.apps.googleusercontent.com`
- **Client Secret:** in GitHub Secrets gespeichert (GMAIL_CREDENTIALS)

### OneSignal (Push-Benachrichtigungen)
- **App Name:** FCW-Blaettle
- **App ID:** `5e6a5c8a-eb23-46a0-b26f-f806ad6d109f`
- **Dashboard:** https://app.onesignal.com
- **Site URL:** https://hardi9919.github.io (Root-Domain wegen Service Worker)
- **API Key:** in GitHub Secrets gespeichert (ONESIGNAL_API_KEY)

### Cloudflare Web Analytics (Besucherstatistik)
- **Zweck:** Cookie-lose, datenschutzfreundliche Besucherzahlen der App
- **Dashboard:** https://dash.cloudflare.com → "Analytics & Logs" → "Web Analytics"
- **Hostname:** `hardi9919.github.io`
- **Site-Token:** `009b371652514ddf986f44d6966b493b` (im `<head>` von `docs/index.html` eingebunden)
- Erfasst nur anonyme, aggregierte Daten (keine individuelle Nutzerverfolgung)

### Make.com (Automatisierungs-Trigger) — DEAKTIVIERT
- **Status:** Seit 28.09.2026 abgeschaltet. Hat laut Actions-Verlauf ohnehin nie einen Lauf ausgelöst;
  der GitHub-Zeitplan (alle paar Stunden) reicht aus.
- **Früherer Zweck:** Gmail (Label FCW/FCW-Blaettle) → HTTP Request → GitHub Actions
- Falls je wieder gewünscht: GitHub-Token (Scope `repo` bzw. Actions: write) unter
  https://github.com/settings/tokens erstellen — NICHT in Git oder hier eintragen!

---

## GitHub Secrets (Repository Settings → Secrets → Actions)

| Name | Inhalt |
|------|--------|
| `GMAIL_CREDENTIALS` | Inhalt der credentials.json (Google OAuth Web-Client) |
| `GMAIL_TOKEN` | Inhalt der token.json (OAuth Refresh Token) |
| `ONESIGNAL_APP_ID` | `5e6a5c8a-eb23-46a0-b26f-f806ad6d109f` |
| `ONESIGNAL_API_KEY` | OneSignal REST API Key (v2) |

---

## Wie läuft alles ab?

### Neue Ausgabe veröffentlichen

```
1. PDF per E-Mail schicken (an das verbundene Gmail-Konto)
   → Betreff beliebig, PDF als Anhang
   → Gmail-Filter schiebt die Mail ins Label FCW/FCW-Blaettle

2. GitHub-Zeitplan startet den Workflow (real ca. alle 2–6 Std., oder manuell per "Run workflow")

3. GitHub Actions (pdf-checker.yml):
   → Lädt PDF aus Gmail herunter
   → Speichert PDF in docs/pdfs/
   → Aktualisiert docs/pdfs/index.json (Ausgaben-Liste)
   → Committet und schreibt docs/pending_push.txt

3b. send-notification.yml startet nach dem GitHub-Pages-Deployment
   → Sendet Push-Benachrichtigung an alle Nutzer via OneSignal
   → Löscht pending_push.txt wieder

4. App aktualisiert sich beim nächsten Öffnen automatisch
```

### Spielbericht (automatisch von fcweisingen.de)

```
1. check-spielberichte.yml (Zeitplan, real ca. alle 2–6 Std., oder manuell)
   → check_rss.py liest den RSS-Feed der Kategorie "Spielbericht" (nur zur Erkennung, guid)
   → Holt den VOLLEN Text von der Artikelseite (div.item-page), da der Feed nur den
     Text vor "Weiterlesen" enthält
   → Speichert nur den neuesten Bericht in docs/spielbericht/data.json (kein Archiv)

2. Neue guid  → data.json + pending_spielbericht_push.txt → Push "⚽ Neuer Spielbericht!"
   Gleiche guid, geänderter Text (z. B. Rechtschreibung) → data.json still aktualisiert, KEIN Push
```

### App-Update (Code-Änderungen)

```
1. Code in docs/ wird geändert und gepusht
2. bump-sw.yml Workflow läuft automatisch
   → Aktualisiert BUILD-Timestamp in sw.js
3. Browser erkennt geänderten Service Worker
   → App lädt neue Version beim nächsten Öffnen
```

---

## Dateistruktur

```
fcw-blaettle/
├── docs/                        ← GitHub Pages Root (die App)
│   ├── index.html               ← Haupt-App (Archiv + PDF-Viewer)
│   ├── style.css                ← Design (Rot/Weiß FCW)
│   ├── app.js                   ← App-Logik (Navigation, PDF, Zoom, Push)
│   ├── sw.js                    ← Service Worker (Caching, Push-Empfang)
│   ├── manifest.json            ← PWA-Manifest (Icon, Name, Farben)
│   ├── favicon.png              ← Browser-Tab Icon
│   ├── OneSignalSDKWorker.js    ← OneSignal Service Worker Integration
│   ├── icons/
│   │   ├── icon-192.png         ← App-Icon klein
│   │   ├── icon-512.png         ← App-Icon groß
│   │   └── logo_original.png    ← FCW Logo Original
│   ├── pdfs/
│   │   ├── index.json           ← Automatisch generierte Ausgaben-Liste
│   │   └── *.pdf                ← Die Blättle-PDFs
│   └── spielbericht/
│       └── data.json            ← Neuester Spielbericht (Titel, Datum, HTML-Inhalt)
│
├── scripts/
│   ├── check_email.py           ← Gmail prüfen & PDF speichern
│   ├── check_rss.py             ← Spielbericht von fcweisingen.de holen (RSS + Artikelseite)
│   ├── send_push.py             ← Push via OneSignal senden
│   ├── update_index.py          ← index.json neu generieren
│   └── generate_token.py        ← Einmalig: Gmail OAuth Token erzeugen
│
├── .github/workflows/
│   ├── pdf-checker.yml          ← E-Mail → PDF → pending_push.txt (Zeitplan + manuell)
│   ├── check-spielberichte.yml  ← Spielbericht prüfen (Zeitplan + manuell)
│   ├── send-notification.yml    ← Push senden nach Pages-Deployment
│   ├── sync-index.yml           ← PDF-Index aktuell halten
│   └── bump-sw.yml              ← Service Worker Timestamp bei Code-Updates
│
├── credentials.json             ← Google OAuth Credentials (NICHT in Git!)
├── token.json                   ← Google OAuth Token (NICHT in Git!)
└── PROJEKT-INFO.md              ← Diese Datei
```

---

## Ausgabe manuell löschen

1. **GitHub → docs/pdfs/** → PDF-Datei löschen (Papierkorb-Symbol → Commit)
2. GitHub Actions → "E-Mail zu PDF verarbeiten" → "Run workflow"
   → index.json wird automatisch neu generiert

---

## Ausgabe manuell hinzufügen (ohne E-Mail)

PDF direkt in `docs/pdfs/` hochladen (GitHub → Add file → Upload files)
→ Dateiname muss mit Datum beginnen: `YYYY-MM-DD_Name.pdf`
→ Danach Workflow manuell starten zum Index-Update

---

## Gmail-Token erneuern (falls Workflow mit "invalid_grant" Fehler abbricht)

Fehlermeldung in den Actions-Logs: `RefreshError: Token has been expired or revoked`

**1. OAuth-Konsent-Bildschirm prüfen** (wichtig, sonst läuft das neue Token wieder ab!)
   - https://console.cloud.google.com/apis/credentials/consent?project=fcw-blaettle
   - Status muss **"In Produktion"** sein, nicht "Test"
   - Falls "Test": auf "App veröffentlichen" / "Publish App" klicken, Warnung bestätigen

**2. Neuen Refresh-Token holen über OAuth Playground**
   - https://developers.google.com/oauthplayground
   - ⚙️ Settings (oben rechts) → "Use your own OAuth credentials" aktivieren
   - Client ID: `917042639034-viu7me0jvevpvqf0hbbhcbdpdq9smtjs.apps.googleusercontent.com`
   - Client Secret: steht in `credentials.json` (lokal, Feld `client_secret`)
   - Unten links bei "Input your own scopes": `https://www.googleapis.com/auth/gmail.modify`
   - "Authorize APIs" klicken → mit dem FCW-Gmail-Konto anmelden → Zugriff erlauben
   - Bei "Step 2" → "Exchange authorization code for tokens" klicken
   - "Refresh token" Wert kopieren

**3. token.json aktualisieren** (lokal in `fcw-blaettle/`)
   ```json
   {
     "token": "<access_token aus Step 2>",
     "refresh_token": "<refresh_token aus Step 2>",
     "token_uri": "https://oauth2.googleapis.com/token",
     "client_id": "917042639034-viu7me0jvevpvqf0hbbhcbdpdq9smtjs.apps.googleusercontent.com",
     "client_secret": "<aus credentials.json>",
     "scopes": ["https://www.googleapis.com/auth/gmail.modify"]
   }
   ```

**4. GitHub Secret aktualisieren**
   - https://github.com/hardi9919/FCW-Blaettle/settings/secrets/actions
   - `GMAIL_TOKEN` → "Update secret" → Inhalt von `token.json` einfügen → speichern

**5. Workflow testen**
   - https://github.com/hardi9919/FCW-Blaettle/actions/workflows/pdf-checker.yml
   - "Run workflow" → Logs prüfen

---

## App-URL

**https://hardi9919.github.io/FCW-Blaettle/**

Nutzer besuchen diese URL einmal → "Installieren" Banner erscheint →
App ist danach wie eine native App auf dem Homescreen verfügbar.

---

## Wichtige Hinweise

- ⚠️ `credentials.json` und `token.json` sind **nicht in Git** — sicher aufbewahren!
- ⚠️ GitHub Secrets regelmäßig prüfen (OAuth Token läuft in ~6 Monaten ohne Nutzung ab)
- ⚠️ **WICHTIG:** OAuth-Konsent-Bildschirm muss auf **"In Produktion"** stehen (nicht "Test")!
  Prüfen unter: https://console.cloud.google.com/apis/credentials/consent?project=fcw-blaettle
  Im "Test"-Status laufen Refresh-Tokens nach **7 Tagen** ab (egal ob genutzt oder nicht).
- ⚠️ OneSignal Free Plan: bis zu 10.000 Push-Abonnenten kostenlos
- ⚠️ GitHub Pages: kostenlos, unbegrenzte Nutzer

---

*Erstellt: Juni 2026*
