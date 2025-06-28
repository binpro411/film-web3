import React from 'react';
import { X, Maximize, Volume2, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Movie } from '../types';

interface VideoPlayerProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Placeholder Video Area */}
        <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-8">
              <img
                src={movie.thumbnail}
                alt={movie.title}
                className="w-64 h-96 object-cover rounded-lg mx-auto shadow-2xl"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {movie.title}
            </h1>
            <h2 className="text-2xl md:text-3xl text-blue-300 mb-8">
              {movie.titleVietnamese}
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Trình phát demo - Trong ứng dụng thực tế, đây sẽ hiển thị nội dung video thật
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-600/50 rounded-full h-1 mb-2">
              <div className="bg-blue-500 h-1 rounded-full w-1/3"></div>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>25:43</span>
              <span>{movie.duration}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="text-white hover:text-blue-400 transition-colors">
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-white text-black p-3 rounded-full hover:bg-gray-200 transition-colors"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
              </button>
              <button className="text-white hover:text-blue-400 transition-colors">
                <SkipForward className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5 text-white" />
                <div className="w-20 bg-gray-600/50 rounded-full h-1">
                  <div className="bg-white h-1 rounded-full w-3/4"></div>
                </div>
              </div>
              <button className="text-white hover:text-blue-400 transition-colors">
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Movie Info */}
          <div className="mt-4 flex items-center space-x-4">
            <img
              src={movie.thumbnail}
              alt={movie.title}
              className="w-16 h-24 object-cover rounded"
            />
            <div>
              <h3 className="text-white font-semibold text-lg">{movie.title}</h3>
              <p className="text-blue-300 text-sm">{movie.titleVietnamese}</p>
              <p className="text-gray-400 text-sm">{movie.year} · {movie.director}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;