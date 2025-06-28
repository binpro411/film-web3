import React, { useState } from 'react';
import { X, Play, Star, Clock, Calendar, User, Building, ChevronDown, ChevronUp, Heart, Share2, CheckCircle, PlayCircle, Upload } from 'lucide-react';
import { Series, Episode } from '../types';
import EpisodeGrid from './EpisodeGrid';
import CommentsSection from './CommentsSection';
import SimilarSeries from './SimilarSeries';

interface SeriesDetailPageProps {
  series: Series | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayEpisode: (series: Series, episode: Episode) => void;
  allSeries: Series[];
}

const SeriesDetailPage: React.FC<SeriesDetailPageProps> = ({ 
  series, 
  isOpen, 
  onClose, 
  onPlayEpisode,
  allSeries 
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodes' | 'comments' | 'extras'>('episodes');

  if (!isOpen || !series) return null;

  const similarSeriesData = allSeries.filter(s => series.similarSeries.includes(s.id));
  const topEpisodes = series.episodes.filter(ep => series.topEpisodes.includes(ep.id));

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {/* Header */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        <img
          src={series.banner}
          alt={series.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-1 bg-yellow-500 text-black px-3 py-1 rounded-full">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold">{series.rating}</span>
              </div>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {series.episodeCount} tập
              </span>
              <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">
                {series.status === 'ongoing' ? 'Đang phát sóng' : series.status === 'completed' ? 'Đã hoàn thành' : 'Sắp ra mắt'}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
              {series.title}
            </h1>
            <h2 className="text-2xl md:text-3xl text-blue-300 mb-4">
              {series.titleVietnamese}
            </h2>

            <div className="flex items-center space-x-6 text-gray-300 mb-6">
              <span>{series.year}</span>
              <span>{series.totalDuration}</span>
              <div className="flex space-x-2">
                {series.genre.slice(0, 3).map((genre, index) => (
                  <span key={index} className="bg-gray-700/50 px-2 py-1 rounded text-sm">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => series.episodes.length > 0 && onPlayEpisode(series, series.episodes[0])}
                className="bg-white text-black px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-200 transition-colors"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>Bắt Đầu Xem</span>
              </button>
              <button className="bg-gray-700/70 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600/70 transition-colors backdrop-blur-sm">
                <Heart className="h-5 w-5" />
              </button>
              <button className="bg-gray-700/70 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600/70 transition-colors backdrop-blur-sm">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Description */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-4">Nội Dung Phim</h3>
          <div className="relative">
            <p className={`text-gray-300 leading-relaxed ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
              {series.description}
            </p>
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
            >
              <span>{isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
              {isDescriptionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Upload Notice */}
        <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Upload className="h-5 w-5 text-blue-400" />
            <div>
              <h4 className="text-blue-400 font-medium">Tải Video Lên</h4>
              <p className="text-blue-300 text-sm">
                Click vào bất kỳ tập nào để tải video lên và xem với chất lượng streaming tối ưu
              </p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 p-6 bg-gray-800/50 rounded-xl">
          <div className="text-center">
            <Calendar className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Năm phát hành</p>
            <p className="text-white font-semibold">{series.year}</p>
          </div>
          <div className="text-center">
            <Clock className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Tổng thời lượng</p>
            <p className="text-white font-semibold">{series.totalDuration}</p>
          </div>
          <div className="text-center">
            <User className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Đạo diễn</p>
            <p className="text-white font-semibold">{series.director}</p>
          </div>
          <div className="text-center">
            <Building className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Studio</p>
            <p className="text-white font-semibold">{series.studio}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('episodes')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'episodes' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tập phim ({series.episodeCount})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'comments' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bình luận ({series.comments.length})
            </button>
            <button
              onClick={() => setActiveTab('extras')}
              className={`pb-4 px-2 font-semibold transition-colors ${
                activeTab === 'extras' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Nội dung thêm
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'episodes' && (
          <div className="space-y-12">
            <EpisodeGrid 
              episodes={series.episodes} 
              onPlayEpisode={(episode) => onPlayEpisode(series, episode)}
            />
            
            {topEpisodes.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Tập Phim Nổi Bật</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {topEpisodes.map((episode) => (
                    <div key={episode.id} className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer"
                         onClick={() => onPlayEpisode(series, episode)}>
                      <div className="relative aspect-video">
                        <img src={episode.thumbnail} alt={episode.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <PlayCircle className="h-12 w-12 text-white" />
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                          Tập {episode.number}
                        </div>
                        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-black/70 text-white px-2 py-1 rounded text-sm">
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <span>{episode.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-white font-semibold mb-1">{episode.title}</h4>
                        <p className="text-blue-300 text-sm mb-2">{episode.titleVietnamese}</p>
                        <p className="text-gray-400 text-sm">{episode.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SimilarSeries series={similarSeriesData} onSeriesClick={() => {}} />
          </div>
        )}

        {activeTab === 'comments' && (
          <CommentsSection comments={series.comments} />
        )}

        {activeTab === 'extras' && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Nội dung thêm sẽ có sớm...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesDetailPage;