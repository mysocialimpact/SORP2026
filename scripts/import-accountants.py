"""Reproducible spreadsheet import. Emits JSON to stdout; never fills missing facts.

Usage: python scripts/import-accountants.py workbook.xlsx postcodes.csv.zip
The second input is the dwyl October 2017 postcode-centroid dataset.
Refresh coordinates against Postcodes.io before describing them as current.
"""
import csv
import io
import json
import re
import sys
import zipfile
import openpyxl

workbook = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows = list(workbook["Firms"].values)
firms = []
for row_number, row in enumerate(rows[1:], start=2):
    name, website, postcode, location, classification, evidence, contact, icaew, independent = [v or "" for v in row]
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and")).strip("-")
    services = []
    # Only explicit service descriptions in the supplied evidence qualify.
    phrases = {"audit": r"charity audit|charities and nfp audit|accounting & auditing for charities",
               "accounts": r"charity account|accountancy services to charities|sorp accounts|accounting & auditing for charities",
               "sorp": r"sorp accounts"}
    if independent and classification == "Verified":
        for service, pattern in phrases.items():
            if re.search(pattern, evidence, re.I):
                services.append({"id": service, "source": independent, "evidence": evidence})
    firms.append(dict(slug=slug, name=name, website=website, postcode=postcode, location=location,
        classification=classification, evidence=evidence, contact=contact, icaewUrl=icaew,
        evidenceUrl=independent, spreadsheetRow=row_number, reviewed="2026-10-12",
        coordinates=None, coordinateSource="", services=services))

assert len(firms) == 110, "Unexpected source row count"
assert len({f["slug"] for f in firms}) == len(firms), "Resolve duplicates explicitly"
by_postcode = {}
for firm in firms:
    by_postcode.setdefault(firm["postcode"].replace(" ", "").upper(), []).append(firm)
with zipfile.ZipFile(sys.argv[2]) as archive:
    file = next(n for n in archive.namelist() if n.endswith(".csv") and not n.startswith("__MACOSX"))
    with archive.open(file) as source:
        for row in csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig")):
            matches = by_postcode.get(row["postcode"].replace(" ", "").upper(), [])
            for firm in matches:
                lat, lng = float(row["latitude"]), float(row["longitude"])
                if 49 <= lat <= 61 and -9 <= lng <= 2:
                    firm["coordinates"] = {"lat": lat, "lng": lng}
                    firm["coordinateSource"] = "https://github.com/dwyl/uk-postcodes-latitude-longitude-complete-csv (October 2017 postcode centroid)"
json.dump(firms, sys.stdout, ensure_ascii=False, indent=2)
