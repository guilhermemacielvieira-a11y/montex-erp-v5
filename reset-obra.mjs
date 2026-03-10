/**
 * MONTEX ERP V5 - Reset Obra para Estado Inicial
 *
 * Este script reseta todos os dados de produção da obra no Supabase:
 * 1. pecas_producao: status_corte → 'aguardando', etapa → 'fabricacao', zera progresso
 * 2. medicoes: remove todas as medições
 * 3. movimentacoes_estoque: remove movimentações de saída (corte)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://trxbohjcwsogthabairh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeGJvaGpjd3NvZ3RoYWJhaXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzU1MTAsImV4cCI6MjA4NTY1MTUxMH0.QzEK1K0vQRpTBOWqNib-Mo1EEbTP6j21J1jWb07urxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetObra() {
  console.log('========================================');
  console.log('MONTEX ERP V5 - RESET OBRA');
  console.log('========================================\n');

  // 1. Buscar estado atual das peças
  console.log('1. Verificando estado atual das peças...');
  const { data: pecas, error: pecasErr } = await supabase
    .from('pecas_producao')
    .select('id, marca, etapa, status_corte, percentual_conclusao, quantidade_produzida')
    .order('marca', { ascending: true });

  if (pecasErr) {
    console.error('Erro ao buscar peças:', pecasErr.message);
    return;
  }

  console.log(`   Total de peças encontradas: ${pecas.length}`);

  // Contar estados atuais
  const etapas = {};
  const statusCorte = {};
  pecas.forEach(p => {
    etapas[p.etapa || 'null'] = (etapas[p.etapa || 'null'] || 0) + 1;
    statusCorte[p.status_corte || 'null'] = (statusCorte[p.status_corte || 'null'] || 0) + 1;
  });
  console.log('   Etapas atuais:', etapas);
  console.log('   Status corte atuais:', statusCorte);

  const pecasComProgresso = pecas.filter(p =>
    (p.percentual_conclusao && p.percentual_conclusao > 0) ||
    (p.quantidade_produzida && p.quantidade_produzida > 0)
  );
  console.log(`   Peças com progresso > 0: ${pecasComProgresso.length}`);

  // 2. Resetar TODAS as peças
  console.log('\n2. Resetando peças para estado inicial...');

  // Resetar em lotes de 100 para evitar timeout
  const batchSize = 100;
  let resetCount = 0;

  for (let i = 0; i < pecas.length; i += batchSize) {
    const batch = pecas.slice(i, i + batchSize);
    const ids = batch.map(p => p.id);

    const { error: updateErr } = await supabase
      .from('pecas_producao')
      .update({
        etapa: 'fabricacao',
        status_corte: 'aguardando',
        status: null,
        data_inicio: null,
        data_fim_real: null,
        responsavel: null,
        equipe_id: null,
        percentual_conclusao: 0,
        quantidade_produzida: 0,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);

    if (updateErr) {
      console.error(`   Erro no lote ${i}-${i + batchSize}:`, updateErr.message);
    } else {
      resetCount += batch.length;
      process.stdout.write(`   Resetadas: ${resetCount}/${pecas.length}\r`);
    }
  }
  console.log(`   ✅ ${resetCount} peças resetadas para etapa='fabricacao', status_corte='aguardando'`);

  // 3. Limpar medições
  console.log('\n3. Limpando medições...');
  const { data: medicoes, error: medErr } = await supabase
    .from('medicoes')
    .select('id')
    .order('id');

  if (medErr) {
    console.log('   ⚠️ Tabela medicoes:', medErr.message);
  } else if (medicoes && medicoes.length > 0) {
    const medIds = medicoes.map(m => m.id);
    const { error: delMedErr } = await supabase
      .from('medicoes')
      .delete()
      .in('id', medIds);

    if (delMedErr) {
      console.error('   Erro ao deletar medições:', delMedErr.message);
    } else {
      console.log(`   ✅ ${medicoes.length} medições removidas`);
    }
  } else {
    console.log('   ✅ Nenhuma medição encontrada (já limpo)');
  }

  // 4. Limpar movimentações de estoque (saídas de corte)
  console.log('\n4. Limpando movimentações de estoque (saídas de corte)...');
  const { data: movs, error: movErr } = await supabase
    .from('movimentacoes_estoque')
    .select('id, tipo')
    .order('id');

  if (movErr) {
    console.log('   ⚠️ Tabela movimentacoes_estoque:', movErr.message);
  } else if (movs && movs.length > 0) {
    const saidasCorte = movs.filter(m => m.tipo === 'saida');
    if (saidasCorte.length > 0) {
      const movIds = saidasCorte.map(m => m.id);
      // Deletar em lotes
      for (let i = 0; i < movIds.length; i += batchSize) {
        const batchIds = movIds.slice(i, i + batchSize);
        const { error: delMovErr } = await supabase
          .from('movimentacoes_estoque')
          .delete()
          .in('id', batchIds);
        if (delMovErr) {
          console.error('   Erro ao deletar movimentações:', delMovErr.message);
        }
      }
      console.log(`   ✅ ${saidasCorte.length} movimentações de saída removidas`);
    } else {
      console.log('   ✅ Nenhuma saída de corte encontrada');
    }
    console.log(`   ℹ️ ${movs.filter(m => m.tipo === 'entrada').length} movimentações de entrada mantidas`);
  } else {
    console.log('   ✅ Nenhuma movimentação encontrada (já limpo)');
  }

  // 5. Verificar estado final
  console.log('\n5. Verificando estado final...');
  const { data: pecasFinal } = await supabase
    .from('pecas_producao')
    .select('id, etapa, status_corte, percentual_conclusao')
    .order('id');

  if (pecasFinal) {
    const etapasFinal = {};
    const statusFinal = {};
    pecasFinal.forEach(p => {
      etapasFinal[p.etapa || 'null'] = (etapasFinal[p.etapa || 'null'] || 0) + 1;
      statusFinal[p.status_corte || 'null'] = (statusFinal[p.status_corte || 'null'] || 0) + 1;
    });
    console.log('   Etapas finais:', etapasFinal);
    console.log('   Status corte finais:', statusFinal);

    const comProgresso = pecasFinal.filter(p => p.percentual_conclusao > 0);
    console.log(`   Peças com progresso > 0: ${comProgresso.length}`);
  }

  console.log('\n========================================');
  console.log('✅ RESET COMPLETO');
  console.log('   Obra: SUPER LUNA - BELO VALE');
  console.log('   Estado: Inicial (sem corte, sem produção, sem medições)');
  console.log('========================================');
}

resetObra().catch(console.error);
