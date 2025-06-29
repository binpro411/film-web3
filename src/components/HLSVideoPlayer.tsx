import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Import HLS.js dynamically
let Hls: any = null;

interface HLSVideoPlayerProps {
  src: string;
  title: string;
  seriesId?: string;
  episodeId?: string;
  videoId?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
  resumeTime?: number;
}

const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
  src,
  title,
  seriesId,
  episodeId,
  videoId,
  onTimeUpdate,
  onEnded,
  className = '',
  resumeTime = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [hlsReady, setHlsReady] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);

  const { user, updateWatchProgress } = useAuth();

  // Progress saving throttle
  const lastProgressSaveRef = useRef(0);
  const lastLocalProgressRef = useRef(0);

  // Load HLS.js
  useEffect(() => {
    const loadHLS = async () => {
      if (!Hls) {
        try {
          const hlsModule = await import('hls.js');
          Hls = hlsModule.default;
          console.log('✅ HLS.js loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load HLS.js:', error);
          setError('Không thể tải HLS.js library');
        }
      }
    };
    loadHLS();
  }, []);

  // Throttled progress save function
  const saveProgress = useCallback(async (progress: number, duration: number) => {
    if (!user || !videoId || duration < 1) return;

    const now = Date.now();
    if (now - lastProgressSaveRef.current < 10000) return; // Only save every 10 seconds

    lastProgressSaveRef.current = now;

    try {
      await fetch('http://localhost:3001/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          videoId,
          progress,
          duration
        })
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [user, videoId]);

  // Throttled local progress update
  const updateLocalProgress = useCallback((current: number, duration: number) => {
    const now = Date.now();
    if (now - lastLocalProgressRef.current < 5000) return; // Only update every 5 seconds

    lastLocalProgressRef.current = now;

    if (seriesId && episodeId) {
      updateWatchProgress(seriesId, episodeId, current, duration);
    }
  }, [seriesId, episodeId, updateWatchProgress]);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !Hls) return;

    console.log('🎬 Initializing HLS player for:', src);

    // Reset states
    setError(null);
    setIsLoading(true);
    setHlsReady(false);
    setRetryCount(0);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initializeHLS = () => {
      if (Hls.isSupported()) {
        console.log('✅ HLS.js is supported, using HLS.js');
        
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          liveDurationInfinity: false,
          liveBackBufferLength: 0,
          maxLiveSyncPlaybackRate: 1,
          liveSyncDuration: undefined,
          liveMaxLatencyDuration: undefined,
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,
          minAutoBitrate: 0,
          testBandwidth: true,
          progressive: false,
          xhrSetup: (xhr: XMLHttpRequest, url: string) => {
            // Add CORS headers for cross-origin requests
            xhr.withCredentials = false;
          },
          fetchSetup: (context: any, initParams: any) => {
            // Add CORS headers for fetch requests
            initParams.mode = 'cors';
            initParams.credentials = 'omit';
            return new Request(context.url, initParams);
          }
        });

        hlsRef.current = hls;

        // HLS Events
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('📋 HLS manifest parsed:', data);
          setHlsLevels(data.levels || []);
          setCurrentLevel(hls.currentLevel);
          setHlsReady(true);
          
          if (resumeTime > 0) {
            console.log(`⏭️ Setting resume time: ${resumeTime}s`);
            video.currentTime = resumeTime;
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          console.log(`📊 Quality switched to: ${data.level}`);
          setCurrentLevel(data.level);
        });

        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
          console.log(`📦 Fragment loaded: ${data.frag.sn}`);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS Error:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('🔄 Network error, trying to recover...');
                if (retryCount < 3) {
                  setRetryCount(prev => prev + 1);
                  setTimeout(() => {
                    hls.startLoad();
                  }, 1000 * (retryCount + 1));
                } else {
                  setError('Lỗi mạng: Không thể tải video. Vui lòng kiểm tra kết nối internet.');
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('🔄 Media error, trying to recover...');
                if (retryCount < 3) {
                  setRetryCount(prev => prev + 1);
                  hls.recoverMediaError();
                } else {
                  setError('Lỗi media: Video không thể phát được. Có thể do codec không tương thích.');
                }
                break;
              default:
                console.log('💥 Fatal error, destroying HLS...');
                setError(`Lỗi HLS: ${data.details || 'Không xác định'}`);
                hls.destroy();
                break;
            }
          }
        });

        // Load HLS source
        try {
          hls.loadSource(src);
          hls.attachMedia(video);
        } catch (error) {
          console.error('❌ Failed to load HLS source:', error);
          setError('Không thể tải nguồn video HLS');
        }

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('✅ Native HLS support detected');
        video.src = src;
        setHlsReady(true);
      } else {
        console.error('❌ HLS not supported');
        setError('Trình duyệt không hỗ trợ HLS streaming');
      }
    };

    initializeHLS();

    // Video event listeners
    const handleLoadedMetadata = () => {
      console.log('📊 Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current, video.duration);
      
      // Throttled progress saving
      saveProgress(current, video.duration);
      updateLocalProgress(current, video.duration);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        setBuffered(bufferedPercent);
      }
    };

    const handlePlay = () => {
      console.log('▶️ Video playing');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('⏸️ Video paused');
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      console.log('⏳ Video buffering...');
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      console.log('✅ Video can play');
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      console.error('❌ Video error:', error);
      
      let errorMessage = 'Lỗi phát video';
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Phát video bị hủy bỏ';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Lỗi mạng khi tải video';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Lỗi giải mã video - codec không được hỗ trợ';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Định dạng video không được hỗ trợ';
            break;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    };

    const handleEnded = () => {
      console.log('🏁 Video ended');
      setIsPlaying(false);
      
      // Save final progress
      saveProgress(video.duration, video.duration);
      updateLocalProgress(video.duration, video.duration);
      
      onEnded?.();
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src, resumeTime, onTimeUpdate, onEnded, saveProgress, updateLocalProgress, retryCount]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      setShowControls(true);
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetTimeout();
    
    return () => clearTimeout(timeout);
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !hlsReady) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(error => {
        console.error('Play failed:', error);
        setError('Không thể phát video. Vui lòng thử lại.');
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
      console.log(`🎯 Quality changed to level ${levelIndex}`);
    }
  };

  const retryLoad = () => {
    setError(null);
    setRetryCount(0);
    setHlsReady(false);
    const video = videoRef.current;
    if (video) {
      video.load(); // Reload video
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getQualityLabel = (level: any) => {
    if (level.height) {
      return `${level.height}p`;
    }
    return `${Math.round(level.bitrate / 1000)}k`;
  };

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        muted={false}
      />

      {/* Loading Overlay */}
      {(isLoading || !hlsReady) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white mb-2">Đang tải HLS stream...</p>
            <p className="text-gray-400 text-sm">
              {hlsRef.current ? 'HLS.js đang load segments' : 'Khởi tạo HLS player'}
            </p>
            {retryCount > 0 && (
              <p className="text-yellow-400 text-xs mt-2">
                Đang thử lại... ({retryCount}/3)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center max-w-md mx-auto p-6">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Lỗi phát video</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="space-y-2 mb-4">
              <p className="text-gray-400 text-sm">Có thể do:</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Video chưa được xử lý hoàn tất</li>
                <li>• HLS segments bị lỗi hoặc thiếu</li>
                <li>• Kết nối mạng không ổn định</li>
                <li>• Server FFmpeg chưa hoàn thành</li>
                <li>• CORS policy chặn request</li>
              </ul>
            </div>
            <button
              onClick={retryLoad}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span>HLS.js Streaming</span>
              <div className={`w-2 h-2 rounded-full ${hlsReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
              {hlsLevels.length > 0 && (
                <span className="text-xs">
                  {hlsLevels.length} qualities
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && hlsReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="bg-white/20 backdrop-blur-sm text-white p-6 rounded-full hover:bg-white/30 transition-colors"
            >
              <Play className="h-12 w-12 fill-current" />
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div 
              className="w-full bg-gray-600/50 rounded-full h-2 cursor-pointer relative"
              onClick={handleSeek}
            >
              {/* Buffered Progress */}
              <div 
                className="absolute top-0 left-0 h-2 bg-gray-400/50 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Current Progress */}
              <div 
                className="absolute top-0 left-0 h-2 bg-blue-500 rounded-full"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-blue-400 transition-colors"
                title="Lùi 10s (←)"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              
              <button
                onClick={togglePlay}
                disabled={!hlsReady}
                className="bg-white text-black p-3 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
              </button>
              
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-blue-400 transition-colors"
                title="Tiến 10s (→)"
              >
                <SkipForward className="h-6 w-6" />
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 transition-colors"
                  title="Mute/Unmute"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  title="Volume (↑↓)"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={playbackRate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value);
                  setPlaybackRate(rate);
                  if (videoRef.current) {
                    videoRef.current.playbackRate = rate;
                  }
                }}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                title="Playback Speed"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              {/* Quality Selector */}
              {hlsLevels.length > 0 && (
                <select
                  value={currentLevel}
                  onChange={(e) => changeQuality(parseInt(e.target.value))}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                  title="Video Quality"
                >
                  <option value={-1}>Auto</option>
                  {hlsLevels.map((level, index) => (
                    <option key={index} value={index}>
                      {getQualityLabel(level)}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-blue-400 transition-colors"
                title="Fullscreen"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HLSVideoPlayer;