import os
import json
from collections import defaultdict

raw_dir = 'artifacts/raw'
summary = defaultdict(float)

for filename in os.listdir(raw_dir):
    if not filename.endswith('.json'): continue
    filepath = os.path.join(raw_dir, filename)
    with open(filepath, 'r') as f:
        data = json.load(f)
        
    category = filename.split('-')[1]
    if 'Comissoes' in category: cat = 'Comissoes'
    elif 'Descontos' in category: cat = 'Descontos'
    elif 'Fretes' in category: cat = 'Fretes'
    elif 'Incentivos' in category: cat = 'Incentivos'
    elif 'Markup' in category: cat = 'Markup'
    elif 'Pagamentos' in category: cat = 'Pagamentos Manuais'
    else: cat = 'Outros'
    
    # Need to know the structure to sum correctly.
    # Let's just print a few keys to understand.
    if isinstance(data, list) and len(data) > 0:
        print(f"Sample for {cat}:", list(data[0].keys())[:5])
        break
