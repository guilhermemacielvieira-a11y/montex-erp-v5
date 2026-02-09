import { base44 } from '@/api/base44Client';
import { isAfter, parseISO } from 'date-fns';

/**
 * Gera notificações automáticas com base no estado dos itens de produção
 */
export async function gerarNotificacoes(item, userEmail = null) {
  const notificacoes = [];
  const agora = new Date();

  try {
    // 1. Verificar atraso previsto
    if (item.data_fim_prevista && item.status !== 'concluido') {
      const dataLimite = parseISO(item.data_fim_prevista);
      if (isAfter(agora, dataLimite) && item.status !== 'concluido') {
        const diasAtrasado = Math.ceil(
          (agora - dataLimite) / (1000 * 60 * 60 * 24)
        );

        notificacoes.push({
          tipo: 'atraso_previsto',
          item_producao_id: item.id,
          item_nome: item.nome,
          projeto_id: item.projeto_id,
          projeto_nome: item.projeto_nome,
          mensagem: `Item ${diasAtrasado} dia(s) atrasado. Prazo previsto: ${new Date(
            item.data_fim_prevista
          ).toLocaleDateString('pt-BR')}`,
          detalhes: {
            data_limite: item.data_fim_prevista,
            percentual_conclusao: item.percentual_conclusao
          },
          data_notificacao: new Date().toISOString(),
          destinatarios: userEmail ? [userEmail] : []
        });
      }
    }

    // 2. Verificar item pausado
    if (item.status === 'pausado') {
      notificacoes.push({
        tipo: 'item_pausado',
        item_producao_id: item.id,
        item_nome: item.nome,
        projeto_id: item.projeto_id,
        projeto_nome: item.projeto_nome,
        mensagem: `Produção pausada em ${item.percentual_conclusao.toFixed(1)}% da conclusão`,
        detalhes: {
          percentual_conclusao: item.percentual_conclusao
        },
        data_notificacao: new Date().toISOString(),
        destinatarios: userEmail ? [userEmail] : []
      });
    }

    // 3. Verificar quantidade baixa (faltam menos de 10% para completar)
    if (
      item.quantidade &&
      item.quantidade_produzida &&
      item.percentual_conclusao < 100 &&
      item.percentual_conclusao >= 90
    ) {
      const quantidadeRestante = item.quantidade - item.quantidade_produzida;

      notificacoes.push({
        tipo: 'quantidade_baixa',
        item_producao_id: item.id,
        item_nome: item.nome,
        projeto_id: item.projeto_id,
        projeto_nome: item.projeto_nome,
        mensagem: `Faltam apenas ${quantidadeRestante} unidade(s) para completar a meta`,
        detalhes: {
          quantidade_restante: quantidadeRestante,
          percentual_conclusao: item.percentual_conclusao
        },
        data_notificacao: new Date().toISOString(),
        destinatarios: userEmail ? [userEmail] : []
      });
    }

    // Criar notificações no banco de dados
    for (const notif of notificacoes) {
      // Verificar se notificação similar já existe (evitar duplicatas)
      const existente = await base44.entities.Notificacao.filter({
        tipo: notif.tipo,
        item_producao_id: notif.item_producao_id,
        lido: false
      });

      if (existente.length === 0) {
        await base44.entities.Notificacao.create(notif);
      }
    }

    return notificacoes;
  } catch (error) {
    console.error('Erro ao gerar notificações:', error);
    return [];
  }
}

/**
 * Registra notificação de item atualizado por administrador
 */
export async function notificarItemAtualizado(
  item,
  adminEmail,
  descricaoMudanca = ''
) {
  try {
    await base44.entities.Notificacao.create({
      tipo: 'item_atualizado',
      item_producao_id: item.id,
      item_nome: item.nome,
      projeto_id: item.projeto_id,
      projeto_nome: item.projeto_nome,
      mensagem: `Item atualizado por administrador. ${descricaoMudanca}`,
      detalhes: {
        atualizado_por: adminEmail,
        percentual_conclusao: item.percentual_conclusao
      },
      data_notificacao: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao notificar atualização:', error);
  }
}

/**
 * Envia notificação por email
 */
export async function enviarEmailNotificacao(notificacao) {
  if (!notificacao.destinatarios || notificacao.destinatarios.length === 0) {
    return;
  }

  try {
    const tiposTexto = {
      atraso_previsto: 'Atraso Previsto',
      item_pausado: 'Produção Pausada',
      quantidade_baixa: 'Quantidade Baixa',
      item_atualizado: 'Item Atualizado'
    };

    const corpo = `
      <h2>${tiposTexto[notificacao.tipo]}</h2>
      <p><strong>Item:</strong> ${notificacao.item_nome}</p>
      <p><strong>Projeto:</strong> ${notificacao.projeto_nome}</p>
      <p><strong>Mensagem:</strong> ${notificacao.mensagem}</p>
      ${
        notificacao.detalhes?.percentual_conclusao !== undefined
          ? `<p><strong>Progresso:</strong> ${notificacao.detalhes.percentual_conclusao.toFixed(1)}%</p>`
          : ''
      }
    `;

    for (const email of notificacao.destinatarios) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `MONTEX - ${tiposTexto[notificacao.tipo]}: ${notificacao.item_nome}`,
        body: corpo
      });
    }

    // Marcar email como enviado
    await base44.entities.Notificacao.update(notificacao.id, {
      email_enviado: true
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
  }
}