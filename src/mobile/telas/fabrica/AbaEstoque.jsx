// ============================================================
// Fábrica · Estoque — saúde do estoque e itens em atenção (leitura)
// ============================================================
// Usa bi.suprimentos (mesmo escopo do BI 360: itens da fábrica + itens das
// obras do escopo) com kpisEstoque/saudeItem de services/estoqueAnalytics.
// Movimentar estoque fica em /m/estoque (perfil operacional).
// ============================================================
import React, { useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { saudeItem, SAUDE, valorItem } from '@/services/estoqueAnalytics';
import { Secao, Grupo, Linha, Metrica, Grade, Status, Vazio, Esqueleto, Botao } from '../../kit';
import { num, brlc, peso, pct } from '../../kit/fmt';

const TOM_SAUDE = { zerado: 'bad', critico: 'bad', baixo: 'warn', atencao: 'warn', excesso: 'teal', saudavel: 'ok', entregue: 'ok', sem_minimo: 'neutro' };
const EM_ATENCAO = ['zerado', 'critico', 'baixo', 'atencao'];
const PAGINA = 30;

export default function AbaEstoque({ bi, carregando }) {
  const itens = bi?.suprimentos?.itens || [];
  const k = bi?.suprimentos?.kpis;
  const [limite, setLimite] = useState(PAGINA);

  const atencao = useMemo(() => itens
    .map((it) => ({ it, s: saudeItem(it) }))
    .filter((x) => EM_ATENCAO.includes(x.s))
    .sort((a, b) => SAUDE[a.s].prioridade - SAUDE[b.s].prioridade || valorItem(b.it) - valorItem(a.it)), [itens]);

  if (carregando && itens.length === 0) return <Esqueleto metricas={4} linhas={5} />;
  if (!k || itens.length === 0) {
    return <Grupo className="mt-4"><Vazio icone={PackageCheck} titulo="Estoque vazio" texto="Nenhum item de estoque no escopo atual." /></Grupo>;
  }

  return (
    <>
      <Secao titulo="Situação do estoque">
        <Grade>
          <Metrica rotulo="Valor em estoque" valor={brlc(k.valorTotal)} sub={`${num(k.nItens)} itens`} />
          <Metrica rotulo="Peso em estoque" valor={peso(k.pesoTotal)} sub="itens com peso" />
          <Metrica rotulo="Em alerta" valor={num(k.alertas)} sub={`${brlc(k.valorEmRisco)} em risco`} tom={k.alertas > 0 ? 'bad' : 'ok'} />
          <Metrica
            rotulo="Material de obra"
            valor={k.coberturaPct === null ? '—' : pct(k.coberturaPct)}
            sub={k.itensComNecessidade ? `${num(k.itensComFalta)} itens com falta` : 'sem necessidade cadastrada'}
            tom={k.coberturaPct === null ? undefined : k.coberturaPct >= 95 ? 'ok' : 'warn'}
          />
        </Grade>
        {k.semMinimo > 0 && (
          <p className="mt-2 px-1 text-[12px] text-mx-text3">{num(k.semMinimo)} itens sem estoque mínimo cadastrado não entram no alerta.</p>
        )}
      </Secao>

      <Secao titulo="Itens em atenção" descricao="zerados, críticos e abaixo do mínimo">
        {atencao.length === 0 ? (
          <Grupo><Vazio icone={PackageCheck} titulo="Nenhum item em atenção" texto="Todos os itens com mínimo cadastrado estão acima do ponto de reposição." /></Grupo>
        ) : (
          <Grupo>
            {atencao.slice(0, limite).map(({ it, s }) => (
              <Linha
                key={it.id}
                titulo={it.descricao || it.nome || it.codigo || it.id}
                sub={`Saldo ${num(it.quantidade, 0)} ${it.unidade || ''} · mínimo ${num(it.minimo, 0)}${it.codigo ? ` · ${it.codigo}` : ''}`}
                direita={<Status tom={TOM_SAUDE[s]}>{SAUDE[s].label}</Status>}
              />
            ))}
          </Grupo>
        )}
        {atencao.length > limite && (
          <Botao variante="secundario" className="mt-3 w-full" onClick={() => setLimite((l) => l + PAGINA)}>
            Mostrar mais ({num(atencao.length - limite)} restantes)
          </Botao>
        )}
      </Secao>
    </>
  );
}
