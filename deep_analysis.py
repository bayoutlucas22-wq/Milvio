import os
import json
from collections import defaultdict

raw_dir = 'artifacts/raw'
totals = defaultdict(float)

def parse_val(v):
    if isinstance(v, (int, float)): return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace('R$', '').replace('.', '').replace(',', '.').strip())
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
        for row in sheet.get('rows', []):
            # Sum up whatever looks like a total or value
            # Let's be specific for the metrics based on known headers
            val = 0.0
            for k, v in row.items():
                kl = k.lower()
                if 'valor' in kl or 'value' in kl or 'total' in kl or 'comissão' in kl or 'repasse' in kl or 'frete' in kl or 'desconto' in kl or 'markup' in kl or 'incentivo' in kl:
                    val = parse_val(v)
                    break
            
            # For Pagamentos Manuais, there might be specific columns for "Valor"
            if cat == 'Pagamentos Manuais':
                for k, v in row.items():
                    if k.lower() in ['valor', 'valor (r$)']:
                        val = parse_val(v)
                        break

            totals[cat] += val

print("FINANCIAL AGGREGATION")
for k, v in totals.items():
    print(f"{k}: {v:.2f}")

proxy_revenue = totals.get('Fretes', 0) + totals.get('Markup', 0) + totals.get('Descontos', 0)
print(f"Base de Receita Calculada (Estimada): {proxy_revenue:.2f}")

if proxy_revenue > 0:
    com_pct = (abs(totals.get('Comissoes', 0)) / proxy_revenue) * 100
    freight_pct = (totals.get('Fretes', 0) / proxy_revenue) * 100
    desc_pct = (totals.get('Descontos', 0) / proxy_revenue) * 100
    markup_pct = (totals.get('Markup', 0) / proxy_revenue) * 100
    print(f"Comissoes % (Custo): {com_pct:.2f}%")
    print(f"Fretes %: {freight_pct:.2f}%")
    print(f"Descontos %: {desc_pct:.2f}%")
    print(f"Markup %: {markup_pct:.2f}%")

