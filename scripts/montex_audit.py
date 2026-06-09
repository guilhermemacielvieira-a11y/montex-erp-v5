#!/usr/bin/env python3
"""
MONTEX ERP - Auditoria autônoma de dados
=========================================

Cruza informações entre tabelas do Supabase e produz relatório markdown
com inconsistências, peças órfãs, lançamentos atrasados, etc.

Uso:
    python3 scripts/montex_audit.py                    # output em stdout
    python3 scripts/montex_audit.py > audit.md         # salva em arquivo
    python3 scripts/montex_audit.py --obra obra-001    # auditoria só Super Luna

Pode ser invocado periodicamente via cron, scheduled task ou hook do Claude Code.
"""

import json
import sys
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone

import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://trxbohjcwsogthabairh.supabase.co")
# SEGURANCA: nunca hardcode a chave no codigo (vai parar no git/historico).
# Use a NOVA secret key (sb_secret_...) ou a service_role legada via env var:
#   export SUPABASE_SECRET_KEY="sb_secret_..."   (preferido)
SERVICE_KEY = (
    os.environ.get("SUPABASE_SECRET_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)
if not SERVICE_KEY:
    sys.exit("ERRO: defina SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_KEY) no ambiente antes de rodar este script.")
H = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}"}


def fetch(path, params=None):
    """Faz GET no Supabase REST com paginação automática."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        sep = '?' if '?' not in path else '&'
        url = url + sep + '&'.join(f"{k}={v}" for k, v in params.items())
    req = urllib.request.Request(url, headers=H)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def fetch_paginated(path, page_size=1000):
    """Pagina manualmente em tabelas grandes (pecas_producao)."""
    all_data = []
    offset = 0
    while True:
        sep = '&' if '?' in path else '?'
        page = fetch(f"{path}{sep}offset={offset}&limit={page_size}")
        if not page:
            break
        all_data.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return all_data


def main(obra_filter=None):
    out = []
    out.append(f"# MONTEX ERP — Auditoria Automatizada\n")
    out.append(f"**Data:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n")

    # ===== 1. Obras =====
    obras = fetch("obras?select=*")
    obras_ativas = [o for o in obras if o.get('status') not in ('cancelada', 'concluida', 'orcamento')]
    if obra_filter:
        obras_ativas = [o for o in obras_ativas if o['id'] == obra_filter]

    out.append(f"## 📊 Visão geral")
    out.append(f"- Obras ativas: **{len(obras_ativas)}**")
    out.append(f"- Total de obras no banco: {len(obras)}")

    # ===== 2. Peças =====
    pecas = fetch_paginated("pecas_producao?select=id,obra_id,marca,tipo,etapa,quantidade,peso_total")
    if obra_filter:
        pecas_filtradas = [p for p in pecas if p.get('obra_id') == obra_filter]
    else:
        pecas_filtradas = pecas

    pecas_por_obra = defaultdict(list)
    for p in pecas_filtradas:
        pecas_por_obra[p.get('obra_id') or 'SEM_OBRA'].append(p)

    out.append(f"- Peças total: **{len(pecas_filtradas):,}**")
    pecas_sem_obra = [p for p in pecas_filtradas if not p.get('obra_id')]
    if pecas_sem_obra:
        out.append(f"- 🚨 Peças sem obra_id: **{len(pecas_sem_obra)}**")

    # ===== 3. Lançamentos =====
    lancamentos = fetch_paginated("lancamentos_despesas?select=id,obra_id,categoria,valor,data_vencimento,status")
    if obra_filter:
        lanc_obra = [l for l in lancamentos if l.get('obra_id') == obra_filter]
    else:
        lanc_obra = lancamentos

    hoje = datetime.now(timezone.utc).date().isoformat()
    atrasados = [l for l in lanc_obra
                 if l.get('status') != 'pago'
                 and l.get('data_vencimento')
                 and l['data_vencimento'] < hoje]
    out.append(f"- Lançamentos: {len(lanc_obra)} (atrasados: **{len(atrasados)}**)")

    # ===== 4. Montagem =====
    try:
        es = fetch("entity_store?id=eq.montagem_concluidas_global&select=data")
        montadas_ids = set(es[0]['data'].keys()) if es else set()
    except Exception:
        montadas_ids = set()
    out.append(f"- Peças marcadas como Montadas: **{len(montadas_ids)}**")

    # ===== 5. Cruzar montadas com peças existentes =====
    pecas_ids_set = set(p['id'] for p in pecas)
    montadas_orfas = montadas_ids - pecas_ids_set
    if montadas_orfas:
        out.append(f"")
        out.append(f"## 🚨 Críticos")
        out.append(f"- entity_store tem **{len(montadas_orfas)} IDs montados** que não existem mais em pecas_producao:")
        for m_id in list(montadas_orfas)[:10]:
            out.append(f"  - `{m_id}`")
        if len(montadas_orfas) > 10:
            out.append(f"  - ... +{len(montadas_orfas)-10} mais")

    # ===== 6. Por obra =====
    out.append(f"")
    out.append(f"## 📋 Detalhe por obra")
    for o in obras_ativas:
        oid = o['id']
        pcs = pecas_por_obra.get(oid, [])
        peso_total = sum(float(p.get('peso_total') or 0) for p in pcs)
        peso_contrato = float(o.get('contrato_peso_total') or 0)
        diff_peso = peso_total - peso_contrato

        # Distribuição por etapa
        por_etapa = defaultdict(lambda: {'pcs': 0, 'peso': 0})
        for p in pcs:
            et = p.get('etapa') or 'sem_etapa'
            por_etapa[et]['pcs'] += 1
            por_etapa[et]['peso'] += float(p.get('peso_total') or 0)

        # Montadas
        n_montadas = sum(1 for p in pcs if p['id'] in montadas_ids)
        peso_montadas = sum(float(p.get('peso_total') or 0) for p in pcs if p['id'] in montadas_ids)

        out.append(f"### {o['codigo']} — {o['nome']}")
        out.append(f"- **{len(pcs)} peças** · peso real **{peso_total/1000:.2f} t** · contrato **{peso_contrato/1000:.2f} t** · diff **{diff_peso/1000:+.2f} t**")
        out.append(f"- Etapas:")
        for et, d in sorted(por_etapa.items(), key=lambda x: -x[1]['pcs']):
            out.append(f"  - `{et}`: {d['pcs']} peças / {d['peso']/1000:.2f} t")
        if n_montadas:
            out.append(f"- 🟢 Montadas (entity_store): **{n_montadas} peças / {peso_montadas/1000:.2f} t**")

        # Lançamentos da obra
        lanc_da_obra = [l for l in lancamentos if l.get('obra_id') == oid]
        if lanc_da_obra:
            total_lanc = sum(float(l.get('valor') or 0) for l in lanc_da_obra)
            atrasados_obra = [l for l in lanc_da_obra
                              if l.get('status') != 'pago'
                              and l.get('data_vencimento')
                              and l['data_vencimento'] < hoje]
            out.append(f"- 💰 {len(lanc_da_obra)} lançamentos · R$ {total_lanc:,.2f}" +
                       (f" · ⚠️ {len(atrasados_obra)} atrasados" if atrasados_obra else ""))

    # ===== 7. Lançamentos atrasados detalhados =====
    if atrasados:
        out.append(f"")
        out.append(f"## ⚠️ Lançamentos atrasados ({len(atrasados)})")
        total_atrasado = sum(float(l.get('valor') or 0) for l in atrasados)
        out.append(f"**Total: R$ {total_atrasado:,.2f}**")
        for l in atrasados[:15]:
            out.append(f"- `{l['id'][:30]}` · venc {l['data_vencimento']} · R$ {float(l.get('valor') or 0):,.2f} · status={l.get('status')}")
        if len(atrasados) > 15:
            out.append(f"- ... +{len(atrasados)-15} mais")

    out.append(f"")
    out.append(f"---")
    out.append(f"_Auditoria gerada por `scripts/montex_audit.py`_")
    return '\n'.join(out)


if __name__ == '__main__':
    obra = None
    if len(sys.argv) > 1 and sys.argv[1] == '--obra' and len(sys.argv) > 2:
        obra = sys.argv[2]
    print(main(obra_filter=obra))
