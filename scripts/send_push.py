import os, time, requests
app_id  = os.environ["ONESIGNAL_APP_ID"]
api_key = os.environ["ONESIGNAL_API_KEY"]
url     = "https://hardi9919.github.io/FCW-Blaettle/"
icon    = url + "icons/icon-192.png"
title   = os.environ.get("PUSH_TITLE") or os.environ.get("PUSH_TITLES","").split("|")[0].strip() or "FCW-Blaettle"
body    = os.environ.get("PUSH_BODY") or f"{title} ist jetzt verfuegbar!"
headers = {"Authorization": f"Key {api_key}", "Content-Type": "application/json"}
res = requests.post("https://onesignal.com/api/v1/notifications",
    headers=headers,
    json={"app_id": app_id, "included_segments": ["All"],
          "headings": {"en": "FCW-Blättle", "de": "FCW-Blättle"}, "url": url,
          "contents": {"en": body, "de": body},
          "chrome_web_icon": icon, "chrome_web_badge": icon,
          "chrome_icon": icon, "firefox_icon": icon},
    timeout=15)
print(f"Push Status: {res.status_code} | {res.text}")

# Zustellstatistik ins Log schreiben (nur Diagnose, darf den Workflow nie fehlschlagen lassen)
def print_delivery_stats(notification_id):
    for attempt in range(2):
        time.sleep(15)
        try:
            r = requests.get(f"https://api.onesignal.com/notifications/{notification_id}",
                             params={"app_id": app_id}, headers=headers, timeout=15)
            if r.status_code != 200:
                print(f"Zustellstatistik: HTTP {r.status_code} | {r.text[:300]}")
                continue
            d = r.json()
            keys = ("successful", "failed", "errored", "converted", "remaining", "queued", "received")
            summary = {k: d[k] for k in keys if k in d}
            print(f"Zustellstatistik (Versuch {attempt + 1}): {summary}")
            if d.get("platform_delivery_stats"):
                print(f"  Pro Plattform: {d['platform_delivery_stats']}")
            if not summary:
                print(f"  Rohantwort: {r.text[:500]}")
        except Exception as e:
            print(f"Zustellstatistik nicht abrufbar: {e}")

try:
    notification_id = res.json().get("id") if res.status_code == 200 else None
except Exception:
    notification_id = None
if notification_id:
    print_delivery_stats(notification_id)
else:
    print("Keine Nachrichten-ID erhalten, keine Zustellstatistik abgefragt.")
