// ============================================================
// INÍCIO — cockpit da diretoria (rota /m)
// ============================================================
// De cima para baixo: o que precisa de decisão, a régua de produção do
// mês, os números do caixa e da carteira, as obras ativas e a semana da
// fábrica. Tudo dos motores reais:
//   • produção/obras/radar: useBIData (escopo do topo; histórico normalizado)
//   • custo/kg e régua:     useCustoKg(dados).analise
//   • caixa da empresa:     useFinanceiroGlobal() (regra 1b) + futuroDe()
//   • aprovações:           usePendenciasAprovacao() (mesmos predicados)
// Somente leitura.
// ============================================================
import React, { useCallback, useMemo } from 'react';
import { Inbox, Bell, ShieldAlert, Gauge, Hourglass, Layers } from 'lucide-react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useBIData } from '@/hooks/useBIData';
import { useCustoKg } from '@/hooks/useCustoKg';
import { useFinanceiroGlobal } from '@/hooks/useFinanceiroGlobal';
import { ROTULO_ETAPA } from '@/services/bi/biCore';
import { futuroDe } from '../usePainelGlobal';
import { Tela, BotaoIcone, Secao, Grupo, Linha, Metrica, Grade, Erro, Esqueleto, Vazio } from '../kit';
import { brl2, brlc, peso, pct, num, saudacao, primeiroNome } from '../kit/fmt';
import Regua from './Regua';
import { usePendenciasAprovacao } from './Aprovacoes';
import { useRadarAtivo, TOM_SEVERIDADE } from './Alertas';

const ETAPAS_FILA = ['aguardando', 'fabricacao', 'solda', 'pintura'];

function dataPorExtenso(d = new Date()) {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const chaveMesAtual = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function Inicio() {
  const { user, hasPermission } = useAuth() || {};
  const pode = (k) => !!hasPermission && hasPermission(k);
  const verFinanceiro = pode('financeiro.view');

  const { reloadPecas } = useERP?.() || {};
  const dados = useBIData();
  const { analise } = useCustoKg(dados);
  const fin = useFinanceiroGlobal();
  const pend = usePendenciasAprovacao();
  const { ativos: radar } = useRadarAtivo(dados);

  const carregandoBI = dados.carregando && !dados.atualizadoEm;

  // ---- alertas ----
  const criticos = useMemo(() => radar.filter((a) => a.severidade === 'critico'), [radar]);
  const urgentes = useMemo(() => radar.filter((a) => a.severidade === 'critico' || a.severidade === 'alto').length, [radar]);

  // ---- caixa ----
  const caixa = useMemo(() => {
    const k = chaveMesAtual();
    const mes = (fin.evolucaoMensal || []).find((m) => m.key === k) || null;
    const futuro = futuroDe(fin.todasMovs || [], Number(fin.metas?.saldoMinimo) || 50000);
    return {
      resultadoMes: mes ? mes.receitas - mes.despesas : 0,
      receitasMes: mes?.receitas || 0,
      despesasMes: mes?.despesas || 0,
      receber30: futuro.receber30,
      pagar30: futuro.pagar30,
    };
  }, [fin.evolucaoMensal, fin.todasMovs, fin.metas]);

  // ---- obras ----
  const executivo = dados.obras?.executivo || {};
  const obrasTop = useMemo(() => (dados.obras?.indicadores || [])
    .filter((i) => i.ativa)
    .sort((a, b) => (Number(b.valorContrato) || 0) - (Number(a.valorContrato) || 0))
    .slice(0, 4), [dados.obras?.indicadores]);

  // ---- fábrica ----
  const fabrica = useMemo(() => {
    const p = dados.producao || {};
    const resumo = p.wip?.resumo || [];
    const fila = resumo.filter((r) => ETAPAS_FILA.includes(r.etapa));
    const etapaGargalo = p.gargalo?.etapa || null;
    const linhaGargalo = etapaGargalo ? p.gargalo.linhas?.find((l) => l.etapa === etapaGargalo) : null;
    return {
      ritmo: p.tendencia?.kgSemanaAtual || 0,
      variacao: p.tendencia?.variacaoPct,
      gargalo: etapaGargalo,
      gargaloSub: linhaGargalo
        ? (linhaGargalo.travada ? `${peso(linhaGargalo.wipKg)} parados, sem saída` : `${num(linhaGargalo.semanasFila, 1)} semanas de fila`)
        : null,
      filaPecas: fila.reduce((s, r) => s + (Number(r.pecas) || 0), 0),
      filaKg: fila.reduce((s, r) => s + (Number(r.kg) || 0), 0),
    };
  }, [dados.producao]);

  const atualizar = useCallback(async () => {
    await Promise.all([dados.recarregar?.(), reloadPecas?.()]);
  }, [dados, reloadPecas]);

  const nome = primeiroNome(user);
  const precisa = [];
  if (pend.total > 0) {
    precisa.push({
      id: 'aprov', icone: Inbox, tom: 'teal', to: '/m/aprovacoes',
      titulo: pend.total === 1 ? '1 aprovação pendente' : `${pend.total} aprovações pendentes`,
      sub: [
        pend.meds.length && `${pend.meds.length} ${pend.meds.length === 1 ? 'medição' : 'medições'}`,
        pend.orcs.length && `${pend.orcs.length} ${pend.orcs.length === 1 ? 'orçamento' : 'orçamentos'}`,
        pend.cmps.length && `${pend.cmps.length} ${pend.cmps.length === 1 ? 'compra' : 'compras'}`,
      ].filter(Boolean).join(' · '),
    });
  }
  criticos.slice(0, 3 - precisa.length).forEach((a) => {
    precisa.push({ id: a.id, icone: ShieldAlert, tom: TOM_SEVERIDADE.critico, to: '/m/alertas', titulo: a.titulo, sub: a.detalhe });
  });

  return (
    <Tela
      titulo={nome ? `${saudacao()}, ${nome}` : saudacao()}
      subtitulo={dataPorExtenso()}
      onRefresh={atualizar}
      acoes={(
        <>
          <BotaoIcone icone={Inbox} rotulo="Aprovações" to="/m/aprovacoes" badge={pend.total} />
          <BotaoIcone icone={Bell} rotulo="Alertas" to="/m/alertas" badge={urgentes} tom={criticos.length ? 'bad' : 'warn'} />
        </>
      )}
    >
      {/* a) Precisa de você */}
      {precisa.length > 0 && (
        <Secao titulo="Precisa de você" className="mt-4">
          <Grupo>
            {precisa.map((l) => (
              <Linha key={l.id} icone={l.icone} iconeTom={l.tom} titulo={l.titulo} sub={l.sub} to={l.to} destaque />
            ))}
          </Grupo>
        </Secao>
      )}

      {dados.erro && <Erro texto="Não foi possível carregar o histórico de produção." onTentar={() => dados.recarregar()} />}

      {/* b) Régua do mês */}
      <div className={precisa.length ? 'mt-6' : 'mt-4'}>
        <Regua analise={carregandoBI ? null : analise} />
      </div>

      {/* c) Métricas */}
      <div className="mt-3">
        {carregandoBI ? (
          <Esqueleto linhas={0} metricas={4} />
        ) : (
          <Grade>
            {verFinanceiro && (
              <Metrica
                rotulo="Caixa no mês"
                valor={brlc(caixa.resultadoMes)}
                tom={caixa.resultadoMes < 0 ? 'bad' : 'ok'}
                sub={`${brlc(caixa.receitasMes)} entrou · ${brlc(caixa.despesasMes)} saiu`}
                to="/m/financeiro"
              />
            )}
            {verFinanceiro && (
              <Metrica
                rotulo="Custo/kg hoje"
                valor={analise?.custoKg != null ? brl2(analise.custoKg) : '—'}
                tom={analise?.custoKg != null && analise?.cfg?.precoFabricacaoKg && analise.custoKg > analise.cfg.precoFabricacaoKg ? 'bad' : undefined}
                sub={analise?.cfg?.precoFabricacaoKg ? `preço ${brl2(analise.cfg.precoFabricacaoKg)}` : 'fabricação'}
                to="/m/financeiro?aba=custo"
              />
            )}
            {verFinanceiro && (
              <Metrica rotulo="A receber em 30 dias" valor={brlc(caixa.receber30)} to="/m/financeiro?aba=receber" />
            )}
            {verFinanceiro && (
              <Metrica rotulo="A pagar em 30 dias" valor={brlc(caixa.pagar30)} tom={caixa.pagar30 > caixa.receber30 ? 'warn' : undefined} to="/m/financeiro?aba=pagar" />
            )}
            <Metrica
              rotulo="Carteira"
              valor={verFinanceiro ? brlc(executivo.carteiraValor) : peso(executivo.carteiraKg)}
              sub={verFinanceiro
                ? `${peso(executivo.carteiraKg)} a fabricar`
                : (executivo.mesesCarteira ? `${num(executivo.mesesCarteira, 1)} meses no ritmo` : 'a fabricar')}
              to="/m/obras"
            />
            <Metrica
              rotulo="Obras em atraso"
              valor={num(executivo.obrasEmAtraso || 0)}
              tom={executivo.obrasEmAtraso > 0 ? 'warn' : 'ok'}
              sub={`de ${num(executivo.obrasAtivas || 0)} ativas`}
              to="/m/obras?filtro=atraso"
            />
          </Grade>
        )}
      </div>

      {/* d) Obras ativas */}
      <Secao titulo="Obras ativas" acao={{ rotulo: 'Ver todas', to: '/m/obras' }}>
        {carregandoBI ? (
          <Esqueleto linhas={3} />
        ) : obrasTop.length === 0 ? (
          <Grupo><Vazio icone={Layers} titulo="Nenhuma obra ativa" /></Grupo>
        ) : (
          <Grupo>
            {obrasTop.map((o) => (
              <Linha
                key={o.id}
                titulo={o.nome || o.codigo || o.id}
                sub={`físico ${pct(o.fisicoPct)} · medido ${pct(o.financeiroPct)}`}
                valor={verFinanceiro ? brlc(o.saldoAMedir) : undefined}
                valorSub={verFinanceiro ? 'a medir' : undefined}
                valorTom={o.atrasoDias > 0 ? 'warn' : undefined}
                to={`/m/obras/${o.id}`}
              />
            ))}
          </Grupo>
        )}
      </Secao>

      {/* e) Semana na fábrica */}
      <Secao titulo="Semana na fábrica">
        {carregandoBI ? (
          <Esqueleto linhas={3} />
        ) : (
          <Grupo>
            <Linha
              icone={Gauge}
              iconeTom="teal"
              titulo="Ritmo atual"
              sub={fabrica.variacao != null ? `${fabrica.variacao >= 0 ? '+' : ''}${num(fabrica.variacao, 0)}% sobre as 4 semanas anteriores` : 'pintura concluída, média de 4 semanas'}
              valor={`${peso(fabrica.ritmo)}/sem`}
              valorTom={fabrica.variacao != null && fabrica.variacao < 0 ? 'warn' : undefined}
              to="/m/fabrica"
            />
            <Linha
              icone={Hourglass}
              iconeTom={fabrica.gargalo ? 'warn' : 'ok'}
              titulo={fabrica.gargalo ? `Gargalo em ${String(ROTULO_ETAPA[fabrica.gargalo] || fabrica.gargalo).toLowerCase()}` : 'Sem gargalo'}
              sub={fabrica.gargaloSub || 'Fila equilibrada entre as etapas'}
              to="/m/fabrica"
            />
            <Linha
              icone={Layers}
              titulo="Em fila na fábrica"
              sub="Corte, fabricação, solda e pintura"
              valor={`${num(fabrica.filaPecas)} ${fabrica.filaPecas === 1 ? 'peça' : 'peças'}`}
              valorSub={peso(fabrica.filaKg)}
              to="/m/fabrica"
            />
          </Grupo>
        )}
      </Secao>
    </Tela>
  );
}
