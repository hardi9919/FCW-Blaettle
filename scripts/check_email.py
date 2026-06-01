"""FCW-Blaettle - E-Mail Checker"""
import os, json, base64, re
from datetime import datetime
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import requests

PDF_DIR = Path("docs/pdfs")
PDF_DIR.mkdir(parents=True, exist_ok=True)
ONESIGNAL_APP_ID  = os.environ.get("ONESIGNAL_APP_ID", "")
ONESIGNAL_API_KEY = os.environ.get("ONESIGNAL_API_KEY", "")
GITHUB_PAGES_URL  = "https://hardi9919.github.io/FCW-Blaettle/"

def get_gmail_service():
    creds = Credentials.from_authorized_user_info(
        json.loads(os.environ["GMAIL_TOKEN"]),
        scopes=["https://www.googleapis.com/auth/gmail.modify"])
    return build("gmail", "v1", credentials=creds)

def sanitize(name):
    name = re.sub(r"[^\w\s\-.]", "", name)
    return re.sub(r"\s+", "_", name.strip()) or "blaettle"

def extract_title(subject, filename):
    if subject and subject.strip():
        t = subject.replace("FCW-Blaettle:", "").replace("Blaettle:", "").strip()
        if t: return t
    return Path(filename).stem.replace("_", " ").replace("-", " ").title()

def send_push(title):
    if not ONESIGNAL_APP_ID:
        print("  Push uebersprungen: ONESIGNAL_APP_ID fehlt")
        return
    res = requests.post("https://onesignal.com/api/v1/notifications",
        headers={"Authorization": f"Key {ONESIGNAL_API_KEY}", "Content-Type": "application/json"},
        json={"app_id": ONESIGNAL_APP_ID, "included_segments": ["All"],
              "headings": {"en": "FCW-Blaettle", "de": "FCW-Blaettle"}, "url": GITHUB_PAGES_URL,
              "contents": {"en": f"Neue Ausgabe: {title}", "de": f"Neue Ausgabe: {title} ist jetzt verfuegbar!"}}, timeout=15)
    print(f"  Push Status: {res.status_code} | Antwort: {res.text}")

def process_emails():
    service = get_gmail_service()
    results = service.users().messages().list(
        userId="me", q="is:unread has:attachment filename:pdf", maxResults=10).execute()
    messages = results.get("messages", [])
    if not messages: print("Keine neuen E-Mails."); return
    new_issues = []
    for msg_ref in messages:
        msg = service.users().messages().get(userId="me", id=msg_ref["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
        subject = headers.get("Subject", "")
        date_prefix = datetime.now().strftime("%Y-%m-%d")
        def find_parts(parts):
            for part in parts:
                if part.get("parts"): find_parts(part["parts"]); continue
                fname = part.get("filename", "")
                if fname.lower().endswith(".pdf"):
                    att_id = part["body"].get("attachmentId")
                    if att_id:
                        att = service.users().messages().attachments().get(
                            userId="me", messageId=msg_ref["id"], id=att_id).execute()
                        data = base64.urlsafe_b64decode(att["data"])
                        out_name = f"{date_prefix}_{sanitize(fname)}"
                        out_path = PDF_DIR / out_name
                        if not out_path.exists():
                            out_path.write_bytes(data)
                            # Titel = PDF-Dateiname ohne Erweiterung, bereinigt
                            t = Path(fname).stem.replace("_", " ").replace("-", " ").strip()
                            new_issues.append({"title": t, "date": date_prefix})
                            print(f"  Gespeichert: {out_name}")
        find_parts(msg["payload"].get("parts", [msg["payload"]]))
        service.users().messages().modify(userId="me", id=msg_ref["id"],
            body={"removeLabelIds": ["UNREAD"]}).execute()
    # Titel fuer spaetere Push-Benachrichtigung ausgeben
    for issue in new_issues:
        print(f"PUSH_TITLE:{issue['title']}")
    print(f"{len(new_issues)} neue Ausgabe(n).")

if __name__ == "__main__":
    process_emails()
