import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Video, Trash2, Loader } from 'lucide-react';

export default function GerenciadorMidias({ item, onMediasUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [descricao, setDescricao] = useState('');

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const midias = item.midias || [];

      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const tipo = file.type.startsWith('video') ? 'video' : 'foto';
        
        midias.push({
          url: file_url,
          tipo,
          data_upload: new Date().toISOString(),
          descricao: descricao || `${tipo} adicionada`
        });
      }

      await base44.entities.ItemProducao.update(item.id, { midias });
      onMediasUpdated(midias);
      toast.success('Mídias adicionadas com sucesso!');
      setDescricao('');
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (index) => {
    try {
      const midias = item.midias || [];
      midias.splice(index, 1);
      await base44.entities.ItemProducao.update(item.id, { midias });
      onMediasUpdated(midias);
      toast.success('Mídia removida');
    } catch {
      toast.error('Erro ao remover mídia');
    }
  };

  const midias = item.midias || [];

  return (
    <div className="space-y-3 pt-3 border-t">
      <div>
        <label className="text-xs font-medium">Evidência da Produção</label>
        <p className="text-xs text-slate-500 mb-2">Adicione fotos ou vídeos da produção realizada</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 bg-blue-50">
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id={`media-upload-${item.id}`}
        />
        <label htmlFor={`media-upload-${item.id}`} className="block">
          <Button
            asChild
            variant="outline"
            className="w-full cursor-pointer"
            disabled={uploading}
          >
            <div className="flex items-center justify-center gap-2">
              {uploading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Enviando...' : 'Clique ou arraste fotos/vídeos'}
            </div>
          </Button>
        </label>
      </div>

      {/* Descrição Optional */}
      <Input
        placeholder="Descrição da foto/vídeo (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="text-xs"
      />

      {/* Galeria de Mídias */}
      {midias.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Mídias adicionadas ({midias.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {midias.map((media, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="p-0 relative group">
                  {media.tipo === 'video' ? (
                    <div className="aspect-square bg-slate-900 flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img
                      src={media.url}
                      alt="Mídia"
                      className="w-full h-24 object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      onClick={() => handleDeleteMedia(idx)}
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {media.descricao && (
                    <p className="text-xs p-1 bg-slate-100 truncate">{media.descricao}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}