import json

data = json.load(open('data/DataTest.json'))
sizes = [(i, len(json.dumps(row))) for i, row in enumerate(data)]
sizes.sort(key=lambda x: x[1], reverse=True)
print('Top 5 largest rows:')
for i, size in sizes[:5]:
    print(f'  Row {i}: {size:,} bytes')
    print(f'  {json.dumps(data[i])}')
