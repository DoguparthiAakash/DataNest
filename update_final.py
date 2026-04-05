import os
import json
import re

d = r'd:\Github_Projects\DataNest\docs\datas'
files = [f for f in os.listdir(d) if f.endswith('.json') and f != 'index.json']

def get_m(data):
    v = data.get('visit_url', '')
    s = data.get('source', '')
    o = 'Unknown'
    osite = 'Other'
    if v:
        if 'github.com' in v:
            osite = 'GitHub'
            m = re.search(r'github\.com/([^/]+)', v)
            if m: o = m.group(1)
        elif 'kaggle.com' in v:
            osite = 'Kaggle'
            m = re.search(r'kaggle\.com/datasets/([^/]+)', v)
            if m: o = m.group(1)
        elif 'archive.ics.uci.edu' in v:
            osite = 'UCI Archive'
            o = 'UCI'
    if o == 'Unknown' and s:
        if 'UCI' in s:
            osite = 'UCI Archive'
            o = 'UCI'
        else:
            o = s.split('/')[0].strip()
    return o, osite

for f in files:
    fp = os.path.join(d, f)
    with open(fp, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    owner, site = get_m(data)
    data['owner'] = data.get('owner', owner) or owner
    data['origin_site'] = data.get('origin_site', site) or site
    
    with open(fp, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=4)
    print(f"UPDATED: {f}")

print("FINISHED_ALL")
