import os
import json
from collections import defaultdict

raw_dir = 'artifacts/raw'
totals = defaultdict(float)
weekly_totals = defaultdict(float)
partners = defaultdict(float)

# Function to safely extract a float from a string/number
def get_val(row):
    for k in row.keys():
        kl = k.lower()
        if 'valor' in kl or 'value' in kl or 'total' in kl or 'comissão' in kl or 'repasse' in kl or 'frete' in kl or 'desconto' in kl or 'markup' in kl or 'incentivo' in kl:
            val = row[k]
            if isinstance(val, (int, float)): return val
            if isinstance(val, str):
                try:
                    return float(val.replace('R$', '').replace('.', '').replace(',', '.').strip())
                except:
                    pass
    return 0.0

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
    
    for sheet in data:
        folder = sheet.get('folder_name', 'Unknown')
        for row in sheet.get('rows', []):
            val = get_val(row)
            
            # Identify partner
            partner = None
            for k, v in row.items():
                if 'parceiro' in k.lower() or 'ponto de venda' in k.lower() or 'pdv' in k.lower():
                    partner = v
                    break
            
            # Aggregation logic based on category
            # If it's a cost/discount it might be negative, let's just sum absolute or raw values to see variance
            totals[cat] += val
            weekly_totals[folder] += val
            if partner:
                partners[partner] += val

print("=== Totais por Categoria ===")
for k, v in totals.items():
    print(f"{k}: {v:.2f}")

print("\n=== Semanas (Top 5) ===")
for k, v in sorted(weekly_totals.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f"{k}: {v:.2f}")

print("\n=== Parceiros (Top 5) ===")
for k, v in sorted(partners.items(), key=lambda x: x[1], reverse=True)[:5]:
    print(f"{k}: {v:.2f}")

