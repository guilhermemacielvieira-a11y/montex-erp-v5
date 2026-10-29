// ============================================================
// ABRIR RELATÓRIO HTML DIRETO NO NAVEGADOR
// ============================================================
// Navegadores bloqueiam window.open feito DEPOIS de um await (perde o
// "gesto" do clique). Por isso o fluxo tem dois passos:
//   1. abrirJanelaRelatorio()  — chamar SINCRONAMENTE no clique, antes de
//      qualquer await: abre a aba já com "Gerando relatório…".
//   2. mostrarHtmlRelatorio(janela, html, nome) — depois de gerar: carrega o
//      HTML nessa aba (blob URL: imprimir, salvar e compartilhar funcionam).
// Sem aba (bloqueada) → tenta abrir de novo; se não der, baixa o arquivo.
// App nativo (Capacitor, sem navegador interno) → compartilha o arquivo.
// ============================================================

const nativo = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

const AGUARDE = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gerando relatório…</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#006666;background:#f2f6f6}
.c{text-align:center}.s{width:36px;height:36px;border:4px solid #cfe3e3;border-top-color:#006666;border-radius:50%;margin:0 auto 14px;animation:g 1s linear infinite}
@keyframes g{to{transform:rotate(360deg)}}</style></head><body><div class="c"><div class="s"></div>Gerando relatório…</div></body></html>`;

/** Passo 1 — no clique, antes de qualquer await. Retorna a aba (ou null). */
export function abrirJanelaRelatorio() {
  if (typeof window === 'undefined' || nativo()) return null;
  try {
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(AGUARDE); w.document.close(); }
    return w;
  } catch {
    return null;
  }
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Passo 2 — mostra o HTML. Retorna 'aberto' | 'compartilhado' | 'baixado' | 'cancelado'.
 */
export async function mostrarHtmlRelatorio(janela, html, nome = 'relatorio.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

  if (nativo()) {
    const arquivo = new File([blob], nome, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: nome });
        return 'compartilhado';
      }
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelado';
    }
    baixar(blob, nome);
    return 'baixado';
  }

  const url = URL.createObjectURL(blob);
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  if (janela && !janela.closed) {
    janela.location.href = url;
    return 'aberto';
  }
  const w = window.open(url, '_blank');
  if (w) return 'aberto';
  baixar(blob, nome);
  return 'baixado';
}

/** Fecha a aba pré-aberta quando a geração falha. */
export function fecharJanelaRelatorio(janela) {
  try { if (janela && !janela.closed) janela.close(); } catch { /* noop */ }
}

/** Logo oficial (monograma + "MONTEX LTDA.") como data URL — carregado sob demanda. */
export async function carregarLogoMontex() {
  try { return (await import('@/utils/montexLogos')).LOGO_FULL_B64; } catch { return null; }
}
