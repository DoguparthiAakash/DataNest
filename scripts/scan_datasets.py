import os
import json
from collections import Counter

def scan_datasets():
    # Use absolute path to be sure
    data_dir = os.path.join(os.getcwd(), 'docs', 'datas')
    print(f"Scanning directory: {data_dir}")
    if not os.path.exists(data_dir):
        print(f"Directory not found: {data_dir}")
        return

    stats = {
        'Total': 0,
        'Area': Counter(),
        'Topic': Counter(),
        'Task': Counter(),
        'Pricing': Counter(),
        'Access': Counter()
    }
    
    files = [f for f in os.listdir(data_dir) if f.endswith('.json') and f != 'index.json']
    print(f"Found {len(files)} JSON files.")

    for filename in files:
        try:
            with open(os.path.join(data_dir, filename), 'r', encoding='utf-8') as f:
                d = json.load(f)
                stats['Total'] += 1
                stats['Area'][d.get('area', 'Other')] += 1
                stats['Topic'][d.get('topic', 'Other')] += 1
                stats['Task'][d.get('task', 'Other')] += 1
                stats['Pricing']['Paid' if d.get('price', 0) > 0 else 'Free'] += 1
                stats['Access'][d.get('access_type', 'Other')] += 1
        except Exception as e:
            print(f"Error reading {filename}: {e}")

    print("\n=== Dataset Scan Report ===")
    print(f"Total Datasets: {stats['Total']}")
    
    for category in ['Area', 'Topic', 'Task', 'Pricing', 'Access']:
        print(f"\n[{category} Distribution]")
        # Safe handling of empty counters
        items = sorted(stats[category].items(), key=lambda x: x[1], reverse=True)
        if not items:
            print("- No data")
        for k, v in items:
            print(f"- {k}: {v}")

if __name__ == "__main__":
    scan_datasets()
