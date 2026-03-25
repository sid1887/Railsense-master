import json
data = json.load(open('data/railway_knowledge_base.json'))
trains = data['trains']
sample_trains = list(trains.keys())[:10]
for tn in sample_trains:
    t = trains[tn]
    name = t.get("trainName", "")[:40]
    cat = t.get("category", "")
    src = t.get("source", "")[:20]
    print(f'{tn}: {name} ({cat}) - {src}...')
