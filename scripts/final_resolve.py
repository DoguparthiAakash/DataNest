import os
import re
import json

def merge_json(head, remote):
    # Base is Head (enriched), Remote is standardized
    res = head.copy()
    
    # Standardized fields to adopt from Remote
    std = ["area", "task", "data_type", "features", "rows", "size"]
    for f in std:
        if f in remote:
            res[f] = remote[f]
            
    # Preserve/Standardize usage_methods
    # If head has usage_methods but remote only has usage_code, keep head
    if 'usage_methods' not in res and 'usage_code' in remote:
        res['usage_methods'] = [{ "name": "python", "label": "Python", "code": remote['usage_code'] }]
    elif 'usage_methods' not in res and 'usage_code' in head:
        res['usage_methods'] = [{ "name": "python", "label": "Python", "code": head['usage_code'] }]

    # Standardize ID and Title
    if 'id' in remote: res['id'] = remote['id']
    if 'title' in remote: res['title'] = remote['title']

    return res

def clean_and_parse(s):
    s = s.strip()
    # Remove leading/trailing commas or braces if they are partial
    if s.startswith(','): s = s[1:].strip()
    if s.endswith(','): s = s[:-1].strip()
    
    # Ensure it's a valid object
    if not s.startswith('{'): s = '{' + s
    if not s.endswith('}'): s = s + '}'
    
    try:
        return json.loads(s)
    except Exception as e:
        # Try a more aggressive cleanup for tricky fragments
        try:
            # Wrap in a root object if it looks like a list of pairs
            fixed = "{" + s.strip("{}") + "}"
            return json.loads(fixed)
        except:
            raise e

def resolve_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<<<<<<< HEAD' not in content: return False
    
    # Regex to find markers
    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-z0-9]+', re.DOTALL)
    match = pattern.search(content)
    if not match: return False
    
    try:
        head_json = clean_and_parse(match.group(1))
        remote_json = clean_and_parse(match.group(2))
        
        merged = merge_json(head_json, remote_json)
        
        # Write back full file
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(merged, f, indent=4)
        return True
    except Exception as e:
        print(f"Failed to resolve {path}: {e}")
        return False

def main():
    data_dir = 'docs/datas'
    resolved = 0
    for fn in os.listdir(data_dir):
        if fn.endswith('.json'):
            if resolve_file(os.path.join(data_dir, fn)):
                resolved += 1
                print(f"Resolved: {fn}")
    print(f"\nFinal count: {resolved} files resolved.")

if __name__ == "__main__":
    main()
