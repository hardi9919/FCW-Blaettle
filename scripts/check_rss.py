import json, os, sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

RSS_URL   = 'https://fcweisingen.de/index.php?option=com_content&view=category&id=10&format=feed&type=rss'
DATA_FILE = 'docs/spielbericht/data.json'

def fetch_rss():
    req = urllib.request.Request(RSS_URL, headers={'User-Agent': 'FCW-Blaettle-Bot/1.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()

def parse_latest(xml_bytes):
    root = ET.fromstring(xml_bytes)
    channel = root.find('channel')
    item = channel.find('item') if channel is not None else None
    if item is None:
        return None
    guid  = (item.findtext('guid') or '').strip()
    title = (item.findtext('title') or '').strip()
    link  = (item.findtext('link') or '').strip()
    pub   = (item.findtext('pubDate') or '').strip()
    desc  = (item.findtext('description') or '').strip()
    try:
        dt = parsedate_to_datetime(pub)
        date_iso = dt.strftime('%Y-%m-%d')
    except Exception:
        date_iso = ''
    return {'guid': guid, 'title': title, 'link': link, 'date': date_iso, 'content': desc}

def load_current():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    xml_bytes = fetch_rss()
    latest = parse_latest(xml_bytes)
    if not latest:
        print('Kein Artikel im RSS-Feed gefunden.')
        sys.exit(0)

    current = load_current()

    if latest['guid'] and latest['guid'] == current.get('guid'):
        if latest['content'] != current.get('content') or latest['title'] != current.get('title'):
            print('Artikel aktualisiert (kein Push).')
            save(latest)
            print('UPDATED_SILENT:true')
        else:
            print('Kein neuer Spielbericht.')
        sys.exit(0)

    print(f'Neuer Spielbericht: {latest["title"]}')
    save(latest)
    print(f'PUSH_TITLE:{latest["title"]}')

if __name__ == '__main__':
    main()
