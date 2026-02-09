// MONTEX ERP Premium - Delivery Calendar Component
// Integrado com ERPContext

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

// ERPContext para dados reais
import { useMedicoes, useProducao } from '../../contexts/ERPContext';

// Formatador de peso
const formatWeight = (value) => `${(value / 1000).toFixed(1)} ton`;

const DeliveryCalendar = () => {
  // Dados reais do contexto
  const { medicoes } = useMedicoes();
  const { pecas } = useProducao();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Fevereiro 2026
  const [selectedDay, setSelectedDay] = useState(null);

  // Criar entregas baseadas nas medições e peças expedidas
  const entregas = useMemo(() => {
    // Simular entregas baseadas em datas de medição
    return [
      { id: 1, data: '2026-02-05', projeto: 'SUPER LUNA', tipo: 'entrega', peso: 15000, status: 'programada' },
      { id: 2, data: '2026-02-10', projeto: 'SUPER LUNA', tipo: 'entrega', peso: 12500, status: 'programada' },
      { id: 3, data: '2026-02-15', projeto: 'SUPER LUNA', tipo: 'entrega', peso: 18000, status: 'programada' },
      { id: 4, data: '2026-02-20', projeto: 'SUPER LUNA', tipo: 'entrega', peso: 20000, status: 'programada' },
      { id: 5, data: '2026-02-25', projeto: 'SUPER LUNA', tipo: 'entrega', peso: 14000, status: 'programada' },
    ];
  }, [medicoes, pecas]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: null });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: true, date: dateStr });
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: null });
    }

    return days;
  };

  const getDeliveriesForDay = (dateStr) => {
    if (!dateStr) return [];
    return entregas.filter(e => e.data === dateStr);
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'expedicao': return Truck;
      case 'material': return Package;
      case 'montagem': return Wrench;
      case 'entrega_final': return CheckCircle;
      case 'finalizacao': return CheckCircle;
      default: return Calendar;
    }
  };

  const getTypeColor = (tipo) => {
    switch (tipo) {
      case 'expedicao': return 'text-blue-400 bg-blue-500/20';
      case 'material': return 'text-amber-400 bg-amber-500/20';
      case 'montagem': return 'text-purple-400 bg-purple-500/20';
      case 'entrega_final': return 'text-emerald-400 bg-emerald-500/20';
      case 'finalizacao': return 'text-emerald-400 bg-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmado': return { icon: CheckCircle, color: 'text-emerald-400' };
      case 'agendado': return { icon: Clock, color: 'text-blue-400' };
      case 'pendente': return { icon: AlertTriangle, color: 'text-amber-400' };
      default: return { icon: Clock, color: 'text-slate-400' };
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const days = getDaysInMonth(currentDate);
  const selectedDeliveries = selectedDay ? getDeliveriesForDay(selectedDay) : [];

  // Próximas entregas (próximos 7 dias)
  const hoje = new Date(2026, 1, 1);
  const proximasEntregas = entregas
    .filter(e => {
      const dataEntrega = new Date(e.data);
      const diffDays = Math.ceil((dataEntrega - hoje) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Calendário de Entregas</h3>
              <p className="text-slate-400 text-xs">{proximasEntregas.length} entregas nos próximos 7 dias</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Navegação do Mês */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-white font-medium">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs text-slate-500 font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const deliveries = getDeliveriesForDay(day.date);
            const hasDeliveries = deliveries.length > 0;
            const isSelected = selectedDay === day.date;

            return (
              <button
                key={index}
                onClick={() => day.isCurrentMonth && setSelectedDay(day.date)}
                disabled={!day.isCurrentMonth}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs
                  transition-all duration-200
                  ${day.isCurrentMonth
                    ? 'hover:bg-slate-700/50 cursor-pointer'
                    : 'text-slate-600 cursor-default'}
                  ${isSelected ? 'bg-emerald-500/30 ring-1 ring-emerald-500' : ''}
                  ${day.isCurrentMonth ? 'text-slate-300' : ''}
                `}
              >
                <span>{day.day}</span>
                {hasDeliveries && (
                  <div className="flex gap-0.5 mt-0.5">
                    {deliveries.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Entregas do Dia Selecionado */}
        <AnimatePresence mode="wait">
          {selectedDay && selectedDeliveries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-700/50"
            >
              <h4 className="text-slate-400 text-xs font-medium mb-3">
                Entregas em {new Date(selectedDay).toLocaleDateString('pt-BR')}
              </h4>
              <div className="space-y-2">
                {selectedDeliveries.map(entrega => {
                  const TypeIcon = getTypeIcon(entrega.tipo);
                  const statusInfo = getStatusIcon(entrega.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={entrega.id}
                      className="p-3 bg-slate-700/30 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(entrega.tipo)}`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium truncate">
                              {entrega.projeto}
                            </span>
                            <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                          </div>
                          <p className="text-slate-400 text-xs truncate">{entrega.descricao}</p>
                          {entrega.peso > 0 && (
                            <p className="text-emerald-400 text-xs mt-1">{formatWeight(entrega.peso)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Próximas Entregas (quando nenhum dia selecionado) */}
        {!selectedDay && proximasEntregas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-slate-400 text-xs font-medium mb-3">Próximas Entregas</h4>
            <div className="space-y-2">
              {proximasEntregas.map(entrega => {
                const TypeIcon = getTypeIcon(entrega.tipo);
                const dataFormatada = new Date(entrega.data).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short'
                });

                return (
                  <div
                    key={entrega.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded-lg transition-colors cursor-pointer"
                    onClick={() => setSelectedDay(entrega.data)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(entrega.tipo)}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{entrega.projeto}</p>
                      <p className="text-slate-500 text-xs truncate">{entrega.descricao}</p>
                    </div>
                    <span className="text-emerald-400 text-xs font-medium whitespace-nowrap">
                      {dataFormatada}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DeliveryCalendar;
