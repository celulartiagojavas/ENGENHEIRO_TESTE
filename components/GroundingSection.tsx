
import React from 'react';
import { ExternalLink, Search, MapPin } from 'lucide-react';
import { GroundingChunk } from '../types';

interface Props {
  metadata: any;
}

export const GroundingSection: React.FC<Props> = ({ metadata }) => {
  if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <div className="flex items-center gap-2 mb-3 text-slate-400">
        <Search className="w-4 h-4" />
        <h4 className="text-xs font-bold uppercase tracking-wider">Fontes de Pesquisa Real-time</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {metadata.groundingChunks.map((chunk: GroundingChunk, i: number) => {
          const isMap = !!chunk.maps;
          const data = chunk.web || chunk.maps;
          if (!data) return null;

          return (
            <a 
              key={i} 
              href={data.uri} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors group"
            >
              {isMap ? (
                <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0" />
              )}
              <span className="text-xs text-slate-300 truncate group-hover:text-white">
                {data.title || data.uri}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};
