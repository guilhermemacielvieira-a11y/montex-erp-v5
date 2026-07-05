// src/modules/paredePronta/ScannerQR.jsx
// Scanner de QR via câmera (html5-qrcode: funciona em iOS Safari/Capacitor via getUserMedia)
// npm i html5-qrcode
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function ScannerQR({ aoLer, aoFechar }) {
  const ref = useRef(null);
  const [manual, setManual] = useState("");
  const [msg, setMsg] = useState("apontando a câmera…");

  useEffect(() => {
    const scanner = new Html5Qrcode("pp-scanner");
    let vivo = true;
    scanner.start(
      { facingMode: "environment" },
      { fps: 8, qrbox: { width: 230, height: 230 } },
      (texto) => { if (vivo) { vivo = false; scanner.stop().catch(()=>{}); aoLer(texto); } },
      () => {}
    ).catch(() => setMsg("câmera indisponível — use o campo manual"));
    ref.current = scanner;
    return () => { vivo = false; scanner.stop().catch(()=>{}); };
  }, [aoLer]);

  return (
    <div style={S.overlay}>
      <div style={S.caixa}>
        <div style={S.topo}>
          <b>BIPAR QR</b>
          <button style={S.fechar} onClick={aoFechar}>✕</button>
        </div>
        <div id="pp-scanner" style={{ width: "100%", borderRadius: 10, overflow: "hidden" }} />
        <div style={S.msg}>{msg}</div>
        <div style={S.linha}>
          <input style={S.input} placeholder="ou digite: MTX-C0001-F1" value={manual}
                 onChange={e => setManual(e.target.value)}
                 onKeyDown={e => e.key === "Enter" && manual && aoLer(manual)} />
          <button style={S.ok} onClick={() => manual && aoLer(manual)}>OK</button>
        </div>
      </div>
    </div>
  );
}
const S = {
  overlay:{ position:"fixed", inset:0, background:"rgba(4,33,31,.92)", zIndex:60,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  caixa:{ width:"100%", maxWidth:400, background:"#0A2E2C", border:"1px solid #1FA79A",
          borderRadius:14, padding:14 },
  topo:{ display:"flex", justifyContent:"space-between", color:"#E8F3F2", marginBottom:10,
         letterSpacing:".12em", fontSize:13 },
  fechar:{ background:"none", border:"none", color:"#E8A33D", fontSize:18, cursor:"pointer" },
  msg:{ color:"#7FA9A6", fontSize:11, textAlign:"center", margin:"8px 0" },
  linha:{ display:"flex", gap:8 },
  input:{ flex:1, background:"#06201F", border:"1px solid #2A5A56", borderRadius:8,
          color:"#E8F3F2", padding:"10px 12px", fontSize:14 },
  ok:{ background:"#E8A33D", border:"none", borderRadius:8, fontWeight:800,
       padding:"0 18px", cursor:"pointer" },
};
