
import React from 'react';
import { Cpu, Loader2 } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-blue-500/30 rounded-xl animate-pulse">
      <div className="relative">
        <Cpu className="w-6 h-6 text-blue-400" />
        <Loader2 className="w-6 h-6 text-blue-400 absolute top-0 left-0 animate-spin opacity-50" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-blue-100">Pensando com Raciocínio Profundo...</span>
        <span className="text-xs text-blue-400/70 font-mono italic">Budget: 16k tokens alocados para otimização de custos</span>
      </div>
    </div>
  );
};
