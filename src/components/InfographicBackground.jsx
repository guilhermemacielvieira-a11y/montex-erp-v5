import React from 'react';

export default function InfographicBackground({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100',
    dark: 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800',
    blue: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100',
    industrial: 'bg-gradient-to-br from-zinc-100 via-stone-100 to-zinc-200',
  };

  return (
    <div className={`min-h-screen ${variants[variant] || variants.default}`}>
      {/* Grid Pattern Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Subtle decorative elements */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
