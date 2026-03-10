/**
 * Gerador de Prévia HTML da Proposta Comercial - Grupo Montex
 * v3 - Tabelas separadas por setor com análise R$/m² e R$/kg independente
 */

const MONTEX_SVG = `<svg width="60" height="38" viewBox="0 0 1900 1200" style="flex-shrink:0">
  <path fill="#368784" d="M572.163 0L583.837 0C590.269 2.40243 602.143 0.735296 609.264 1.80956C617.731 3.08681 626.181 4.90844 634.594 6.57045C680.355 15.6105 721.355 41.8386 750.502 78.0239C763.354 93.9787 774.583 111.151 783.94 129.414C827.253 214.835 868.585 301.243 910.79 387.213C912.883 391.477 914.938 395.947 917.163 400.118C929.564 380.248 943.58 363.127 954.394 342.333C978.907 295.197 1001.57 246.481 1025.84 199.307C1047.46 157.276 1069.93 108.268 1101.81 73.7301C1131.05 41.4317 1169.55 18.9565 1212.05 9.3798C1271.72-4.41151 1339.42 3.09465 1392 36.0435C1440.79 66.6144 1462.32 105.451 1487.42 154.543L1520.77 219.852L1630.71 436.974C1676.34 527.348 1721.51 617.95 1766.23 708.777L1803.65 784.77C1819.18 816.436 1832.8 841.003 1840.8 875.839C1854.5 934.32 1844.33 995.852 1812.54 1046.81C1775.07 1106.27 1711.7 1143.65 1643.31 1152.74C1639.2 1153.29 1631.1 1153.94 1627.41 1155L1602.16 1155C1599.55 1153.8 1583.34 1152.93 1578.62 1151.9C1569.55 1149.92 1561.28 1147.9 1552.32 1145.11C1513.94 1132.96 1479.56 1110.64 1452.86 1080.51C1419.74 1043.75 1385.66 973.319 1361.89 927.491L1270.85 751.243C1258.08 772.266 1244.19 798.909 1232.36 820.675C1206.55 868.128 1181.19 915.825 1156.29 963.761C1145.14 985.4 1134.41 1008.01 1123.55 1029.04C1089.84 1094.29 1031.74 1140.68 958.566 1152.22C951.652 1153.31 938.844 1152.9 932.837 1155L908.163 1155C904.758 1153.42 886.42 1152.86 880.952 1151.86C870.385 1149.92 860.671 1147.98 850.269 1144.89C811.453 1133.54 776.728 1111.25 750.249 1080.68C720.559 1046.68 711.236 1020.92 692.623 981.458C683.058 961.343 673.276 941.331 663.278 921.426C634.416 863.533 604.515 806.164 573.587 749.348C541.47 812.012 510.73 875.141 477.157 937.1C428.151 1027.54 379.593 1123.27 268.5 1144.66C209.032 1155.73 147.602 1142.71 97.7418 1108.46C54.1175 1078.54 22.4605 1034.18 8.3546 983.194C4.05929 967.559 2.9118 954.943 0 939.414L0 902.586C1.00264 898.987 1.43661 893.281 2.05424 889.382C12.3183 824.592 47.3501 764.777 76.2507 706.456L181.889 494.232L315.667 226.965C332.112 194.391 348.856 161.389 365.025 128.745C399.237 58.2948 461.82 11.3312 540.098 2.56458C547.51 1.73444 566.141 2.1707 572.163 0ZM1612.2 1035.42C1643.17 1036.13 1673.14 1024.41 1695.43 1002.89C1716.13 982.955 1727.91 955.519 1728.12 926.784C1728.21 910.744 1725.18 894.84 1719.18 879.961C1712.13 862.405 1696.87 834.086 1688.11 816.578L1626.01 692.924L1536.73 514.984C1523.26 488.167 1509.49 460.117 1495.74 433.577C1489.47 421.472 1464.02 377.988 1454.42 368.649L1335.26 606L1458.19 852.863L1489.48 915.659C1511.55 960.515 1533.01 1012.59 1584 1029.9C1593.12 1032.97 1602.6 1034.82 1612.2 1035.42ZM508.028 611C496.095 587.141 386.57 365.692 383.513 363.471L193.193 742.364L144.969 841.074C136.9 857.751 122.609 884.061 118.081 901.381C100.338 969.258 175.151 1040.23 241.741 1030.3C294.795 1023.87 310.75 992.916 333.836 950.414C346.339 927.394 358.647 904.267 370.758 881.037C417.071 791.309 462.829 701.295 508.028 611ZM921.124 1030.49C954.718 1027.78 985.865 1011.85 1007.74 986.212C1036.66 952.151 1038.38 913.93 1021.28 874.005C998.152 819.99 971.382 767.417 944.778 714.988C940.794 707.136 926.85 676.207 922.408 670.682L851.363 811.214C839.253 835.672 818.261 875.438 812.678 900.385C808.856 917.503 809.673 935.332 815.046 952.028C828.763 993.401 876.405 1032.11 921.124 1030.49ZM854.201 541.5L789.127 415.242C785.293 407.808 766.155 369.339 763.006 365.504L640.382 610.753L699.856 726.043C709.352 744.427 721.598 769.889 731.675 787.151C772.006 706.44 815.3 622.504 854.201 541.5ZM573.837 477.231L641.338 342.922C652.904 319.682 674.333 280.91 679.679 257.559C691.491 205.968 667.606 148.777 617.859 127.115C604.005 120.724 585.136 113.78 569.757 116.362C538.043 117.957 510.564 139.545 489.977 162.096C465.987 188.375 453.58 223.079 468.204 257.368C479.966 284.949 492.911 311.895 505.865 338.959L572.354 476.771L573.837 477.231ZM1078.4 360.694L990.208 537.106C1000.38 562.047 1011.3 586.675 1022.95 610.956C1029.95 625.536 1109.39 779.989 1114.09 782.308L1202.1 605.705L1118.99 440.776L1091.68 386.664C1088.7 380.766 1081.66 365.822 1078.4 360.694ZM1262.76 127.395C1232.95 128.511 1209.57 138.403 1189.18 160.134C1162.35 188.734 1152.33 230.527 1167.35 267.306C1176.2 288.97 1186.55 310.387 1196.74 331.48C1215.62 370.223 1234.95 408.743 1254.73 447.031C1257.86 453.111 1264.86 470.064 1267.56 473.207L1269.05 473.654L1270.76 470.654C1301.02 409.15 1333.2 348.886 1361.98 286.584C1375.87 256.528 1382.17 229.094 1370.77 196.663C1362.1 171.735 1346.04 150.242 1321.94 138.426C1305.87 130.481 1280.47 125.104 1262.76 127.395Z"/>
</svg>`;

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0);
}

// Calculate setor-level metrics
function calcSetorMetrics(setor) {
  let setorTotal = 0;
  let setorWeight = 0;
  let setorArea = 0;
  const gruposPorBase = {};

  (setor.itens || []).forEach(item => {
    const total = (item.quantidade || 0) * (item.preco || 0);
    setorTotal += total;
    if (item.unidade === 'KG') {
      const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
      if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
        gruposPorBase[base] = item.quantidade || 0;
      }
    }
    if (item.unidade === 'M2') {
      setorArea += item.quantidade || 0;
    }
  });

  setorWeight = Object.values(gruposPorBase).reduce((s, qty) => s + qty, 0);

  return {
    total: setorTotal,
    peso: setorWeight,
    area: setorArea,
    valorKg: setorWeight > 0 ? setorTotal / setorWeight : 0,
    valorM2: setorArea > 0 ? setorTotal / setorArea : 0,
  };
}

export function gerarPreviaPropostaHTML(data) {
  const { project, setores, calculations, unitCosts, propostaNumber, prazoExecucao, condicoesPagamento } = data;

  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const dataValidade = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR');
  const propNum = propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazo = prazoExecucao || 150;
  const pagamento = condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  // Calculate totals
  const totalGeral = setores.reduce((sum, s) => {
    return sum + s.itens.reduce((itemSum, item) => itemSum + (item.quantidade * item.preco), 0);
  }, 0);

  // Peso real: agrupa itens KG por nome base
  let totalWeight = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    totalWeight += Object.values(gruposPorBase).reduce((s2, qty) => s2 + qty, 0);
  });

  const totalArea = setores.reduce((sum, s) => {
    return sum + s.itens.reduce((itemSum, item) => {
      return itemSum + (item.quantidade || 0) * (item.unidade === 'M2' ? 1 : 0);
    }, 0);
  }, 0);

  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;

  // Separar Material vs Instalação
  let custoMaterial = 0;
  let custoInstalacao = 0;
  setores.forEach(s => {
    (s.itens || []).forEach(item => {
      const total = (item.quantidade || 0) * (item.preco || 0);
      const parts = (item.descricao || '').split(' - ');
      const sufixo = parts.length >= 2 ? parts[parts.length - 1].trim().toLowerCase() : '';
      if (sufixo === 'material') {
        custoMaterial += total;
      } else {
        custoInstalacao += total;
      }
    });
  });

  const margemInstalacao = custoInstalacao * (margemPct / 100);
  const subtotalInstalacao = custoInstalacao + margemInstalacao;
  const impostosInstalacao = subtotalInstalacao * (impostosPct / 100);
  const precoFinal = calculations?.precoFinal || (custoMaterial + subtotalInstalacao + impostosInstalacao);

  // Build setor tables with analysis per setor
  const setoresHTML = setores.map((setor, sIdx) => {
    const metrics = calcSetorMetrics(setor);

    const itemRows = setor.itens.map((item, iIdx) => {
      const total = item.quantidade * item.preco;
      return `<tr class="${iIdx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-desc">${item.descricao}</td>
        <td class="td-center">${item.unidade}</td>
        <td class="td-center">${formatNumber(item.quantidade)}</td>
        <td class="td-right">${formatCurrency(item.preco)}</td>
        <td class="td-right td-bold">${formatCurrency(total)}</td>
      </tr>`;
    }).join('');

    // Analysis badges for the setor
    const badges = [];
    if (metrics.peso > 0) {
      badges.push(`<span class="badge"><b>${formatNumber(metrics.peso)}</b> kg</span>`);
      badges.push(`<span class="badge badge-teal"><b>${formatCurrency(metrics.valorKg)}</b>/kg</span>`);
    }
    if (metrics.area > 0) {
      badges.push(`<span class="badge"><b>${formatNumber(metrics.area)}</b> m²</span>`);
      badges.push(`<span class="badge badge-teal"><b>${formatCurrency(metrics.valorM2)}</b>/m²</span>`);
    }

    return `
      <div class="setor-block">
        <div class="setor-header">
          <div class="setor-header-left">
            <span class="setor-number">${sIdx + 1}</span>
            <span class="setor-name">${setor.nome}</span>
          </div>
          <span class="setor-total">${formatCurrency(metrics.total)}</span>
        </div>
        <table class="setor-table">
          <thead><tr>
            <th style="width:40%">Descrição</th>
            <th style="width:8%;text-align:center">Un</th>
            <th style="width:14%;text-align:center">Quantidade</th>
            <th style="width:18%;text-align:right">Preço Unit.</th>
            <th style="width:20%;text-align:right">Total</th>
          </tr></thead>
          <tbody>
            ${itemRows}
            <tr class="subtotal-row">
              <td colspan="4" style="text-align:right">Subtotal - ${setor.nome}</td>
              <td style="text-align:right">${formatCurrency(metrics.total)}</td>
            </tr>
          </tbody>
        </table>
        ${badges.length > 0 ? `<div class="setor-analysis">${badges.join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  // Custos unitários
  const custosInfo = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div>
        <div class="field"><b>Estrutura - Material:</b> R$ ${(unitCosts?.estrutura?.material || 0).toFixed(2)}/kg</div>
        <div class="field"><b>Estrutura - Fabricação:</b> R$ ${(unitCosts?.estrutura?.fabricacao || 0).toFixed(2)}/kg</div>
        <div class="field"><b>Estrutura - Pintura:</b> R$ ${(unitCosts?.estrutura?.pintura || 0).toFixed(2)}/kg</div>
        <div class="field"><b>Estrutura - Transporte:</b> R$ ${(unitCosts?.estrutura?.transporte || 0).toFixed(2)}/kg</div>
        <div class="field"><b>Estrutura - Montagem:</b> R$ ${(unitCosts?.estrutura?.montagem || 0).toFixed(2)}/kg</div>
      </div>
      <div>
        <div class="field"><b>Cobertura - Material:</b> R$ ${(unitCosts?.cobertura?.material || 0).toFixed(2)}/m²</div>
        <div class="field"><b>Cobertura - Montagem:</b> R$ ${(unitCosts?.cobertura?.montagem || 0).toFixed(2)}/m²</div>
        <div class="field"><b>Fechamento - Material:</b> R$ ${(unitCosts?.fechamento?.material || 0).toFixed(2)}/m²</div>
        <div class="field"><b>Fechamento - Montagem:</b> R$ ${(unitCosts?.fechamento?.montagem || 0).toFixed(2)}/m²</div>
        <div class="field"><b>Steel Deck - Material:</b> R$ ${(unitCosts?.steelDeck?.material || 0).toFixed(2)}/m²</div>
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Proposta Comercial - ${project?.nome || 'Montex'} - ${propNum}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1e293b;background:#fff}

  /* HEADER */
  .header{background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);padding:24px 32px;display:flex;justify-content:space-between;align-items:center;color:#fff}
  .header-left{display:flex;align-items:center;gap:16px}
  .header-left h1{color:#fff;font-size:24px;margin:0;font-weight:bold;letter-spacing:1px}
  .header-left .tagline{color:#94d2bd;font-size:10px;letter-spacing:2px;margin-top:2px;text-transform:uppercase}
  .header-right{text-align:right}
  .header-right .title{color:#94d2bd;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .header-right .num{color:#fff;font-size:20px;font-weight:bold}
  .header-right .label{color:#cbd5e1;font-size:10px;margin-top:4px}

  /* SECTIONS */
  .section{margin:16px 32px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}
  .section-title{background:linear-gradient(90deg,#1a7a6d,#2c9e8f);padding:8px 14px;font-size:11px;font-weight:bold;color:#fff;letter-spacing:1px;text-transform:uppercase}
  .section-body{padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .section-body.full{grid-template-columns:1fr}
  .field{font-size:12px;line-height:1.8}
  .field b{color:#475569}

  /* SETOR BLOCKS */
  .budget-container{margin:16px 32px}
  .budget-header{background:linear-gradient(90deg,#1a7a6d,#2c9e8f);color:#fff;padding:10px 14px;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;border-radius:8px 8px 0 0;letter-spacing:1px;text-transform:uppercase}

  .setor-block{margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
  .setor-header{background:linear-gradient(135deg,#0f2027,#1e3a4a);color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
  .setor-header-left{display:flex;align-items:center;gap:10px}
  .setor-number{background:#1a7a6d;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;flex-shrink:0}
  .setor-name{font-size:13px;font-weight:bold;letter-spacing:0.5px}
  .setor-total{font-size:14px;font-weight:bold;color:#94d2bd}

  .setor-table{width:100%;border-collapse:collapse;font-size:11px}
  .setor-table th{background:#475569;color:#fff;padding:6px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;text-align:left}
  .setor-table .td-desc{padding:6px 10px;border-bottom:1px solid #e2e8f0}
  .setor-table .td-center{padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center}
  .setor-table .td-right{padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right}
  .setor-table .td-bold{font-weight:600}
  .row-even{background:#f8fafc}
  .row-odd{background:#fff}
  .subtotal-row{background:#e8f5f3;font-weight:bold;color:#006666;font-size:12px}
  .subtotal-row td{padding:8px 10px;border-top:2px solid #1a7a6d}

  .setor-analysis{background:#f0f9ff;padding:8px 14px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-top:1px dashed #bae6fd}
  .badge{background:#e2e8f0;padding:4px 10px;border-radius:20px;font-size:10px;color:#475569}
  .badge-teal{background:#ccfbf1;color:#006666}

  /* GRAND TOTAL */
  .grand-total-bar{background:linear-gradient(90deg,#006666,#1a7a6d);color:#fff;margin:0 32px 16px;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,102,102,0.3)}
  .grand-total-bar .gt-label{font-size:13px;font-weight:bold;letter-spacing:1px}
  .grand-total-bar .gt-value{font-size:18px;font-weight:bold}

  /* SUMMARY METRICS */
  .metrics-grid{margin:16px 32px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .metric-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;border-top:3px solid #1a7a6d}
  .metric-card .metric-value{font-size:18px;font-weight:bold;color:#006666;margin:4px 0}
  .metric-card .metric-label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px}

  /* INVESTMENT BOX */
  .invest-box{margin:16px 32px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #10b981;border-radius:8px;padding:20px;page-break-inside:avoid}
  .invest-box h3{color:#065f46;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .invest-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .invest-item{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dashed #d1fae5}
  .invest-item.highlight{font-size:16px;font-weight:bold;color:#065f46;border-bottom:2px solid #10b981;padding:8px 0}

  /* CONDITIONS */
  .cond-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:16px 32px}
  .cond-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;border-top:3px solid #1a7a6d}
  .cond-card .pct{font-size:24px;font-weight:bold;color:#1a7a6d}
  .cond-card .desc{font-size:10px;color:#64748b;margin-top:4px}
  .cond-card .val{font-size:11px;font-weight:bold;color:#1e293b;margin-top:4px}

  /* TIMELINE */
  .timeline{margin:16px 32px;display:flex;gap:0;border-radius:8px;overflow:hidden;height:40px}
  .timeline-seg{display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold}

  /* SIGNATURES */
  .signatures{margin:24px 32px;page-break-inside:avoid}
  .signatures h3{font-size:11px;color:#475569;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center}
  .sig-box .line{border-top:1px solid #94a3b8;margin-top:50px;padding-top:8px}
  .sig-box .label{font-size:11px;font-weight:bold;color:#475569}
  .sig-box .date{font-size:9px;color:#94a3b8;margin-top:4px}

  /* FOOTER */
  .footer{border-top:2px solid #1a7a6d;margin:24px 32px 16px;padding-top:12px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;align-items:center}
  .footer .brand{color:#1a7a6d;font-weight:bold;font-size:10px}

  /* PRINT */
  @media print{button,.no-print{display:none !important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>

<!-- ====== HEADER ====== -->
<div class="header">
  <div class="header-left">
    ${MONTEX_SVG}
    <div>
      <h1>GRUPO MONTEX</h1>
      <div class="tagline">Soluções em Aço</div>
    </div>
  </div>
  <div class="header-right">
    <div class="title">Proposta Comercial</div>
    <div class="num">Nº ${propNum}</div>
    <div class="label">Emissão: ${dataEmissao} | Validade: ${dataValidade}</div>
  </div>
</div>

<!-- ====== DADOS DO PROJETO ====== -->
<div class="section">
  <div class="section-title">Dados do Projeto</div>
  <div class="section-body">
    <div>
      <div class="field"><b>Projeto:</b> ${project?.nome || '-'}</div>
      <div class="field"><b>Cliente:</b> ${project?.cliente || '-'}</div>
    </div>
    <div>
      <div class="field"><b>Tipo:</b> ${project?.tipo || 'Galpão Industrial'}</div>
      <div class="field"><b>Região:</b> ${(project?.regiao || 'sudeste').toUpperCase()}</div>
    </div>
  </div>
</div>

<!-- ====== CUSTOS UNITÁRIOS ====== -->
<div class="section">
  <div class="section-title">Custos Unitários de Referência</div>
  <div class="section-body">
    ${custosInfo}
  </div>
</div>

<!-- ====== ORÇAMENTO DETALHADO POR SETOR ====== -->
<div class="budget-container">
  <div class="budget-header">
    <span>Orçamento Detalhado por Setor</span>
    <span>${setores.length} setores | ${setores.reduce((s,sec) => s + sec.itens.length, 0)} itens</span>
  </div>
</div>

<div style="margin:0 32px">
  ${setoresHTML}
</div>

<!-- ====== GRAND TOTAL BAR ====== -->
<div class="grand-total-bar">
  <span class="gt-label">TOTAL GERAL DO ORÇAMENTO</span>
  <span class="gt-value">${formatCurrency(totalGeral)}</span>
</div>

<!-- ====== RESUMO MÉTRICAS ====== -->
<div class="metrics-grid">
  <div class="metric-card">
    <div class="metric-label">Peso Total</div>
    <div class="metric-value">${formatNumber(totalWeight)} kg</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Área Total</div>
    <div class="metric-value">${formatNumber(totalArea)} m²</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Preço Médio / kg</div>
    <div class="metric-value">${totalWeight > 0 ? formatCurrency(precoFinal / totalWeight) : '-'}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Preço Médio / m²</div>
    <div class="metric-value">${totalArea > 0 ? formatCurrency(precoFinal / totalArea) : '-'}</div>
  </div>
</div>

<!-- ====== COMPOSIÇÃO DO INVESTIMENTO ====== -->
<div class="invest-box">
  <h3>Composição do Investimento</h3>
  <div class="invest-grid">
    <div>
      <div class="invest-item"><span>Material (s/ margem/impostos)</span><span>${formatCurrency(custoMaterial)}</span></div>
      <div class="invest-item"><span>Instalação (Fab/Pint/Transp/Mont)</span><span>${formatCurrency(custoInstalacao)}</span></div>
      <div class="invest-item"><span>Margem (${margemPct}%) s/ instalação</span><span>${formatCurrency(margemInstalacao)}</span></div>
      <div class="invest-item"><span>Impostos (${impostosPct}%) s/ instalação</span><span>${formatCurrency(impostosInstalacao)}</span></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center">
      <div class="invest-item highlight" style="width:100%;text-align:center;justify-content:center;flex-direction:column;align-items:center">
        <span style="font-size:11px;color:#64748b;font-weight:normal">VALOR TOTAL DA PROPOSTA</span>
        <span style="font-size:28px;color:#065f46">${formatCurrency(precoFinal)}</span>
      </div>
    </div>
  </div>
</div>

<!-- ====== CONDIÇÕES DE PAGAMENTO ====== -->
<div class="section">
  <div class="section-title">Condições de Pagamento</div>
  <div class="section-body full" style="padding:0">
    <div class="cond-grid" style="margin:12px">
      <div class="cond-card">
        <div class="pct">${pagamento.assinatura}%</div>
        <div class="desc">Na Assinatura do Contrato</div>
        <div class="val">${formatCurrency(precoFinal * pagamento.assinatura / 100)}</div>
      </div>
      <div class="cond-card">
        <div class="pct">${pagamento.projeto}%</div>
        <div class="desc">Aprovação do Projeto</div>
        <div class="val">${formatCurrency(precoFinal * pagamento.projeto / 100)}</div>
      </div>
      <div class="cond-card">
        <div class="pct">${pagamento.medicoes}%</div>
        <div class="desc">Medições Mensais</div>
        <div class="val">${formatCurrency(precoFinal * pagamento.medicoes / 100)}</div>
      </div>
    </div>
  </div>
</div>

<!-- ====== CRONOGRAMA ====== -->
<div class="section">
  <div class="section-title">Cronograma Estimado (${prazo} dias)</div>
  <div class="section-body full" style="padding:16px">
    <div class="timeline">
      <div class="timeline-seg" style="flex:1;background:#3b82f6">Projeto (10d)</div>
      <div class="timeline-seg" style="flex:3;background:#f59e0b">Fabricação (${Math.ceil((totalWeight / 1000) * 1.5) || 45}d)</div>
      <div class="timeline-seg" style="flex:2;background:#10b981">Montagem (${Math.ceil((totalWeight / 1000) * 2) || 30}d)</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:6px;padding:0 4px">
      <span>Início</span>
      <span>→</span>
      <span>→</span>
      <span>Entrega Final</span>
    </div>
  </div>
</div>

<!-- ====== ESCOPO ====== -->
<div class="section">
  <div class="section-title">Escopo de Fornecimento</div>
  <div class="section-body full">
    <div style="font-size:12px;line-height:1.8">
      <b>INCLUSO:</b> Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.
    </div>
    <div style="font-size:12px;line-height:1.8;margin-top:8px;color:#991b1b">
      <b>NÃO INCLUSO:</b> Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.
    </div>
  </div>
</div>

<!-- ====== OBRIGAÇÕES ====== -->
<div class="section">
  <div class="section-title">Obrigações do Contratante</div>
  <div class="section-body full">
    <div style="font-size:12px;line-height:1.8">
      Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.
    </div>
  </div>
</div>

<!-- ====== ASSINATURAS ====== -->
<div class="signatures">
  <h3>Assinaturas</h3>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="line">
        <div class="label">GRUPO MONTEX</div>
        <div class="date">Guilherme Maciel Vieira - Diretor Comercial</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="line">
        <div class="label">CONTRATANTE</div>
        <div class="date">${project?.cliente || '___________________________'}</div>
      </div>
    </div>
  </div>
</div>

<!-- ====== FOOTER ====== -->
<div class="footer">
  <div>
    <span class="brand">GRUPO MONTEX - Soluções em Aço</span><br/>
    <span>CNPJ: 00.000.000/0001-00 | contato@grupomontex.com.br | (31) 9 9999-9999</span>
  </div>
  <span>Proposta ${propNum} | ${dataEmissao} | Pág 1</span>
</div>

<!-- ====== BOTÕES (não imprime) ====== -->
<div class="no-print" style="text-align:center;margin:24px;display:flex;gap:12px;justify-content:center">
  <button onclick="window.print()" style="padding:14px 36px;background:#1a7a6d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:8px">
    Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()" style="padding:14px 36px;background:#64748b;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer">
    Fechar
  </button>
</div>

</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob));
}
