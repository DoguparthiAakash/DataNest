import os
import json
import re

DATA_FILES = [
    "amazon-reviews.json", "arxiv.json", "breast-cancer.json", "celeba.json",
    "cifar-100.json", "cityscapes.json", "coco-stuff.json", "coco.json",
    "common-voice.json", "credit-card-fraud.json", "dbpedia-14.json",
    "enron-emails.json", "flickr30k.json", "fma-music.json", "glue.json",
    "goemotions.json", "google-books-ngrams.json", "google-landmarks.json",
    "imagenet.json", "kaggle-titanic.json", "kinetics-700.json", "laion-5b.json",
    "mental-health-conversations.json", "mimic-iii.json", "mnist-train.json",
    "mnist.json", "ms-coco.json", "multinli.json", "openwebtext.json",
    "otto-products.json", "penn-treebank.json", "reddit-comments.json",
    "snli.json", "sports-1m.json", "squad-v2.json", "squad.json",
    "titanic.json", "voxceleb.json", "wikitext-103.json"
]

def merge(head, remote):
    m = head.copy()
    for k in ["area", "task", "data_type", "features", "rows", "size"]:
        if k in remote: m[k] = remote[k]
    # Standardize usage
    if "usage_methods" not in m:
        code = remote.get("usage_code", head.get("usage_code", ""))
        if code: m["usage_methods"] = [{"name":"python", "label":"Python", "code":code}]
    if "usage_code" in m: del m["usage_code"]
    return m

def resolve(fn):
    p = os.path.join("docs", "datas", fn)
    if not os.path.exists(p): return False
    with open(p, "r", encoding="utf-8") as f: txt = f.read()
    if "<<<<<<< HEAD" not in txt: return False
    parts = re.split(r'<<<<<<< HEAD\n|=======|>>>>>>> [a-z0-9]+', txt)
    if len(parts) < 4: return False
    
    def parse(s):
        s = s.strip()
        if not s.startswith("{"): s = "{" + s
        if not s.endswith("}"): s = s + "}"
        # Multi-line cleanup
        s = re.sub(r',\s*$', '', s, flags=re.MULTILINE) # remove trailing commas
        return json.loads(s)

    try:
        head = parse(parts[1])
        remote = parse(parts[2])
        res = merge(head, remote)
        with open(p, "w", encoding="utf-8") as f: json.dump(res, f, indent=4)
        return True
    except Exception as e:
        print(f"FAILED {fn}: {e}")
        return False

for f in DATA_FILES:
    if resolve(f): print(f"RESOLVED {f}")
