import os
import json

def generate_index():
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'docs', 'datas')
    index_file = os.path.join(data_dir, 'index.json')
    
    print(f"Scanning datasets in: {data_dir}")
    
    try:
        files = os.listdir(data_dir)
        json_files = [f for f in files if f.endswith('.json') and f != 'index.json']
        
        print(f"Found {len(json_files)} datasets.")
        
        with open(index_file, 'w') as f:
            json.dump(json_files, f)
        
        print(f"Successfully updated: {index_file}")
    except Exception as e:
        print(f"Error generating index: {e}")
        exit(1)

if __name__ == "__main__":
    generate_index()
