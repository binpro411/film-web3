import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MovieGrid from './components/MovieGrid';
import WeeklySchedule from './components/WeeklySchedule';
import MovieModal from './components/MovieModal';
import VideoPlayer from './components/VideoPlayer';
import SeriesDetailPage from './components/SeriesDetailPage';
import EpisodePlayer from './components/EpisodePlayer';
import AuthModal from './components/AuthModal';
import VipModal from './components/VipModal';
import PaymentModal from './components/PaymentModal';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import { Movie, Series, Episode, VipPlan } from './types';

function AppContent() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isSeriesDetailOpen, setIsSeriesDetailOpen] = useState(false);
  const [isEpisodePlayerOpen, setIsEpisodePlayerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedVipPlan, setSelectedVipPlan] = useState<VipPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [seriesData, setSeriesData] = useState<Series[]>([]);
  const [moviesData, setMoviesData] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataRefreshKey, setDataRefreshKey] = useState(0); // Add refresh key

  // Load data from PostgreSQL
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load series from PostgreSQL
      const seriesResponse = await fetch('http://localhost:3001/api/series');
      const seriesResult = await seriesResponse.json();
      
      if (seriesResult.success) {
        // Convert series data to movie format for compatibility
        const convertedMovies: Movie[] = seriesResult.series.map((series: any) => ({
          id: series.id,
          title: series.title,
          titleVietnamese: series.title_vietnamese,
          description: series.description,
          year: series.year,
          duration: series.total_duration || '24 phút/tập',
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
          type: 'series' as const,
          episodeCount: series.episode_count,
          airDay: series.air_day as any,
          airTime: series.air_time
        }));

        setMoviesData(convertedMovies);
        setSeriesData(seriesResult.series);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataRefreshKey]);

  // Function to refresh data (can be called from admin panel)
  const refreshData = () => {
    setDataRefreshKey(prev => prev + 1);
  };

  // Filter movies based on search query
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return moviesData;
    
    const query = searchQuery.toLowerCase();
    return moviesData.filter(movie => 
      movie.title.toLowerCase().includes(query) ||
      movie.titleVietnamese.includes(query) ||
      movie.genre.some(g => g.toLowerCase().includes(query)) ||
      movie.director.toLowerCase().includes(query)
    );
  }, [searchQuery, moviesData]);

  // Categorize movies
  const featuredMovies = filteredMovies.filter(movie => movie.featured);
  const newMovies = filteredMovies.filter(movie => movie.new);
  const scheduledMovies = filteredMovies.filter(movie => movie.airDay);
  const allMovies = filteredMovies;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handlePlayMovie = async (movie: Movie) => {
    if (movie.type === 'series') {
      try {
        // Load series details from PostgreSQL
        const response = await fetch(`http://localhost:3001/api/series/${movie.id}`);
        const result = await response.json();
        
        if (result.success && result.series.episodes.length > 0) {
          const seriesData = result.series;
          const firstEpisode = seriesData.episodes[0];
          
          // Convert to expected format
          const convertedSeries: Series = {
            id: seriesData.id,
            title: seriesData.title,
            titleVietnamese: seriesData.title_vietnamese,
            description: seriesData.description,
            year: seriesData.year,
            rating: seriesData.rating,
            genre: seriesData.genre,
            director: seriesData.director,
            studio: seriesData.studio,
            thumbnail: seriesData.thumbnail,
            banner: seriesData.banner,
            trailer: seriesData.trailer || '',
            featured: seriesData.featured,
            new: seriesData.new,
            popular: seriesData.popular,
            episodeCount: seriesData.episode_count,
            totalDuration: seriesData.total_duration,
            status: seriesData.status,
            episodes: seriesData.episodes.map((ep: any) => ({
              id: ep.id,
              number: ep.number,
              title: ep.title,
              titleVietnamese: ep.title_vietnamese,
              description: ep.description,
              duration: ep.duration,
              thumbnail: ep.thumbnail,
              releaseDate: ep.release_date,
              rating: ep.rating,
              watched: false,
              watchProgress: 0,
              hasBehindScenes: ep.has_behind_scenes,
              hasCommentary: ep.has_commentary,
              guestCast: ep.guest_cast || [],
              directorNotes: ep.director_notes
            })),
            comments: [],
            similarSeries: [],
            topEpisodes: []
          };

          const convertedEpisode: Episode = {
            id: firstEpisode.id,
            number: firstEpisode.number,
            title: firstEpisode.title,
            titleVietnamese: firstEpisode.title_vietnamese,
            description: firstEpisode.description,
            duration: firstEpisode.duration,
            thumbnail: firstEpisode.thumbnail,
            releaseDate: firstEpisode.release_date,
            rating: firstEpisode.rating,
            watched: false,
            watchProgress: 0,
            hasBehindScenes: firstEpisode.has_behind_scenes,
            hasCommentary: firstEpisode.has_commentary,
            guestCast: firstEpisode.guest_cast || [],
            directorNotes: firstEpisode.director_notes
          };

          setSelectedSeries(convertedSeries);
          setSelectedEpisode(convertedEpisode);
          setIsEpisodePlayerOpen(true);
        }
      } catch (error) {
        console.error('Failed to load series details:', error);
      }
    } else {
      setSelectedMovie(movie);
      setIsPlayerOpen(true);
    }
    setIsModalOpen(false);
    setIsSeriesDetailOpen(false);
  };

  const handleShowDetails = async (movie: Movie) => {
    if (movie.type === 'series') {
      try {
        // Load series details from PostgreSQL
        const response = await fetch(`http://localhost:3001/api/series/${movie.id}`);
        const result = await response.json();
        
        if (result.success) {
          const seriesData = result.series;
          
          const convertedSeries: Series = {
            id: seriesData.id,
            title: seriesData.title,
            titleVietnamese: seriesData.title_vietnamese,
            description: seriesData.description,
            year: seriesData.year,
            rating: seriesData.rating,
            genre: seriesData.genre,
            director: seriesData.director,
            studio: seriesData.studio,
            thumbnail: seriesData.thumbnail,
            banner: seriesData.banner,
            trailer: seriesData.trailer || '',
            featured: seriesData.featured,
            new: seriesData.new,
            popular: seriesData.popular,
            episodeCount: seriesData.episode_count,
            totalDuration: seriesData.total_duration,
            status: seriesData.status,
            episodes: seriesData.episodes.map((ep: any) => ({
              id: ep.id,
              number: ep.number,
              title: ep.title,
              titleVietnamese: ep.title_vietnamese,
              description: ep.description,
              duration: ep.duration,
              thumbnail: ep.thumbnail,
              releaseDate: ep.release_date,
              rating: ep.rating,
              watched: false,
              watchProgress: 0,
              hasBehindScenes: ep.has_behind_scenes,
              hasCommentary: ep.has_commentary,
              guestCast: ep.guest_cast || [],
              directorNotes: ep.director_notes
            })),
            comments: [],
            similarSeries: [],
            topEpisodes: []
          };

          setSelectedSeries(convertedSeries);
          setIsSeriesDetailOpen(true);
        }
      } catch (error) {
        console.error('Failed to load series details:', error);
      }
    } else {
      setSelectedMovie(movie);
      setIsModalOpen(true);
    }
  };

  const handlePlayEpisode = (seriesData: Series, episode: Episode) => {
    setSelectedSeries(seriesData);
    setSelectedEpisode(episode);
    setIsEpisodePlayerOpen(true);
    setIsSeriesDetailOpen(false);
  };

  const handleEpisodeChange = (episode: Episode) => {
    setSelectedEpisode(episode);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedMovie(null);
  };

  const handleCloseSeriesDetail = () => {
    setIsSeriesDetailOpen(false);
    setSelectedSeries(null);
  };

  const handleCloseEpisodePlayer = () => {
    setIsEpisodePlayerOpen(false);
    setSelectedSeries(null);
    setSelectedEpisode(null);
  };

  const handleOpenAuth = () => {
    setIsAuthModalOpen(true);
  };

  const handleOpenVip = () => {
    setIsVipModalOpen(true);
  };

  const handleOpenAdmin = () => {
    setIsAdminPanelOpen(true);
  };

  const handleCloseAdmin = () => {
    setIsAdminPanelOpen(false);
    // Refresh data when admin panel closes
    refreshData();
  };

  const handleSelectVipPlan = (plan: VipPlan) => {
    setSelectedVipPlan(plan);
    setIsVipModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleClosePayment = () => {
    setIsPaymentModalOpen(false);
    setSelectedVipPlan(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Đang tải dữ liệu từ PostgreSQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        onSearch={handleSearch} 
        onOpenAuth={handleOpenAuth} 
        onOpenVip={handleOpenVip}
        onOpenAdmin={handleOpenAdmin}
      />
      
      <main className="pt-16">
        {/* Hero Section - only show if no search query */}
        {!searchQuery && featuredMovies.length > 0 && (
          <Hero
            featuredMovies={featuredMovies}
            onPlayMovie={handlePlayMovie}
            onShowDetails={handleShowDetails}
          />
        )}

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {searchQuery ? (
            <MovieGrid
              title={`Kết quả tìm kiếm: "${searchQuery}" (${filteredMovies.length} kết quả)`}
              movies={filteredMovies}
              onPlayMovie={handlePlayMovie}
              onShowDetails={handleShowDetails}
            />
          ) : (
            <>
              {newMovies.length > 0 && (
                <MovieGrid
                  title="Mới Nhất 🔥"
                  movies={newMovies}
                  onPlayMovie={handlePlayMovie}
                  onShowDetails={handleShowDetails}
                />
              )}

              {scheduledMovies.length > 0 && (
                <WeeklySchedule
                  movies={scheduledMovies}
                  onPlayMovie={handlePlayMovie}
                  onShowDetails={handleShowDetails}
                />
              )}

              <MovieGrid
                title="Tất Cả Phim Hoạt Hình"
                movies={allMovies}
                onPlayMovie={handlePlayMovie}
                onShowDetails={handleShowDetails}
              />
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Modals and Players */}
      <MovieModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPlay={handlePlayMovie}
      />

      <VideoPlayer
        movie={selectedMovie}
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
      />

      <SeriesDetailPage
        series={selectedSeries}
        isOpen={isSeriesDetailOpen}
        onClose={handleCloseSeriesDetail}
        onPlayEpisode={handlePlayEpisode}
        allSeries={seriesData}
      />

      <EpisodePlayer
        series={selectedSeries}
        currentEpisode={selectedEpisode}
        isOpen={isEpisodePlayerOpen}
        onClose={handleCloseEpisodePlayer}
        onEpisodeChange={handleEpisodeChange}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <VipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        onSelectPlan={handleSelectVipPlan}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePayment}
        selectedPlan={selectedVipPlan}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={handleCloseAdmin}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;