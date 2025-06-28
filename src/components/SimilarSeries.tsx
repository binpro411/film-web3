import React from 'react';
import { Star, Play } from 'lucide-react';
import { Series } from '../types';

interface SimilarSeriesProps {
  series: Series[];
  onSeriesClick: (series: Series) => void;
}

const SimilarSeries: React.FC<SimilarSeriesProps> = ({ series, onSeriesClick }) => {
  if (series.length === 0) return null;

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Phim Tương Tự</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {series.map((item) => (
          <div
            key={item.id}
            className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 cursor-pointer"
            onClick={() => onSeriesClick(item)}
          >
            <div className="relative aspect-[2/3] overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/90 text-black p-3 rounded-full">
                  <Play className="h-6 w-6 fill-current" />
                </div>
              </div>

              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                {item.episodeCount} tập
              </div>

              <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 text-white px-2 py-1 rounded text-sm">
                <Star className="h-3 w-3 fill-current text-yellow-400" />
                <span>{item.rating}</span>
              </div>
            </div>

            <div className="p-4">
              <h4 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                {item.title}
              </h4>
              <p className="text-blue-300 text-sm mb-2">{item.titleVietnamese}</p>
              <div className="flex items-center justify-between text-gray-400 text-sm">
                <span>{item.year}</span>
                <span>{item.totalDuration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimilarSeries;