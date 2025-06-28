import React from 'react';
import { Play } from 'lucide-react';

interface EpisodeBadgeProps {
  episodeCount: number;
  className?: string;
}

const EpisodeBadge: React.FC<EpisodeBadgeProps> = ({ episodeCount, className = '' }) => {
  return (
    <div className={`group/badge inline-flex items-center space-x-1 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20 hover:bg-black/80 hover:border-white/40 transition-all duration-300 ${className}`}>
      <Play className="h-3 w-3 group-hover/badge:animate-pulse" />
      <span className="group-hover/badge:animate-pulse">×{episodeCount} tập</span>
    </div>
  );
};

export default EpisodeBadge;