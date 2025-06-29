import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Play, 
  Eye, 
  Search, 
  Save,
  X,
  Film,
  Calendar,
  Clock,
  Star,
  Database,
  BarChart3,
  Video,
  FileText,
  Image,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import VideoUploadModal from './VideoUploadModal';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  trailer: string;
  featured: boolean;
  new: boolean;
  popular: boolean;
  episode_count: number;
  total_duration: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  air_day: string;
  air_time: string;
  actual_episode_count: number;
  videos_count: number;
  episodes?: Episode[];
}

interface Episode {
  id: string;
  series_id: string;
  number: number;
  title: string;
  title_vietnamese: string;
  description: string;
  duration: string;
  thumbnail: string;
  release_date: string;
  rating: number;
  has_behind_scenes: boolean;
  has_commentary: boolean;
  guest_cast: string[];
  director_notes: string;
  video_id?: string;
  video_status?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'series'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [seriesData, setSeriesData] = useState<Series[]>([]);
  const [episodesData, setEpisodesData] = useState<Episode[]>([]);

  // Load series data
  const loadSeries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/series');
      const data = await response.json();
      
      if (data.success) {
        setSeriesData(data.series);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to load series:', error);
      setError('Failed to load series data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load episodes for selected series
  const loadEpisodes = async (seriesId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/series/${seriesId}/episodes`);
      const data = await response.json();
      
      if (data.success) {
        setEpisodesData(data.episodes);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSeries();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSeries) {
      loadEpisodes(selectedSeries.id);
    }
  }, [selectedSeries]);

  if (!isOpen) return null;

  const handleCreateSeries = () => {
    setEditingItem(null);
    setIsSeriesModalOpen(true);
  };

  const handleEditSeries = (series: Series) => {
    setEditingItem(series);
    setIsSeriesModalOpen(true);
  };

  const handleDeleteSeries = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa series này? Tất cả tập phim và video sẽ bị xóa.')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/series/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadSeries();
        if (selectedSeries?.id === id) {
          setSelectedSeries(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete series:', error);
    }
  };

  const handleCreateEpisode = () => {
    if (!selectedSeries) return;
    setEditingItem(null);
    setIsEpisodeModalOpen(true);
  };

  const handleEditEpisode = (episode: Episode) => {
    setEditingItem(episode);
    setIsEpisodeModalOpen(true);
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tập phim này?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/episodes/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (selectedSeries) {
          loadEpisodes(selectedSeries.id);
        }
      }
    } catch (error) {
      console.error('Failed to delete episode:', error);
    }
  };

  const handleVideoUpload = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsUploadModalOpen(true);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Tổng Series</p>
              <p className="text-3xl font-bold">{seriesData.length}</p>
            </div>
            <Film className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Tổng Tập Phim</p>
              <p className="text-3xl font-bold">
                {seriesData.reduce((sum, series) => sum + (series.actual_episode_count || 0), 0)}
              </p>
            </div>
            <Video className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Videos Uploaded</p>
              <p className="text-3xl font-bold">
                {seriesData.reduce((sum, series) => sum + (series.videos_count || 0), 0)}
              </p>
            </div>
            <Upload className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Đang Phát Sóng</p>
              <p className="text-3xl font-bold">
                {seriesData.filter(s => s.status === 'ongoing').length}
              </p>
            </div>
            <Clock className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Series Gần Đây</span>
        </h3>
        <div className="space-y-3">
          {seriesData.slice(0, 5).map((series) => (
            <div key={series.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={series.thumbnail}
                  alt={series.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div>
                  <p className="text-white font-medium">{series.title}</p>
                  <p className="text-blue-300 text-sm">{series.title_vietnamese}</p>
                  <p className="text-gray-400 text-xs">
                    {series.actual_episode_count}/{series.episode_count} tập • {series.videos_count} videos
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                series.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                series.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {series.status === 'completed' ? 'Hoàn thành' :
                 series.status === 'ongoing' ? 'Đang phát' : 'Sắp ra mắt'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSeries = () => (
    <div className="space-y-6">
      {/* Header với nút Thêm Series - ĐẶT Ở TRÊN CÙNG */}
      <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Quản Lý Series</h2>
            <p className="text-gray-400 text-sm">Tạo và quản lý series phim hoạt hình</p>
          </div>
          <button
            onClick={handleCreateSeries}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Thêm Series Mới</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm series..."
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Series List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Series Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Danh Sách Series ({seriesData.length})</h3>
            <div className="text-sm text-gray-400">
              {seriesData.filter(s => s.status === 'ongoing').length} đang phát sóng
            </div>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {seriesData
              .filter(series => 
                series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                series.title_vietnamese.includes(searchQuery)
              )
              .map((series) => (
                <div 
                  key={series.id} 
                  className={`bg-gray-800 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedSeries?.id === series.id 
                      ? 'ring-2 ring-blue-500 bg-gray-750' 
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedSeries(series)}
                >
                  <div className="flex space-x-4">
                    <img
                      src={series.thumbnail}
                      alt={series.title}
                      className="w-16 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{series.title}</h4>
                          <p className="text-blue-300 text-sm">{series.title_vietnamese}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSeries(series);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeries(series.id);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                        <span>{series.year}</span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span>{series.rating}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          series.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          series.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {series.status === 'completed' ? 'Hoàn thành' :
                           series.status === 'ongoing' ? 'Đang phát' : 'Sắp ra mắt'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400">
                        {series.actual_episode_count}/{series.episode_count} tập • {series.videos_count} videos
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Episodes Panel */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {selectedSeries ? (
            <div className="h-full flex flex-col">
              {/* Header với nút Thêm Tập - ĐẶT Ở TRÊN CÙNG */}
              <div className="bg-gray-700 p-6 border-b border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Tập Phim - {selectedSeries.title_vietnamese}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {episodesData.length} tập • {episodesData.filter(ep => ep.video_id).length} có video
                    </p>
                  </div>
                  <button
                    onClick={handleCreateEpisode}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">Thêm Tập</span>
                  </button>
                </div>
              </div>

              {/* Episodes List */}
              <div className="flex-1 p-6">
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {episodesData.length > 0 ? (
                    episodesData.map((episode) => (
                      <div key={episode.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">Tập {episode.number}</h4>
                          <div className="flex space-x-1">
                            {!episode.video_id && (
                              <button
                                onClick={() => handleVideoUpload(episode)}
                                className="bg-green-600 hover:bg-green-700 text-white p-1 rounded transition-colors"
                                title="Upload Video"
                              >
                                <Upload className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditEpisode(episode)}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteEpisode(episode.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-1">{episode.title}</p>
                        <p className="text-blue-300 text-xs mb-2">{episode.title_vietnamese}</p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{episode.duration}</span>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              episode.video_id ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <span>{episode.video_id ? 'Có video' : 'Chưa có video'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Video className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400 mb-4">Chưa có tập phim nào</p>
                      <button
                        onClick={handleCreateEpisode}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Thêm Tập Đầu Tiên
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12">
              <div className="text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Chọn Series</h3>
                <p className="text-gray-400">Chọn một series để xem và quản lý tập phim</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'overview' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Tổng Quan</span>
                </button>

                <button
                  onClick={() => setActiveTab('series')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'series' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Film className="h-5 w-5" />
                  <span>Quản Lý Series</span>
                </button>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'series' && renderSeries()}
            </div>
          </div>
        </div>
      </div>

      {/* Series Modal - HIỂN THỊ Ở TRÊN CÙNG */}
      <SeriesModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
        series={editingItem}
        onSave={() => {
          loadSeries();
          setIsSeriesModalOpen(false);
        }}
      />

      {/* Episode Modal - HIỂN THỊ Ở TRÊN CÙNG */}
      <EpisodeModal
        isOpen={isEpisodeModalOpen}
        onClose={() => setIsEpisodeModalOpen(false)}
        episode={editingItem}
        seriesId={selectedSeries?.id}
        onSave={() => {
          if (selectedSeries) {
            loadEpisodes(selectedSeries.id);
          }
          setIsEpisodeModalOpen(false);
        }}
      />

      {/* Video Upload Modal */}
      {selectedEpisode && (
        <VideoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedEpisode(null);
          }}
          onVideoUploaded={() => {
            if (selectedSeries) {
              loadEpisodes(selectedSeries.id);
            }
            setIsUploadModalOpen(false);
            setSelectedEpisode(null);
          }}
          episodeId={selectedEpisode.id}
          episodeNumber={selectedEpisode.number}
          seriesTitle={selectedSeries?.title_vietnamese || ''}
        />
      )}
    </>
  );
};

// Series Modal Component - HIỂN THỊ Ở TRÊN CÙNG
const SeriesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  series?: Series | null;
  onSave: () => void;
}> = ({ isOpen, onClose, series, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    title_vietnamese: '',
    description: '',
    year: new Date().getFullYear(),
    rating: 0,
    genre: [] as string[],
    director: '',
    studio: '',
    thumbnail: '',
    banner: '',
    trailer: '',
    featured: false,
    new: false,
    popular: false,
    episode_count: 0,
    total_duration: '',
    status: 'upcoming' as 'ongoing' | 'completed' | 'upcoming',
    air_day: '',
    air_time: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (series) {
      setFormData({
        title: series.title,
        title_vietnamese: series.title_vietnamese,
        description: series.description,
        year: series.year,
        rating: series.rating,
        genre: series.genre,
        director: series.director,
        studio: series.studio,
        thumbnail: series.thumbnail,
        banner: series.banner,
        trailer: series.trailer || '',
        featured: series.featured,
        new: series.new,
        popular: series.popular,
        episode_count: series.episode_count,
        total_duration: series.total_duration,
        status: series.status,
        air_day: series.air_day || '',
        air_time: series.air_time || ''
      });
    } else {
      setFormData({
        title: '',
        title_vietnamese: '',
        description: '',
        year: new Date().getFullYear(),
        rating: 0,
        genre: [],
        director: '',
        studio: '',
        thumbnail: '',
        banner: '',
        trailer: '',
        featured: false,
        new: false,
        popular: false,
        episode_count: 0,
        total_duration: '',
        status: 'upcoming',
        air_day: '',
        air_time: ''
      });
    }
  }, [series]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = series 
        ? `http://localhost:3001/api/series/${series.id}`
        : 'http://localhost:3001/api/series';
      
      const method = series ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save series:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreChange = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter(g => g !== genre)
        : [...prev.genre, genre]
    }));
  };

  const availableGenres = [
    'Hành Động', 'Phiêu Lưu', 'Tu Tiên', 'Drama', 'Romance', 'Comedy',
    'Siêu Nhiên', 'Mecha', 'Slice of Life', 'Thriller', 'Horror', 'Mystery'
  ];

  const weekDays = [
    { value: 'monday', label: 'Thứ Hai' },
    { value: 'tuesday', label: 'Thứ Ba' },
    { value: 'wednesday', label: 'Thứ Tư' },
    { value: 'thursday', label: 'Thứ Năm' },
    { value: 'friday', label: 'Thứ Sáu' },
    { value: 'saturday', label: 'Thứ Bảy' },
    { value: 'sunday', label: 'Chủ Nhật' }
  ];

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm">
      {/* CONTAINER HIỂN THỊ Ở TRÊN CÙNG */}
      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 pt-8">
          <div className="bg-gray-900 rounded-2xl max-w-4xl w-full border border-gray-700 my-8">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {series ? 'Chỉnh Sửa Series' : 'Thêm Series Mới'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tên Tiếng Anh
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tên Tiếng Việt
                  </label>
                  <input
                    type="text"
                    value={formData.title_vietnamese}
                    onChange={(e) => setFormData(prev => ({ ...prev, title_vietnamese: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mô Tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Năm
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Đánh Giá
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Số Tập
                  </label>
                  <input
                    type="number"
                    value={formData.episode_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, episode_count: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Đạo Diễn
                  </label>
                  <input
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData(prev => ({ ...prev, director: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Studio
                  </label>
                  <input
                    type="text"
                    value={formData.studio}
                    onChange={(e) => setFormData(prev => ({ ...prev, studio: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Thể Loại
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {availableGenres.map((genre) => (
                    <label key={genre} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.genre.includes(genre)}
                        onChange={() => handleGenreChange(genre)}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banner URL
                  </label>
                  <input
                    type="url"
                    value={formData.banner}
                    onChange={(e) => setFormData(prev => ({ ...prev, banner: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trạng Thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upcoming">Sắp ra mắt</option>
                    <option value="ongoing">Đang phát sóng</option>
                    <option value="completed">Đã hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ngày Phát Sóng
                  </label>
                  <select
                    value={formData.air_day}
                    onChange={(e) => setFormData(prev => ({ ...prev, air_day: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn ngày</option>
                    {weekDays.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Giờ Phát Sóng
                  </label>
                  <input
                    type="time"
                    value={formData.air_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, air_time: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Nổi bật</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.new}
                    onChange={(e) => setFormData(prev => ({ ...prev, new: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Mới</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.popular}
                    onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Phổ biến</span>
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{series ? 'Cập Nhật' : 'Tạo Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Episode Modal Component - HIỂN THỊ Ở TRÊN CÙNG
const EpisodeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  episode?: Episode | null;
  seriesId?: string;
  onSave: () => void;
}> = ({ isOpen, onClose, episode, seriesId, onSave }) => {
  const [formData, setFormData] = useState({
    number: 1,
    title: '',
    title_vietnamese: '',
    description: '',
    duration: '24:00',
    thumbnail: '',
    release_date: new Date().toISOString().split('T')[0],
    rating: 8.0,
    has_behind_scenes: false,
    has_commentary: false,
    guest_cast: [] as string[],
    director_notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (episode) {
      setFormData({
        number: episode.number,
        title: episode.title,
        title_vietnamese: episode.title_vietnamese,
        description: episode.description,
        duration: episode.duration,
        thumbnail: episode.thumbnail,
        release_date: episode.release_date,
        rating: episode.rating,
        has_behind_scenes: episode.has_behind_scenes,
        has_commentary: episode.has_commentary,
        guest_cast: episode.guest_cast || [],
        director_notes: episode.director_notes || ''
      });
    } else {
      setFormData({
        number: 1,
        title: '',
        title_vietnamese: '',
        description: '',
        duration: '24:00',
        thumbnail: '',
        release_date: new Date().toISOString().split('T')[0],
        rating: 8.0,
        has_behind_scenes: false,
        has_commentary: false,
        guest_cast: [],
        director_notes: ''
      });
    }
  }, [episode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = episode 
        ? `http://localhost:3001/api/episodes/${episode.id}`
        : `http://localhost:3001/api/series/${seriesId}/episodes`;
      
      const method = episode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save episode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm">
      {/* CONTAINER HIỂN THỊ Ở TRÊN CÙNG */}
      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 pt-8">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full border border-gray-700 my-8">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {episode ? 'Chỉnh Sửa Tập Phim' : 'Thêm Tập Phim Mới'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Số Tập
                  </label>
                  <input
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: parseInt(e.target.value) }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Thời Lượng
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="24:00"
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên Tập (Tiếng Anh)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên Tập (Tiếng Việt)
                </label>
                <input
                  type="text"
                  value={formData.title_vietnamese}
                  onChange={(e) => setFormData(prev => ({ ...prev, title_vietnamese: e.target.value }))}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mô Tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ngày Phát Hành
                  </label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Đánh Giá
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.rating}
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_behind_scenes}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_behind_scenes: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Có hậu trường</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_commentary}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_commentary: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Có bình luận đạo diễn</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ghi Chú Đạo Diễn
                </label>
                <textarea
                  value={formData.director_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, director_notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{episode ? 'Cập Nhật' : 'Tạo Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;