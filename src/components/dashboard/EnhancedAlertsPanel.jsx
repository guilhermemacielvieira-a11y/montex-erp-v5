import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bell, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ALERT_TYPES = {
  stock_low: { label: 'Estoque Baixo', color: 'bg-yellow-100 text-yellow-800', icon: '📦' },
  budget_deviation: { label: 'Desvio de Orçamento', color: 'bg-red-100 text-red-800', icon: '💰' },
  delayed_project: { label: 'Projeto Atrasado', color: 'bg-orange-100 text-orange-800', icon: '⏰' },
  production_alert: { label: 'Alerta de Produção', color: 'bg-blue-100 text-blue-800', icon: '⚙️' },
};

export default function EnhancedAlertsPanel({ projetos = [], relatorios = [] }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabledAlerts, setEnabledAlerts] = useState({
    stock_low: true,
    budget_deviation: true,
    delayed_project: true,
    production_alert: true,
  });
  const [alerts, setAlerts] = useState([]);

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('dashboardAlertSettings');
    if (saved) {
      setEnabledAlerts(JSON.parse(saved));
    }
  }, []);

  // Generate alerts based on data
  useEffect(() => {
    const generatedAlerts = [];

    if (enabledAlerts.delayed_project) {
      projetos.forEach(p => {
        if (['em_fabricacao', 'em_montagem'].includes(p.status) && p.data_fim_prevista) {
          const daysUntilDeadline = Math.ceil(
            (new Date(p.data_fim_prevista) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
            generatedAlerts.push({
              type: 'delayed_project',
              title: `${p.nome} vence em ${daysUntilDeadline} dias`,
              severity: daysUntilDeadline <= 3 ? 'high' : 'medium',
              id: 'delayed_' + p.id,
            });
          } else if (daysUntilDeadline <= 0) {
            generatedAlerts.push({
              type: 'delayed_project',
              title: `${p.nome} está ATRASADO`,
              severity: 'critical',
              id: 'overdue_' + p.id,
            });
          }
        }
      });
    }

    if (enabledAlerts.budget_deviation) {
      projetos.forEach(p => {
        if (p.valor_contrato && Math.random() > 0.7) { // Simula desvio
          generatedAlerts.push({
            type: 'budget_deviation',
            title: `Desvio de orçamento detectado em ${p.nome}`,
            severity: 'medium',
            id: 'budget_' + p.id,
          });
        }
      });
    }

    setAlerts(generatedAlerts.slice(0, 5)); // Mostrar máximo 5 alertas
  }, [projetos, relatorios, enabledAlerts]);

  const handleToggleAlert = (alertType) => {
    const updated = { ...enabledAlerts, [alertType]: !enabledAlerts[alertType] };
    setEnabledAlerts(updated);
    localStorage.setItem('dashboardAlertSettings', JSON.stringify(updated));
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'border-l-4 border-red-600 bg-red-50',
      high: 'border-l-4 border-orange-500 bg-orange-50',
      medium: 'border-l-4 border-yellow-500 bg-yellow-50',
    };
    return colors[severity] || colors.medium;
  };

  return (
    <>
      <Card className="border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">Sistema de Alertas</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum alerta no momento</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{ALERT_TYPES[alert.type]?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                      >
                        {ALERT_TYPES[alert.type]?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Alertas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {Object.entries(ALERT_TYPES).map(([type, config]) => (
              <div key={type} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
                <Checkbox
                  id={type}
                  checked={enabledAlerts[type] || false}
                  onCheckedChange={() => handleToggleAlert(type)}
                />
                <Label htmlFor={type} className="flex-1 cursor-pointer">
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-slate-500">
                    {type === 'stock_low' && 'Notificar sobre materiais com estoque baixo'}
                    {type === 'budget_deviation' && 'Alertar sobre desvios de orçamento'}
                    {type === 'delayed_project' && 'Alertar sobre projetos atrasados'}
                    {type === 'production_alert' && 'Alertas gerais de produção'}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}