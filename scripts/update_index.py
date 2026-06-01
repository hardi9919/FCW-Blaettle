"""FCW-Blaettle - PDF Index Generator"""
import json, re
from pathlib import Path

PDF_DIR    = Path("docs/pdfs")
INDEX_FILE = PDF_DIR / "index.json"

def get_date(fn):
    m = re.match(r"(\d{4}-\d{2}-\d{2})", fn)
    return m.group(1) if m else "2000-01-01"

def make_title(fn):
    name = Path(fn).stem
    name = re.sub(r"^\d{4}-\d{2}-\d{2}_?", "", name)
    return name.replace("_"," ").replace("-"," ").strip().title() or "FCW-Blaettle"

def build_index():
    # Sortierung: zuerst nach Datum, bei gleichem Datum nach Aenderungszeit (neueste zuerst)
    pdfs = sorted(PDF_DIR.glob("*.pdf"), key=lambda p: (get_date(p.name), p.stat().st_mtime), reverse=True)
    issues = [{"id": p.stem, "title": make_title(p.name), "date": get_date(p.name),
               "filename": p.name, "url": f"pdfs/{p.name}"} for p in pdfs]
    INDEX_FILE.write_text(json.dumps(issues, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"index.json aktualisiert: {len(issues)} Ausgabe(n)")

if __name__ == "__main__":
    build_index()
