import React, { useState } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function ChatInput({ onSend, isLoading, placeholder, showAttachment = false }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
        {showAttachment && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        )}
        
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Digite sua mensagem..."}
          className={cn(
            "flex-1 min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 p-2",
            "placeholder:text-slate-400"
          )}
          rows={1}
        />
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={cn(
            "h-11 w-11 rounded-xl flex-shrink-0",
            "bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700",
            "disabled:opacity-50"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}