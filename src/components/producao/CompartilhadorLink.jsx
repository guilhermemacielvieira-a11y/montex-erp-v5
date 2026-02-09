import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CompartilhadorLink({ linkPath = 'AtualizacaoProducaoPublica' }) {
  const [copiado, setCopiado] = useState(false);

  const link = `${window.location.origin}${window.location.pathname.split('/').slice(0, -1).join('/')}/${linkPath}`;

  const handleCopiar = () => {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleCompartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Atualização de Produção',
          text: 'Clique aqui para acessar o painel de atualização de produção',
          url: link
        });
        toast.success('Link compartilhado!');
      } catch (e) {
        if (e.name !== 'AbortError') {
          toast.error('Erro ao compartilhar');
        }
      }
    } else {
      handleCopiar();
    }
  };

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Compartilhar com Encarregados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={link}
            readOnly
            className="text-sm bg-white"
          />
          <Button
            onClick={handleCopiar}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            {copiado ? (
              <><Check className="w-4 h-4 mr-1" /> Copiado</>
            ) : (
              <><Copy className="w-4 h-4 mr-1" /> Copiar</>
            )}
          </Button>
        </div>
        <Button
          onClick={handleCompartilhar}
          className="w-full bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Compartilhar Link
        </Button>
        <p className="text-xs text-slate-600">
          Envie este link para os encarregados acessarem o painel sem necessidade de login.
        </p>
      </CardContent>
    </Card>
  );
}