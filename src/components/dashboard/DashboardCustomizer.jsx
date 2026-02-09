import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { id: 'stats', label: 'Cartões de Estatísticas', default: true },
  { id: 'projectsInsights', label: 'Análise Inteligente de Projetos', default: true },
  { id: 'progressChart', label: 'Gráfico de Progresso', default: true },
  { id: 'projects', label: 'Projetos em Andamento', default: true },
  { id: 'notifications', label: 'Notificações de Produção', default: true },
  { id: 'stockAlerts', label: 'Alertas de Estoque', default: true },
  { id: 'alerts', label: 'Alertas Gerais', default: true },
  { id: 'quickStats', label: 'Estatísticas Rápidas', default: true },
  { id: 'costAnalysis', label: 'Análise de Custos', default: true },
];

export default function DashboardCustomizer({ open, onOpenChange, onSave }) {
  const [visibleWidgets, setVisibleWidgets] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    if (saved) {
      setVisibleWidgets(JSON.parse(saved));
    } else {
      const defaults = {};
      AVAILABLE_WIDGETS.forEach(w => {
        defaults[w.id] = w.default;
      });
      setVisibleWidgets(defaults);
    }
  }, [open]);

  const handleToggle = (widgetId) => {
    setVisibleWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(visibleWidgets));
    onSave(visibleWidgets);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaults = {};
    AVAILABLE_WIDGETS.forEach(w => {
      defaults[w.id] = w.default;
    });
    setVisibleWidgets(defaults);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Personalizar Dashboard
          </DialogTitle>
          <DialogDescription>
            Escolha quais widgets deseja exibir no seu dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {AVAILABLE_WIDGETS.map(widget => (
            <div key={widget.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50">
              <Checkbox
                id={widget.id}
                checked={visibleWidgets[widget.id] || false}
                onCheckedChange={() => handleToggle(widget.id)}
              />
              <Label
                htmlFor={widget.id}
                className="flex-1 cursor-pointer text-sm font-medium text-slate-700"
              >
                {widget.label}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-orange-600 hover:bg-orange-700">
            Salvar Preferências
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { AVAILABLE_WIDGETS };