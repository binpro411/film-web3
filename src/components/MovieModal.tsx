import React from 'react';
import { X, Play, Star, Clock, Calendar, User, Building } from 'lucide-react';
import { Movie } from '../types';

interface MovieModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (movie: Movie) => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, isOpen, onClose, onPlay }) => {
  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Banner */}
        <div className="relative h-64 md:h-80 overflow-hidden rounded-t-2xl">
          <img
            src={movie.banner}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
          
          {/* Play Button */}
          <button
            onClick={() => onPlay(movie)}
            className="absolute bottom-6 left-6 bg-white text-black px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>Xem Ngay</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title & Rating */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {movie.title}
                </h1>
                <h2 className="text-xl md:text-2xl text-blue-300 font-medium">
                  {movie.titleVietnamese}
                </h2>
              </div>
              <div className="flex items-center space-x-1 bg-yellow-500 text-black px-3 py-1 rounded-full">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold">{movie.rating}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center space-x-2">
              {movie.new && (
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Mới Nhất
                </span>
              )}
              {movie.popular && (
                <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Phổ Biến
                </span>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-2 text-gray-300">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{movie.year}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{movie.duration}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <User className="h-4 w-4" />
              <span className="text-sm">{movie.director}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <Building className="h-4 w-4" />
              <span className="text-sm">{movie.studio}</span>
            </div>
          </div>

          {/* Genres */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Thể Loại</h3>
            <div className="flex flex-wrap gap-2">
              {movie.genre.map((genre, index) => (
                <span
                  key={index}
                  className="bg-blue-600/20 text-blue-300 border border-blue-600/30 px-3 py-1 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Nội Dung Phim</h3>
            <p className="text-gray-300 leading-relaxed">{movie.description}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onPlay(movie)}
              className="bg-white text-black px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-200 transition-colors"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Xem Ngay</span>
            </button>
            <button className="bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors">
              Thêm Vào Yêu Thích
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;