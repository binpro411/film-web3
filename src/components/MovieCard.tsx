import React from 'react';
import { Play, Star, Clock } from 'lucide-react';
import { Movie } from '../types';
import EpisodeBadge from './EpisodeBadge';

interface MovieCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onShowDetails: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onPlay, onShowDetails }) => {
  return (
    <div className="group relative bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.thumbnail}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <button
          onClick={() => onPlay(movie)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <div className="bg-white/90 text-black p-4 rounded-full hover:bg-white transition-colors">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </button>

        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1">
          {movie.new && (
            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
              Mới
            </span>
          )}
          {movie.popular && (
            <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium">
              Hot
            </span>
          )}
          {movie.episodeCount && (
            <EpisodeBadge episodeCount={movie.episodeCount} className="text-xs px-2 py-1" />
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
          <Star className="h-3 w-3 text-yellow-400 fill-current" />
          <span className="text-white text-xs font-medium">{movie.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
          {movie.title}
        </h3>
        <p className="text-blue-300 text-sm mb-2 line-clamp-1">{movie.titleVietnamese}</p>
        
        <div className="flex items-center justify-between text-gray-400 text-sm mb-3">
          <span>{movie.year}</span>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{movie.duration}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {movie.genre.slice(0, 2).map((genre, index) => (
            <span
              key={index}
              className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
            >
              {genre}
            </span>
          ))}
        </div>

        <button
          onClick={() => onShowDetails(movie)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          Xem Chi Tiết
        </button>
      </div>
    </div>
  );
};

export default MovieCard;