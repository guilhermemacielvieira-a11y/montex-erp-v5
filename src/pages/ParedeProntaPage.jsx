// src/modules/paredePronta/ParedePronta.jsx
// Tela do módulo Parede-Pronta R5: kanban W1..W6 + scanner (o bipe é o cronômetro do piloto)
import { useMemo, useState, useCallback } from "react";
import { useParedePronta, ESTACOES, ROTULOS } from "../hooks/useParedePronta";
import ScannerQR from "../components/paredepronta/ScannerQR";

const COR = { teal:"#006666", tealV:"#1FA79A", gold:"#E8A33D", red:"#E85D4A",
  bg:"#06201F", panel:"#0A2E2C", ink:"#E8F3F2", mute:"#7FA9A6", borda:"#1c4a46" };
const CORES_SKU = { jun:"#E8837A", hid:"#9CC4E4", int:"#BCD9E8", ext:"#DDEBF7" };
const tipoSku = s => s.startsWith("JUNTA") ? "jun" : (["IA1","F5-A"].includes(s) ? "hid"
  : (s.startsWith("I") ? "int" : "ext"));

export default function ParedeProntaPage() {
  const pp = useParedePronta();
  const [scanner, setScanner] = useState(false);
  const [confirma, setConfirma] = useState(null);   // {parede, acao} | {kit}
  const [aba, setAba] = useState("kanban");         // kanban | kits | piloto
  const casa = pp.casas.find(c => c.id === pp.casaId);

  const porEstacao = useMemo(() => {
    const m = Object.fromEntries(ESTACOES.map(e => [e, []]));
    pp.paredes.forEach(p => (m[p.estacao_atual] || m.FILA).push(p));
    return m;
  }, [pp.paredes]);

  const aoLerQR = useCallback(async (codigo) => {
    setScanner(false);
    const r = pp.resolverQR(codigo);
    if (r.tipo === "casa" && r.casa) { pp.setCasaId(r.casa.id); return; }
    if (r.tipo === "kit") { setConfirma({ kit: r.kit }); return; }
    if (r.tipo === "parede") {
      const acao = await pp.proximaAcao(r.parede);
      setConfirma(acao ? { parede: r.parede, acao } : { info: `${r.parede.sku} já está INSTALADA.` });
      return;
    }
    setConfirma({ info: `QR não reconhecido: ${r.codigo}` });
  }, [pp]);

  const takt = useMemo(() => {
    const m = {};
    pp.takt.forEach(t => { (m[t.estacao] = m[t.estacao] || []).push(Number(t.minutos)); });
    return Object.entries(m).map(([est, v]) =>
      ({ est, media: v.reduce((a,b)=>a+b,0)/v.length, n: v.length }))
      .sort((a,b) => a.est.localeCompare(b.est));
  }, [pp.takt]);

  return (
    <div style={{ background: COR.bg, minHeight: "100vh", color: COR.ink,
                  fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* topo */}
      <div style={{ position:"sticky", top:0, zIndex:20, background:COR.bg,
                    borderBottom:`1px solid ${COR.borda}`, padding:"10px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <b style={{ color:COR.tealV, letterSpacing:".1em", fontSize:13 }}>PAREDE-PRONTA R5</b>
          <select value={pp.casaId || ""} onChange={e => pp.setCasaId(e.target.value)}
                  style={est.select}>
            {pp.casas.map(c =>
              <option key={c.id} value={c.id}>Casa {c.numero} · rota {c.rota} · {c.municipio}</option>)}
          </select>
          <span style={{ fontSize:11, color:COR.mute }}>{casa?.status}</span>
          <div style={{ flex:1 }} />
          {["kanban","kits","piloto"].map(a =>
            <button key={a} onClick={() => setAba(a)}
              style={{ ...est.aba, ...(aba===a ? est.abaOn : {}) }}>{a.toUpperCase()}</button>)}
        </div>
      </div>

      {pp.erro && <div style={est.erro} onClick={() => pp.setErro(null)}>⚠ {pp.erro} (toque p/ fechar)</div>}

      {/* KANBAN */}
      {aba === "kanban" && (
        <div style={{ display:"flex", gap:10, overflowX:"auto", padding:14, alignItems:"flex-start" }}>
          {ESTACOES.map(estac => (
            <div key={estac} style={est.coluna}>
              <div style={est.colTit}>
                {ROTULOS[estac]} <span style={{ color:COR.gold }}>{porEstacao[estac].length}</span>
              </div>
              {porEstacao[estac].map(p => (
                <button key={p.id} style={{ ...est.card, borderLeft:`4px solid ${CORES_SKU[tipoSku(p.sku)]}` }}
                  onClick={async () => {
                    const acao = await pp.proximaAcao(p);
                    setConfirma(acao ? { parede:p, acao } : { info:`${p.sku} concluída.` });
                  }}>
                  <b>{p.sku}</b>
                  <div style={{ fontSize:10.5, color:COR.mute }}>
                    {p.ordem_montagem} · {Number(p.peso_t).toFixed(2)} t · rack {p.pos_rack}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* KITS */}
      {aba === "kits" && (
        <div style={{ padding:14, display:"grid", gap:8, maxWidth:560 }}>
          {pp.kits.map(k => (
            <button key={k.id} style={est.kit} onClick={() => setConfirma({ kit:k })}>
              <b>{k.codigo}</b>
              <span style={{ fontSize:11 }}>
                <i style={{ color: k.conferido_expedicao ? COR.tealV : COR.mute }}>expedição ✓</i>{" · "}
                <i style={{ color: k.conferido_recebimento ? COR.tealV : COR.mute }}>recebimento ✓</i>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* PILOTO */}
      {aba === "piloto" && (
        <div style={{ padding:14, maxWidth:560 }}>
          <div style={est.colTit}>MINUTOS MÉDIOS POR ESTAÇÃO (pp_v_takt · dado do bipe)</div>
          {takt.length === 0 && <div style={{ color:COR.mute, fontSize:12, padding:10 }}>
            Sem medições ainda — os pares início/fim de estação alimentam esta tela sozinhos.</div>}
          {takt.map(t => (
            <div key={t.est} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
              <span style={{ width:36, fontWeight:700, color:COR.tealV }}>{t.est}</span>
              <div style={{ flex:1, background:COR.panel, borderRadius:6, height:16 }}>
                <div style={{ width:`${Math.min(100, t.media/6)}%`, height:"100%",
                              background:COR.gold, borderRadius:6 }} />
              </div>
              <span style={{ width:90, fontSize:11, textAlign:"right" }}>
                {t.media.toFixed(0)} min · n={t.n}</span>
            </div>
          ))}
        </div>
      )}

      {/* botão bipar */}
      <button style={est.fab} onClick={() => setScanner(true)}>▣ BIPAR</button>
      {scanner && <ScannerQR aoLer={aoLerQR} aoFechar={() => setScanner(false)} />}

      {/* confirmação — botão grande p/ luva */}
      {confirma && (
        <div style={est.overlay} onClick={() => setConfirma(null)}>
          <div style={est.modal} onClick={e => e.stopPropagation()}>
            {confirma.info && <div style={{ padding:8 }}>{confirma.info}</div>}
            {confirma.parede && (
              <>
                <div style={{ fontSize:22, fontWeight:800 }}>{confirma.parede.sku}</div>
                <div style={{ color:COR.mute, fontSize:12, marginBottom:14 }}>
                  passo {confirma.parede.ordem_montagem} · agora em {ROTULOS[confirma.parede.estacao_atual]}
                </div>
                <button style={est.botaoAcao} onClick={async () => {
                  await pp.executarBipe(confirma.parede, confirma.acao);
                  setConfirma(null);
                }}>{confirma.acao.rotulo}</button>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  {[["nc_aberta","NC"],["retoque","RETOQUE"],["divergencia_contador","CONTADOR"]].map(([t,l]) =>
                    <button key={t} style={est.botaoOcorr} onClick={async () => {
                      await pp.registrarOcorrencia(confirma.parede, t, {});
                      setConfirma(null);
                    }}>{l}</button>)}
                </div>
              </>
            )}
            {confirma.kit && (
              <>
                <div style={{ fontSize:20, fontWeight:800 }}>{confirma.kit.codigo}</div>
                <button style={est.botaoAcao} onClick={async () => {
                  await pp.biparKit(confirma.kit); setConfirma(null);
                }}>
                  {!confirma.kit.conferido_expedicao ? "Conferir EXPEDIÇÃO" : "Conferir RECEBIMENTO"}
                </button>
              </>
            )}
            <button style={est.cancelar} onClick={() => setConfirma(null)}>cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

const est = {
  select:{ background:COR_bg(), border:`1px solid ${"#2A5A56"}`, color:"#E8F3F2",
           borderRadius:8, padding:"6px 8px", fontSize:12 },
  aba:{ background:"none", border:"1px solid #2A5A56", color:"#7FA9A6", borderRadius:8,
        padding:"5px 10px", fontSize:10, letterSpacing:".08em", cursor:"pointer" },
  abaOn:{ background:"#1FA79A", color:"#04211F", borderColor:"#1FA79A", fontWeight:800 },
  coluna:{ minWidth:150, background:"#0A2E2C", border:"1px solid #1c4a46",
           borderRadius:12, padding:8, flex:"0 0 auto" },
  colTit:{ fontSize:10, letterSpacing:".1em", color:"#7FA9A6", padding:"2px 4px 8px",
           fontWeight:700 },
  card:{ display:"block", width:"100%", textAlign:"left", background:"#0E3835",
         border:"1px solid #1c4a46", borderRadius:8, color:"#E8F3F2",
         padding:"8px 10px", marginBottom:6, cursor:"pointer" },
  kit:{ display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#0A2E2C", border:"1px solid #1c4a46", borderRadius:10,
        color:"#E8F3F2", padding:"12px 14px", cursor:"pointer" },
  fab:{ position:"fixed", right:16, bottom:16, zIndex:30, background:"#E8A33D",
        color:"#3a2604", border:"none", borderRadius:14, padding:"16px 22px",
        fontSize:16, fontWeight:800, boxShadow:"0 6px 18px rgba(0,0,0,.45)", cursor:"pointer" },
  overlay:{ position:"fixed", inset:0, background:"rgba(4,33,31,.9)", zIndex:50,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal:{ width:"100%", maxWidth:380, background:"#0A2E2C", border:"1px solid #1FA79A",
          borderRadius:14, padding:18, textAlign:"center" },
  botaoAcao:{ width:"100%", background:"#1FA79A", color:"#04211F", border:"none",
              borderRadius:12, padding:"18px 10px", fontSize:17, fontWeight:800, cursor:"pointer" },
  botaoOcorr:{ flex:1, background:"none", border:"1px solid #E85D4A", color:"#E85D4A",
               borderRadius:8, padding:"8px 4px", fontSize:10.5, fontWeight:700, cursor:"pointer" },
  cancelar:{ marginTop:12, background:"none", border:"none", color:"#7FA9A6",
             fontSize:12, cursor:"pointer" },
  erro:{ background:"#5a1f16", color:"#ffd9d2", padding:"8px 14px", fontSize:12, cursor:"pointer" },
};
function COR_bg(){ return "#06201F"; }
