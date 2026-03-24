/**
 * Gerador de Proposta Comercial - Grupo Montex
 * v9 - PDF export corrigido: backgrounds imprimem, sem chrome do browser,
 *      layout fluido com page-breaks corretos, SVG logo visível
 */

// SVG real do logo Montex (M estilizado) - teal
const MONTEX_LOGO_SVG = `<svg width="55" height="35" viewBox="0 0 1900 1200" style="flex-shrink:0">
  <path fill="#368784" d="M572.163 0L583.837 0C590.269 2.40243 602.143 0.735296 609.264 1.80956C617.731 3.08681 626.181 4.90844 634.594 6.57045C680.355 15.6105 721.355 41.8386 750.502 78.0239C763.354 93.9787 774.583 111.151 783.94 129.414C827.253 214.835 868.585 301.243 910.79 387.213C912.883 391.477 914.938 395.947 917.163 400.118C929.564 380.248 943.58 363.127 954.394 342.333C978.907 295.197 1001.57 246.481 1025.84 199.307C1047.46 157.276 1069.93 108.268 1101.81 73.7301C1131.05 41.4317 1169.55 18.9565 1212.05 9.3798C1271.72-4.41151 1339.42 3.09465 1392 36.0435C1440.79 66.6144 1462.32 105.451 1487.42 154.543L1520.77 219.852L1630.71 436.974C1676.34 527.348 1721.51 617.95 1766.23 708.777L1803.65 784.77C1819.18 816.436 1832.8 841.003 1840.8 875.839C1854.5 934.32 1844.33 995.852 1812.54 1046.81C1775.07 1106.27 1711.7 1143.65 1643.31 1152.74C1639.2 1153.29 1631.1 1153.94 1627.41 1155L1602.16 1155C1599.55 1153.8 1583.34 1152.93 1578.62 1151.9C1569.55 1149.92 1561.28 1147.9 1552.32 1145.11C1513.94 1132.96 1479.56 1110.64 1452.86 1080.51C1419.74 1043.75 1385.66 973.319 1361.89 927.491L1270.85 751.243C1258.08 772.266 1244.19 798.909 1232.36 820.675C1206.55 868.128 1181.19 915.825 1156.29 963.761C1145.14 985.4 1134.41 1008.01 1123.55 1029.04C1089.84 1094.29 1031.74 1140.68 958.566 1152.22C951.652 1153.31 938.844 1152.9 932.837 1155L908.163 1155C904.758 1153.42 886.42 1152.86 880.952 1151.86C870.385 1149.92 860.671 1147.98 850.269 1144.89C811.453 1133.54 776.728 1111.25 750.249 1080.68C720.559 1046.68 711.236 1020.92 692.623 981.458C683.058 961.343 673.276 941.331 663.278 921.426C634.416 863.533 604.515 806.164 573.587 749.348C541.47 812.012 510.73 875.141 477.157 937.1C428.151 1027.54 379.593 1123.27 268.5 1144.66C209.032 1155.73 147.602 1142.71 97.7418 1108.46C54.1175 1078.54 22.4605 1034.18 8.3546 983.194C4.05929 967.559 2.9118 954.943 0 939.414L0 902.586C1.00264 898.987 1.43661 893.281 2.05424 889.382C12.3183 824.592 47.3501 764.777 76.2507 706.456L181.889 494.232L315.667 226.965C332.112 194.391 348.856 161.389 365.025 128.745C399.237 58.2948 461.82 11.3312 540.098 2.56458C547.51 1.73444 566.141 2.1707 572.163 0ZM1612.2 1035.42C1643.17 1036.13 1673.14 1024.41 1695.43 1002.89C1716.13 982.955 1727.91 955.519 1728.12 926.784C1728.21 910.744 1725.18 894.84 1719.18 879.961C1712.13 862.405 1696.87 834.086 1688.11 816.578L1626.01 692.924L1536.73 514.984C1523.26 488.167 1509.49 460.117 1495.74 433.577C1489.47 421.472 1464.02 377.988 1454.42 368.649L1335.26 606L1458.19 852.863L1489.48 915.659C1511.55 960.515 1533.01 1012.59 1584 1029.9C1593.12 1032.97 1602.6 1034.82 1612.2 1035.42ZM508.028 611C496.095 587.141 386.57 365.692 383.513 363.471L193.193 742.364L144.969 841.074C136.9 857.751 122.609 884.061 118.081 901.381C100.338 969.258 175.151 1040.23 241.741 1030.3C294.795 1023.87 310.75 992.916 333.836 950.414C346.339 927.394 358.647 904.267 370.758 881.037C417.071 791.309 462.829 701.295 508.028 611ZM921.124 1030.49C954.718 1027.78 985.865 1011.85 1007.74 986.212C1036.66 952.151 1038.38 913.93 1021.28 874.005C998.152 819.99 971.382 767.417 944.778 714.988C940.794 707.136 926.85 676.207 922.408 670.682L851.363 811.214C839.253 835.672 818.261 875.438 812.678 900.385C808.856 917.503 809.673 935.332 815.046 952.028C828.763 993.401 876.405 1032.11 921.124 1030.49ZM854.201 541.5L789.127 415.242C785.293 407.808 766.155 369.339 763.006 365.504L640.382 610.753L699.856 726.043C709.352 744.427 721.598 769.889 731.675 787.151C772.006 706.44 815.3 622.504 854.201 541.5ZM573.837 477.231L641.338 342.922C652.904 319.682 674.333 280.91 679.679 257.559C691.491 205.968 667.606 148.777 617.859 127.115C604.005 120.724 585.136 113.78 569.757 116.362C538.043 117.957 510.564 139.545 489.977 162.096C465.987 188.375 453.58 223.079 468.204 257.368C479.966 284.949 492.911 311.895 505.865 338.959L572.354 476.771L573.837 477.231ZM1078.4 360.694L990.208 537.106C1000.38 562.047 1011.3 586.675 1022.95 610.956C1029.95 625.536 1109.39 779.989 1114.09 782.308L1202.1 605.705L1118.99 440.776L1091.68 386.664C1088.7 380.766 1081.66 365.822 1078.4 360.694ZM1262.76 127.395C1232.95 128.511 1209.57 138.403 1189.18 160.134C1162.35 188.734 1152.33 230.527 1167.35 267.306C1176.2 288.97 1186.55 310.387 1196.74 331.48C1215.62 370.223 1234.95 408.743 1254.73 447.031C1257.86 453.111 1264.86 470.064 1267.56 473.207L1269.05 473.654L1270.76 470.654C1301.02 409.15 1333.2 348.886 1361.98 286.584C1375.87 256.528 1382.17 229.094 1370.77 196.663C1362.1 171.735 1346.04 150.242 1321.94 138.426C1305.87 130.481 1280.47 125.104 1262.76 127.395Z"/>
</svg>`;

// SVG logo branco para header com fundo teal
const MONTEX_LOGO_WHITE_SVG = `<svg width="55" height="35" viewBox="0 0 1900 1200" style="flex-shrink:0">
  <path fill="white" d="M572.163 0L583.837 0C590.269 2.40243 602.143 0.735296 609.264 1.80956C617.731 3.08681 626.181 4.90844 634.594 6.57045C680.355 15.6105 721.355 41.8386 750.502 78.0239C763.354 93.9787 774.583 111.151 783.94 129.414C827.253 214.835 868.585 301.243 910.79 387.213C912.883 391.477 914.938 395.947 917.163 400.118C929.564 380.248 943.58 363.127 954.394 342.333C978.907 295.197 1001.57 246.481 1025.84 199.307C1047.46 157.276 1069.93 108.268 1101.81 73.7301C1131.05 41.4317 1169.55 18.9565 1212.05 9.3798C1271.72-4.41151 1339.42 3.09465 1392 36.0435C1440.79 66.6144 1462.32 105.451 1487.42 154.543L1520.77 219.852L1630.71 436.974C1676.34 527.348 1721.51 617.95 1766.23 708.777L1803.65 784.77C1819.18 816.436 1832.8 841.003 1840.8 875.839C1854.5 934.32 1844.33 995.852 1812.54 1046.81C1775.07 1106.27 1711.7 1143.65 1643.31 1152.74C1639.2 1153.29 1631.1 1153.94 1627.41 1155L1602.16 1155C1599.55 1153.8 1583.34 1152.93 1578.62 1151.9C1569.55 1149.92 1561.28 1147.9 1552.32 1145.11C1513.94 1132.96 1479.56 1110.64 1452.86 1080.51C1419.74 1043.75 1385.66 973.319 1361.89 927.491L1270.85 751.243C1258.08 772.266 1244.19 798.909 1232.36 820.675C1206.55 868.128 1181.19 915.825 1156.29 963.761C1145.14 985.4 1134.41 1008.01 1123.55 1029.04C1089.84 1094.29 1031.74 1140.68 958.566 1152.22C951.652 1153.31 938.844 1152.9 932.837 1155L908.163 1155C904.758 1153.42 886.42 1152.86 880.952 1151.86C870.385 1149.92 860.671 1147.98 850.269 1144.89C811.453 1133.54 776.728 1111.25 750.249 1080.68C720.559 1046.68 711.236 1020.92 692.623 981.458C683.058 961.343 673.276 941.331 663.278 921.426C634.416 863.533 604.515 806.164 573.587 749.348C541.47 812.012 510.73 875.141 477.157 937.1C428.151 1027.54 379.593 1123.27 268.5 1144.66C209.032 1155.73 147.602 1142.71 97.7418 1108.46C54.1175 1078.54 22.4605 1034.18 8.3546 983.194C4.05929 967.559 2.9118 954.943 0 939.414L0 902.586C1.00264 898.987 1.43661 893.281 2.05424 889.382C12.3183 824.592 47.3501 764.777 76.2507 706.456L181.889 494.232L315.667 226.965C332.112 194.391 348.856 161.389 365.025 128.745C399.237 58.2948 461.82 11.3312 540.098 2.56458C547.51 1.73444 566.141 2.1707 572.163 0ZM1612.2 1035.42C1643.17 1036.13 1673.14 1024.41 1695.43 1002.89C1716.13 982.955 1727.91 955.519 1728.12 926.784C1728.21 910.744 1725.18 894.84 1719.18 879.961C1712.13 862.405 1696.87 834.086 1688.11 816.578L1626.01 692.924L1536.73 514.984C1523.26 488.167 1509.49 460.117 1495.74 433.577C1489.47 421.472 1464.02 377.988 1454.42 368.649L1335.26 606L1458.19 852.863L1489.48 915.659C1511.55 960.515 1533.01 1012.59 1584 1029.9C1593.12 1032.97 1602.6 1034.82 1612.2 1035.42ZM508.028 611C496.095 587.141 386.57 365.692 383.513 363.471L193.193 742.364L144.969 841.074C136.9 857.751 122.609 884.061 118.081 901.381C100.338 969.258 175.151 1040.23 241.741 1030.3C294.795 1023.87 310.75 992.916 333.836 950.414C346.339 927.394 358.647 904.267 370.758 881.037C417.071 791.309 462.829 701.295 508.028 611ZM921.124 1030.49C954.718 1027.78 985.865 1011.85 1007.74 986.212C1036.66 952.151 1038.38 913.93 1021.28 874.005C998.152 819.99 971.382 767.417 944.778 714.988C940.794 707.136 926.85 676.207 922.408 670.682L851.363 811.214C839.253 835.672 818.261 875.438 812.678 900.385C808.856 917.503 809.673 935.332 815.046 952.028C828.763 993.401 876.405 1032.11 921.124 1030.49ZM854.201 541.5L789.127 415.242C785.293 407.808 766.155 369.339 763.006 365.504L640.382 610.753L699.856 726.043C709.352 744.427 721.598 769.889 731.675 787.151C772.006 706.44 815.3 622.504 854.201 541.5ZM573.837 477.231L641.338 342.922C652.904 319.682 674.333 280.91 679.679 257.559C691.491 205.968 667.606 148.777 617.859 127.115C604.005 120.724 585.136 113.78 569.757 116.362C538.043 117.957 510.564 139.545 489.977 162.096C465.987 188.375 453.58 223.079 468.204 257.368C479.966 284.949 492.911 311.895 505.865 338.959L572.354 476.771L573.837 477.231ZM1078.4 360.694L990.208 537.106C1000.38 562.047 1011.3 586.675 1022.95 610.956C1029.95 625.536 1109.39 779.989 1114.09 782.308L1202.1 605.705L1118.99 440.776L1091.68 386.664C1088.7 380.766 1081.66 365.822 1078.4 360.694ZM1262.76 127.395C1232.95 128.511 1209.57 138.403 1189.18 160.134C1162.35 188.734 1152.33 230.527 1167.35 267.306C1176.2 288.97 1186.55 310.387 1196.74 331.48C1215.62 370.223 1234.95 408.743 1254.73 447.031C1257.86 453.111 1264.86 470.064 1267.56 473.207L1269.05 473.654L1270.76 470.654C1301.02 409.15 1333.2 348.886 1361.98 286.584C1375.87 256.528 1382.17 229.094 1370.77 196.663C1362.1 171.735 1346.04 150.242 1321.94 138.426C1305.87 130.481 1280.47 125.104 1262.76 127.395Z"/>
</svg>`;

const fmt = (v) => {
  if (!v || isNaN(v)) return 'R$ 0,00';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtN = (v) => {
  if (!v || isNaN(v)) return '0';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

function calcSetorMetrics(setor) {
  let total = 0, peso = 0, area = 0;
  const gruposPorBase = {};
  (setor.itens || []).forEach(item => {
    const qty = item.quantidade || 0;
    total += qty * ((item.precoMaterial || 0) + (item.precoInstalacao || 0));
    if (item.unidade === 'KG') {
      const desc = (item.descricao || '').toLowerCase();
      if (!desc.includes('projeto')) {
        const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
        if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
      }
    }
    if (item.unidade === 'M2') area += qty;
  });
  peso = Object.values(gruposPorBase).reduce((s, q) => s + q, 0);
  return { total, peso, area, valorKg: peso > 0 ? total / peso : 0, valorM2: area > 0 ? total / area : 0 };
}

/**
 * Gera o HTML completo da proposta comercial
 * v9 - Layout otimizado para print: backgrounds forçados, sem chrome do browser
 */
export function buildPropostaHTML(data) {
  const { project, setores, calculations, paymentConditions, cronograma, escopo } = data;

  const propNum = project?.numeroPropostas || data.propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazoDias = (cronograma?.projeto || 10) + (cronograma?.fabricacao || 30) + (cronograma?.montagem || 15);
  const pagamento = paymentConditions || { assinatura: 10, aprovacao: 5, medicoes: 85 };
  const dataEmissao = project?.dataEmissao ? new Date(project.dataEmissao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const dataValidade = project?.dataValidade ? new Date(project.dataValidade).toLocaleDateString('pt-BR') : new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR');

  // Totals
  let totalWeight = 0, totalArea = 0, custoMaterial = 0, custoInstalacao = 0;
  let totalItens = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      totalItens++;
      const qty = item.quantidade || 0;
      custoMaterial += qty * (item.precoMaterial || 0);
      custoInstalacao += qty * (item.precoInstalacao || 0);
      if (item.unidade === 'KG') {
        const desc = (item.descricao || '').toLowerCase();
        if (!desc.includes('projeto')) {
          const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
          if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
        }
      }
      if (item.unidade === 'M2') totalArea += qty;
    });
    totalWeight += Object.values(gruposPorBase).reduce((s2, q) => s2 + q, 0);
  });

  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;
  const margemVal = custoInstalacao * (margemPct / 100);
  const impostosVal = (custoInstalacao + margemVal) * (impostosPct / 100);
  const totalDireto = custoMaterial + custoInstalacao;
  const precoFinal = calculations?.precoFinal || (totalDireto + margemVal + impostosVal);
  const totalOrcamento = totalDireto;

  // Escopo
  const escopoIncluso = escopo?.incluso || 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.';
  const escopoNaoIncluso = escopo?.naoIncluso || 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.';
  const obrigacoes = cronograma?.obrigacoes || 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.';

  // Fator de markup (margem + impostos) para embutir nos valores
  const markupFactor = totalDireto > 0 ? precoFinal / totalDireto : 1;

  // Agrupar itens por categoria base e aplicar markup
  function agruparItensSetor(setor) {
    const grupos = {};
    (setor.itens || []).forEach(item => {
      const desc = (item.descricao || '').trim();
      const totalItem = (item.quantidade || 0) * ((item.precoMaterial || 0) + (item.precoInstalacao || 0));
      // Agrupar: "Estrutura Metálica - Material/Pintura/etc" → "Estrutura Metálica"
      // "Cobertura - Material" → "Cobertura em Telha Sanduíche"
      let grupo;
      if (desc.toLowerCase().startsWith('estrutura met')) {
        grupo = 'Estrutura Metálica';
      } else if (desc.toLowerCase().startsWith('cobertura')) {
        grupo = 'Cobertura em Telha Sanduíche';
      } else {
        grupo = desc; // Calha, Rufos, etc. ficam como estão
      }
      if (!grupos[grupo]) grupos[grupo] = 0;
      grupos[grupo] += totalItem;
    });
    // Aplicar markup (impostos + lucro embutidos)
    const resultado = [];
    for (const [nome, valor] of Object.entries(grupos)) {
      resultado.push({ nome, valor: valor * markupFactor });
    }
    return resultado;
  }

  // Setores HTML — itens agrupados, sem preço unitário, com impostos embutidos
  const setoresHTML = setores.map((setor, idx) => {
    const gruposSetor = agruparItensSetor(setor);
    const totalSetor = gruposSetor.reduce((s, g) => s + g.valor, 0);
    const m = calcSetorMetrics(setor);

    const rows = gruposSetor.map((g, ri) => {
      return `<tr style="background:${ri % 2 === 0 ? 'white' : '#f8fafb'};">
        <td style="padding:10px 16px;border-bottom:1px solid #e8ecef;font-size:12px;font-weight:500;">${g.nome}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e8ecef;text-align:right;font-weight:700;font-size:12px;">${fmt(g.valor)}</td>
      </tr>`;
    }).join('');

    // Badges: só área (sem peso/kg)
    const badges = [];
    if (m.area > 0) {
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">${fmtN(m.area)} m²</span>`);
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">R$ ${(totalSetor / m.area).toFixed(2).replace('.', ',')}/m²</span>`);
    }

    return `
    <div class="setor-block" style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:18px;">
      <div style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e8ecef;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:#2d8c7f;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${idx+1}</span>
          <span style="font-size:12px;font-weight:700;color:#1e293b;">${setor.nome.toUpperCase()}</span>
        </div>
        <span style="font-size:13px;font-weight:800;color:#1e293b;">${fmt(totalSetor)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f0f2f5;">
          <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">DESCRIÇÃO</th>
          <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;color:#475569;">VALOR</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="background:#f0f9f7;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #2d8c7f;">
        <span style="font-size:11px;font-weight:600;color:#475569;">Total - ${setor.nome.toUpperCase()}</span>
        <span style="font-size:12px;font-weight:800;color:#1e293b;">${fmt(totalSetor)}</span>
      </div>
      ${badges.length > 0 ? `<div style="padding:8px 16px;background:#fafbfc;">${badges.join('')}</div>` : ''}
    </div>`;
  }).join('');

  const projDias = cronograma?.projeto || 10;
  const fabDias = cronograma?.fabricacao || 30;
  const montDias = cronograma?.montagem || 15;

  // Header HTML reutilizável com logo real
  const headerHTML = (showDates) => `
  <div style="background:#2d8c7f;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${MONTEX_LOGO_WHITE_SVG}
      <div style="color:white;">
        <div style="font-size:22px;font-weight:800;letter-spacing:3px;line-height:1.1;">GRUPO MONTEX</div>
        <div style="font-size:10px;letter-spacing:4px;color:rgba(255,255,255,0.8);margin-top:2px;">SOLUÇÕES EM AÇO</div>
      </div>
    </div>
    <div style="text-align:right;color:white;">
      <div style="font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.75);">PROPOSTA COMERCIAL</div>
      <div style="font-size:22px;font-weight:800;">Nº ${propNum}</div>
      ${showDates ? `<div style="font-size:9px;color:rgba(255,255,255,0.7);margin-top:2px;">Emissão: ${dataEmissao} | Validade: ${dataValidade}</div>` : ''}
    </div>
  </div>`;

  // Footer HTML reutilizável
  const footerHTML = (pag) => `
  <div class="page-footer" style="padding:10px 28px;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#64748b;border-top:1px solid #e0e0e0;background:white;margin-top:auto;">
    <div><strong style="color:#2d8c7f;font-size:9px;">GRUPO MONTEX - Soluções em Aço</strong><br/>CNPJ: 00.000.000/0001-00 | contato@grupomontex.com.br | (31) 9 9999-9999</div>
    <div style="text-align:right;">Proposta ${propNum} | ${dataEmissao} | Pág ${pag}</div>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposta Comercial - ${project?.nome || 'Projeto'} - Grupo Montex</title>
<style>
  /* === PRINT: forçar backgrounds e remover chrome do browser === */
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .page {
      page-break-after: always;
      box-shadow: none !important;
      margin: 0 !important;
      border: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
    }
    .page:last-child { page-break-after: avoid; }
    .no-print { display: none !important; }
    .content-wrapper { margin-top: 0 !important; padding-bottom: 0 !important; }
    /* Forçar todos backgrounds a imprimir */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1e293b;
    font-size: 11px;
    line-height: 1.5;
    background: #e8ecef;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    background: white;
    box-shadow: 0 2px 20px rgba(0,0,0,0.12);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page-content {
    flex: 1;
    padding: 20px 28px 20px;
  }
  .page-footer {
    flex-shrink: 0;
  }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #2d8c7f; color: white; padding: 10px 24px; display: flex; gap: 12px; align-items: center; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .toolbar button { padding: 8px 18px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
  .toolbar button:hover { opacity: 0.85; }
  .toolbar .btn-print { background: white; color: #2d8c7f; }
  .toolbar .btn-close { background: rgba(255,255,255,0.15); color: white; margin-left: auto; }
  .toolbar span { font-weight: 700; font-size: 14px; letter-spacing: 1.5px; }
  .content-wrapper { margin-top: 56px; padding-bottom: 20px; }
  @media print {
    .toolbar { display: none !important; }
    .content-wrapper { margin-top: 0 !important; padding-bottom: 0 !important; }
    body { background: white !important; }
  }
  /* Setor blocks: evitar quebra no meio */
  .setor-block {
    page-break-inside: avoid;
  }
</style>
</head>
<body>

<div class="toolbar no-print">
  <span>GRUPO MONTEX — Proposta Comercial</span>
  <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
  <button class="btn-close" onclick="window.close()">Fechar</button>
</div>

<div class="content-wrapper">

<!-- PAGE 1: HEADER + DADOS + ORÇAMENTO -->
<div class="page">
  ${headerHTML(true)}
  <div class="page-content">

    <!-- DADOS DO PROJETO -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">DADOS DO PROJETO</div>
      <div style="padding:14px 20px;">
        <table style="width:100%;font-size:12px;">
          <tr>
            <td style="padding:4px 0;width:50%;"><strong style="color:#64748b;">Projeto:</strong> ${project?.nome || '-'}</td>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Tipo:</strong> ${(project?.tipo || 'Galpão Industrial').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Cliente:</strong> ${project?.cliente || '-'}</td>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Região:</strong> ${(project?.regiao || 'Sudeste').toUpperCase()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ORÇAMENTO POR SETOR -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;display:flex;justify-content:space-between;">
        <span>ORÇAMENTO POR SETOR</span>
        <span>${setores.length} SETOR${setores.length > 1 ? 'ES' : ''}</span>
      </div>
    </div>

    ${setoresHTML}

  </div>
  ${footerHTML(1)}
</div>

<!-- PAGE 2: TOTAL + COMPOSIÇÃO + PAGAMENTO + CRONOGRAMA + ESCOPO -->
<div class="page">
  ${headerHTML(false)}
  <div class="page-content">

    <!-- VALOR TOTAL DA PROPOSTA -->
    <div style="border:2px solid #2d8c7f;border-radius:8px;overflow:hidden;margin-bottom:18px;">
      <div style="background:#e8f5f1;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:14px;font-weight:800;color:#1e293b;letter-spacing:1px;">VALOR TOTAL DA PROPOSTA</span>
        <span style="font-size:24px;font-weight:800;color:#1e293b;">${fmt(precoFinal)}</span>
      </div>
    </div>

    <!-- MÉTRICAS — somente área e preço/m² -->
    <table style="width:100%;border-collapse:separate;border-spacing:10px 0;margin-bottom:20px;margin-left:-10px;">
      <tr>
        <td style="border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;width:50%;">
          <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">ÁREA TOTAL</div>
          <div style="font-size:18px;font-weight:800;color:#1e293b;">${fmtN(totalArea)} m²</div>
        </td>
        <td style="border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;width:50%;">
          <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">PREÇO MÉDIO / M²</div>
          <div style="font-size:18px;font-weight:800;color:#1e293b;">R$ ${totalArea > 0 ? (precoFinal / totalArea).toFixed(2).replace('.', ',') : '0,00'}</div>
        </td>
      </tr>
    </table>

    <!-- CONDIÇÕES DE PAGAMENTO -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">CONDIÇÕES DE PAGAMENTO</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:16px;text-align:center;border-right:1px solid #e0e0e0;width:33.33%;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.assinatura}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Na Assinatura do Contrato</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.assinatura / 100)}</div>
          </td>
          <td style="padding:16px;text-align:center;border-right:1px solid #e0e0e0;width:33.33%;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.aprovacao}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Aprovação do Projeto</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.aprovacao / 100)}</div>
          </td>
          <td style="padding:16px;text-align:center;width:33.33%;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.medicoes}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Medições Mensais</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.medicoes / 100)}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- CRONOGRAMA -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">CRONOGRAMA ESTIMADO (${prazoDias} DIAS)</div>
      <div style="padding:14px 20px;">
        <table style="width:100%;border-collapse:separate;border-spacing:4px 0;">
          <tr>
            <td style="background:#3b82f6;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;width:${Math.round(projDias/prazoDias*100)}%;">Projeto (${projDias}d)</td>
            <td style="background:#f59e0b;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;width:${Math.round(fabDias/prazoDias*100)}%;">Fabricação (${fabDias}d)</td>
            <td style="background:#10b981;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;width:${Math.round(montDias/prazoDias*100)}%;">Montagem (${montDias}d)</td>
          </tr>
        </table>
        <table style="width:100%;margin-top:8px;">
          <tr>
            <td style="font-size:10px;color:#64748b;text-align:left;">Início</td>
            <td style="font-size:10px;color:#64748b;text-align:center;">→</td>
            <td style="font-size:10px;color:#64748b;text-align:center;">→</td>
            <td style="font-size:10px;color:#64748b;text-align:right;">Entrega Final</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ESCOPO -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">ESCOPO DE FORNECIMENTO</div>
      <div style="padding:14px 20px;font-size:11px;line-height:1.7;color:#475569;">
        <p><strong style="color:#1e293b;">INCLUSO:</strong> ${escopoIncluso}</p>
        <p style="margin-top:10px;"><strong style="color:#1e293b;">NÃO INCLUSO:</strong> ${escopoNaoIncluso}</p>
      </div>
    </div>

  </div>
  ${footerHTML(2)}
</div>

<!-- PAGE 3: OBRIGAÇÕES + ASSINATURAS -->
<div class="page">
  ${headerHTML(false)}
  <div class="page-content">

    <!-- OBRIGAÇÕES -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">OBRIGAÇÕES DO CONTRATANTE</div>
      <div style="padding:14px 20px;font-size:11px;line-height:1.7;color:#475569;">
        ${obrigacoes}
      </div>
    </div>

    <!-- ASSINATURAS -->
    <div style="margin-top:60px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#1e293b;margin-bottom:50px;">ASSINATURAS</div>
      <table style="width:100%;margin-top:80px;">
        <tr>
          <td style="width:45%;text-align:center;padding:0 20px;">
            <div style="border-top:2px solid #2d8c7f;padding-top:10px;">
              <div style="font-weight:700;font-size:12px;color:#1e293b;">GRUPO MONTEX</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">Guilherme Maciel Vieira - Diretor Comercial</div>
            </div>
          </td>
          <td style="width:10%;"></td>
          <td style="width:45%;text-align:center;padding:0 20px;">
            <div style="border-top:2px solid #2d8c7f;padding-top:10px;">
              <div style="font-weight:700;font-size:12px;color:#1e293b;">CONTRATANTE</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">${project?.cliente || '___________________________'}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

  </div>
  ${footerHTML(3)}
</div>

</div>
</body>
</html>`;

  return html;
}

/**
 * Abre a proposta HTML em nova janela
 */
export function openPropostaHTML(data) {
  const html = buildPropostaHTML(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
  return html;
}

/**
 * Gera PDF via nova janela + auto-print
 * v9 - Usa @page margin:0 para remover headers/footers do browser
 */
export async function generatePropostaPDF(data) {
  const html = buildPropostaHTML(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    // Aguarda renderização completa (SVGs, fonts)
    setTimeout(() => { win.print(); }, 800);
  }
  return null;
}

/**
 * Gera DOCX baixável
 */
export async function generatePropostaDOCX(data) {
  const html = buildPropostaHTML(data);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  const docxContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
    <style>
      @page { size: A4; margin: 1.5cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; }
      .no-print { display: none; }
      .toolbar { display: none; }
      .content-wrapper { margin-top: 0; }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', docxContent], { type: 'application/msword' });
  return blob;
}
