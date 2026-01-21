
import React from 'react';
import { Database, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

interface Props {
  status: 'synced' | 'syncing' | 'volatile' | 'error';
}

export const PersistenceIndicator: React.FC<Props> = ({ status }) => {
  const configs = {
    synced: {
      icon: <CloudCheck className="w-4 h-4 text-emerald-400" />,
      text: 'Sincronizado',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    syncing: {
      icon: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
      text: 'Gravando Memória...',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    volatile: {
      icon: <Database className="w-4 h-4 text-amber-400" />,
      text: 'Sessão Volátil',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    error: {
      icon: <CloudOff className="w-4 h-4 text-red-400" />,
      text: 'Erro L2 DB',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20'
    }
  };

  const current = configs[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${current.bg} transition-all duration-500 shadow-sm ring-1 ring-white/5`}>
      {current.icon}
      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${current.color}`}>
        {current.text}
      </span>
    </div>
  );
};
