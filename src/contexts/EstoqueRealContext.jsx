/**
 * MONTEX ERP Premium - Estoque Real Context
 *
 * Gerencia o estado do estoque real em tempo real com integração
 * entre módulos (Estoque, Kanban Corte, etc.)
 *
 * Funcionalidades:
 * - Dedução automática de peso ao iniciar corte
 * - Registro de movimentações
 * - Atualização em tempo real dos KPIs
 * - Sincronização entre páginas
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useState } from 'react';
import { movEstoqueApi, estoqueApi, isSupabaseConfigured, supabase } from '@/api/supabaseClient';

// ========================================
// DADOS INICIAIS DE ESTOQUE REAL
// ========================================

// Dados reais de estoque - SUPER LUNA BELO VALE
// Importado de: LANCAMENTO PEDIDO X ENTREGA SUPER LUNA BELO VALE.xlsx
const ESTOQUE_REAL_INICIAL = [
  // PERFIS W
  { id: 'ER001', codigo: 'W310X79-6M', nome: 'Perfil W310X79 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 5214, pedido: 5214, comprado: 5214, falta: 0, minimo: 2000, maximo: 10000, localizacao: 'PÁTIO-B1', preco: 8.32, ultimaEntrada: '2026-01-26', ultimaSaida: '' },
  { id: 'ER002', codigo: 'W410X53-6M', nome: 'Perfil W410X53 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 5724, pedido: 5724, comprado: 5724, falta: 0, minimo: 2000, maximo: 12000, localizacao: 'PÁTIO-B1', preco: 7.69, ultimaEntrada: '2026-01-26', ultimaSaida: '' },
  { id: 'ER003', codigo: 'W250X25.3-12M', nome: 'Perfil W250X25.3 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 7286.4, pedido: 607, comprado: 7286.4, falta: 6679.4, minimo: 500, maximo: 10000, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-28', ultimaSaida: '' },
  { id: 'ER004', codigo: 'W150X22.5-6M', nome: 'Perfil W150X22.5 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 675, pedido: 675, comprado: 675, falta: 0, minimo: 300, maximo: 2000, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-25', ultimaSaida: '' },
  { id: 'ER005', codigo: 'W530X66-12M', nome: 'Perfil W530X66 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 792, pedido: 792, comprado: 792, falta: 0, minimo: 400, maximo: 2000, localizacao: 'PÁTIO-B3', preco: 7.69, ultimaEntrada: '2026-01-27', ultimaSaida: '' },
  { id: 'ER006', codigo: 'W410X38.8-12M', nome: 'Perfil W410X38.8 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 12571, pedido: 12571, comprado: 12571, falta: 0, minimo: 5000, maximo: 20000, localizacao: 'PÁTIO-B1', preco: 7.69, ultimaEntrada: '2026-01-29', ultimaSaida: '' },
  { id: 'ER007', codigo: 'W200X35.9-6M', nome: 'Perfil W200X35.9 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 215.4, pedido: 215.4, comprado: 215.4, falta: 0, minimo: 100, maximo: 1000, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-24', ultimaSaida: '' },
  { id: 'ER008', codigo: 'W200X35.9-12M', nome: 'Perfil W200X35.9 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 3015.6, pedido: 3015.6, comprado: 3015.6, falta: 0, minimo: 1500, maximo: 6000, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-28', ultimaSaida: '' },
  { id: 'ER009', codigo: 'W200X19.3-12M', nome: 'Perfil W200X19.3 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 3705.6, pedido: 3705, comprado: 3705.6, falta: 0.6, minimo: 1500, maximo: 6000, localizacao: 'PÁTIO-B3', preco: 7.69, ultimaEntrada: '2026-01-30', ultimaSaida: '' },
  { id: 'ER010', codigo: 'W410X38.8-6M', nome: 'Perfil W410X38.8 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 232.8, pedido: 232.8, comprado: 232.8, falta: 0, minimo: 100, maximo: 1000, localizacao: 'PÁTIO-B1', preco: 7.69, ultimaEntrada: '2026-01-26', ultimaSaida: '' },
  { id: 'ER011', codigo: 'W150X13-12M', nome: 'Perfil W150X13 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 468, pedido: 468, comprado: 468, falta: 0, minimo: 200, maximo: 1500, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-27', ultimaSaida: '' },
  { id: 'ER012', codigo: 'W310X38.7-12M', nome: 'Perfil W310X38.7 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 2786.4, pedido: 0, comprado: 2786.4, falta: 2786.4, minimo: 1000, maximo: 5000, localizacao: 'PÁTIO-B3', preco: 7.69, ultimaEntrada: '2026-01-31', ultimaSaida: '' },
  { id: 'ER013', codigo: 'W410X53-12M', nome: 'Perfil W410X53 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 12720, pedido: 0, comprado: 12720, falta: 12720, minimo: 5000, maximo: 20000, localizacao: 'PÁTIO-B1', preco: 7.69, ultimaEntrada: '2026-02-01', ultimaSaida: '' },
  { id: 'ER030', codigo: 'W200X26.6-12M', nome: 'Perfil W200X26.6 12M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 37.3, pedido: 37.3, comprado: 37.3, falta: 0, minimo: 20, maximo: 200, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-30', ultimaSaida: '' },
  { id: 'ER031', codigo: 'W200X15-6M', nome: 'Perfil W200X15 6M - A572', categoria: 'perfis', unidade: 'kg', quantidade: 19.8, pedido: 19.8, comprado: 19.8, falta: 0, minimo: 10, maximo: 100, localizacao: 'PÁTIO-B2', preco: 7.69, ultimaEntrada: '2026-01-30', ultimaSaida: '' },
  // PERFIS HP
  { id: 'ER014', codigo: 'HP310X79-12M', nome: 'Perfil HP310X79 12M - A572', categoria: 'perfis_hp', unidade: 'kg', quantidade: 1896, pedido: 1896, comprado: 1896, falta: 0, minimo: 800, maximo: 4000, localizacao: 'PÁTIO-B4', preco: 8.32, ultimaEntrada: '2026-01-29', ultimaSaida: '' },
  // BARRAS REDONDAS
  { id: 'ER015', codigo: 'BARRED-1-A36', nome: 'Barra Redonda 1" - A36', categoria: 'barras', unidade: 'kg', quantidade: 430, pedido: 430, comprado: 430, falta: 0, minimo: 200, maximo: 1000, localizacao: 'PÁTIO-D1', preco: 7.04, ultimaEntrada: '2026-01-25', ultimaSaida: '' },
  { id: 'ER016', codigo: 'BARRED-5/8-A36', nome: 'Barra Redonda 5/8" - A36', categoria: 'barras', unidade: 'kg', quantidade: 1180, pedido: 1180, comprado: 1180, falta: 0, minimo: 500, maximo: 2500, localizacao: 'PÁTIO-D1', preco: 7.04, ultimaEntrada: '2026-01-26', ultimaSaida: '' },
  { id: 'ER017', codigo: 'BARRED-1/2-GG', nome: 'Barra Redonda 1/2" GG', categoria: 'barras', unidade: 'kg', quantidade: 606.532, pedido: 606.532, comprado: 606.532, falta: 0, minimo: 300, maximo: 1500, localizacao: 'PÁTIO-D1', preco: 7.04, ultimaEntrada: '2026-01-27', ultimaSaida: '' },
  { id: 'ER029', codigo: 'BARRED-3/4-A36', nome: 'Barra Redonda 3/4" - A36', categoria: 'barras', unidade: 'kg', quantidade: 64.3, pedido: 64.3, comprado: 64.3, falta: 0, minimo: 30, maximo: 300, localizacao: 'PÁTIO-D1', preco: 7.04, ultimaEntrada: '2026-01-25', ultimaSaida: '' },
  // CANTONEIRAS
  { id: 'ER018', codigo: 'CANT-1.5X1/8', nome: 'Cantoneira 1.1/2" X 1/8" - A36', categoria: 'cantoneiras', unidade: 'kg', quantidade: 131.76, pedido: 131.76, comprado: 131.76, falta: 0, minimo: 50, maximo: 500, localizacao: 'PÁTIO-C1', preco: 7.04, ultimaEntrada: '2026-01-24', ultimaSaida: '' },
  { id: 'ER019', codigo: 'CANT-3X3/8-6M', nome: 'Cantoneira 3" X 3/8" 6M - A36', categoria: 'cantoneiras', unidade: 'kg', quantidade: 64.26, pedido: 64.26, comprado: 64.26, falta: 0, minimo: 30, maximo: 300, localizacao: 'PÁTIO-C1', preco: 7.74, ultimaEntrada: '2026-01-25', ultimaSaida: '' },
  { id: 'ER020', codigo: 'CANT-2X1/4-12M', nome: 'Cantoneira 2" X 1/4" 12M - A36', categoria: 'cantoneiras', unidade: 'kg', quantidade: 2730.24, pedido: 2730.24, comprado: 2730.24, falta: 0, minimo: 1000, maximo: 5000, localizacao: 'PÁTIO-C2', preco: 7.04, ultimaEntrada: '2026-01-28', ultimaSaida: '' },
  // CHAPAS
  { id: 'ER021', codigo: 'CH-22.4X2550X3000', nome: 'Chapa A36 22.4mm 2550x3000', categoria: 'chapas', unidade: 'kg', quantidade: 2742, pedido: 2722.5, comprado: 2742, falta: 19.5, minimo: 1000, maximo: 5000, localizacao: 'PÁTIO-A1', preco: 7.27, ultimaEntrada: '2026-01-30', ultimaSaida: '' },
  { id: 'ER022', codigo: 'CH-12.5X1200X3000', nome: 'Chapa A36 12.5mm 1200x3000', categoria: 'chapas', unidade: 'kg', quantidade: 720, pedido: 730, comprado: 720, falta: -10, minimo: 300, maximo: 2000, localizacao: 'PÁTIO-A1', preco: 5.25, ultimaEntrada: '2026-01-28', ultimaSaida: '' },
  { id: 'ER023', codigo: 'CH-9.5X1200X6000', nome: 'Chapa A36 9.5mm 1200x6000', categoria: 'chapas', unidade: 'kg', quantidade: 1094, pedido: 1090, comprado: 1094, falta: 4, minimo: 500, maximo: 2500, localizacao: 'PÁTIO-A2', preco: 5.25, ultimaEntrada: '2026-01-29', ultimaSaida: '' },
  { id: 'ER024', codigo: 'CH-6.3X1200X6000', nome: 'Chapa A36 6.3mm 1200x6000', categoria: 'chapas', unidade: 'kg', quantidade: 1728, pedido: 1830, comprado: 1728, falta: -102, minimo: 800, maximo: 3500, localizacao: 'PÁTIO-A2', preco: 5.25, ultimaEntrada: '2026-01-27', ultimaSaida: '' },
  { id: 'ER025', codigo: 'CH-4.75X1200X3000', nome: 'Chapa A36 4.75mm 1200x3000', categoria: 'chapas', unidade: 'kg', quantidade: 685, pedido: 685, comprado: 685, falta: 0, minimo: 300, maximo: 1500, localizacao: 'PÁTIO-A3', preco: 5.25, ultimaEntrada: '2026-01-26', ultimaSaida: '' },
  { id: 'ER026', codigo: 'CH-16X1200X3000', nome: 'Chapa A36 16mm 1200x3000', categoria: 'chapas', unidade: 'kg', quantidade: 1356, pedido: 1410, comprado: 1356, falta: -54, minimo: 600, maximo: 3000, localizacao: 'PÁTIO-A1', preco: 5.25, ultimaEntrada: '2026-01-28', ultimaSaida: '' },
  { id: 'ER027', codigo: 'CH-8X1500X6000', nome: 'Chapa A36 8mm 1500x6000', categoria: 'chapas', unidade: 'kg', quantidade: 1728, pedido: 1720, comprado: 1728, falta: 8, minimo: 800, maximo: 3500, localizacao: 'PÁTIO-A2', preco: 5.25, ultimaEntrada: '2026-01-30', ultimaSaida: '' },
  { id: 'ER028', codigo: 'CH-LQ-8X1000X2000', nome: 'Chapa LQ 8mm 1000x2000', categoria: 'chapas', unidade: 'kg', quantidade: 128, pedido: 0, comprado: 128, falta: 128, minimo: 50, maximo: 500, localizacao: 'PÁTIO-A3', preco: 5.50, ultimaEntrada: '2026-02-01', ultimaSaida: '' },
  { id: 'ER032', codigo: 'CH-2X1200X3000', nome: 'Chapa GG 2mm 1200x3000', categoria: 'chapas', unidade: 'kg', quantidade: 4721.3, pedido: 4721.3, comprado: 4721.3, falta: 0, minimo: 2000, maximo: 8000, localizacao: 'PÁTIO-A3', preco: 5.50, ultimaEntrada: '2026-01-29', ultimaSaida: '' },
];

// Movimentações iniciais
const MOVIMENTACOES_INICIAL = [
  { id: 'MOV001', data: '2026-01-26 08:30', tipo: 'entrada', materialId: 'ER001', quantidade: 5214, obra: '', setor: 'Recebimento', usuario: 'João Santos', nf: 'NF-78541' },
  { id: 'MOV002', data: '2026-01-26 08:45', tipo: 'entrada', materialId: 'ER002', quantidade: 5724, obra: '', setor: 'Recebimento', usuario: 'João Santos', nf: 'NF-78541' },
  { id: 'MOV003', data: '2026-01-28 09:15', tipo: 'entrada', materialId: 'ER003', quantidade: 7286.4, obra: '', setor: 'Recebimento', usuario: 'João Santos', nf: 'NF-78620' },
  { id: 'MOV004', data: '2026-01-29 10:00', tipo: 'entrada', materialId: 'ER006', quantidade: 12571, obra: '', setor: 'Recebimento', usuario: 'Maria Costa', nf: 'NF-78695' },
  { id: 'MOV005', data: '2026-01-30 14:30', tipo: 'entrada', materialId: 'ER021', quantidade: 2742, obra: '', setor: 'Recebimento', usuario: 'João Santos', nf: 'NF-78750' },
  { id: 'MOV006', data: '2026-02-01 08:00', tipo: 'entrada', materialId: 'ER013', quantidade: 12720, obra: '', setor: 'Recebimento', usuario: 'Maria Costa', nf: 'NF-78812' },
];

// ========================================
// TIPOS DE AÇÕES
// ========================================

const ACTIONS = {
  // Estoque
  SET_ESTOQUE: 'SET_ESTOQUE',
  UPDATE_ITEM_ESTOQUE: 'UPDATE_ITEM_ESTOQUE',
  DEDUZIR_ESTOQUE: 'DEDUZIR_ESTOQUE',
  ADICIONAR_ESTOQUE: 'ADICIONAR_ESTOQUE',

  // Movimentações
  ADD_MOVIMENTACAO: 'ADD_MOVIMENTACAO',

  // Consumo por Corte
  REGISTRAR_CONSUMO_CORTE: 'REGISTRAR_CONSUMO_CORTE',

  // Importar Previsto
  IMPORTAR_PREVISTO: 'IMPORTAR_PREVISTO',

  // Reconciliação retroativa - abater peças já cortadas
  RECONCILIAR_CORTE: 'RECONCILIAR_CORTE',
};

// ========================================
// ESTADO INICIAL
// ========================================

const initialState = {
  estoqueReal: ESTOQUE_REAL_INICIAL,
  movimentacoes: MOVIMENTACOES_INICIAL,

  // Consumo registrado pelo corte
  consumoCorte: [],

  // Totais de consumo do dia
  consumoHoje: {
    peso: 0,
    itens: 0,
    pecas: 0,
  },
};

// ========================================
// REDUCER
// ========================================

function estoqueRealReducer(state, action) {
  switch (action.type) {

    case ACTIONS.SET_ESTOQUE:
      return { ...state, estoqueReal: action.payload };

    case ACTIONS.UPDATE_ITEM_ESTOQUE:
      return {
        ...state,
        estoqueReal: state.estoqueReal.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.data }
            : item
        )
      };

    // Deduzir peso do estoque (saída para corte)
    case ACTIONS.DEDUZIR_ESTOQUE: {
      const { perfil, peso, obraId, pecaId, motivo, comprimento } = action.payload;
      const agora = new Date().toISOString();
      const perfilUpper = (perfil || '').toUpperCase();

      // ====================================================
      // MATCHING INTELIGENTE: perfil do corte → item estoque
      // ====================================================
      // Perfis W/HP: 'W410X53' → 'W410X53-6M' ou 'W410X53-12M'
      // Chapas:      'CH16X300' → 'CH-16X...'
      // Barras:      'FERRO Ø1' → 'BARRED-1-A36'
      // Cantoneiras: 'L64X64X6.4' → 'CANT-...'
      // ====================================================

      function findBestMatch(items) {
        // 1. PERFIS W e HP - match exato pelo código do perfil
        if (perfilUpper.startsWith('W') || perfilUpper.startsWith('HP')) {
          const matches = items.filter(item => {
            const codPrefix = (item.codigo || '').split('-')[0].toUpperCase();
            return codPrefix === perfilUpper;
          });
          if (matches.length === 1) return matches[0];
          if (matches.length > 1) {
            // Peça curta (≤6500mm) → prefere barra 6M; longa → 12M
            const comp = comprimento || 0;
            if (comp > 0 && comp <= 6500) {
              return matches.find(m => m.codigo.includes('6M')) || matches[0];
            }
            return matches.find(m => m.codigo.includes('12M')) || matches[0];
          }
        }

        // 2. CHAPAS - extrair espessura do perfil (CH16X... → 16mm)
        if (perfilUpper.startsWith('CH')) {
          const espMatch = perfilUpper.match(/^CH([\d.]+)/);
          if (espMatch) {
            const espessura = parseFloat(espMatch[1]);
            const chapas = items.filter(i => i.categoria === 'chapas');

            // Match exato: CH-16X... contém '-16X'
            const exato = chapas.find(item =>
              (item.codigo || '').includes('-' + espMatch[1] + 'X')
            );
            if (exato) return exato;

            // Match por tolerância (±0.35mm) para espessuras nominais
            // Ex: 4.8mm ≈ 4.75mm (3/16"), 6.0mm ≈ 6.3mm (1/4")
            const tolerancia = chapas.find(item => {
              const codMatch = (item.codigo || '').match(/CH-(?:LQ-)?([\d.]+)X/);
              if (!codMatch) return false;
              const espEstoque = parseFloat(codMatch[1]);
              return Math.abs(espEstoque - espessura) <= 0.35;
            });
            if (tolerancia) return tolerancia;

            // Match no nome
            return chapas.find(item =>
              (item.nome || '').includes(espMatch[1] + 'mm')
            );
          }
        }

        // 3. BARRAS REDONDAS - FERRO Ø1 → BARRED-1, FERRO Ø5/8 → BARRED-5/8
        if (perfilUpper.includes('FERRO')) {
          const diaMatch = perfilUpper.match(/Ø([\d/]+)/);
          if (diaMatch) {
            const dia = diaMatch[1];
            const barras = items.filter(i => i.categoria === 'barras');
            // Match por código: BARRED-1-A36, BARRED-5/8-A36, BARRED-1/2-GG
            const barraMatch = barras.find(item => {
              const cod = (item.codigo || '');
              return cod.includes('-' + dia + '-') || cod.endsWith('-' + dia);
            });
            if (barraMatch) return barraMatch;
            // Fallback: match no nome (1", 5/8", 3/4")
            return barras.find(item =>
              (item.nome || '').includes(dia + '"')
            );
          }
        }

        // 4. CANTONEIRAS - L64X64X6.4 → match por dimensão aproximada
        if (perfilUpper.startsWith('L')) {
          const dimMatch = perfilUpper.match(/^L([\d.]+)X([\d.]+)X([\d.]+)/);
          if (dimMatch) {
            const lado = parseFloat(dimMatch[1]);
            // L38 ≈ 1.5", L64 ≈ 2.5"→ 2", L76 ≈ 3"
            if (lado <= 45) return items.find(i => i.id === 'ER018'); // Cant 1.1/2"
            if (lado <= 70) return items.find(i => i.id === 'ER020'); // Cant 2"X1/4"
            return items.find(i => i.id === 'ER019'); // Cant 3"X3/8"
          }
          // Fallback: primeira cantoneira disponível
          return items.find(item => item.categoria === 'cantoneiras');
        }

        // 5. Perfis NÃO no estoque (UE, US, TUBO) → sem dedução
        if (perfilUpper.startsWith('UE') || perfilUpper.startsWith('US') ||
            perfilUpper.startsWith('TUBO')) {
          return null; // Esses materiais não estão no estoque de aço principal
        }

        // 6. Fallback genérico - tentar match parcial
        return items.find(item => {
          const cod = (item.codigo || '').toUpperCase();
          return cod.startsWith(perfilUpper.split('X')[0]);
        }) || null;
      }

      const itemEncontrado = findBestMatch(state.estoqueReal);

      // Se não encontrou match, não deduzir (material fora do estoque controlado)
      let novoEstoque = state.estoqueReal;
      if (itemEncontrado) {
        novoEstoque = state.estoqueReal.map(item => {
          if (item.id === itemEncontrado.id) {
            return {
              ...item,
              quantidade: Math.max(0, item.quantidade - peso),
              ultimaSaida: agora.split('T')[0]
            };
          }
          return item;
        });
      }

      // Criar movimentação de saída
      const novaMovimentacao = {
        id: `MOV-${Date.now()}`,
        data: agora.replace('T', ' ').slice(0, 16),
        tipo: 'saida',
        materialId: itemEncontrado?.id || 'GENERICO',
        quantidade: peso,
        obra: obraId || 'CORTE',
        setor: 'Corte',
        usuario: 'Sistema Kanban',
        nf: '',
        motivo: motivo || 'Entrada em Corte',
        pecaId: pecaId,
        perfil: perfil
      };

      // Registrar consumo do corte
      const novoConsumoCorte = {
        id: `CONS-${Date.now()}`,
        data: agora,
        perfil: perfil,
        peso: peso,
        pecaId: pecaId,
        obraId: obraId,
        materialId: itemEncontrado?.id,
        materialCodigo: itemEncontrado?.codigo
      };

      // Atualizar consumo do dia
      const hoje = new Date().toISOString().split('T')[0];
      const consumoHojeAtualizado = { ...state.consumoHoje };

      // Verificar se é do mesmo dia
      if (!state.ultimaDataConsumo || state.ultimaDataConsumo !== hoje) {
        consumoHojeAtualizado.peso = peso;
        consumoHojeAtualizado.itens = 1;
        consumoHojeAtualizado.pecas = 1;
      } else {
        consumoHojeAtualizado.peso += peso;
        consumoHojeAtualizado.itens += 1;
        consumoHojeAtualizado.pecas += 1;
      }

      return {
        ...state,
        estoqueReal: novoEstoque,
        movimentacoes: [novaMovimentacao, ...state.movimentacoes],
        consumoCorte: [novoConsumoCorte, ...state.consumoCorte],
        consumoHoje: consumoHojeAtualizado,
        ultimaDataConsumo: hoje
      };
    }

    // Adicionar peso ao estoque (entrada)
    case ACTIONS.ADICIONAR_ESTOQUE: {
      const { itemId, quantidade, nf, setor, usuario } = action.payload;
      const agora = new Date().toISOString();

      const novoEstoque = state.estoqueReal.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantidade: item.quantidade + quantidade,
              ultimaEntrada: agora.split('T')[0]
            }
          : item
      );

      const novaMovimentacao = {
        id: `MOV-${Date.now()}`,
        data: agora.replace('T', ' ').slice(0, 16),
        tipo: 'entrada',
        materialId: itemId,
        quantidade: quantidade,
        obra: '',
        setor: setor || 'Recebimento',
        usuario: usuario || 'Usuário',
        nf: nf || ''
      };

      return {
        ...state,
        estoqueReal: novoEstoque,
        movimentacoes: [novaMovimentacao, ...state.movimentacoes]
      };
    }

    // Adicionar movimentação
    case ACTIONS.ADD_MOVIMENTACAO:
      return {
        ...state,
        movimentacoes: [action.payload, ...state.movimentacoes]
      };

    // Registrar consumo específico do corte
    case ACTIONS.REGISTRAR_CONSUMO_CORTE:
      return {
        ...state,
        consumoCorte: [action.payload, ...state.consumoCorte]
      };

    // Importar itens previstos (atualizar campo pedido/previsto)
    case ACTIONS.IMPORTAR_PREVISTO: {
      const itensImportados = action.payload;

      const novoEstoque = state.estoqueReal.map(item => {
        const itemPrevisto = itensImportados.find(i =>
          i.codigo === item.codigo ||
          i.codigo?.includes(item.codigo?.split('-')[0])
        );

        if (itemPrevisto) {
          return {
            ...item,
            pedido: itemPrevisto.previsto,
            falta: itemPrevisto.previsto - item.comprado
          };
        }
        return item;
      });

      // Adicionar novos itens que não existiam
      itensImportados.forEach(itemPrevisto => {
        const existe = novoEstoque.find(e =>
          e.codigo === itemPrevisto.codigo ||
          e.codigo?.includes(itemPrevisto.codigo?.split('-')[0])
        );

        if (!existe) {
          novoEstoque.push({
            ...itemPrevisto,
            id: itemPrevisto.id,
            pedido: itemPrevisto.previsto
          });
        }
      });

      return {
        ...state,
        estoqueReal: novoEstoque
      };
    }

    // Reconciliação retroativa: abater peças já cortadas que não foram deduzidas
    case ACTIONS.RECONCILIAR_CORTE: {
      const { pecasJaCortadas } = action.payload;
      const agora = new Date().toISOString();

      // IDs de peças já registradas no consumoCorte (evitar duplicatas)
      const idsJaConsumidos = new Set(state.consumoCorte.map(c => c.pecaId));

      // Filtrar apenas peças que ainda não foram processadas
      const pecasPendentes = pecasJaCortadas.filter(p => !idsJaConsumidos.has(p.pecaId));

      if (pecasPendentes.length === 0) {
        return state; // Nada a reconciliar
      }

      let estoqueAtualizado = [...state.estoqueReal];
      const novasMovimentacoes = [];
      const novosConsumos = [];

      // Reutilizar a mesma lógica de findBestMatch para cada peça
      pecasPendentes.forEach(peca => {
        const perfilUpper = (peca.perfil || '').toUpperCase();

        // findBestMatch inline (mesma lógica do DEDUZIR_ESTOQUE)
        function findMatch(items) {
          if (perfilUpper.startsWith('W') || perfilUpper.startsWith('HP')) {
            const matches = items.filter(item => {
              const codPrefix = (item.codigo || '').split('-')[0].toUpperCase();
              return codPrefix === perfilUpper;
            });
            if (matches.length === 1) return matches[0];
            if (matches.length > 1) {
              const comp = peca.comprimento || 0;
              if (comp > 0 && comp <= 6500) {
                return matches.find(m => m.codigo.includes('6M')) || matches[0];
              }
              return matches.find(m => m.codigo.includes('12M')) || matches[0];
            }
          }
          if (perfilUpper.startsWith('CH')) {
            const espMatch = perfilUpper.match(/^CH([\d.]+)/);
            if (espMatch) {
              const espessura = parseFloat(espMatch[1]);
              const chapas = items.filter(i => i.categoria === 'chapas');
              const exato = chapas.find(item => (item.codigo || '').includes('-' + espMatch[1] + 'X'));
              if (exato) return exato;
              const tolerancia = chapas.find(item => {
                const codMatch = (item.codigo || '').match(/CH-(?:LQ-)?([\d.]+)X/);
                if (!codMatch) return false;
                return Math.abs(parseFloat(codMatch[1]) - espessura) <= 0.35;
              });
              if (tolerancia) return tolerancia;
              return chapas.find(item => (item.nome || '').includes(espMatch[1] + 'mm'));
            }
          }
          if (perfilUpper.includes('FERRO')) {
            const diaMatch = perfilUpper.match(/Ø([\d/]+)/);
            if (diaMatch) {
              const dia = diaMatch[1];
              const barras = items.filter(i => i.categoria === 'barras');
              const barraMatch = barras.find(item => {
                const cod = (item.codigo || '');
                return cod.includes('-' + dia + '-') || cod.endsWith('-' + dia);
              });
              if (barraMatch) return barraMatch;
              return barras.find(item => (item.nome || '').includes(dia + '"'));
            }
          }
          if (perfilUpper.startsWith('L')) {
            const dimMatch = perfilUpper.match(/^L([\d.]+)X([\d.]+)X([\d.]+)/);
            if (dimMatch) {
              const lado = parseFloat(dimMatch[1]);
              if (lado <= 45) return items.find(i => i.id === 'ER018');
              if (lado <= 70) return items.find(i => i.id === 'ER020');
              return items.find(i => i.id === 'ER019');
            }
            return items.find(item => item.categoria === 'cantoneiras');
          }
          if (perfilUpper.startsWith('UE') || perfilUpper.startsWith('US') || perfilUpper.startsWith('TUBO')) {
            return null;
          }
          return items.find(item => {
            const cod = (item.codigo || '').toUpperCase();
            return cod.startsWith(perfilUpper.split('X')[0]);
          }) || null;
        }

        const itemEncontrado = findMatch(estoqueAtualizado);

        if (itemEncontrado) {
          estoqueAtualizado = estoqueAtualizado.map(item => {
            if (item.id === itemEncontrado.id) {
              return {
                ...item,
                quantidade: Math.max(0, item.quantidade - peca.peso),
                ultimaSaida: agora.split('T')[0]
              };
            }
            return item;
          });
        }

        novasMovimentacoes.push({
          id: `MOV-RECONC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          data: agora.replace('T', ' ').slice(0, 16),
          tipo: 'saida',
          materialId: itemEncontrado?.id || 'GENERICO',
          quantidade: peca.peso,
          obra: peca.obraId || 'CORTE',
          setor: 'Corte',
          usuario: 'Reconciliação Retroativa',
          nf: '',
          motivo: `[RECONCILIAÇÃO] ${peca.motivo || 'Corte já executado'}`,
          pecaId: peca.pecaId,
          perfil: peca.perfil
        });

        novosConsumos.push({
          id: `CONS-RECONC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          data: agora,
          perfil: peca.perfil,
          peso: peca.peso,
          pecaId: peca.pecaId,
          obraId: peca.obraId,
          materialId: itemEncontrado?.id,
          materialCodigo: itemEncontrado?.codigo
        });
      });

      console.log(`[EstoqueReal] Reconciliação retroativa: ${pecasPendentes.length} peças, ${novasMovimentacoes.length} movimentações registradas`);

      return {
        ...state,
        estoqueReal: estoqueAtualizado,
        movimentacoes: [...novasMovimentacoes, ...state.movimentacoes],
        consumoCorte: [...novosConsumos, ...state.consumoCorte]
      };
    }

    default:
      return state;
  }
}

// ========================================
// CONTEXTO
// ========================================

const EstoqueRealContext = createContext(null);

export function EstoqueRealProvider({ children }) {
  const [state, dispatch] = useReducer(estoqueRealReducer, initialState);
  const [supabaseSync, setSupabaseSync] = useState(false);

  // ===== SINCRONIZAÇÃO SUPABASE =====
  // Carrega estoque e movimentações do Supabase na inicialização (se disponível)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    async function syncFromSupabase() {
      try {
        // Carregar estoque do Supabase (com todos os campos incluindo categoria, pedido, etc.)
        const estoqueData = await estoqueApi.getAll();
        if (estoqueData && estoqueData.length > 0) {
          // Mapear campos snake_case do Supabase → camelCase do front
          const estoqueFormatado = estoqueData.map(item => ({
            id: item.id,
            codigo: item.codigo || '',
            nome: item.nome || item.descricao || '',
            categoria: item.categoria || item.tipo || '',
            unidade: item.unidade || 'kg',
            quantidade: parseFloat(item.quantidade) || 0,
            pedido: parseFloat(item.pedido) || 0,
            comprado: parseFloat(item.comprado) || 0,
            falta: parseFloat(item.falta) || 0,
            minimo: parseFloat(item.minimo) || 0,
            maximo: parseFloat(item.maximo) || 0,
            preco: parseFloat(item.preco) || 0,
            localizacao: item.localizacao || '',
            ultimaEntrada: item.ultima_entrada || '',
            ultimaSaida: item.ultima_saida || '',
          }));
          dispatch({ type: ACTIONS.SET_ESTOQUE, payload: estoqueFormatado });
        }

        // Carregar movimentações recentes
        const movData = await movEstoqueApi.getAll();
        if (movData && movData.length > 0) {
          const movFormatadas = movData.map(m => ({
            id: m.id,
            data: m.data || m.created_at,
            tipo: m.tipo,
            materialId: m.item_id || m.material_perfil,
            quantidade: parseFloat(m.quantidade) || 0,
            obra: m.obra_id || '',
            setor: m.setor || '',
            usuario: m.usuario || m.responsavel || '',
            nf: m.nota_fiscal || '',
            motivo: m.motivo || '',
            pecaId: m.peca_id || '',
            perfil: m.material_perfil || ''
          }));
          // Merge com movimentações existentes (evitar duplicatas)
          movFormatadas.forEach(mov => {
            dispatch({ type: ACTIONS.ADD_MOVIMENTACAO, payload: mov });
          });
        }

        setSupabaseSync(true);
        console.log('[EstoqueReal] Sincronizado com Supabase -', estoqueData?.length, 'itens');
      } catch (err) {
        console.warn('[EstoqueReal] Falha ao sincronizar com Supabase, usando dados locais:', err);
      }
    }

    syncFromSupabase();
  }, []);

  // ===== AÇÕES =====

  // Deduzir peso do estoque (chamado quando peça entra em corte)
  // Atualiza in-memory E persiste no Supabase quando disponível
  const deduzirEstoque = useCallback((perfil, peso, obraId, pecaId, motivo, comprimento) => {
    dispatch({
      type: ACTIONS.DEDUZIR_ESTOQUE,
      payload: { perfil, peso, obraId, pecaId, motivo, comprimento }
    });

    // Persistir movimentação E atualizar quantidade no Supabase (async)
    if (isSupabaseConfigured()) {
      const agora = new Date().toISOString();

      // 1. Encontrar o item do estoque que será deduzido (mesma lógica do reducer)
      const perfilUpper = (perfil || '').toUpperCase();
      let matchedItem = null;

      // Match inteligente simplificado para achar o item_id
      const currentEstoque = state.estoqueReal;
      if (perfilUpper.startsWith('W') || perfilUpper.startsWith('HP')) {
        const matches = currentEstoque.filter(item => {
          const codPrefix = (item.codigo || '').split('-')[0].toUpperCase();
          return codPrefix === perfilUpper;
        });
        if (matches.length === 1) matchedItem = matches[0];
        else if (matches.length > 1) {
          const comp = comprimento || 0;
          matchedItem = (comp > 0 && comp <= 6500)
            ? (matches.find(m => m.codigo.includes('6M')) || matches[0])
            : (matches.find(m => m.codigo.includes('12M')) || matches[0]);
        }
      } else if (perfilUpper.startsWith('CH')) {
        const espMatch = perfilUpper.match(/^CH([\d.]+)/);
        if (espMatch) {
          matchedItem = currentEstoque.find(i =>
            i.categoria === 'chapas' && (i.codigo || '').includes('-' + espMatch[1] + 'X')
          );
        }
      } else if (perfilUpper.includes('FERRO') || perfilUpper.includes('Ø')) {
        const diaMatch = perfilUpper.match(/Ø([\d/]+)/);
        if (diaMatch) {
          matchedItem = currentEstoque.find(i =>
            i.categoria === 'barras' && (i.codigo || '').includes('-' + diaMatch[1] + '-')
          );
        }
      } else if (perfilUpper.startsWith('L')) {
        const dimMatch = perfilUpper.match(/^L([\d.]+)/);
        if (dimMatch) {
          const lado = parseFloat(dimMatch[1]);
          if (lado <= 45) matchedItem = currentEstoque.find(i => i.id === 'ER018');
          else if (lado <= 70) matchedItem = currentEstoque.find(i => i.id === 'ER020');
          else matchedItem = currentEstoque.find(i => i.id === 'ER019');
        }
      }

      // 2. Registrar movimentação de saída
      movEstoqueApi.create({
        tipo: 'saida',
        item_id: matchedItem?.id || null,
        material_perfil: perfil,
        quantidade: peso,
        peso: peso,
        unidade: 'kg',
        obra_id: obraId || null,
        peca_id: pecaId || null,
        motivo: motivo || 'Entrada em Corte',
        setor: 'Corte',
        usuario: 'Sistema Kanban',
        data: agora,
      }).catch(err => {
        console.warn('[EstoqueReal] Falha ao persistir movimentação no Supabase:', err);
      });

      // 3. Atualizar quantidade real no Supabase (baixa efetiva)
      if (matchedItem) {
        const novaQtd = Math.max(0, (matchedItem.quantidade || 0) - peso);
        estoqueApi.update(matchedItem.id, {
          quantidade: novaQtd,
          ultima_saida: agora.split('T')[0]
        }).then(() => {
          console.log(`[EstoqueReal] Baixa Supabase: ${matchedItem.codigo} ${matchedItem.quantidade}kg → ${novaQtd}kg (-${peso}kg)`);
        }).catch(err => {
          console.warn('[EstoqueReal] Falha ao atualizar quantidade no Supabase:', err);
        });
      }
    }
  }, [state.estoqueReal]);

  // Adicionar peso ao estoque (entrada de material)
  // Atualiza in-memory E persiste no Supabase quando disponível
  const adicionarEstoque = useCallback((itemId, quantidade, nf, setor, usuario) => {
    dispatch({
      type: ACTIONS.ADICIONAR_ESTOQUE,
      payload: { itemId, quantidade, nf, setor, usuario }
    });

    // Persistir entrada no Supabase (async, fire-and-forget)
    if (isSupabaseConfigured()) {
      const agora = new Date().toISOString();
      movEstoqueApi.create({
        tipo: 'entrada',
        material_id: itemId,
        quantidade: quantidade,
        unidade: 'kg',
        nf: nf || null,
        setor: setor || 'Recebimento',
        usuario: usuario || 'Usuário',
        data: agora,
      }).catch(err => {
        console.warn('[EstoqueReal] Falha ao persistir entrada no Supabase:', err);
      });
    }
  }, []);

  // Atualizar item do estoque
  const updateItemEstoque = useCallback((id, data) => {
    dispatch({
      type: ACTIONS.UPDATE_ITEM_ESTOQUE,
      payload: { id, data }
    });
  }, []);

  // Importar itens previstos
  const importarPrevisto = useCallback((itens) => {
    dispatch({
      type: ACTIONS.IMPORTAR_PREVISTO,
      payload: itens
    });
  }, []);

  // Adicionar movimentação manual
  const addMovimentacao = useCallback((movimentacao) => {
    dispatch({
      type: ACTIONS.ADD_MOVIMENTACAO,
      payload: movimentacao
    });
  }, []);

  // Reconciliar peças já cortadas (chamado manualmente ou na inicialização)
  const reconciliarCorte = useCallback((pecasJaCortadas) => {
    if (!pecasJaCortadas || pecasJaCortadas.length === 0) return;
    dispatch({
      type: ACTIONS.RECONCILIAR_CORTE,
      payload: { pecasJaCortadas }
    });
  }, []);

  // ===== RECONCILIAÇÃO AUTOMÁTICA NA INICIALIZAÇÃO =====
  // Busca peças já cortadas de materiais_corte (Supabase) e aplica deduções retroativas
  const [reconciliado, setReconciliado] = useState(false);

  useEffect(() => {
    if (reconciliado) return;

    async function reconciliarPecasExistentes() {
      try {
        let pecasJaCortadas = [];

        // 1. Buscar de materiais_corte (KanbanCortePage - Sistema B)
        if (isSupabaseConfigured()) {
          try {
            const { data: materiaisCorte, error } = await supabase
              .from('materiais_corte')
              .select('*')
              .in('status_corte', ['cortando', 'em_corte', 'finalizado', 'liberado', 'conferencia']);

            if (!error && materiaisCorte && materiaisCorte.length > 0) {
              const pecasSupabase = materiaisCorte.map(p => ({
                pecaId: `MARCA-${p.marca}`,
                perfil: p.perfil || '',
                peso: parseFloat(p.peso_teorico) || 0,
                comprimento: p.comprimento_mm || 0,
                obraId: 'SUPER-LUNA-BELO-VALE',
                motivo: `Corte ${p.peca || ''} Marca ${p.marca} (${p.perfil}) - já executado`
              }));
              pecasJaCortadas = [...pecasJaCortadas, ...pecasSupabase];
            }
          } catch (err) {
            console.warn('[EstoqueReal] Não foi possível buscar materiais_corte do Supabase:', err);
          }
        }

        // 2. Se não encontrou no Supabase, usar dados locais do ERPContext
        // (isso será feito via reconciliarCorte chamado externamente pelo KanbanCorteIntegrado)

        if (pecasJaCortadas.length > 0) {
          // Filtrar peças com peso válido
          const pecasValidas = pecasJaCortadas.filter(p => p.peso > 0 && p.perfil);
          if (pecasValidas.length > 0) {
            dispatch({
              type: ACTIONS.RECONCILIAR_CORTE,
              payload: { pecasJaCortadas: pecasValidas }
            });
            console.log(`[EstoqueReal] Reconciliação automática: ${pecasValidas.length} peças já cortadas processadas`);
          }
        }

        setReconciliado(true);
      } catch (err) {
        console.warn('[EstoqueReal] Erro na reconciliação automática:', err);
        setReconciliado(true);
      }
    }

    // Aguardar um ciclo para o estado inicial estar pronto
    const timer = setTimeout(reconciliarPecasExistentes, 500);
    return () => clearTimeout(timer);
  }, [reconciliado]);

  // ===== SELETORES/KPIS =====

  // KPIs calculados do estoque
  const kpisEstoque = useMemo(() => {
    const estoque = state.estoqueReal;

    const total = estoque.length;
    const normal = estoque.filter(i => i.quantidade > i.minimo).length;
    const baixo = estoque.filter(i => i.quantidade <= i.minimo && i.quantidade > i.minimo * 0.5).length;
    const critico = estoque.filter(i => i.quantidade <= i.minimo * 0.5 && i.quantidade > 0).length;
    const zerado = estoque.filter(i => i.quantidade === 0).length;

    const valorTotal = estoque.reduce((a, i) => a + (i.comprado * i.preco), 0);
    const pesoTotal = estoque.filter(i => i.unidade === 'kg').reduce((a, i) => a + i.quantidade, 0);

    // Previsto vs Real
    const totalPrevisto = estoque.filter(i => i.unidade === 'kg').reduce((a, i) => a + (i.pedido || 0), 0);
    const totalComprado = estoque.filter(i => i.unidade === 'kg').reduce((a, i) => a + (i.comprado || 0), 0);
    const itensFalta = estoque.filter(i => i.falta > 0).length;
    const itensSobra = estoque.filter(i => i.falta < 0).length;
    const totalFalta = estoque.filter(i => i.falta > 0 && i.unidade === 'kg').reduce((a, i) => a + i.falta, 0);
    const totalSobra = estoque.filter(i => i.falta < 0 && i.unidade === 'kg').reduce((a, i) => a + Math.abs(i.falta), 0);

    // Movimentações de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const entradasHoje = state.movimentacoes.filter(m => m.tipo === 'entrada' && m.data.startsWith(hoje)).length;
    const saidasHoje = state.movimentacoes.filter(m => m.tipo === 'saida' && m.data.startsWith(hoje)).length;
    const pesoSaidaHoje = state.movimentacoes
      .filter(m => m.tipo === 'saida' && m.data.startsWith(hoje))
      .reduce((a, m) => a + m.quantidade, 0);

    return {
      total,
      normal,
      baixo,
      critico,
      zerado,
      valorTotal,
      pesoTotal,
      totalPrevisto,
      totalComprado,
      itensFalta,
      itensSobra,
      totalFalta,
      totalSobra,
      entradasHoje,
      saidasHoje,
      pesoSaidaHoje
    };
  }, [state.estoqueReal, state.movimentacoes]);

  // Consumo do corte (últimas 24h)
  const consumoCorte24h = useMemo(() => {
    const agora = new Date();
    const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    return state.consumoCorte.filter(c => new Date(c.data) >= ontem);
  }, [state.consumoCorte]);

  // Total consumido no corte (24h)
  const totalConsumoCorte24h = useMemo(() => {
    return consumoCorte24h.reduce((a, c) => a + c.peso, 0);
  }, [consumoCorte24h]);

  // ===== VALOR DO CONTEXTO =====

  const value = useMemo(() => ({
    // Estado
    estoqueReal: state.estoqueReal,
    movimentacoes: state.movimentacoes,
    consumoCorte: state.consumoCorte,
    consumoHoje: state.consumoHoje,
    reconciliado,

    // KPIs
    kpisEstoque,
    consumoCorte24h,
    totalConsumoCorte24h,

    // Ações
    deduzirEstoque,
    adicionarEstoque,
    updateItemEstoque,
    importarPrevisto,
    addMovimentacao,
    reconciliarCorte,
  }), [
    state,
    reconciliado,
    kpisEstoque,
    consumoCorte24h,
    totalConsumoCorte24h,
    deduzirEstoque,
    adicionarEstoque,
    updateItemEstoque,
    importarPrevisto,
    addMovimentacao,
    reconciliarCorte,
  ]);

  return (
    <EstoqueRealContext.Provider value={value}>
      {children}
    </EstoqueRealContext.Provider>
  );
}

// ===== HOOK CUSTOMIZADO =====
export function useEstoqueReal() {
  const context = useContext(EstoqueRealContext);
  if (!context) {
    throw new Error('useEstoqueReal deve ser usado dentro de um EstoqueRealProvider');
  }
  return context;
}

export default EstoqueRealContext;
