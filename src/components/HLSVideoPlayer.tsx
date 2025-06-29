import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  const { user, updateWatchProgress } = useAuth();

  // Progress saving throttle
  const lastProgressSaveRef = useRef(0);
  const lastLocalProgressRef = useRef(0);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    console.log('🎬 Loading HLS video:', src);

    // Reset states
    setError(null);
    setIsLoading(true);
    setHlsReady(false);

    // Set video source - Browser will handle HLS automatically
    video.src = src;

    const handleLoadStart = () => {
      console.log('📡 Video load started');
      setIsLoading(true);
    };

    const handleLoadedMetadata = () => {
      console.log('📊 Video metadata loaded:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      setDuration(video.duration);
      setHlsReady(true);
      
      if (resumeTime > 0 && resumeTime < video.duration) {
        console.log(`⏭️ Resuming from: ${resumeTime}s`);
        video.currentTime = resumeTime;
      }
    };

    const handleCanPlay = () => {
      console.log('✅ Video can play');
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
      console.log('⏳ Video waiting for data');
      setIsLoading(true);
    };

    const handlePlaying = () => {
      console.log('🎬 Video playing smoothly');
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      const error = (e.target as HTMLVideoElement).error;
      console.error('❌ Video error:', error);
      
      let errorMessage = 'Video playback error';
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Video decode error';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported';
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
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src, resumeTime, onTimeUpdate, onEnded, saveProgress, updateLocalProgress]);

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
        setError('Failed to play video');
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

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      />

      {/* Loading Overlay */}
      {(isLoading || !hlsReady) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white mb-2">Đang tải video HLS...</p>
            <p className="text-gray-400 text-sm">Browser đang tự động load segments</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-white text-xl font-bold mb-2">Lỗi phát video</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setHlsReady(false);
                const video = videoRef.current;
                if (video) {
                  video.load(); // Reload video
                }
              }}
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
              <span>HLS Streaming</span>
              <div className={`w-2 h-2 rounded-full ${hlsReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
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