import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HLSVideoPlayerProps {
  src: string;
  title: string;
  seriesId?: string;
  episodeId?: string;
  videoId?: string; // Database video ID
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

  const { user, updateWatchProgress } = useAuth();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Load video source
    if (src.includes('.m3u8')) {
      // HLS source - load segments info
      loadSegmentsInfo();
      video.src = src;
    } else {
      // Direct video source
      video.src = src;
    }

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
      
      // Save progress to server if videoId exists
      if (videoId && user && Math.floor(current) % 10 === 0) {
        saveProgressToServer(current, video.duration);
      }
      
      // Update local progress
      if (seriesId && episodeId && Math.floor(current) % 10 === 0) {
        updateWatchProgress(seriesId, episodeId, current, video.duration);
      }
      
      // Update buffered progress
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        setBuffered(bufferedPercent);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (videoId && user) {
        saveProgressToServer(video.duration, video.duration);
      }
      if (seriesId && episodeId) {
        updateWatchProgress(seriesId, episodeId, video.duration, video.duration);
      }
      onEnded?.();
    };

    const handleProgress = () => {
      // Simulate segment loading for HLS
      if (src.includes('.m3u8') && totalSegments > 0) {
        const currentSegment = Math.floor((video.currentTime / video.duration) * totalSegments);
        const loadedSegments = Math.min(currentSegment + 3, totalSegments); // Load 3 segments ahead
        setSegmentsLoaded(loadedSegments);
        
        // Show which segments are being loaded
        const loading = [];
        for (let i = currentSegment; i < loadedSegments; i++) {
          loading.push(`segment_${i.toString().padStart(3, '0')}.ts`);
        }
        setLoadingSegments(loading);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('progress', handleProgress);
    };
  }, [src, onTimeUpdate, onEnded, resumeTime, seriesId, episodeId, videoId, user, updateWatchProgress]);

  const loadSegmentsInfo = async () => {
    if (videoId) {
      try {
        const response = await fetch(`http://localhost:3001/api/video/${videoId}/segments`);
        const data = await response.json();
        if (data.success) {
          setTotalSegments(data.totalSegments);
        }
      } catch (error) {
        console.error('Failed to load segments info:', error);
      }
    }
  };

  const saveProgressToServer = async (progress: number, duration: number) => {
    if (!user || !videoId) return;

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
  };

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
            {totalSegments > 0 && (
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
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <span>HLS Streaming</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {totalSegments > 0 && (
                <span className="text-xs">({segmentsLoaded}/{totalSegments} segments)</span>
              )}
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