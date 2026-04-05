import os
import json

def check_json_files():
    data_dir = 'docs/datas'
    errors = []
    
    for filename in os.listdir(data_dir):
        if filename.endswith('.json') and filename != 'index.json':
            try:
                with open(os.path.join(data_dir, filename), 'r', encoding='utf-8') as f:
                    json.load(f)
            except Exception as e:
                errors.append(f"{filename}: {e}")
                
    if errors:
        print("\n=== JSON Syntax Errors ===")
        for error in errors:
            print(f"- {error}")
    else:
        print("\nAll JSON files are syntactically correct.")

if __name__ == "__main__":
    check_json_files()
