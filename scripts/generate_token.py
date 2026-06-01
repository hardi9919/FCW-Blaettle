"""Einmalig ausfuehren um Gmail token.json zu erstellen.
pip install google-api-python-client google-auth-oauthlib
python scripts/generate_token.py
"""
import json
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

def main():
    if not Path("credentials.json").exists():
        print("credentials.json nicht gefunden. Von Google Cloud Console herunterladen.")
        return
    flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
    creds = flow.run_local_server(port=0)
    token = {"token": creds.token, "refresh_token": creds.refresh_token,
             "token_uri": creds.token_uri, "client_id": creds.client_id,
             "client_secret": creds.client_secret, "scopes": list(creds.scopes)}
    Path("token.json").write_text(json.dumps(token, indent=2))
    print("token.json erstellt.")
    print("Inhalt als GitHub Secret GMAIL_TOKEN eintragen.")
    print("Inhalt von credentials.json als GitHub Secret GMAIL_CREDENTIALS eintragen.")

if __name__ == "__main__":
    main()
