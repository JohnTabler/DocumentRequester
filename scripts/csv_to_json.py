import csv
import json
import urllib.request
import io

SOURCES = [
    {
        "file_id": "1g8mD6E6IDR-tME_PmT8_UNtGi8TMAiC0",
        "campus": "City College",
        "label": "City Documents"
    },
    {
        "file_id": "1xrwWcDxiwJJT6vBWoN5IfKGYWQIdD0Qb",
        "campus": "Continuing Education",
        "label": "Continuing Education Documents"
    },
    {
        "file_id": "1Mh4M0CArmSN-J5hdjD3Q1hDQx0ZiY284",
        "campus": "Miramar",
        "label": "Miramar Documents"
    },
    {
        "file_id": "1unFuPAqIK8o75IeN5LBQI3s5F6q95EEJ",
        "campus": "Mesa College",
        "label": "Mesa Documents"
    },
]

all_rows = []

for source in SOURCES:
    url = f"https://drive.google.com/uc?export=download&id={source['file_id']}"
    print(f"Downloading: {source['label']}...")

    with urllib.request.urlopen(url) as response:
        content = response.read().decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)

    for row in rows:
        row["campus"] = source["campus"]
        all_rows.append(row)

    print(f"  -> {len(rows)} rows added from {source['label']}")

with open("data/DataTest.json", "w") as f:
    json.dump(all_rows, f, separators=(',', ':'))

print(f"\nDone. Total rows written: {len(all_rows)}")
