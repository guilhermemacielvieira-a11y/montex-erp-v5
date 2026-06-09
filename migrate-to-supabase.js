// Script de Migração - Base44 para Supabase
// Execute: node migrate-to-supabase.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// SEGURANÇA: chaves vêm de variáveis de ambiente, nunca hardcoded.
//   export SUPABASE_URL="..."  export SUPABASE_KEY="..."
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://trxbohjcwsogthabairh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_KEY) {
  console.error('ERRO: defina a variável de ambiente SUPABASE_KEY antes de rodar este script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Ler arquivo de export
const exportFile = process.argv[2] || 'montex-export-completo-2026-02-03.json';

async function migrate() {
  console.log('🚀 Iniciando migração para Supabase...\n');

  let data;
  try {
    const fileContent = fs.readFileSync(exportFile, 'utf-8');
    data = JSON.parse(fileContent);
    console.log(`📁 Arquivo carregado: ${exportFile}\n`);
  } catch (err) {
    console.error('❌ Erro ao ler arquivo:', err.message);
    process.exit(1);
  }

  // Migrar Clientes
  if (data.clientes && data.clientes.length > 0) {
    console.log(`📤 Migrando ${data.clientes.length} clientes...`);
    for (const cliente of data.clientes) {
      const { error } = await supabase.from('clientes').insert({
        nome: cliente.nome,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        contato: cliente.contato,
        endereco: cliente.endereco,
        cidade: cliente.cidade,
        estado: cliente.estado,
        segmento: cliente.segmento,
        observacoes: cliente.observacoes,
        created_by: cliente.created_by
      });
      if (error) console.log(`  ⚠️ Erro em cliente ${cliente.nome}:`, error.message);
    }
    console.log('  ✅ Clientes migrados!\n');
  }

  // Migrar Projetos
  if (data.projetos && data.projetos.length > 0) {
    console.log(`📤 Migrando ${data.projetos.length} projetos...`);
    for (const projeto of data.projetos) {
      const { error } = await supabase.from('projetos').insert({
        nome: projeto.nome,
        cliente_nome: projeto.cliente_nome,
        tipo: projeto.tipo,
        status: projeto.status,
        localizacao: projeto.localizacao,
        area: projeto.area,
        peso_estimado: projeto.peso_estimado,
        valor_contrato: projeto.valor_contrato,
        custo_por_kg_fabricacao: projeto.custo_por_kg_fabricacao,
        custo_por_kg_montagem: projeto.custo_por_kg_montagem,
        data_inicio: projeto.data_inicio,
        data_fim_prevista: projeto.data_fim_prevista,
        data_fim_real: projeto.data_fim_real,
        observacoes: projeto.observacoes,
        created_by: projeto.created_by
      });
      if (error) console.log(`  ⚠️ Erro em projeto ${projeto.nome}:`, error.message);
    }
    console.log('  ✅ Projetos migrados!\n');
  }

  // Migrar Orçamentos
  if (data.orcamentos && data.orcamentos.length > 0) {
    console.log(`📤 Migrando ${data.orcamentos.length} orçamentos...`);
    for (const orc of data.orcamentos) {
      const { error } = await supabase.from('orcamentos').insert({
        numero: orc.numero,
        projeto_nome: orc.projeto_nome,
        cliente_nome: orc.cliente_nome,
        cliente_email: orc.cliente_email,
        status: orc.status,
        area: orc.area,
        peso_estimado: orc.peso_estimado,
        custo_estrutura: orc.custo_estrutura,
        custo_montagem: orc.custo_montagem,
        custo_cobertura: orc.custo_cobertura,
        custo_transporte: orc.custo_transporte,
        custo_total: orc.custo_total,
        margem_lucro: orc.margem_lucro,
        valor_venda: orc.valor_venda,
        preco_por_kg: orc.preco_por_kg,
        prazo_fabricacao: orc.prazo_fabricacao,
        prazo_montagem: orc.prazo_montagem,
        validade: orc.validade,
        itens: orc.itens,
        conteudo_proposta: orc.conteudo_proposta,
        created_by: orc.created_by
      });
      if (error) console.log(`  ⚠️ Erro em orçamento ${orc.numero}:`, error.message);
    }
    console.log('  ✅ Orçamentos migrados!\n');
  }

  // Migrar Movimentações
  if (data.movimentacoes && data.movimentacoes.length > 0) {
    console.log(`📤 Migrando ${data.movimentacoes.length} movimentações...`);
    for (const mov of data.movimentacoes) {
      const { error } = await supabase.from('movimentacoes').insert({
        projeto_nome: mov.projeto_nome,
        tipo: mov.tipo,
        categoria: mov.categoria,
        descricao: mov.descricao,
        valor: mov.valor,
        data_movimentacao: mov.data_movimentacao,
        forma_pagamento: mov.forma_pagamento,
        documento_fiscal: mov.documento_fiscal,
        status: mov.status,
        observacoes: mov.observacoes,
        created_by: mov.created_by
      });
      if (error) console.log(`  ⚠️ Erro em movimentação:`, error.message);
    }
    console.log('  ✅ Movimentações migradas!\n');
  }

  // Migrar Itens de Produção (em lotes de 100)
  if (data.itensProducao && data.itensProducao.length > 0) {
    console.log(`📤 Migrando ${data.itensProducao.length} itens de produção...`);
    const batchSize = 100;
    for (let i = 0; i < data.itensProducao.length; i += batchSize) {
      const batch = data.itensProducao.slice(i, i + batchSize).map(item => ({
        projeto_nome: item.projeto_nome,
        codigo: item.codigo,
        nome: item.nome,
        marca: item.marca,
        quantidade: item.quantidade,
        quantidade_produzida: item.quantidade_produzida,
        peso_unitario: item.peso_unitario,
        peso_total: item.peso_total,
        etapa: item.etapa,
        status: item.status,
        percentual_conclusao: item.percentual_conclusao,
        responsavel: item.responsavel,
        data_inicio: item.data_inicio,
        data_fim_prevista: item.data_fim_prevista,
        data_fim_real: item.data_fim_real,
        observacoes: item.observacoes,
        created_by: item.created_by
      }));

      const { error } = await supabase.from('itens_producao').insert(batch);
      if (error) console.log(`  ⚠️ Erro no lote ${i}-${i+batchSize}:`, error.message);
      else console.log(`  📦 Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.itensProducao.length/batchSize)} migrado`);
    }
    console.log('  ✅ Itens de produção migrados!\n');
  }

  // Migrar Custos
  if (data.custos && data.custos.length > 0) {
    console.log(`📤 Migrando ${data.custos.length} custos...`);
    for (const custo of data.custos) {
      const { error } = await supabase.from('custos').insert({
        projeto_nome: custo.projeto_nome,
        tipo: custo.tipo,
        categoria: custo.categoria,
        descricao: custo.descricao,
        valor: custo.valor,
        data_custo: custo.data_custo,
        observacoes: custo.observacoes,
        created_by: custo.created_by
      });
      if (error) console.log(`  ⚠️ Erro em custo:`, error.message);
    }
    console.log('  ✅ Custos migrados!\n');
  }

  console.log('🎉 Migração concluída com sucesso!');
}

migrate().catch(console.error);
