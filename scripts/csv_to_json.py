import csv, json

with open('DataTest.csv', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))

with open('data/DataTest.json', 'w') as f:
    json.dump(rows, f, indent=2)
