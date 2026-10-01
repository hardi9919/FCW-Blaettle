import os, requests
app_id  = os.environ["ONESIGNAL_APP_ID"]
api_key = os.environ["ONESIGNAL_API_KEY"]
url     = "https://hardi9919.github.io/FCW-Blaettle/"
icon    = url + "icons/icon-192.png"
title   = os.environ.get("PUSH_TITLE") or os.environ.get("PUSH_TITLES","").split("|")[0].strip() or "FCW-Blaettle"
body    = os.environ.get("PUSH_BODY") or f"{title} ist jetzt verfuegbar!"
res = requests.post("https://onesignal.com/api/v1/notifications",
    headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
    json={"app_id": app_id, "included_segments": ["All"],
          "headings": {"en": "FCW-Blättle", "de": "FCW-Blättle"}, "url": url,
          "contents": {"en": body, "de": body},
          "chrome_web_icon": icon, "chrome_web_badge": icon,
          "chrome_icon": icon, "firefox_icon": icon},
    timeout=15)
print(f"Push Status: {res.status_code} | {res.text}")
