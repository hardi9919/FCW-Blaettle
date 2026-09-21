import os, requests
app_id  = os.environ["ONESIGNAL_APP_ID"]
api_key = os.environ["ONESIGNAL_API_KEY"]
url     = "https://hardi9919.github.io/FCW-Blaettle/"
title   = os.environ.get("PUSH_TITLE") or os.environ.get("PUSH_TITLES","").split("|")[0].strip() or "FCW-Blaettle"
body    = os.environ.get("PUSH_BODY") or f"{title} ist jetzt verfuegbar!"
res = requests.post("https://onesignal.com/api/v1/notifications",
    headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
    json={"app_id": app_id, "included_segments": ["All"],
          "headings": {"en": "FCW-Blaettle", "de": "FCW-Blaettle"}, "url": url,
          "contents": {"en": body, "de": body}},
    timeout=15)
print(f"Push Status: {res.status_code} | {res.text}")
