// ============================================================
// ifcWorker.js — parse do IFC OFF-MAIN-THREAD (Web Worker clássico)
// ============================================================
// Roda parseIFCFile (web-ifc) inteiramente no worker, mantendo a thread
// principal livre durante os ~40s de parse. A geometria (verts/indices) volta
// TRANSFERIDA (sem cópia). O buffer do IFC chega CLONADO (a página mantém o seu
// para salvar/upload). Em qualquer falha, a página cai para o parse na main
// thread (fallback) — então o worker nunca pode quebrar o 3D.
//
// web-ifc é carregado via importScripts dentro de getWebIFC (worker clássico).
// ============================================================
import { parseIFCFile, IFC_TYPES } from '../utils/ifcParser';

// Coleta os ArrayBuffers da geometria para a lista de transferência (verts +
// indices são os pesados; transform é pequeno e vai por clone).
function collectGeometryBuffers(elements) {
  const transfer = [];
  for (const el of elements) {
    const g = el && el.geometry;
    if (!g) continue;
    if (g.verts && g.verts.buffer && !transfer.includes(g.verts.buffer)) transfer.push(g.verts.buffer);
    if (g.indices && g.indices.buffer && !transfer.includes(g.indices.buffer)) transfer.push(g.indices.buffer);
  }
  return transfer;
}

self.onmessage = async (ev) => {
  const { buffer } = ev.data || {};
  if (!buffer) {
    self.postMessage({ type: 'error', message: 'buffer ausente' });
    return;
  }
  try {
    let primary = [];
    const all = await parseIFCFile(
      buffer,
      (pct, txt) => self.postMessage({ type: 'progress', pct, txt }),
      (stage, stageElements) => {
        if (stage === 'primary') {
          primary = stageElements;
          // Renderização progressiva: estrutura principal vai primeiro (buffers
          // primários transferidos aqui; NÃO são re-postados no 'done').
          self.postMessage(
            { type: 'stage', stage: 'primary', elements: stageElements },
            collectGeometryBuffers(stageElements)
          );
        }
      }
    );
    // 'done' leva APENAS os secundários (os primários já foram no 'stage').
    const secondary = all.filter((el) => !el.isPrimary);
    // CRÍTICO: o 'stage primary' foi postado ANTES das etapas 3/4 do parser
    // (PropertySets + propagação da marca do Assembly via IFCRELAGGREGATES).
    // O clone do postMessage congelou os primários SEM marcaFromIfc/assemblyId/
    // props — colunas/tesouras/vigas-mestras perdiam a marca real e o matching
    // do 3D caía no fallback (marcas "só no ERP", montadas sem verde).
    // Enviamos um PATCH leve (sem geometria — os buffers já foram transferidos)
    // para a página mesclar nos primários.
    const primaryPatch = all
      .filter((el) => el.isPrimary)
      .map((el) => ({
        expressID: el.expressID,
        marcaFromIfc: el.marcaFromIfc || '',
        assemblyId: el.assemblyId ?? null,
        props: el.props || null,
      }));
    self.postMessage(
      { type: 'done', elements: secondary, primaryPatch, correctedTypes: { ...IFC_TYPES } },
      collectGeometryBuffers(secondary)
    );
  } catch (e) {
    self.postMessage({ type: 'error', message: (e && e.message) || String(e) });
  }
};
