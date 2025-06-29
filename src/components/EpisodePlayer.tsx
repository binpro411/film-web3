import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Upload, Play, Clock } from 'lucide-react';
import { Series, Episode } from '../types';
import HLSVideoPlayer from './HLSVideoPlayer';
import VideoUploadModal from './VideoUploadModal';
import { useAuth } from '../contexts/AuthContext';

interface EpisodePlayerProps {
  series: Series | null;
  currentEpisode: Episode | null;
  isOpen: boolean;
  onClose: () => void;
  onEpisodeChange: (episode: Episode) => void;
}

const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ 
  series, 
  currentEpisode, 
  isOpen, 
  onClose, 
  onEpisodeChange 
}) => {
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showAutoplayCountdown, setShowAutoplayCountdown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeProgress, setResumeProgress] = useState<any>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user, getResumePrompt } = useAuth();

  // Memoize loadVideoData để tránh infinite loop
  const loadVideoData = useCallback(async () => {
    if (!series || !currentEpisode) return;

    setIsLoadingVideo(true);
    setLoadError(null);
    
    try {
      console.log(`🔍 Loading video for ${series.id} episode ${currentEpisode.number}`);
      
      const response = await fetch(`http://localhost:3001/api/videos/${series.id}/${currentEpisode.number}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Video data loaded:', data.video);
        setVideoData({
          id: data.video.id,
          title: data.video.title,
          hlsUrl: `http://localhost:3001${data.video.hlsUrl}`,
          duration: data.video.duration,
          status: data.video.status,
          totalSegments: data.video.totalSegments
        });
      } else {
        console.log('❌ No video found:', data.error);
        setVideoData(null);
      }
    } catch (error) {
      console.error('❌ Failed to load video:', error);
      setLoadError('Không thể tải thông tin video');
      setVideoData(null);
    } finally {
      setIsLoadingVideo(false);
    }
  }, [series?.id, currentEpisode?.number]); // Chỉ depend vào ID và episode number

  // Load video data khi episode thay đổi
  useEffect(() => {
    if (isOpen && series && currentEpisode) {
      loadVideoData();
    }
  }, [isOpen, loadVideoData]); // Depend vào loadVideoData đã memoized

  // Check resume prompt - SEPARATE useEffect
  useEffect(() => {
    if (user && series && currentEpisode && videoData) {
      const { shouldPrompt, progress } = getResumePrompt(series.id, currentEpisode.id);
      if (shouldPrompt && progress) {
        setResumeProgress(progress);
        setShowResumePrompt(true);
      }
    }
  }, [user, series?.id, currentEpisode?.id, videoData?.id, getResumePrompt]);

  // Autoplay countdown effect
  useEffect(() => {
    if (showAutoplayCountdown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showAutoplayCountdown && countdown === 0) {
      handleNextEpisode();
      setShowAutoplayCountdown(false);
      setCountdown(10);
    }
  }, [showAutoplayCountdown, countdown]);

  if (!isOpen || !series || !currentEpisode) return null;

  const currentIndex = series.episodes.findIndex(ep => ep.id === currentEpisode.id);
  const nextEpisode = currentIndex < series.episodes.length - 1 ? series.episodes[currentIndex + 1] : null;
  const prevEpisode = currentIndex > 0 ? series.episodes[currentIndex - 1] : null;

  const handleNextEpisode = () => {
    if (nextEpisode) {
      onEpisodeChange(nextEpisode);
    }
  };

  const handlePrevEpisode = () => {
    if (prevEpisode) {
      onEpisodeChange(prevEpisode);
    }
  };

  const handleVideoEnded = () => {
    if (nextEpisode) {
      setShowAutoplayCountdown(true);
      setCountdown(10);
    }
  };

  const handleVideoUploaded = (uploadedVideoData: any) => {
    setVideoData({
      id: uploadedVideoData.id,
      title: uploadedVideoData.title,
      hlsUrl: uploadedVideoData.hlsUrl,
      duration: uploadedVideoData.duration,
      status: 'completed'
    });
  };

  const handleResumeVideo = () => {
    setShowResumePrompt(false);
  };

  const handleStartFromBeginning = () => {
    setShowResumePrompt(false);
    setResumeProgress(null);
  };

  const canUpload = user?.isAdmin;
  const hasVideo = videoData && videoData.status === 'completed';

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black">
        {/* Resume Prompt Overlay */}
        {showResumePrompt && resumeProgress && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md text-center border border-gray-700">
              <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-white text-xl font-bold mb-4">Tiếp tục xem?</h3>
              <p className="text-gray-300 mb-2">
                Bạn đã xem tới <span className="text-blue-400 font-semibold">{formatTime(resumeProgress.progress)}</span>
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Lần cuối xem: {new Date(resumeProgress.lastWatchedAt).toLocaleDateString('vi-VN')}
              </p>
              
              <div className="bg-gray-800 rounded-lg p-3 mb-6">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${resumeProgress.percentage}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Đã xem {Math.round(resumeProgress.percentage)}%
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleStartFromBeginning}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  Xem từ đầu
                </button>
                <button
                  onClick={handleResumeVideo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Tiếp tục</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Container */}
        <div className="relative w-full h-full">
          {isLoadingVideo ? (
            <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white text-xl">Đang kiểm tra video...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="relative w-full h-full bg-gradient-to-br from-red-900 via-gray-900 to-black flex items-center justify-center">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="text-red-400 text-6xl mb-4">⚠️</div>
                <h1 className="text-4xl font-bold text-white mb-4">Lỗi tải video</h1>
                <p className="text-xl text-gray-300 mb-8">{loadError}</p>
                <button
                  onClick={loadVideoData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : hasVideo ? (
            <HLSVideoPlayer
              src={videoData.hlsUrl}
              title={`${series.title} - Tập ${currentEpisode.number}: ${currentEpisode.title}`}
              seriesId={series.id}
              episodeId={currentEpisode.id}
              videoId={videoData.id}
              onEnded={handleVideoEnded}
              resumeTime={resumeProgress && !showResumePrompt ? resumeProgress.progress : 0}
              className="w-full h-full"
            />
          ) : (
            // Placeholder when no video is uploaded
            <div className="relative w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="mb-8">
                  <img
                    src={currentEpisode.thumbnail}
                    alt={currentEpisode.title}
                    className="w-64 h-96 object-cover rounded-lg mx-auto shadow-2xl"
                  />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  Tập {currentEpisode.number}: {currentEpisode.title}
                </h1>
                <h2 className="text-2xl md:text-3xl text-blue-300 mb-8">
                  {currentEpisode.titleVietnamese}
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  {canUpload 
                    ? "Chưa có video cho tập này. Tải video lên để xem!" 
                    : "Video chưa có sẵn. Vui lòng quay lại sau."
                  }
                </p>
                {canUpload && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Upload className="h-6 w-6" />
                    <span>Tải Video Lên (Admin)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Autoplay Countdown Overlay */}
          {showAutoplayCountdown && nextEpisode && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
              <div className="bg-gray-900 rounded-xl p-8 max-w-md text-center">
                <h3 className="text-white text-xl font-bold mb-4">Sắp phát tập tiếp theo</h3>
                <div className="flex items-center space-x-4 mb-6">
                  <img
                    src={nextEpisode.thumbnail}
                    alt={nextEpisode.title}
                    className="w-20 h-28 object-cover rounded"
                  />
                  <div className="text-left">
                    <p className="text-white font-semibold">Tập {nextEpisode.number}</p>
                    <p className="text-blue-300">{nextEpisode.title}</p>
                    <p className="text-gray-400 text-sm">{nextEpisode.titleVietnamese}</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-4">{countdown}s</div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowAutoplayCountdown(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleNextEpisode}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Phát ngay
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Top Controls */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                <div>
                  <h3 className="text-white font-semibold text-lg">{series.title}</h3>
                  <p className="text-gray-300 text-sm">Tập {currentEpisode.number}: {currentEpisode.title}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {canUpload && !hasVideo && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Tải Video</span>
                  </button>
                )}
                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="bg-gray-700/70 text-white px-4 py-2 rounded-lg hover:bg-gray-600/70 transition-colors"
                >
                  Danh sách tập
                </button>
              </div>
            </div>
          </div>

          {/* Episode Navigation */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20">
            <button
              onClick={handlePrevEpisode}
              disabled={!prevEpisode}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </div>

          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20">
            <button
              onClick={handleNextEpisode}
              disabled={!nextEpisode}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Episode List Sidebar */}
          {showEpisodeList && (
            <div className="absolute top-0 right-0 w-80 h-full bg-gray-900/95 backdrop-blur-md overflow-y-auto z-30">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Danh sách tập</h3>
                  <button
                    onClick={() => setShowEpisodeList(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {series.episodes.map((episode) => {
                    const watchProgress = user ? getResumePrompt(series.id, episode.id).progress : null;
                    
                    return (
                      <div
                        key={episode.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          episode.id === currentEpisode.id 
                            ? 'bg-blue-600' 
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => onEpisodeChange(episode)}
                      >
                        <img
                          src={episode.thumbnail}
                          alt={episode.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            Tập {episode.number}: {episode.title}
                          </p>
                          <p className="text-gray-400 text-xs truncate">{episode.titleVietnamese}</p>
                          <p className="text-gray-400 text-xs">{episode.duration}</p>
                          
                          {/* Watch Progress Bar */}
                          {watchProgress && watchProgress.percentage > 5 && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-blue-400 h-1 rounded-full"
                                  style={{ width: `${watchProgress.percentage}%` }}
                                />
                              </div>
                              <p className="text-gray-500 text-xs mt-1">
                                {Math.round(watchProgress.percentage)}% đã xem
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-2 h-2 bg-gray-600 rounded-full" title="Chưa có video"></div>
                          {watchProgress?.completed && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full" title="Đã xem xong"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Upload Modal - Only for Admin */}
      {canUpload && (
        <VideoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onVideoUploaded={handleVideoUploaded}
          episodeNumber={currentEpisode.number}
          seriesTitle={series.title}
          seriesId={series.id}
        />
      )}
    </>
  );
};

export default EpisodePlayer;