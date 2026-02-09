import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

export default function ChatMessage({ message, isUser }) {
  return (
    <div className={cn(
      "flex gap-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-gradient-to-br from-slate-700 to-slate-900" 
          : "bg-gradient-to-br from-orange-400 to-orange-600"
      )}>
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </div>
      
      <div className={cn(
        "flex-1 max-w-[80%] rounded-2xl px-5 py-4",
        isUser 
          ? "bg-[#1e3a5f] text-white" 
          : "bg-white border border-slate-200 shadow-sm"
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        ) : (
          <ReactMarkdown 
            className={cn(
              "text-sm prose prose-sm max-w-none",
              "prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed",
              "prose-strong:text-slate-900 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded",
              "prose-ul:text-slate-700 prose-ol:text-slate-700",
              "prose-li:marker:text-orange-500"
            )}
          >
            {message}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}