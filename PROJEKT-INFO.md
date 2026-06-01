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
- Der GitHub Actions Workflow prüft alle 15 Minuten auf neue ungelesene E-Mails in diesem Label

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

### Make.com (Automatisierungs-Trigger)
- **Zweck:** Prüft Gmail alle 15 Minuten und startet den GitHub Actions Workflow
- **Account:** https://make.com
- **Scenario:** Gmail (Label FCW/FCW-Blaettle) → HTTP Request → GitHub Actions
- **GitHub Token (für Make.com):** Liegt sicher bei dir lokal — NICHT hier eintragen!
  - Neu erstellen unter: https://github.com/settings/tokens
  - Scope: `repo`, No expiration
  - ⚠️ Token sicher aufbewahren, nicht in Git speichern!

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

2. Make.com erkennt neue E-Mail im Label (alle 15 Min.)
   → Löst GitHub Actions Workflow aus

3. GitHub Actions (email-to-pdf.yml):
   → Lädt PDF aus Gmail herunter
   → Speichert PDF in docs/pdfs/
   → Aktualisiert docs/pdfs/index.json (Ausgaben-Liste)
   → Wartet 90 Sekunden (GitHub Pages Deployment)
   → Sendet Push-Benachrichtigung an alle Nutzer via OneSignal

4. App aktualisiert sich beim nächsten Öffnen automatisch
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
│   └── pdfs/
│       ├── index.json           ← Automatisch generierte Ausgaben-Liste
│       └── *.pdf                ← Die Blättle-PDFs
│
├── scripts/
│   ├── check_email.py           ← Gmail prüfen & PDF speichern & Push senden
│   ├── update_index.py          ← index.json neu generieren
│   └── generate_token.py        ← Einmalig: Gmail OAuth Token erzeugen
│
├── .github/workflows/
│   ├── email-to-pdf.yml         ← Hauptworkflow (E-Mail → PDF → Push)
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

## App-URL

**https://hardi9919.github.io/FCW-Blaettle/**

Nutzer besuchen diese URL einmal → "Installieren" Banner erscheint →
App ist danach wie eine native App auf dem Homescreen verfügbar.

---

## Wichtige Hinweise

- ⚠️ `credentials.json` und `token.json` sind **nicht in Git** — sicher aufbewahren!
- ⚠️ GitHub Secrets regelmäßig prüfen (OAuth Token läuft in ~6 Monaten ohne Nutzung ab)
- ⚠️ Make.com Free Plan: 1.000 Operationen/Monat (reicht für ~33 Ausgaben/Monat)
- ⚠️ OneSignal Free Plan: bis zu 10.000 Push-Abonnenten kostenlos
- ⚠️ GitHub Pages: kostenlos, unbegrenzte Nutzer

---

*Erstellt: Juni 2026*
