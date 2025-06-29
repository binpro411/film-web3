import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Upload, Video, Database, RefreshCw, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Series {
  id: string;
  title: string;
  title_vietnamese: string;
  description: string;
  year: number;
  rating: number;
  genre: string[];
  director: string;
  studio: string;
  thumbnail: string;
  banner: string;
  episode_count: number;
  status: string;
  episodes?: Episode[];
}

interface Episode {
  id: string;
  number: number;
  title: string;
  title_vietnamese: string;
  description: string;
  duration: string;
  thumbnail: string;
  video_id?: string;
  video_status?: string;
  hls_manifest_path?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'series' | 'episodes' | 'videos'>('series');
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingEpisode, setUploadingEpisode] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh key
  
  const { user } = useAuth();

  // Load series data
  const loadSeries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/series');
      const data = await response.json();
      if (data.success) {
        setSeries(data.series);
        console.log('✅ Series loaded:', data.series.length);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load episodes for selected series
  const loadEpisodes = async (seriesId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/series/${seriesId}/episodes`);
      const data = await response.json();
      if (data.success) {
        setEpisodes(data.episodes);
        console.log('✅ Episodes loaded:', data.episodes.length);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh data
  const refreshData = async () => {
    setRefreshKey(prev => prev + 1);
    await loadSeries();
    if (selectedSeries) {
      await loadEpisodes(selectedSeries.id);
    }
  };

  useEffect(() => {
    if (isOpen && user?.isAdmin) {
      loadSeries();
    }
  }, [isOpen, user, refreshKey]);

  useEffect(() => {
    if (selectedSeries) {
      loadEpisodes(selectedSeries.id);
    }
  }, [selectedSeries, refreshKey]);

  if (!isOpen || !user?.isAdmin) return null;

  const handleVideoUpload = async (episodeId: string, file: File) => {
    setIsUploading(true);
    setUploadingEpisode(episodeId);

    try {
      const formData = new FormData();
      formData.append('video', file);

      console.log('🎬 Starting video upload for episode:', episodeId);

      const response = await fetch(`http://localhost:3001/api/episodes/${episodeId}/upload-video`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Video upload successful:', data.videoId);
        
        // Wait a moment for processing to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh episodes data to show updated status
        if (selectedSeries) {
          await loadEpisodes(selectedSeries.id);
        }
        
        // Poll for completion
        pollVideoStatus(data.videoId, episodeId);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadingEpisode(null);
    }
  };

  const pollVideoStatus = async (videoId: string, episodeId: string) => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/video/${videoId}`);
        const data = await response.json();

        if (data.success) {
          const video = data.video;
          console.log('📊 Video status check:', video.status, `${video.processingProgress || 0}%`);
          
          if (video.status === 'completed') {
            console.log('🎉 Video processing completed!');
            // Video processing completed, refresh episodes
            if (selectedSeries) {
              await loadEpisodes(selectedSeries.id);
            }
            return;
          } else if (video.status === 'failed') {
            alert('Video processing failed');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          console.log('⏰ Polling timeout reached');
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    checkStatus();
  };

  const getVideoStatus = (episode: Episode) => {
    if (episode.video_id && episode.video_status === 'completed') {
      return { status: 'completed', color: 'text-green-400', icon: CheckCircle, text: 'Có video' };
    } else if (episode.video_id && episode.video_status === 'processing') {
      return { status: 'processing', color: 'text-yellow-400', icon: Clock, text: 'Đang xử lý' };
    } else if (episode.video_id && episode.video_status === 'failed') {
      return { status: 'failed', color: 'text-red-400', icon: AlertCircle, text: 'Lỗi' };
    } else {
      return { status: 'none', color: 'text-gray-400', icon: Upload, text: 'Chưa có video' };
    }
  };

  const handlePlayVideo = (episode: Episode) => {
    if (episode.video_id && episode.video_status === 'completed') {
      // Open video in new tab or trigger video player
      const videoUrl = `http://localhost:3001/segments/${episode.video_id}/playlist.m3u8`;
      window.open(`/video-player?url=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(episode.title)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-8 w-8 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Admin Panel</h2>
                  <p className="text-gray-400 text-sm">Quản lý nội dung</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('series')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'series' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                📺 Quản lý Series
              </button>
              <button
                onClick={() => setActiveTab('episodes')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'episodes' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                🎬 Quản lý Episodes
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'videos' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                📹 Quản lý Videos
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="p-4 border-t border-gray-700 mt-auto">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới dữ liệu</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-800 overflow-y-auto">
          {activeTab === 'series' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Quản lý Series</h3>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Thêm Series</span>
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Đang tải dữ liệu...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {series.map((item) => (
                    <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="text-white font-semibold mb-2">{item.title}</h4>
                        <p className="text-blue-300 text-sm mb-2">{item.title_vietnamese}</p>
                        <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                          <span>{item.year}</span>
                          <span>{item.episode_count} tập</span>
                          <span>⭐ {item.rating}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSeries(item);
                              setActiveTab('episodes');
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors"
                          >
                            Xem Episodes
                          </button>
                          <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Quản lý Episodes</h3>
                  {selectedSeries && (
                    <p className="text-gray-400">
                      {selectedSeries.title} - {selectedSeries.title_vietnamese}
                    </p>
                  )}
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('series')}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Quay lại Series
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Thêm Episode</span>
                  </button>
                </div>
              </div>

              {!selectedSeries ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Chọn một series để xem episodes</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Đang tải episodes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {episodes.map((episode) => {
                    const videoStatus = getVideoStatus(episode);
                    const StatusIcon = videoStatus.icon;
                    
                    return (
                      <div key={episode.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <img
                              src={episode.thumbnail}
                              alt={episode.title}
                              className="w-20 h-28 object-cover rounded"
                            />
                            <div>
                              <h4 className="text-white font-semibold text-lg">
                                Tập {episode.number}: {episode.title}
                              </h4>
                              <p className="text-blue-300 mb-2">{episode.title_vietnamese}</p>
                              <p className="text-gray-400 text-sm mb-2">{episode.duration}</p>
                              <div className={`flex items-center space-x-2 ${videoStatus.color}`}>
                                <StatusIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">{videoStatus.text}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {videoStatus.status === 'completed' && (
                              <button
                                onClick={() => handlePlayVideo(episode)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                              >
                                <Play className="h-4 w-4" />
                                <span>Xem</span>
                              </button>
                            )}
                            
                            <label className={`cursor-pointer ${
                              isUploading && uploadingEpisode === episode.id 
                                ? 'bg-gray-600 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors`}>
                              <Upload className="h-4 w-4" />
                              <span>
                                {isUploading && uploadingEpisode === episode.id 
                                  ? 'Đang tải...' 
                                  : videoStatus.status === 'completed' 
                                    ? 'Tải lại' 
                                    : 'Tải video'
                                }
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleVideoUpload(episode.id, file);
                                  }
                                }}
                              />
                            </label>

                            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="p-6">
              <h3 className="text-2xl font-bold text-white mb-6">Quản lý Videos</h3>
              <div className="text-center py-12">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Tính năng quản lý video sẽ có sớm...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;