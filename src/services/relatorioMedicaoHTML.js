// ============================================================
// Pleito de Medição em HTML (arquivo único, para envio ao CLIENTE)
// ============================================================
// Mesmo conteúdo e visual do PDF (relatorioMedicaoPDF.js): faixa
// azul-marinho com logo, cards, tabelas, bloco de autorização e rodapé
// "GRUPO MONTEX". Autocontido (CSS e logo embutidos) e pronto para imprimir.
// ============================================================

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#e2e8f0;font-family:Helvetica,Arial,sans-serif;color:#0f172a;font-size:13px;line-height:1.45}
.folha{max-width:860px;margin:24px auto;background:#fff;box-shadow:0 4px 24px rgba(15,23,42,.12)}
.topo{background:#0f172a;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.topo h1{margin:0;font-size:22px}
.topo p{margin:3px 0 0;font-size:12px;color:#cbd5e1}
.topo img{height:46px}
.corpo{padding:22px 28px 8px}
h2{font-size:15px;margin:22px 0 8px}
.sub{font-size:16px;margin:0 0 6px}
.intro{color:#334155;margin:0 0 14px}
.destaque{border:2px solid #16a34a;background:#f0fdf4;border-radius:8px;padding:12px 18px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.destaque small{display:block;color:#15803d;font-weight:700;font-size:11px;letter-spacing:.04em}
.destaque strong{font-size:28px}
.destaque span{color:#334155}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.kpi{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:8px 10px}
.kpi small{color:#64748b;font-size:11px}
.kpi b{display:block;font-size:16px;margin:2px 0}
.kpi i{font-style:normal;color:#64748b;font-size:11px}
.barra{display:flex;height:16px;border:1px solid #cbd5e1;border-radius:4px;overflow:hidden}
.legenda{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:6px;font-size:11.5px;color:#334155}
.legenda span::before{content:"";display:inline-block;width:10px;height:10px;margin-right:5px;background:var(--c);vertical-align:-1px}
table{width:100%;border-collapse:collapse;font-size:12px}
.tab{overflow-x:auto}
th{background:#1e293b;color:#e2e8f0;text-align:left;padding:6px 8px}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
tr:nth-child(even) td{background:#f1f5f9}
.r{text-align:right}
tr.subtotal td{background:#e2e8f0;font-weight:700}
tr.total td{background:#dcfce7;color:#15803d;font-weight:700}
tr.deducao td{color:#b91c1c}
tr.adiant td{color:#64748b}
.nota{color:#64748b;font-size:11.5px;margin:6px 0 0}
.alerta{color:#b91c1c}
.opcoes{color:#334155;margin:4px 0 10px}
.assin{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.assin>div{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:10px 12px;min-height:110px}
.assin b{display:block}
.assin small{color:#64748b}
.linha{border-top:1px solid #94a3b8;margin-top:38px;padding-top:3px;font-size:11px;color:#64748b;display:flex;justify-content:space-between}
.rodape{border-top:1px solid #cbd5e1;margin:20px 28px 0;padding:8px 0 16px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;gap:12px}
.rodape b{color:#64748b}
@media print{body{background:#fff}.folha{box-shadow:none;margin:0;max-width:none}.anexo{page-break-before:always}tr{page-break-inside:avoid}}
@media (max-width:640px){.folha{margin:0}.corpo{padding:16px}.rodape{margin:16px 16px 0;flex-direction:column}td,th{padding:5px 6px}.kpis{grid-template-columns:1fr 1fr}.assin{grid-template-columns:1fr}.topo{flex-direction:column-reverse;align-items:flex-start}}
`;

export function montarPleitoMedicaoHTML(mod, { logoDataUrl } = {}) {
  const linhasMemoria = mod.memoria.map((r) => `
    <tr class="${esc(r.tipo)}"><td>${esc(r.label)}</td><td class="r">${esc(r.pecas)}</td><td class="r">${esc(r.medida)}</td><td class="r">${esc(r.valor)}</td></tr>`).join('');
  const barra = mod.barra.filter((b) => b.pct > 0.05)
    .map((b) => `<div title="${esc(b.label)}: ${esc(b.valorTxt)}" style="width:${b.pct.toFixed(3)}%;background:${esc(b.cor)}"></div>`).join('');
  const legenda = mod.barra
    .map((b) => `<span style="--c:${esc(b.cor)}">${esc(b.label)}: <b>${esc(b.valorTxt)}</b> (${esc(b.pctTxt)})</span>`).join('');
  const historico = mod.historico.length ? `
    <h2>Medições anteriores</h2>
    <div class="tab"><table><thead><tr><th>Nº</th><th>Data</th><th>Descrição</th><th class="r">Quantidade</th><th class="r">Valor</th><th>Situação</th></tr></thead><tbody>
    ${mod.historico.map((h) => `<tr class="${h.adiantamento ? 'adiant' : ''}"><td>${esc(h.numero)}</td><td>${esc(h.data)}</td><td>${esc(h.descricao)}</td><td class="r">${esc(h.medida)}</td><td class="r">${esc(h.valor)}</td><td>${esc(h.situacao)}</td></tr>`).join('')}
    </tbody></table></div>` : '';
  const itens = mod.itens.length ? `
    <div class="anexo">
    <h2>Anexo — Peças fabricadas ainda na fábrica (${esc(mod.itensTotal)} · ${esc(mod.itensPeso)})</h2>
    <p class="nota">Peças aguardando carga ou em processo final incluídas no pleito. As já entregues constam nos romaneios de expedição.</p>
    <div class="tab"><table><thead><tr><th>Marca</th><th>Perfil</th><th>Situação</th><th class="r">Qtd</th><th class="r">Peso</th></tr></thead><tbody>
    ${mod.itens.map((i) => `<tr><td>${esc(i.marca)}</td><td>${esc(i.perfil)}</td><td>${esc(i.situacao)}</td><td class="r">${esc(i.qtd)}</td><td class="r">${esc(i.peso)}</td></tr>`).join('')}
    </tbody></table></div>
    ${mod.itensTotal > mod.itens.length ? `<p class="nota">… mostrando as ${esc(mod.itens.length)} peças de maior peso, de ${esc(mod.itensTotal)}.</p>` : ''}
    </div>` : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(mod.titulo)} — ${esc(mod.obraTxt)}</title><style>${CSS}</style></head>
<body><div class="folha">
  <header class="topo">
    <div><h1>MONTEX — ${esc(mod.titulo)}</h1>
      <p>Obra: ${esc(mod.obraTxt)}</p>
      <p>${mod.cliente ? `Cliente: ${esc(mod.cliente)} &nbsp;·&nbsp; ` : ''}Data-base: ${esc(mod.dataTxt)}</p></div>
    ${logoDataUrl ? `<img src="${esc(logoDataUrl)}" alt="Grupo Montex">` : ''}
  </header>
  <main class="corpo">
    <h2 class="sub">${esc(mod.subtitulo)}</h2>
    <p class="intro">${esc(mod.intro)}</p>
    <div class="destaque"><div><small>VALOR PLEITEADO PARA AUTORIZAÇÃO</small><strong>${esc(mod.destaque.valor)}</strong></div><span>${esc(mod.destaque.formula)}</span></div>
    <div class="kpis">${mod.kpis.map((k) => `<div class="kpi"><small>${esc(k.label)}</small><b>${esc(k.valor)}</b><i>${esc(k.sub)}</i></div>`).join('')}</div>
    <h2>Situação do contrato</h2>
    <div class="barra">${barra}</div>
    <div class="legenda">${legenda}</div>
    <h2>Memória de cálculo</h2>
    <div class="tab"><table><thead><tr><th>Descrição</th><th class="r">Peças</th><th class="r">Quantidade</th><th class="r">Valor</th></tr></thead><tbody>${linhasMemoria}</tbody></table></div>
    ${mod.naoConsiderado.length ? `<p class="nota">Não considerado neste pleito: ${esc(mod.naoConsiderado.join(' · '))}.</p>` : ''}
    ${mod.avisoExcedente ? `<p class="nota alerta">${esc(mod.avisoExcedente)}</p>` : ''}
    ${historico}
    ${mod.observacao ? `<h2>Observações</h2><p class="intro">${esc(mod.observacao)}</p>` : ''}
    <h2>Autorização do cliente</h2>
    <p class="opcoes">(&nbsp;&nbsp;) Autorizado &nbsp;&nbsp;&nbsp; (&nbsp;&nbsp;) Autorizado com ressalvas &nbsp;&nbsp;&nbsp; (&nbsp;&nbsp;) Não autorizado</p>
    <div class="assin">
      <div><b>GRUPO MONTEX</b><small>Responsável pela medição</small><div class="linha"><span>Nome / Assinatura</span><span>Data: ___/___/______</span></div></div>
      <div><b>${esc(mod.cliente || 'CLIENTE')}</b><small>Aprovação</small><div class="linha"><span>Nome / Assinatura</span><span>Data: ___/___/______</span></div></div>
    </div>
    ${itens}
  </main>
  <footer class="rodape"><span><b>GRUPO MONTEX</b> · São Joaquim de Bicas/MG · ${esc(mod.obraTxt)}</span><span>Gerado em ${esc(mod.geradoEm)}</span></footer>
</div></body></html>`;
}

export function baixarPleitoMedicaoHTML(mod, opts = {}) {
  const html = montarPleitoMedicaoHTML(mod, opts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${mod.nomeArquivo}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { nome: a.download };
}
