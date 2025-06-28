import React, { useState, useEffect } from 'react';
import { Play, Info, Star } from 'lucide-react';
import { Movie } from '../types';
import EpisodeBadge from './EpisodeBadge';

interface HeroProps {
  featuredMovies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onShowDetails: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ featuredMovies, onPlayMovie, onShowDetails }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === featuredMovies.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000);

    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex];

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url(${currentMovie.banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {/* Tags */}
          <div className="flex items-center space-x-2 mb-4">
            {currentMovie.new && (
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Mới Nhất
              </span>
            )}
            {currentMovie.popular && (
              <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Phổ Biến
              </span>
            )}
            {currentMovie.episodeCount && (
              <EpisodeBadge episodeCount={currentMovie.episodeCount} />
            )}
            <div className="flex items-center space-x-1 text-yellow-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-white font-medium">{currentMovie.rating}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 leading-tight">
            {currentMovie.title}
          </h1>
          <h2 className="text-2xl md:text-3xl text-blue-300 mb-6 font-medium">
            {currentMovie.titleVietnamese}
          </h2>

          {/* Metadata */}
          <div className="flex items-center space-x-6 text-gray-300 mb-6">
            <span>{currentMovie.year}</span>
            <span>{currentMovie.duration}</span>
            <div className="flex space-x-2">
              {currentMovie.genre.slice(0, 3).map((genre, index) => (
                <span key={index} className="bg-gray-700/50 px-2 py-1 rounded text-sm">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-200 mb-8 leading-relaxed max-w-xl">
            {currentMovie.description}
          </p>

          {/* Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onPlayMovie(currentMovie)}
              className="bg-white text-black px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-200 transition-colors"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Xem Ngay</span>
            </button>
            <button
              onClick={() => onShowDetails(currentMovie)}
              className="bg-gray-700/70 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-600/70 transition-colors backdrop-blur-sm"
            >
              <Info className="h-5 w-5" />
              <span>Thông Tin Chi Tiết</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {featuredMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? 'bg-white' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;