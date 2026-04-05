import os
import re
import json

def merge_json(head, remote):
    # Base is Head (our enriched data)
    result = head.copy()
    
    # Adhere to Standardized remote fields
    standard_fields = ["area", "task", "data_type", "features", "rows", "size"]
    for field in standard_fields:
        if field in remote:
            result[field] = remote[field]
            
    # Keep our rich preview and usage methods
    if "preview" in head:
        result["preview"] = head["preview"]
    if "usage_methods" in head:
        result["usage_methods"] = head["usage_methods"]
        
    # Standardize id/title
    if "id" in remote: result["id"] = remote["id"]
    if "title" in remote: result["title"] = remote["title"]
    
    return result

def resolve_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "<<<<<<< HEAD" not in content:
        return False

    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [a-f0-9]+', re.DOTALL)
    match = pattern.search(content)
    
    if not match:
        print(f"Match failed for {filepath}")
        return False
    
    head_raw = match.group(1).strip()
    remote_raw = match.group(2).strip()
    
    # Sometimes the markers are inside the JSON brackets
    if not head_raw.startswith("{"): head_raw = "{" + head_raw
    if not head_raw.endswith("}"): head_raw = head_raw + "}"
    if not remote_raw.startswith("{"): remote_raw = "{" + remote_raw
    if not remote_raw.endswith("}"): remote_raw = remote_raw + "}"

    try:
        head_json = json.loads(head_raw)
        remote_json = json.loads(remote_raw)
        
        merged = merge_json(head_json, remote_json)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(merged, f, indent=4)
        return True
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return False

def main():
    data_dir = "docs/datas"
    count = 0
    for filename in os.listdir(data_dir):
        if filename.endswith(".json"):
            if resolve_file(os.path.join(data_dir, filename)):
                count += 1
                print(f"Resolved: {filename}")
    print(f"\nTotal resolved: {count} files")

if __name__ == "__main__":
    main()
