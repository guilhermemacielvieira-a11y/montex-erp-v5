// ============================================================
// Pleito de Medição — modelo do relatório (puro, sem React/jsPDF)
// ============================================================
// Converte a apuração (services/medicaoPleito.js) em textos e linhas
// prontos para o PDF (relatorioMedicaoPDF.js) e o HTML
// (relatorioMedicaoHTML.js). Os dois exportadores mostram EXATAMENTE o
// mesmo conteúdo.
// ============================================================

export const fmtMoeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtKg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
export const fmtUn = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} un`;
export const fmtPct = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const fmtData = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '-');
};
const fmtValorUnit = (v, unidade) => `${(Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })}/${unidade}`;

const SITUACAO_TXT = { paga: 'Paga', aprovada: 'Aprovada', em_analise: 'Em análise', cancelada: 'Cancelada' };
const GRUPO_TXT = { aguardandoCarga: 'Aguardando carga', pintura: 'Em pintura', solda: 'Em solda' };
export const ITENS_CAP = 60;

/**
 * @param {object} ap  resultado de apurarPleito()
 * @param {object} info { obraNome, obraCodigo, cliente, numero, dataISO, observacao }
 */
export function modeloPleito(ap, info = {}) {
  const kg = ap.modo !== 'unidade';
  const fm = kg ? fmtKg : fmtUn;
  const numero = info.numero || ap.proximoNumero;
  const dataTxt = fmtData(info.dataISO) || new Date().toLocaleDateString('pt-BR');
  const obraTxt = `${info.obraCodigo ? `${info.obraCodigo} · ` : ''}${info.obraNome || ''}`;
  const valorUnitTxt = fmtValorUnit(ap.valorUnit, ap.unidade);
  const incluidos = ap.composicao.filter((c) => c.incluido);
  const nomesIncluidos = incluidos.map((c) => c.label.toLowerCase());
  const listaIncluidos = nomesIncluidos.length > 1
    ? `${nomesIncluidos.slice(0, -1).join(', ')} e ${nomesIncluidos[nomesIncluidos.length - 1]}`
    : (nomesIncluidos[0] || '-');

  const intro = ap.disponivel > 0
    ? `Apresentamos a apuração da fabricação da obra ${obraTxt} até ${dataTxt}. Considerando o ${kg ? 'peso' : 'quantitativo'} já fabricado (${listaIncluidos}), descontado o que já foi medido, solicitamos a autorização para emissão da Medição nº ${numero}, no valor de ${fmtMoeda(ap.valorDisponivel)}.`
    : `Apresentamos a apuração da fabricação da obra ${obraTxt} até ${dataTxt}. No momento não há saldo fabricado disponível para nova medição: o já medido cobre todo o ${kg ? 'peso' : 'quantitativo'} fabricado considerado (${listaIncluidos}).`;

  const kpis = [
    { label: 'Contratado', valor: fm(ap.contrato), sub: ap.valorContrato > 0 ? fmtMoeda(ap.valorContrato) : '' },
    { label: 'Fabricado elegível', valor: fm(ap.tetoElegivel), sub: `${fmtPct(ap.pctElegivel)} do contrato` },
    { label: 'Já medido', valor: fm(ap.medido), sub: `${fmtPct(ap.pctMedido)} · ${fmtMoeda(ap.valorMedido)}` },
    { label: 'Saldo do contrato', valor: fm(ap.saldoContrato), sub: 'a medir' },
  ];

  // Memória de cálculo
  const memoria = [];
  incluidos.forEach((c) => memoria.push({ tipo: 'item', label: c.label, pecas: c.pecas, medida: fm(c.medida), valor: '' }));
  memoria.push({ tipo: 'subtotal', label: `Fabricado elegível${ap.tetoElegivel < ap.elegivel ? ' (limitado ao contrato)' : ''}`, pecas: incluidos.reduce((s, c) => s + c.pecas, 0), medida: fm(ap.tetoElegivel), valor: '' });
  memoria.push({ tipo: 'deducao', label: '(-) Já medido (medições anteriores de fabricação)', pecas: '', medida: fm(ap.medido), valor: fmtMoeda(ap.valorMedido) });
  memoria.push({ tipo: 'subtotal', label: '(=) Disponível para medição', pecas: '', medida: fm(ap.disponivel), valor: '' });
  memoria.push({ tipo: 'item', label: `(×) Valor unitário contratado`, pecas: '', medida: valorUnitTxt, valor: '' });
  memoria.push({ tipo: 'total', label: `(=) Valor pleiteado — Medição nº ${numero}`, pecas: '', medida: fm(ap.disponivel), valor: fmtMoeda(ap.valorDisponivel) });

  const naoConsiderado = ap.composicao.filter((c) => !c.incluido && c.medida > 0)
    .map((c) => `${c.label}: ${fm(c.medida)}`);

  const historico = ap.historico
    .filter((h) => h.tipo !== 'outra' && h.situacao !== 'cancelada')
    .map((h) => ({
      numero: h.numero != null ? `#${h.numero}` : '-',
      data: fmtData(h.data),
      descricao: h.tipo === 'adiantamento' ? `${h.descricao} (adiantamento)` : h.descricao,
      medida: h.tipo === 'fabricacao' ? fm(h.medida) : '—',
      valor: fmtMoeda(h.valor),
      situacao: SITUACAO_TXT[h.situacao] || h.situacao,
      adiantamento: h.tipo === 'adiantamento',
    }));

  const itens = ap.itensFabrica.slice(0, ITENS_CAP).map((i) => ({
    marca: i.marca, perfil: i.perfil, situacao: GRUPO_TXT[i.grupo] || i.grupo,
    qtd: (Number(i.qtd) || 0).toLocaleString('pt-BR'), peso: fmtKg(i.peso),
  }));

  return {
    titulo: `Pleito de Medição nº ${numero}`,
    subtitulo: 'Solicitação de autorização de medição — Fabricação',
    numero, obraTxt, cliente: info.cliente || '', dataTxt,
    geradoEm: new Date().toLocaleString('pt-BR'),
    intro,
    destaque: {
      valor: fmtMoeda(ap.valorDisponivel),
      formula: `${fm(ap.disponivel)} × ${valorUnitTxt}`,
    },
    kpis,
    barra: ap.barra.map((b) => ({ ...b, valorTxt: fm(b.valor), pctTxt: fmtPct(b.pct) })),
    memoria,
    naoConsiderado,
    avisoExcedente: ap.excedente > 0 ? `O já medido supera o fabricado elegível em ${fm(ap.excedente)}.` : '',
    historico,
    itens,
    itensTotal: ap.itensFabrica.length,
    itensPeso: fmtKg(ap.itensFabrica.reduce((s, i) => s + i.peso, 0)),
    observacao: info.observacao || '',
    nomeArquivo: `pleito_medicao_${numero}_${String(info.obraCodigo || info.obraNome || 'obra').replace(/[^\w.-]+/g, '_')}`,
  };
}
