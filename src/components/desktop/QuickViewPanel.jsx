import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Download, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function QuickViewPanel({ 
  open, 
  onOpenChange, 
  item, 
  type = 'project',
  onAction 
}) {
  if (!item) return null;

  const renderContent = () => {
    switch (type) {
      case 'project':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Cliente</h4>
              <p className="text-white">{item.cliente_nome || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Status</h4>
              <Badge>{item.status}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Área</h4>
              <p className="text-white">{item.area ? `${item.area} m²` : 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Valor do Contrato</h4>
              <p className="text-white text-lg font-semibold">
                {item.valor_contrato 
                  ? `R$ ${item.valor_contrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Localização</h4>
              <p className="text-white">{item.localizacao || 'N/A'}</p>
            </div>
            {item.observacoes && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">Observações</h4>
                <p className="text-slate-300 text-sm">{item.observacoes}</p>
              </div>
            )}
          </div>
        );
      
      case 'budget':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Status</h4>
              <Badge>{item.status}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Valor Total</h4>
              <p className="text-white text-lg font-semibold">
                {item.valor_total 
                  ? `R$ ${item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Validade</h4>
              <p className="text-white">{item.validade_dias ? `${item.validade_dias} dias` : 'N/A'}</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-4">
            {Object.entries(item)
              .filter(([key]) => !key.includes('id') && !key.includes('created'))
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key}>
                  <h4 className="text-sm font-medium text-slate-400 mb-2 capitalize">
                    {key.replace(/_/g, ' ')}
                  </h4>
                  <p className="text-white">{String(value) || 'N/A'}</p>
                </div>
              ))}
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[540px] bg-slate-900 border-slate-800 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-white text-xl">
            {item.nome || item.numero_orcamento || 'Visualização Rápida'}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Visualização rápida de detalhes
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => onAction?.('edit', item)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white"
              onClick={() => onAction?.('download', item)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white"
              onClick={() => onAction?.('share', item)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="bg-slate-800" />

          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}