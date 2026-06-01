import os, requests
app_id  = os.environ["ONESIGNAL_APP_ID"]
api_key = os.environ["ONESIGNAL_API_KEY"]
url     = "https://hardi9919.github.io/FCW-Blaettle/"
titles  = [t for t in os.environ.get("PUSH_TITLES","").split("|") if t.strip()]
title   = titles[0] if titles else "Neue Ausgabe"
res = requests.post("https://onesignal.com/api/v1/notifications",
    headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
    json={"app_id": app_id, "included_segments": ["All"],
          "headings": {"en": "FCW-Blaettle", "de": "FCW-Blaettle"}, "url": url,
          "contents": {"en": f"Neue Ausgabe: {title}", "de": f"Neue Ausgabe: {title} ist jetzt verfuegbar!"}},
    timeout=15)
print(f"Push Status: {res.status_code} | {res.text}")
