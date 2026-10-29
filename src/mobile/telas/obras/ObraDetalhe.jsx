// ============================================================
// Obra — detalhe (app da diretoria, rota /m/obras/:id)
// ============================================================
// Filtra tudo LOCALMENTE pelo id da URL (não chama setObraAtual, regra do
// app da diretoria). Números financeiros = mesma régua da GFO (regra 1b):
// calcularSaldoObra sobre medições + receitas manuais vinculadas e os
// lançamentos da obra. Avanço/ritmo/previsão = motor do BI (biObras) e
// margem estimada = motor do custo/kg (biCustoKg), calculados só para esta
// obra para não depender do seletor do topo. Somente leitura.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, ExternalLink } from 'lucide-react';
import { useObras, useProducao, useMedicoes, useLancamentos, useExpedicao, useERP } from '@/contexts/ERPContext';
import { useBIData } from '@/hooks/useBIData';
import { useCustoKg } from '@/hooks/useCustoKg';
import { useReceitasManuais } from '@/utils/receitasSync';
import { calcularSaldoObra } from '@/data/obraFinanceiraDatabase';
import { indicadoresObras } from '@/services/bi/biObras';
import { margemObras } from '@/services/bi/biCustoKg';
import { etapaPeca, pesoPeca, qtdPeca } from '@/services/relatorioProducao';
import { loadConcluidasSmart, subscribeConcluidas, isMontada, getMontadasCount } from '@/utils/montagemSync';
import {
  medicaoReconhecida, medicaoRecebida, despesaPaga, despesaCancelada, statusReceitaParaMedicao,
} from '@/utils/financeiroStatus';
import { normalizarStatusRomaneio, itensDoRomaneio } from '@/services/romaneio';
import { valorMedicao } from '../../dados';
import {
  Tela, Secao, Grupo, Linha, Metrica, Grade, Barra, Status, Botao, Vazio, Esqueleto, Erro,
} from '../../kit';
import { brl, brlc, num, peso, pct, data, quando } from '../../kit/fmt';
import { abrirNoComputador, temVersaoComputador } from '../../kit/fmt';
import { clienteDaObra, situacaoObra } from './Obras';

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const obraDe = (x) => x?.obraId ?? x?.obra_id ?? null;
const dataMed = (m) => String(m?.dataMedicao || m?.data_medicao || m?.dataReferencia || m?.data_referencia || m?.data || '').slice(0, 10);
const dataExp = (e) => String(e?.dataSaida || e?.data_saida || e?.dataExpedicao || e?.data_expedicao || e?.dataEnvio || e?.data_envio || e?.data || e?.createdAt || e?.created_at || '').slice(0, 10);

const ETAPAS = [
  { key: 'aguardando', rotulo: 'Aguardando corte' },
  { key: 'fabricacao', rotulo: 'Fabricação' },
  { key: 'solda', rotulo: 'Solda' },
  { key: 'pintura', rotulo: 'Pintura' },
  { key: 'expedido', rotulo: 'Fila de embarque' },
  { key: 'enviado', rotulo: 'Em obra, aguardando montagem' },
  { key: 'montadas', rotulo: 'Montadas' },
];

const ROMANEIO = {
  preparando: { tom: 'neutro', texto: 'Preparando' },
  aguardando_transporte: { tom: 'warn', texto: 'Aguardando transporte' },
  em_transito: { tom: 'teal', texto: 'Em trânsito' },
  entregue: { tom: 'ok', texto: 'Entregue' },
  problema: { tom: 'bad', texto: 'Problema' },
};

function statusMedicao(st) {
  const s = String(st || '').toLowerCase();
  if (/rejeit|cancel/.test(s)) return { tom: 'bad', texto: 'Rejeitada' };
  if (medicaoRecebida(st)) return { tom: 'ok', texto: 'Paga' };
  if (/fatur/.test(s)) return { tom: 'teal', texto: 'Faturada' };
  if (medicaoReconhecida(st)) return { tom: 'teal', texto: 'Aprovada' };
  if (/previst/.test(s)) return { tom: 'neutro', texto: 'Prevista' };
  return { tom: 'warn', texto: 'Pendente' };
}

const rotuloCategoria = (c) => {
  const t = String(c || 'outros').replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Medição no formato que calcularSaldoObra espera (status canônico da GFO). */
function paraMedicaoGFO(m, obraId) {
  const s = String(m.status || 'aguardando').toLowerCase();
  const status = ['pago', 'paga', 'recebido', 'recebida'].includes(s) ? 'paga' : s;
  return {
    ...m,
    obraId,
    status,
    valorBruto: n(m.valorBruto ?? m.valor_bruto),
    valorLiquido: n(m.valorLiquido ?? m.valor_liquido) || n(m.valorBruto ?? m.valor_bruto),
  };
}

export default function ObraDetalhe() {
  const { id: idParam } = useParams();
  const id = decodeURIComponent(idParam || '');
  const navigate = useNavigate();

  const { obras = [], clientes = [] } = useObras();
  const { loading } = useERP();
  const { pecas = [] } = useProducao();
  const { medicoes = [] } = useMedicoes();
  const { lancamentosDespesas = [] } = useLancamentos();
  const { expedicoes = [] } = useExpedicao();
  const { receitas: receitasManuais = [] } = useReceitasManuais();
  const dados = useBIData({ empresa: true });
  const { analise } = useCustoKg(dados);

  // Montagem: estado independente da etapa (regra 6) — cache local + entity_store
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart((r) => setConcluidas(r || {})) || {});
  useEffect(() => subscribeConcluidas((r) => setConcluidas(r || {})), []);

  const obra = useMemo(() => obras.find((o) => String(o.id) === id) || null, [obras, id]);

  // ---- Financeiro (régua da GFO) ----
  const fin = useMemo(() => {
    if (!obra) return null;
    const valorContrato = n(obra.contratoValorTotal ?? obra.contrato_valor_total ?? obra.valorContrato);
    const lancs = lancamentosDespesas
      .filter((l) => obraDe(l) === obra.id)
      .map((l) => ({ ...l, obraId: obra.id, valor: n(l.valor), status: despesaCancelada(l.status) ? 'cancelado' : (despesaPaga(l.status) ? 'pago' : (l.status || 'pendente')) }));
    const meds = medicoes
      .filter((m) => obraDe(m) === obra.id && !/previst/i.test(String(m.status || '')))
      .map((m) => paraMedicaoGFO(m, obra.id));
    // Receitas manuais vinculadas à obra entram como na GFO
    const manuais = receitasManuais
      .filter((r) => obraDe(r) === obra.id && String(r.status || '').toLowerCase() !== 'cancelado')
      .map((r) => paraMedicaoGFO({
        id: `RECMAN-${r.id}`,
        valorBruto: n(r.valor),
        valorLiquido: n(r.valorLiquido ?? r.valor),
        status: statusReceitaParaMedicao(r.status),
      }, obra.id));
    const s = calcularSaldoObra({ id: obra.id, contrato: { valorTotal: valorContrato } }, lancs, [...meds, ...manuais]);
    const despesasPagas = lancs.filter((l) => l.status === 'pago').reduce((a, l) => a + l.valor, 0);
    return {
      ...s,
      contratoCadastrado: valorContrato > 0,
      despesasPagas,
      // Resultado da obra como na GFO: recebido − despesas pagas
      resultadoCaixa: s.totalRecebido - despesasPagas,
      lancs,
    };
  }, [obra, lancamentosDespesas, medicoes, receitasManuais]);

  // ---- Avanço (motor do BI só para esta obra) ----
  const ind = useMemo(() => {
    if (!obra) return null;
    const b = dados.bruto;
    return indicadoresObras({
      obras: [obra], pecas: b.pecas, medicoes: b.medicoes,
      despesas: (b.lancamentos || []).filter((d) => obraDe(d) === obra.id),
      transicoes: b.transicoes, hoje: dados.hoje,
    })[0] || null;
  }, [obra, dados.bruto, dados.hoje]);

  // ---- Fabricação por etapa ----
  const fabricacao = useMemo(() => {
    if (!obra) return null;
    const acc = Object.fromEntries(ETAPAS.map((e) => [e.key, { un: 0, kg: 0, marcas: 0 }]));
    let totalKg = 0;
    pecas.filter((p) => obraDe(p) === obra.id).forEach((p) => {
      const kgP = pesoPeca(p);
      const q = Math.max(1, qtdPeca(p) || 1);
      totalKg += kgP;
      let et = etapaPeca(p);
      if (et === 'entregue') et = 'enviado';
      if (et === 'enviado') {
        const pay = concluidas[String(p.id)];
        const m = isMontada(pay) ? getMontadasCount(pay, q) : 0;
        if (m > 0) {
          acc.montadas.un += m; acc.montadas.kg += (kgP / q) * m; acc.montadas.marcas += 1;
        }
        if (q - m > 0) {
          acc.enviado.un += q - m; acc.enviado.kg += (kgP / q) * (q - m); acc.enviado.marcas += 1;
        }
        return;
      }
      acc[et].un += q; acc[et].kg += kgP; acc[et].marcas += 1;
    });
    return { acc, totalKg, vazio: totalKg === 0 && Object.values(acc).every((v) => v.un === 0) };
  }, [obra, pecas, concluidas]);

  // ---- Margem estimada (motor do custo/kg, sem depender do escopo) ----
  const margem = useMemo(() => {
    if (!obra || !analise) return null;
    return margemObras({
      obras: [obra], pecas: dados.bruto.pecas, custoKg: analise.custoKg, custoKg2027: analise.custoKg2027, cfg: analise.cfg,
    })[0] || null;
  }, [obra, analise, dados.bruto]);

  // ---- Medições ----
  const ultimasMedicoes = useMemo(() => {
    if (!obra) return [];
    return medicoes
      .filter((m) => obraDe(m) === obra.id)
      .slice()
      .sort((a, b) => dataMed(b).localeCompare(dataMed(a)) || n(b.numero) - n(a.numero))
      .slice(0, 5);
  }, [obra, medicoes]);

  // ---- Despesas por categoria ----
  const despesasCat = useMemo(() => {
    if (!fin) return { top: [], total: 0, qtdCat: 0 };
    const mapa = new Map();
    fin.lancs.filter((l) => l.status !== 'cancelado').forEach((l) => {
      const k = l.categoria || 'outros';
      const cur = mapa.get(k) || { categoria: k, valor: 0, qtd: 0 };
      cur.valor += l.valor; cur.qtd += 1;
      mapa.set(k, cur);
    });
    const lista = [...mapa.values()].sort((a, b) => b.valor - a.valor);
    return { top: lista.slice(0, 5), total: lista.reduce((s, c) => s + c.valor, 0), qtdCat: lista.length };
  }, [fin]);

  // ---- Embarques ----
  const embarques = useMemo(() => {
    if (!obra) return { ultimos: [], total: 0 };
    const lista = expedicoes
      .filter((e) => obraDe(e) === obra.id && !e.deletedAt && !e.deleted_at)
      .slice()
      .sort((a, b) => dataExp(b).localeCompare(dataExp(a)));
    return { ultimos: lista.slice(0, 3), total: lista.length };
  }, [obra, expedicoes]);

  // ---------- Estados ----------
  if (!obra) {
    if (loading || obras.length === 0) {
      return (
        <Tela titulo="Obra" voltar="/m/obras">
          <Esqueleto metricas={4} linhas={4} />
        </Tela>
      );
    }
    return (
      <Tela titulo="Obra" voltar="/m/obras">
        <Vazio
          icone={Building2}
          titulo="Obra não encontrada"
          texto="Ela pode ter sido removida ou o link está incompleto."
          acao={<Botao variante="secundario" onClick={() => navigate('/m/obras')}>Voltar para obras</Botao>}
        />
      </Tela>
    );
  }

  const cliente = clienteDaObra(obra, clientes);
  const subtitulo = [cliente, obra.codigo].filter(Boolean).join(' · ');
  const sit = situacaoObra(ind);
  const fisico = ind?.fisicoPct;
  const financeiro = ind?.financeiroPct;

  return (
    <Tela titulo={obra.nome || obra.codigo || obra.id} subtitulo={subtitulo} voltar="/m/obras" onRefresh={() => dados.recarregar(true)}>
      {/* a) Métricas financeiras (régua da GFO) */}
      <div className="pt-4">
        <Grade>
          <Metrica rotulo="Contrato" valor={fin.contratoCadastrado ? brlc(fin.valorContrato) : '—'} sub={fin.contratoCadastrado ? undefined : 'Contrato não cadastrado'} />
          <Metrica
            rotulo="Medido"
            valor={brlc(fin.totalMedidoBruto)}
            sub={fin.contratoCadastrado ? `${pct(fin.percentualMedido)} do contrato` : undefined}
          />
          <Metrica
            rotulo="Recebido"
            valor={brlc(fin.totalRecebido)}
            sub={fin.contratoCadastrado ? `${pct(fin.percentualRecebido)} do contrato` : undefined}
          />
          <Metrica rotulo="A receber" valor={brlc(fin.saldoAReceber)} sub="Medido e ainda não pago" tom={fin.saldoAReceber > 0 ? 'warn' : undefined} />
        </Grade>
        <div className="mt-2.5">
          <Metrica
            rotulo="Resultado"
            valor={brlc(fin.resultadoCaixa)}
            sub={`Recebido ${brlc(fin.totalRecebido)} − despesas pagas ${brlc(fin.despesasPagas)}`}
            tom={fin.resultadoCaixa >= 0 ? 'ok' : 'bad'}
          />
        </div>
      </div>

      {/* b) Avanço */}
      <Secao titulo="Avanço" descricao="Físico = kg fabricado · financeiro = contrato medido">
        {dados.erro && <Erro texto="Histórico de produção indisponível: ritmo e previsão podem estar desatualizados." onTentar={() => dados.recarregar(true)} />}
        <Grupo>
          <div className="space-y-3 px-4 py-3.5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="text-mx-tealhi">Físico</span>
                <span className="mx-tab text-mx-text">{pct(fisico)}</span>
              </div>
              <Barra valor={fisico ?? 0} tom="teal" altura={8} rotulo="Avanço físico" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="text-mx-text2">Financeiro</span>
                <span className="mx-tab text-mx-text">{pct(financeiro)}</span>
              </div>
              <Barra valor={financeiro ?? 0} tom="neutro" altura={8} rotulo="Avanço financeiro" />
            </div>
            {ind?.gapPp !== null && ind?.gapPp !== undefined && (
              <p className="text-[12px] text-mx-text3">
                {ind.gapPp > 0
                  ? `Medição ${num(ind.gapPp, 1)} pp à frente da fabricação`
                  : ind.gapPp < 0
                    ? `Fabricação ${num(-ind.gapPp, 1)} pp à frente da medição`
                    : 'Medição e fabricação no mesmo ritmo'}
              </p>
            )}
          </div>
          <Linha titulo="Peso pronto" valor={`${peso(ind?.kgPronto)} de ${peso(ind?.kgTotal)}`} valorSub={ind?.kgEmObra > 0 ? `${peso(ind.kgEmObra)} em obra` : undefined} />
          <Linha
            titulo="Ritmo"
            sub="Média das últimas 4 semanas"
            valor={ind?.ritmoKgSemana > 0 ? `${peso(ind.ritmoKgSemana)}/semana` : 'Sem produção recente'}
          />
          <Linha
            titulo="Previsão de término"
            sub={ind?.prazo ? `Prazo ${data(ind.prazo, { ano: true })} (${quando(ind.prazo)})` : 'Prazo não cadastrado'}
            valor={ind?.previsaoFim ? data(ind.previsaoFim, { ano: true }) : (ind?.kgRestante > 0 ? '—' : 'Fabricação concluída')}
            valorSub={ind?.previsaoFim ? quando(ind.previsaoFim) : (ind?.kgRestante > 0 ? 'sem ritmo para estimar' : undefined)}
          />
          <div className="flex min-h-[48px] items-center justify-between px-4 py-3">
            <span className="text-[15px] text-mx-text">Situação</span>
            <Status tom={sit.tom}>{sit.texto}</Status>
          </div>
        </Grupo>
      </Secao>

      {/* c) Fabricação por etapa */}
      <Secao titulo="Fabricação" descricao="Unidades e peso por etapa do fluxo">
        {fabricacao.vazio ? (
          <Grupo><Vazio titulo="Sem peças cadastradas" texto="A lista de peças desta obra ainda não foi importada." /></Grupo>
        ) : (
          <Grupo>
            {ETAPAS.map((e) => {
              const v = fabricacao.acc[e.key];
              return (
                <div key={e.key} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] text-mx-text">{e.rotulo}</span>
                    <span className="mx-tab shrink-0 text-[14px] font-semibold text-mx-text">{peso(v.kg)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex-1">
                      <Barra valor={v.kg} max={fabricacao.totalKg || 1} tom={e.key === 'montadas' ? 'ok' : 'teal'} altura={4} rotulo={e.rotulo} />
                    </div>
                    <span className="mx-tab w-[64px] shrink-0 text-right text-[12px] text-mx-text3">{num(v.un)} un</span>
                  </div>
                </div>
              );
            })}
          </Grupo>
        )}
      </Secao>

      {/* d) Margem estimada de fabricação */}
      <Secao titulo="Margem estimada de fabricação" descricao="Estimativa — o resultado oficial fica na Gestão Financeira da Obra">
        {!margem || margem.receitaKg === null ? (
          <Grupo>
            <Vazio
              titulo="Sem dados para estimar"
              texto={!margem ? 'Obra fora da carteira ativa.' : 'Cadastre o R$/kg de fabricação ou o valor e o peso do contrato.'}
            />
          </Grupo>
        ) : (
          <Grupo>
            <Linha titulo="Receita de fabricação" sub={margem.fonte === 'informado' ? 'R$/kg informado na obra' : 'Estimada do preço global'} valor={`${brl(margem.receitaKg, 2)}/kg`} />
            <Linha titulo="Custo da fábrica" sub="Volume atual" valor={margem.custoKg === null ? '—' : `${brl(margem.custoKg, 2)}/kg`} />
            <Linha
              titulo="Margem hoje"
              valor={margem.margemKg === null ? '—' : `${brl(margem.margemKg, 2)}/kg`}
              valorTom={margem.margemKg === null ? undefined : margem.margemKg < 0 ? 'bad' : margem.situacao === 'apertada' ? 'warn' : 'ok'}
              valorSub={margem.margemRestante !== null && margem.kgRestante > 0 ? `${brlc(margem.margemRestante)} no saldo de ${peso(margem.kgRestante)}` : undefined}
            />
            <Linha
              titulo="Margem em 2027"
              sub="Com os reajustes previstos"
              valor={margem.margemKg2027 === null ? '—' : `${brl(margem.margemKg2027, 2)}/kg`}
              valorTom={margem.margemKg2027 === null ? undefined : margem.margemKg2027 < 0 ? 'bad' : 'ok'}
            />
          </Grupo>
        )}
      </Secao>

      {/* e) Medições */}
      <Secao titulo="Medições" descricao={ultimasMedicoes.length ? 'Últimas 5' : undefined}>
        {ultimasMedicoes.length === 0 ? (
          <Grupo><Vazio titulo="Nenhuma medição" texto="Esta obra ainda não tem medições lançadas." /></Grupo>
        ) : (
          <Grupo>
            {ultimasMedicoes.map((m) => {
              const st = statusMedicao(m.status);
              return (
                <Linha
                  key={m.id}
                  titulo={m.numero ? `Medição ${m.numero}` : (m.descricao || 'Medição')}
                  sub={[data(dataMed(m)), m.etapa === 'montagem' ? 'Montagem' : m.etapa === 'fabricacao' ? 'Fabricação' : null].filter(Boolean).join(' · ')}
                  direita={(
                    <div className="shrink-0 text-right">
                      <div className="mx-tab text-[15px] font-semibold text-mx-text">{brlc(valorMedicao(m))}</div>
                      <Status tom={st.tom} className="text-[12px]">{st.texto}</Status>
                    </div>
                  )}
                />
              );
            })}
          </Grupo>
        )}
      </Secao>

      {/* f) Despesas da obra */}
      <Secao
        titulo="Despesas da obra"
        descricao={despesasCat.total > 0 ? `Total ${brlc(despesasCat.total)}${despesasCat.qtdCat > 5 ? ' · 5 maiores categorias' : ''}` : undefined}
      >
        {despesasCat.top.length === 0 ? (
          <Grupo><Vazio titulo="Nenhuma despesa" texto="Sem lançamentos de material ou serviço nesta obra." /></Grupo>
        ) : (
          <Grupo>
            {despesasCat.top.map((c) => (
              <Linha
                key={c.categoria}
                titulo={rotuloCategoria(c.categoria)}
                sub={`${c.qtd} ${c.qtd === 1 ? 'lançamento' : 'lançamentos'}`}
                valor={brlc(c.valor)}
                valorSub={despesasCat.total > 0 ? pct((c.valor / despesasCat.total) * 100) : undefined}
              />
            ))}
          </Grupo>
        )}
      </Secao>

      {/* g) Embarques */}
      <Secao titulo="Embarques" descricao={embarques.total > 3 ? `Últimos 3 de ${embarques.total}` : undefined}>
        {embarques.ultimos.length === 0 ? (
          <Grupo><Vazio titulo="Nenhum romaneio" texto="Nada embarcado para esta obra ainda." /></Grupo>
        ) : (
          <Grupo>
            {embarques.ultimos.map((e) => {
              const st = ROMANEIO[normalizarStatusRomaneio(e.status)] || { tom: 'neutro', texto: e.status || '—' };
              const nPecas = itensDoRomaneio(e).length || (Array.isArray(e.pecasIds || e.pecas_ids) ? (e.pecasIds || e.pecas_ids).length : 0);
              const kgR = n(e.pesoTotal ?? e.peso_total);
              return (
                <Linha
                  key={e.id}
                  titulo={`Romaneio ${e.numeroRomaneio || e.numero_romaneio || e.numero || e.id}`}
                  sub={[data(dataExp(e)), nPecas ? `${nPecas} ${nPecas === 1 ? 'peça' : 'peças'}` : null, kgR > 0 ? peso(kgR) : null, e.motorista || null].filter(Boolean).join(' · ')}
                  direita={<Status tom={st.tom} className="shrink-0">{st.texto}</Status>}
                />
              );
            })}
          </Grupo>
        )}
      </Secao>

      {/* h) GFO no computador — já abre com esta obra selecionada no topo */}
      {temVersaoComputador() && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              try { localStorage.setItem('montex_obra_atual', id); } catch { /* noop */ }
              abrirNoComputador('/GestaoFinanceiraObra');
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-mx-line bg-mx-s1 px-4 text-[15px] font-semibold text-mx-text active:bg-mx-s2"
          >
            <ExternalLink className="h-[18px] w-[18px]" aria-hidden />
            Abrir Gestão Financeira da obra
          </button>
          <p className="mt-2 px-1 text-center text-[12px] text-mx-text3">Abre a versão do computador já nesta obra. Para voltar ao app, abra o Montex de novo.</p>
        </div>
      )}
    </Tela>
  );
}
