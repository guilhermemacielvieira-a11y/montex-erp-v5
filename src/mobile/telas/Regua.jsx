// ============================================================
// RÉGUA DE PRODUÇÃO DO MÊS — elemento-assinatura do app da diretoria
// ============================================================
// Uma trena: escala em toneladas (traço a cada 10 t), preenchida com o
// que ENTROU em pintura no mês corrente (critério "fabricado" da
// diretoria — analiseCustoKg().serie, último mês, regra 1e-bis), com a
// projeção do mês tracejada e duas marcas verticais: ponto de equilíbrio
// (equilibrio.t2026) e capacidade (cfg.capacidadeTMes).
// SVG em coordenadas percentuais (width 100%): escala sem medir o DOM.
// ============================================================
import React, { useMemo } from 'react';
import { num } from '../kit/fmt';

const COR = {
  trilho: 'rgb(var(--mx-s3))',
  cheio: 'rgb(var(--mx-tealhi))',
  traco: 'rgb(var(--mx-text3))',
  texto: 'rgb(var(--mx-text2))',
  equilibrio: 'rgb(var(--mx-warn))',
  capacidade: 'rgb(var(--mx-text))',
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Calcula a régua a partir da análise de custo/kg (puro, testável). */
export function calcularRegua(analise, hoje = new Date()) {
  if (!analise) return null;
  const ultimo = analise.serie?.[analise.serie.length - 1];
  const kgMes = Number(ultimo?.kg) || 0;
  const t = kgMes / 1000;
  const [ano, mes] = String(ultimo?.mes || '').split('-').map(Number);
  const mesCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasCorridos = hoje.getDate();
  // Projeção linear só faz sentido para o mês em curso
  const projecao = mesCorrente && diasCorridos > 0 ? (t / diasCorridos) * diasMes : t;
  const equilibrio = Number(analise.equilibrio?.t2026) > 0 ? Number(analise.equilibrio.t2026) : null;
  const capacidade = Number(analise.cfg?.capacidadeTMes) > 0 ? Number(analise.cfg.capacidadeTMes) : null;
  const topo = Math.max(10, capacidade || 0, t, projecao, equilibrio || 0);
  const max = Math.ceil(topo / 10) * 10;
  return {
    t, projecao, equilibrio, capacidade, max,
    nomeMes: mes ? MESES[mes - 1] : MESES[hoje.getMonth()],
    mesCorrente,
  };
}

const p = (v, max) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
const pn = (v, max) => Math.max(0, Math.min(100, (v / max) * 100));

export default function Regua({ analise }) {
  const r = useMemo(() => calcularRegua(analise), [analise]);

  if (!r) {
    return (
      <div className="animate-pulse rounded-[18px] border border-mx-line/60 bg-mx-s1 p-4" aria-busy="true" aria-label="Carregando produção do mês">
        <div className="h-5 w-2/3 rounded bg-mx-s2" />
        <div className="mt-5 h-3.5 rounded-full bg-mx-s2" />
        <div className="mt-4 h-3 w-1/2 rounded bg-mx-s2" />
      </div>
    );
  }

  const { t, projecao, equilibrio, capacidade, max, nomeMes, mesCorrente } = r;

  // Traços a cada 10 t; rótulos espaçados para caberem (até ~6 rótulos)
  const passoRotulo = 10 * Math.max(1, Math.ceil(max / 10 / 6));
  const ticks = [];
  for (let v = 0; v <= max; v += 10) ticks.push(v);

  // Geometria (px no eixo Y; X em %)
  const yTopo = 22;          // linha dos rótulos das marcas
  const yTrilho = 30;        // topo do trilho
  const hTrilho = 14;
  const yEscala = yTrilho + hTrilho + 4;
  const altura = yEscala + 26;

  const eqPct = equilibrio ? pn(equilibrio, max) : null;
  const capPct = capacidade ? pn(capacidade, max) : null;
  const mostraRotuloCap = capPct !== null && (eqPct === null || Math.abs(capPct - eqPct) > 22);
  const ancora = (pc) => (pc < 10 ? 'start' : pc > 90 ? 'end' : 'middle');
  const acimaEquilibrio = equilibrio ? projecao >= equilibrio : null;

  return (
    <div className="rounded-[18px] border border-mx-line/60 bg-mx-s1 px-4 pb-3.5 pt-4">
      <p className="text-[15px] text-mx-text2">
        <span className="mx-num text-[26px] leading-none text-mx-text">{num(t, 1)} t</span>
        <span className="ml-1.5">fabricadas em {nomeMes}</span>
      </p>

      <svg
        width="100%"
        height={altura}
        className="mt-3 block overflow-visible"
        role="img"
        aria-label={`Régua do mês: ${num(t, 1)} t fabricadas, projeção ${num(projecao, 0)} t${equilibrio ? `, equilíbrio ${num(equilibrio, 0)} t` : ''}${capacidade ? `, capacidade ${num(capacidade, 0)} t` : ''}`}
      >
        {/* trilho */}
        <rect x="0" y={yTrilho} width="100%" height={hTrilho} rx="3" fill={COR.trilho} />

        {/* projeção tracejada (do realizado até o fim do mês) */}
        {mesCorrente && projecao > t && (
          <rect
            x={p(t, max)}
            y={yTrilho + 1}
            width={`${pn(projecao, max) - pn(t, max)}%`}
            height={hTrilho - 2}
            fill="none"
            stroke={COR.cheio}
            strokeOpacity="0.75"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* realizado */}
        {t > 0 && <rect x="0" y={yTrilho} width={p(t, max)} height={hTrilho} rx="3" fill={COR.cheio} />}

        {/* escala: traço a cada 10 t, maior onde há rótulo */}
        {ticks.map((v) => {
          const rotulo = v % passoRotulo === 0;
          return (
            <line key={`t${v}`} x1={p(v, max)} x2={p(v, max)} y1={yEscala} y2={yEscala + (rotulo ? 7 : 4)} stroke={COR.traco} strokeWidth="1" />
          );
        })}
        {ticks.filter((v) => v % passoRotulo === 0).map((v) => (
          <text key={`r${v}`} x={p(v, max)} y={yEscala + 20} fontSize="11" fill={COR.texto} textAnchor={ancora(pn(v, max))} className="mx-tab">
            {num(v)}
          </text>
        ))}

        {/* capacidade */}
        {capPct !== null && (
          <>
            <line x1={`${capPct}%`} x2={`${capPct}%`} y1={yTrilho - 5} y2={yTrilho + hTrilho + 3} stroke={COR.capacidade} strokeWidth="2" />
            {mostraRotuloCap && (
              <text x={`${capPct}%`} y={yTopo - 4} fontSize="11" fill={COR.texto} textAnchor={ancora(capPct)}>capacidade</text>
            )}
          </>
        )}

        {/* ponto de equilíbrio */}
        {eqPct !== null && (
          <>
            <line x1={`${eqPct}%`} x2={`${eqPct}%`} y1={yTrilho - 5} y2={yTrilho + hTrilho + 3} stroke={COR.equilibrio} strokeWidth="2" />
            <text x={`${eqPct}%`} y={yTopo - 4} fontSize="11" fontWeight="600" fill={COR.equilibrio} textAnchor={ancora(eqPct)}>equilíbrio</text>
          </>
        )}
      </svg>

      <p className="mt-1 text-[13px] text-mx-text2">
        <span className={acimaEquilibrio === false ? 'text-mx-warn' : acimaEquilibrio ? 'text-mx-ok' : undefined}>
          Projeção {num(projecao, 0)} t
        </span>
        {equilibrio ? ` · equilíbrio ${num(equilibrio, 0)} t` : ' · equilíbrio indisponível'}
        {capacidade ? ` · capacidade ${num(capacidade, 0)} t` : ''}
      </p>
    </div>
  );
}
