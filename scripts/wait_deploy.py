import urllib.request, json, os, sys, time

token = os.environ["GH_TOKEN"]
repo = "hardi9919/FCW-Blaettle"

print("Warte auf GitHub Pages Deployment...")
for i in range(1, 13):
    time.sleep(15)
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/deployments?environment=github-pages&per_page=1",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    )
    deps = json.loads(urllib.request.urlopen(req).read())
    if not deps:
        print(f"Status ({i}/12): pending")
        continue
    dep_id = deps[0]["id"]
    req2 = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/deployments/{dep_id}/statuses?per_page=1",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    )
    statuses = json.loads(urllib.request.urlopen(req2).read())
    status = statuses[0]["state"] if statuses else "pending"
    print(f"Status ({i}/12): {status}")
    if status == "success":
        print("GitHub Pages ist live!")
        sys.exit(0)

print("Timeout - sende Push trotzdem.")