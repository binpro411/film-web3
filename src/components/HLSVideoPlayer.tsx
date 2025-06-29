import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2, Wifi } from 'lucide-react';
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
  const [quality, setQuality] = useState('Auto');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [segmentsLoaded, setSegmentsLoaded] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [loadingSegments, setLoadingSegments] = useState<string[]>([]);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [bufferHealth, setBufferHealth] = useState(0);

  const { user, updateWatchProgress } = useAuth();

  // Progressive loading state with throttling
  const [progressiveLoader, setProgressiveLoader] = useState({
    isActive: false,
    loadedSegments: 0,
    preloadBuffer: 3,
    lastLoadTime: 0,
    lastProgressSave: 0,
    isInitialized: false
  });

  // Throttled progress saving
  const saveProgressThrottled = useCallback(async (progress: number, duration: number) => {
    const now = Date.now();
    if (now - progressiveLoader.lastProgressSave < 10000) return; // Only save every 10 seconds

    if (!user || !videoId || duration < 1) return;

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

      setProgressiveLoader(prev => ({
        ...prev,
        lastProgressSave: now
      }));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [user, videoId, progressiveLoader.lastProgressSave]);

  // Initialize segments info ONCE
  const initializeSegments = useCallback(async () => {
    if (!videoId || progressiveLoader.isInitialized) return;

    try {
      const response = await fetch(`http://localhost:3001/api/video/${videoId}/segments?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setTotalSegments(data.totalSegments);
        setSegmentsLoaded(Math.min(10, data.totalSegments)); // Initial 10 segments
        setProgressiveLoader(prev => ({
          ...prev,
          isActive: true,
          isInitialized: true,
          loadedSegments: Math.min(10, data.totalSegments)
        }));
        console.log(`📊 Initialized: ${data.totalSegments} total segments, loaded first 10`);
      }
    } catch (error) {
      console.error('Failed to initialize segments:', error);
    }
  }, [videoId, progressiveLoader.isInitialized]);

  // Progressive loading with proper throttling
  const handleProgressiveLoading = useCallback((currentTime: number) => {
    if (!progressiveLoader.isActive || !duration || !totalSegments) return;

    const now = Date.now();
    if (now - progressiveLoader.lastLoadTime < 5000) return; // Throttle to 5 seconds

    const segmentDuration = 6;
    const currentSegment = Math.floor(currentTime / segmentDuration);
    const targetSegment = Math.min(currentSegment + progressiveLoader.preloadBuffer, totalSegments);
    
    if (targetSegment > progressiveLoader.loadedSegments) {
      preloadSegments(progressiveLoader.loadedSegments + 1, targetSegment);
      setProgressiveLoader(prev => ({
        ...prev,
        loadedSegments: targetSegment,
        lastLoadTime: now
      }));
    }
  }, [progressiveLoader, duration, totalSegments]);

  // Preload segments with proper error handling
  const preloadSegments = useCallback(async (startSegment: number, endSegment: number) => {
    const segmentsToLoad = [];
    for (let i = startSegment; i <= endSegment; i++) {
      segmentsToLoad.push(`segment_${i.toString().padStart(3, '0')}.ts`);
    }
    
    setLoadingSegments(segmentsToLoad);
    
    const startTime = Date.now();
    
    try {
      // Preload with HEAD requests (lighter than full downloads)
      const promises = segmentsToLoad.map(segment => 
        fetch(`http://localhost:3001/segments/${videoId}/${segment}`, { 
          method: 'HEAD',
          cache: 'force-cache' // Use browser cache
        }).catch(() => null) // Ignore individual failures
      );
      
      await Promise.allSettled(promises); // Don't fail if some segments fail
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      const estimatedSpeed = loadTime > 0 ? (segmentsToLoad.length * 1000) / loadTime : 0;
      setNetworkSpeed(estimatedSpeed);
      
      setSegmentsLoaded(prev => prev + segmentsToLoad.length);
      console.log(`📦 Preloaded segments ${startSegment}-${endSegment} (${loadTime}ms)`);
    } catch (error) {
      console.error('Segment preloading failed:', error);
    } finally {
      setLoadingSegments([]);
    }
  }, [videoId]);

  // Update buffer health
  const updateBufferHealth = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration) return;

    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const bufferedPercent = (bufferedEnd / duration) * 100;
      setBuffered(bufferedPercent);
      
      const bufferAhead = bufferedEnd - video.currentTime;
      const healthPercent = Math.min((bufferAhead / 30) * 100, 100);
      setBufferHealth(healthPercent);
    }
  }, [duration]);

  // Main video setup effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initialize segments info
    initializeSegments();

    // Set video source
    video.src = src;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      
      if (resumeTime > 0) {
        video.currentTime = resumeTime;
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current, video.duration);
      
      // Progressive loading (throttled)
      handleProgressiveLoading(current);
      
      // Save progress (throttled)
      saveProgressThrottled(current, video.duration);
      
      // Update local progress (throttled)
      if (seriesId && episodeId && Math.floor(current) % 5 === 0) {
        updateWatchProgress(seriesId, episodeId, current, video.duration);
      }
      
      // Update buffer health
      updateBufferHealth();
    };

    const handleProgress = () => {
      updateBufferHealth();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (videoId && user) {
        saveProgressThrottled(video.duration, video.duration);
      }
      if (seriesId && episodeId) {
        updateWatchProgress(seriesId, episodeId, video.duration, video.duration);
      }
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
    video.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src, resumeTime, initializeSegments, handleProgressiveLoading, saveProgressThrottled, updateBufferHealth, onTimeUpdate, onEnded, seriesId, episodeId, videoId, user, updateWatchProgress]);

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
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
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

  const getBufferHealthColor = () => {
    if (bufferHealth > 70) return 'text-green-400';
    if (bufferHealth > 30) return 'text-yellow-400';
    return 'text-red-400';
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
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white mb-2">Đang tải video...</p>
            {progressiveLoader.isActive && totalSegments > 0 && (
              <>
                <div className="bg-gray-700 rounded-full h-2 w-64 mx-auto mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(segmentsLoaded / totalSegments) * 100}%` }}
                  />
                </div>
                <p className="text-gray-300 text-sm">
                  Segments: {segmentsLoaded}/{totalSegments}
                </p>
                {loadingSegments.length > 0 && (
                  <p className="text-gray-400 text-xs mt-1">
                    Loading: {loadingSegments.slice(0, 2).join(', ')}
                    {loadingSegments.length > 2 && '...'}
                  </p>
                )}
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Wifi className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 text-xs">
                    {networkSpeed.toFixed(1)} seg/s
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">{title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-300">
              <div className="flex items-center space-x-1">
                <span>HLS Streaming</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              {totalSegments > 0 && (
                <span className="text-xs">({segmentsLoaded}/{totalSegments})</span>
              )}
              <div className={`flex items-center space-x-1 ${getBufferHealthColor()}`}>
                <Wifi className="h-3 w-3" />
                <span className="text-xs">{bufferHealth.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
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
                className="bg-white text-black p-3 rounded-full hover:bg-gray-200 transition-colors"
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

              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                title="Video Quality"
              >
                <option value="Auto">Auto</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
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