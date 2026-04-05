import os
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'datas')

TOPIC_TO_AREA = {
    "NLP": "Computer Science",
    "Finance": "Business",
    "Biology": "Life Sciences",
    "Healthcare": "Life Sciences",
    "Health": "Life Sciences",
    "Climate": "Physical Sciences",
    "Agriculture": "Life Sciences",
    "Social Science": "Social Sciences",
    "Economics": "Business",
    "Computer Vision": "Computer Science",
    "Other": "Other"
}

def migrate_file(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # 1. Map Area from Topic
    old_topic = data.get('topic', 'Other')
    data['area'] = TOPIC_TO_AREA.get(old_topic, 'Other')
    
    # 2. Extract Task from Tags
    tags = [t.lower() for t in data.get('tags', [])]
    task = "Other"
    if 'classification' in tags: task = "Classification"
    elif 'regression' in tags: task = "Regression"
    elif 'clustering' in tags: task = "Clustering"
    elif 'nlp' in tags or old_topic == 'NLP': task = "NLP"
    elif 'computer-vision' in tags or old_topic == 'Computer Vision': task = "Computer Vision"
    data['task'] = data.get('task', task)

    # 3. Extract Data Type from Tags/Format
    fmt = data.get('format', '').upper()
    data_type = "Tabular"
    if 'image' in tags or 'computer-vision' in tags: data_type = "Image"
    elif 'text' in tags or 'nlp' in tags: data_type = "Text"
    elif 'audio' in tags: data_type = "Audio"
    elif 'time-series' in tags: data_type = "Time-Series"
    elif fmt == 'CSV': data_type = "Tabular"
    data['data_type'] = data.get('data_type', data_type)

    # 4. Refine Access Type
    visit_url = data.get('visit_url', '').lower()
    if data.get('usage_code') or 'huggingface' in visit_url or 'kaggle' in visit_url:
        data['access_type'] = 'api'
    elif data.get('download_url'):
        data['access_type'] = 'download'
    else:
        data['access_type'] = data.get('access_type', 'download')

    # 5. Standardize numeric fields
    if 'rows' in data:
        try:
            # Handle strings like "1.5M" or "50,000"
            val = str(data['rows']).replace(',', '').lower()
            if 'm' in val: data['rows'] = int(float(val.replace('m', '')) * 1000000)
            elif 'k' in val: data['rows'] = int(float(val.replace('k', '')) * 1000)
            else: data['rows'] = int(float(val))
        except:
            pass # Keep as string if complex

    if 'features' not in data:
        data['features'] = 0

    # 5. Clean up old fields (optional, but keep for now to avoid breaking existing UI until updated)
    # data.pop('topic', None) 

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def migrate_all():
    print(f"Starting migration in {DATA_DIR}...")
    count = 0
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json') and filename != 'index.json':
            migrate_file(os.path.join(DATA_DIR, filename))
            count += 1
    print(f"Migration complete. Updated {count} files.")

if __name__ == "__main__":
    migrate_all()
