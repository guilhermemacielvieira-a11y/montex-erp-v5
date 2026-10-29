// ============================================================
// ALERTAS — radar da empresa + avisos operacionais (rota /m/alertas)
// ============================================================
// Radar: useBIData().alertas (motor services/bi/radarAlertas), sem os
//   resolvidos/ignorados (useAlertasStatus — sincroniza com o desktop via
//   entity_store 'radar_alertas_status'). Agrupado por severidade.
//   Toque abre a folha com detalhe e ações Reconhecer/Resolver/Ignorar.
//   Os links do radar apontam para telas desktop: só "Abrir no computador".
// Operação: useAlertas() (mobile), com as rotas novas do app da diretoria.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, CheckCheck, Eye, Check, EyeOff, Monitor, Radar } from 'lucide-react';
import { useBIData } from '@/hooks/useBIData';
import { useAlertasStatus, STATUS_ALERTA } from '@/hooks/useAlertasStatus';
import { SEVERIDADES, REGRAS } from '@/services/bi/radarAlertas';
import { useAuth } from '@/lib/AuthContext';
import { useAlertas } from '../useAlertas';
import { ensureOnline } from '../ui/online';
import { tap, success } from '../ui/haptics';
import { Tela, Secao, Grupo, Linha, Status, Botao, Vazio, Erro, Esqueleto, Etiqueta } from '../kit';
import Folha from '../kit/Folha';
import { brl, num, abrirNoComputador, temVersaoComputador } from '../kit/fmt';

export const TOM_SEVERIDADE = { critico: 'bad', alto: 'warn', medio: 'teal', baixo: 'neutro' };
const ORDEM = ['critico', 'alto', 'medio', 'baixo'];
const TITULO_GRUPO = { critico: 'Críticos', alto: 'Altos', medio: 'Médios', baixo: 'Baixos' };

// Rotas antigas do app mobile → rotas do app da diretoria
const ROTA_NOVA = {
  '/m/despesas': '/m/financeiro?aba=pagar',
  '/m/estoque': '/m/fabrica?aba=estoque',
  '/m/expedicao': '/m/fabrica?aba=expedicao',
  '/m/montagem': '/m/fabrica?aba=montagem',
};
export const rotaNova = (to) => ROTA_NOVA[to] || to;

const TOM_COR_OPERACAO = { red: 'bad', amber: 'warn', emerald: 'ok', blue: 'teal' };

/** Valor do alerta do radar em texto. */
export function valorAlerta(a) {
  if (a?.valor === null || a?.valor === undefined) return undefined;
  if (a.unidade === 'R$') return brl(a.valor);
  if (a.unidade === '%') return `${num(a.valor, 1)}%`;
  if (a.unidade === 'pp') return `${num(a.valor, 1)} pp`;
  if (a.unidade === 'kg') return `${num(a.valor)} kg`;
  return `${num(a.valor)} ${a.unidade || ''}`.trim();
}

/** Radar sem resolvidos/ignorados (para tela e badge do Início). */
export function useRadarAtivo(dados) {
  const { statusDe, definir, status } = useAlertasStatus();
  const ativos = useMemo(
    () => (dados?.alertas || []).filter((a) => !['resolvido', 'ignorado'].includes(statusDe(a.id))),
    [dados?.alertas, statusDe],
  );
  return { ativos, statusDe, definir, status };
}

const urlDesktop = (link) => {
  if (!link || typeof window === 'undefined') return null;
  try { return new URL(link, window.location.origin).href; } catch { return null; }
};

export default function Alertas() {
  const dados = useBIData({ empresa: true });
  const { ativos, statusDe, definir } = useRadarAtivo(dados);
  const operacao = useAlertas();
  const { user } = useAuth() || {};
  const [aberto, setAberto] = useState(null);
  const [gravando, setGravando] = useState(null);

  const grupos = useMemo(() => ORDEM
    .map((sev) => ({ sev, itens: ativos.filter((a) => a.severidade === sev) }))
    .filter((g) => g.itens.length), [ativos]);

  const marcar = useCallback(async (a, novo) => {
    if (!ensureOnline()) return;
    setGravando(novo);
    try {
      await definir(a.id, novo, { por: user?.nome || user?.name || user?.email || '' });
      await success();
      toast.success(novo === 'reconhecido' ? 'Alerta em tratamento' : novo === 'resolvido' ? 'Alerta resolvido' : 'Alerta ignorado');
      setAberto(null);
    } catch (e) {
      toast.error('Falha ao atualizar o alerta');
      console.error('[Alertas] definir falhou:', e);
    } finally {
      setGravando(null);
    }
  }, [definir, user]);

  const total = ativos.length + operacao.length;
  const carregandoRadar = dados.carregando && !dados.atualizadoEm;
  const st = aberto ? statusDe(aberto.id) : null;
  const href = aberto ? urlDesktop(aberto.link) : null;

  return (
    <Tela
      titulo="Alertas"
      subtitulo={total ? `${total} ${total === 1 ? 'aviso ativo' : 'avisos ativos'}` : 'Nenhum aviso ativo'}
      voltar="/m"
      onRefresh={() => dados.recarregar()}
    >
      {/* ---------- Radar ---------- */}
      <Secao titulo="Radar" descricao="Riscos da empresa calculados pelo BI">
        {dados.erro && <Erro texto="Não foi possível carregar o histórico de produção." onTentar={() => dados.recarregar()} />}
        {carregandoRadar ? (
          <Esqueleto linhas={3} />
        ) : grupos.length === 0 ? (
          <Grupo><Vazio icone={Radar} titulo="Radar limpo" texto="Nenhum risco aberto agora." /></Grupo>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <div key={g.sev}>
                <div className="mb-1.5 px-1"><Status tom={TOM_SEVERIDADE[g.sev]}>{TITULO_GRUPO[g.sev]} · {g.itens.length}</Status></div>
                <Grupo>
                  {g.itens.map((a) => (
                    <Linha
                      key={a.id}
                      titulo={a.titulo}
                      sub={[REGRAS[a.regra]?.area, statusDe(a.id) === 'reconhecido' ? 'em tratamento' : null].filter(Boolean).join(' · ') || a.detalhe}
                      valor={valorAlerta(a)}
                      valorTom={TOM_SEVERIDADE[a.severidade]}
                      onClick={() => { tap('light'); setAberto(a); }}
                    />
                  ))}
                </Grupo>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {/* ---------- Operação ---------- */}
      <Secao titulo="Operação" descricao="Pendências do dia a dia">
        {operacao.length === 0 ? (
          <Grupo><Vazio icone={CheckCheck} titulo="Nada pendente" texto="Sem avisos de operação." /></Grupo>
        ) : (
          <Grupo>
            {operacao.map((a) => (
              <Linha
                key={a.id}
                icone={a.icon || Bell}
                iconeTom={TOM_COR_OPERACAO[a.color] || 'neutro'}
                titulo={a.title}
                sub={a.sub}
                to={rotaNova(a.to)}
              />
            ))}
          </Grupo>
        )}
      </Secao>

      {/* ---------- Detalhe do radar ---------- */}
      <Folha
        open={!!aberto}
        onClose={() => !gravando && setAberto(null)}
        title={REGRAS[aberto?.regra]?.rotulo || 'Alerta'}
        footer={aberto && (
          <div className="space-y-2 pb-1">
            <div className="flex gap-2">
              {st !== 'reconhecido' && (
                <Botao variante="secundario" icone={Eye} className="flex-1" carregando={gravando === 'reconhecido'} disabled={!!gravando} onClick={() => marcar(aberto, 'reconhecido')}>
                  Reconhecer
                </Botao>
              )}
              <Botao variante="primario" icone={Check} className="flex-1" carregando={gravando === 'resolvido'} disabled={!!gravando} onClick={() => marcar(aberto, 'resolvido')}>
                Resolver
              </Botao>
            </div>
            <Botao variante="fantasma" icone={EyeOff} className="w-full" carregando={gravando === 'ignorado'} disabled={!!gravando} onClick={() => marcar(aberto, 'ignorado')}>
              Ignorar
            </Botao>
          </div>
        )}
      >
        {aberto && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Status tom={TOM_SEVERIDADE[aberto.severidade]}>{SEVERIDADES[aberto.severidade]?.rotulo || aberto.severidade}</Status>
              {REGRAS[aberto.regra]?.area && <Etiqueta>{REGRAS[aberto.regra].area}</Etiqueta>}
              {st === 'reconhecido' && <Etiqueta tom="teal">{STATUS_ALERTA.reconhecido}</Etiqueta>}
            </div>
            <p className="mt-3 text-[17px] font-semibold text-mx-text">{aberto.titulo}</p>
            {valorAlerta(aberto) && <p className="mx-num mt-2 text-[26px] leading-tight text-mx-text">{valorAlerta(aberto)}</p>}
            {aberto.detalhe && <p className="mt-2 text-[15px] text-mx-text2">{aberto.detalhe}</p>}
            {aberto.obraId && dados.nomeObra && (
              <Grupo className="mt-4">
                <Linha titulo={dados.nomeObra(aberto.obraId)} sub="Ver a obra" to={`/m/obras/${aberto.obraId}`} />
              </Grupo>
            )}
            {href && temVersaoComputador() && (
              <button
                type="button"
                onClick={() => {
                  if (aberto.obraId) { try { localStorage.setItem('montex_obra_atual', aberto.obraId); } catch { /* noop */ } }
                  abrirNoComputador(href);
                }}
                className="mt-4 inline-flex items-center gap-2 py-2 text-[15px] font-medium text-mx-tealhi active:opacity-70"
              >
                <Monitor className="h-[18px] w-[18px]" aria-hidden />
                Abrir no computador
              </button>
            )}
          </div>
        )}
      </Folha>
    </Tela>
  );
}
