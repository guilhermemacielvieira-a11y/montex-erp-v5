// ============================================================
// Fábrica · Expedição — fila de embarque, romaneios e previsão de cargas
// ============================================================
// Somente leitura (despacho e conferência ficam com a expedição).
// Fila de embarque = peças 'expedido' MENOS as unidades já reservadas em
// romaneio ativo (mesma regra da EnviosExpedicaoPage: calcularReservasRomaneios).
// ============================================================
import React, { useMemo, useState } from 'react';
import { Truck, Package } from 'lucide-react';
import { useProducao, useExpedicao } from '@/contexts/ERPContext';
import { pesoPeca, qtdPeca, etapaPeca } from '@/services/relatorioProducao';
import { calcularReservasRomaneios, normalizarStatusRomaneio, itensDoRomaneio } from '@/services/romaneio';
import { previsaoCargasTodas } from '@/services/previsaoCargas';
import { Secao, Grupo, Linha, Metrica, Grade, Status, Abas, Vazio, Esqueleto, Botao } from '../../kit';
import Folha from '../../kit/Folha';
import { num, kg, peso, data, quando } from '../../kit/fmt';
import { useEscopoFabrica, obraIdDe } from './comum';

const STATUS_ROM = {
  preparando: { rotulo: 'Preparando', tom: 'warn' },
  aguardando_transporte: { rotulo: 'Aguardando transporte', tom: 'warn' },
  em_transito: { rotulo: 'Em trânsito', tom: 'teal' },
  entregue: { rotulo: 'Entregue', tom: 'ok' },
  problema: { rotulo: 'Problema', tom: 'bad' },
};
const statusRom = (s) => STATUS_ROM[normalizarStatusRomaneio(s) || 'preparando'] || { rotulo: String(s || 'Sem status'), tom: 'neutro' };

const FILTROS = [
  { id: 'abertos', rotulo: 'Em aberto', casa: (s) => ['preparando', 'aguardando_transporte', 'problema', ''].includes(s) },
  { id: 'em_transito', rotulo: 'Em trânsito', casa: (s) => s === 'em_transito' },
  { id: 'entregue', rotulo: 'Entregues', casa: (s) => s === 'entregue' },
  { id: 'todos', rotulo: 'Todos', casa: () => true },
];

const numeroRom = (e) => e?.numeroRomaneio || e?.numero_romaneio || e?.numero || e?.id;
const dataRom = (e) => e?.dataSaida || e?.data_saida || e?.dataExpedicao || e?.data_expedicao || e?.dataEnvio || e?.data_envio || e?.createdAt || '';
const pesoRom = (e) => Number(e?.pesoTotal ?? e?.peso_total) || 0;
const PAGINA = 30;

export default function AbaExpedicao({ carregando }) {
  const { pecas = [] } = useProducao();
  const { expedicoes = [] } = useExpedicao();
  const { obras, noEscopo, obraNoEscopo, nomeObra } = useEscopoFabrica();
  const [filtro, setFiltro] = useState('abertos');
  const [limite, setLimite] = useState(PAGINA);
  const [sel, setSel] = useState(null);

  const ativos = useMemo(() => expedicoes.filter((e) => e && !e.deletedAt && !e.deleted_at && noEscopo(e)), [expedicoes, noEscopo]);
  const pecasEscopo = useMemo(() => pecas.filter(noEscopo), [pecas, noEscopo]);

  const fila = useMemo(() => {
    const { reservada } = calcularReservasRomaneios(expedicoes);
    let kgFila = 0, kgReservado = 0, marcas = 0;
    pecasEscopo.forEach((p) => {
      if (etapaPeca(p) !== 'expedido') return;
      const total = qtdPeca(p) || 1;
      const res = Math.min(total, reservada[String(p.id)] || 0);
      const unit = pesoPeca(p) / total;
      const restante = total - res;
      kgReservado += res * unit;
      if (restante > 0) { kgFila += restante * unit; marcas += 1; }
    });
    return { kgFila, kgReservado, marcas };
  }, [pecasEscopo, expedicoes]);

  const porStatus = useMemo(() => {
    const c = {};
    ativos.forEach((e) => { const s = normalizarStatusRomaneio(e.status); FILTROS.forEach((f) => { if (f.casa(s)) c[f.id] = (c[f.id] || 0) + 1; }); });
    return c;
  }, [ativos]);

  const transitoKg = useMemo(() => ativos.filter((e) => normalizarStatusRomaneio(e.status) === 'em_transito').reduce((s, e) => s + pesoRom(e), 0), [ativos]);

  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    return ativos
      .filter((e) => f.casa(normalizarStatusRomaneio(e.status)))
      .sort((a, b) => String(dataRom(b)).localeCompare(String(dataRom(a))));
  }, [ativos, filtro]);

  const previsao = useMemo(
    // Romaneios de todas as obras: a média global de carga é o fallback de
    // obra sem histórico; o histórico por obra é filtrado lá dentro.
    () => previsaoCargasTodas({
      pecas: pecasEscopo,
      expedicoes: expedicoes.filter((e) => e && !e.deletedAt && !e.deleted_at),
      obras: obras.filter(obraNoEscopo),
    }),
    [pecasEscopo, expedicoes, obras, obraNoEscopo],
  );

  const pecasById = useMemo(() => new Map(pecas.map((p) => [String(p.id), p])), [pecas]);

  if (carregando && expedicoes.length === 0 && pecas.length === 0) return <Esqueleto metricas={4} linhas={5} />;

  const prevAtivas = previsao.ativas.slice(0, 6);

  return (
    <>
      <Secao titulo="Embarque">
        <Grade>
          <Metrica rotulo="Fila de embarque" valor={kg(fila.kgFila)} sub={`${num(fila.marcas)} ${fila.marcas === 1 ? 'marca pronta' : 'marcas prontas'} sem romaneio`} tom={fila.kgFila > 0 ? 'warn' : undefined} />
          <Metrica rotulo="Já em romaneio" valor={kg(fila.kgReservado)} sub="aguardando despacho" />
          <Metrica rotulo="Romaneios em aberto" valor={num(porStatus.abertos || 0)} sub="preparando ou aguardando" />
          <Metrica rotulo="Em trânsito" valor={kg(transitoKg)} sub={`${num(porStatus.em_transito || 0)} ${porStatus.em_transito === 1 ? 'carga' : 'cargas'}`} tom={transitoKg > 0 ? 'teal' : undefined} />
        </Grade>
      </Secao>

      <Secao titulo="Romaneios">
        <Abas
          className="-mx-4 pb-3"
          itens={FILTROS.map((f) => ({ id: f.id, rotulo: f.rotulo, badge: porStatus[f.id] || 0 }))}
          valor={filtro}
          onChange={(v) => { setFiltro(v); setLimite(PAGINA); }}
        />
        {lista.length === 0 ? (
          <Grupo><Vazio icone={Truck} titulo="Nenhum romaneio" texto="Não há romaneios nesta situação no escopo atual." /></Grupo>
        ) : (
          <Grupo>
            {lista.slice(0, limite).map((e) => {
              const st = statusRom(e.status);
              const d = dataRom(e);
              return (
                <Linha
                  key={e.id}
                  onClick={() => setSel(e)}
                  titulo={`Romaneio ${numeroRom(e)}`}
                  sub={`${nomeObra(obraIdDe(e))} · ${d ? data(d) : 'sem data'} · ${kg(pesoRom(e))}`}
                  direita={<Status tom={st.tom}>{st.rotulo}</Status>}
                />
              );
            })}
          </Grupo>
        )}
        {lista.length > limite && (
          <Botao variante="secundario" className="mt-3 w-full" onClick={() => setLimite((l) => l + PAGINA)}>
            Mostrar mais ({num(lista.length - limite)} restantes)
          </Botao>
        )}
      </Secao>

      <Secao titulo="Previsão de cargas" descricao="carretas que faltam para levar o restante de cada obra">
        {prevAtivas.length === 0 ? (
          <Grupo><Vazio icone={Package} titulo="Nada a transportar" texto="Todas as obras com peças cadastradas já foram enviadas." /></Grupo>
        ) : (
          <>
            <Grade>
              <Metrica rotulo="Cargas previstas" valor={`≈ ${num(previsao.totais.cargasVolume)}`} sub="por peso e volume" />
              <Metrica rotulo="Prontas para carregar" valor={`${num(previsao.totais.cargasFila)}`} sub={`${peso(previsao.totais.fila)} na fila`} />
            </Grade>
            <Grupo className="mt-2.5">
              {prevAtivas.map((l) => (
                <Linha
                  key={l.obraId}
                  titulo={l.obra?.nome || nomeObra(l.obraId)}
                  sub={`${peso(l.restante.restante)} a transportar${l.previsaoTermino ? ` · fim ${data(l.previsaoTermino)}` : ''}`}
                  valor={`≈ ${num(l.volume.cargasCalibradas)}`}
                  valorSub={l.volume.cargasCalibradas === 1 ? 'carga' : 'cargas'}
                />
              ))}
            </Grupo>
            {previsao.ativas.length > prevAtivas.length && (
              <p className="mt-2 px-1 text-[12px] text-mx-text3">Mais {num(previsao.ativas.length - prevAtivas.length)} obras com saldo menor.</p>
            )}
          </>
        )}
      </Secao>

      <DetalheRomaneio rom={sel} pecasById={pecasById} nomeObra={nomeObra} onClose={() => setSel(null)} />
    </>
  );
}

function DetalheRomaneio({ rom, pecasById, nomeObra, onClose }) {
  const itens = useMemo(() => (rom ? itensDoRomaneio(rom).map((it) => {
    const p = pecasById.get(String(it.id));
    const q = Number(it.qtd_enviada ?? it.qtdEnviada) || qtdPeca(p) || 1;
    const unit = p ? pesoPeca(p) / (qtdPeca(p) || 1) : 0;
    return { id: it.id, marca: p?.marca || it.marca || it.id, q, kg: unit * q };
  }) : []), [rom, pecasById]);
  if (!rom) return <Folha open={false} onClose={onClose} />;
  const st = statusRom(rom.status);
  const d = dataRom(rom);
  const entrega = rom.dataEntrega || rom.data_entrega;
  return (
    <Folha open onClose={onClose} title={`Romaneio ${numeroRom(rom)}`}>
      <div className="flex items-center justify-between gap-3">
        <Status tom={st.tom}>{st.rotulo}</Status>
        <span className="truncate text-[13px] text-mx-text3">{nomeObra(obraIdDe(rom))}</span>
      </div>
      <Grupo className="mt-4">
        <Linha titulo="Data" valor={d ? data(d, { ano: true }) : '—'} valorSub={d ? quando(d) : undefined} />
        {entrega && <Linha titulo="Entrega" valor={data(entrega, { ano: true })} />}
        <Linha titulo="Peso" valor={kg(pesoRom(rom))} destaque />
        {(rom.motorista || rom.placa) && <Linha titulo="Motorista" valor={[rom.motorista, rom.placa].filter(Boolean).join(' · ')} />}
        {rom.transportadora && <Linha titulo="Transportadora" valor={rom.transportadora} />}
        {rom.destino && <Linha titulo="Destino" valor={rom.destino} />}
      </Grupo>
      <Secao titulo={`${num(itens.length)} ${itens.length === 1 ? 'item' : 'itens'}`} className="mt-5">
        {itens.length ? (
          <Grupo>
            {itens.map((i) => <Linha key={i.id} titulo={i.marca} valor={kg(i.kg)} valorSub={`${num(i.q)} un.`} />)}
          </Grupo>
        ) : <p className="px-1 text-[14px] text-mx-text2">Romaneio sem itens registrados.</p>}
      </Secao>
      <div className="h-2" />
    </Folha>
  );
}
