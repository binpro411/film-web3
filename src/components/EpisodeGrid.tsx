import React from 'react';
import { Play, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { Episode } from '../types';

interface EpisodeGridProps {
  episodes: Episode[];
  onPlayEpisode: (episode: Episode) => void;
}

const EpisodeGrid: React.FC<EpisodeGridProps> = ({ episodes, onPlayEpisode }) => {
  const formatWatchProgress = (progress: number) => {
    const minutes = Math.floor(progress / 60);
    const seconds = progress % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Safe rating formatter
  const formatRating = (rating: any): string => {
    if (rating === null || rating === undefined) return '0.0';
    if (typeof rating === 'string') {
      const parsed = parseFloat(rating);
      return isNaN(parsed) ? '0.0' : parsed.toFixed(1);
    }
    if (typeof rating === 'number') {
      return rating.toFixed(1);
    }
    return '0.0';
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Danh Sách Tập Phim</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 cursor-pointer"
            onClick={() => onPlayEpisode(episode)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={episode.thumbnail || 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400'}
                alt={episode.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/90 text-black p-3 rounded-full">
                  <Play className="h-6 w-6 fill-current" />
                </div>
              </div>

              {/* Episode Number */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                Tập {episode.number}
              </div>

              {/* Duration */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{episode.duration || '24:00'}</span>
              </div>

              {/* Watch Status */}
              {episode.watched && (
                <div className="absolute top-2 right-2 bg-green-600 text-white p-1 rounded-full">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}

              {/* Progress Bar */}
              {episode.watchProgress && episode.watchProgress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${episode.watchProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">
                {episode.title}
              </h4>
              <p className="text-blue-300 text-sm mb-2">{episode.titleVietnamese}</p>
              
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {episode.description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{episode.releaseDate ? new Date(episode.releaseDate).toLocaleDateString('vi-VN') : 'Chưa có ngày'}</span>
                <div className="flex items-center space-x-1">
                  <span>⭐</span>
                  <span>{formatRating(episode.rating)}</span>
                </div>
              </div>

              {/* Resume Button */}
              {episode.watchProgress && episode.watchProgress > 0 && episode.watchProgress < 90 && (
                <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Tiếp tục từ {formatWatchProgress(episode.watchProgress * 60)}</span>
                </button>
              )}

              {/* Extra Features */}
              <div className="flex items-center space-x-2 mt-2">
                {episode.hasBehindScenes && (
                  <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs">Hậu trường</span>
                )}
                {episode.hasCommentary && (
                  <span className="bg-orange-600/20 text-orange-300 px-2 py-1 rounded text-xs">Bình luận đạo diễn</span>
                )}
                {episode.guestCast && episode.guestCast.length > 0 && (
                  <span className="bg-pink-600/20 text-pink-300 px-2 py-1 rounded text-xs">Khách mời đặc biệt</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EpisodeGrid;