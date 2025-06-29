import React, { useState, useRef } from 'react';
import { X, Upload, Video, CheckCircle, Loader2, Play, FileVideo, HardDrive, Clock, Database } from 'lucide-react';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoUploaded: (videoData: any) => void;
  episodeId: string;
  episodeNumber?: number;
  seriesTitle?: string;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onVideoUploaded,
  episodeId,
  episodeNumber = 1,
  seriesTitle = "Series"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState<any>(null);
  const [segmentationProgress, setSegmentationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Vui lòng chọn file video hợp lệ');
      return;
    }

    processVideo(file);
  };

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setSegmentationProgress(0);
    setProcessingStage('Đang tải video lên server...');

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('video', file);

      // Upload video with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      const uploadResponse = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('POST', `http://localhost:3001/api/episodes/${episodeId}/upload-video`);
        xhr.send(formData);
      });

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Upload failed');
      }

      const videoId = uploadResponse.videoId;
      setProcessingStage('Video đã tải lên! Đang tạo segments...');

      // Poll for segmentation progress
      await pollSegmentationProgress(videoId);

    } catch (error) {
      console.error('Video processing error:', error);
      alert(`Có lỗi xảy ra: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const pollSegmentationProgress = async (videoId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const checkProgress = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/video/${videoId}`);
        const data = await response.json();

        if (data.success) {
          const video = data.video;
          
          if (video.status === 'completed') {
            setProcessingStage('Hoàn thành!');
            setSegmentationProgress(100);

            const videoData = {
              id: videoId,
              title: video.title,
              episodeNumber,
              duration: formatDuration(video.duration),
              fileSize: video.fileSize,
              hlsUrl: `http://localhost:3001${video.hlsUrl}`,
              totalSegments: video.totalSegments || 0,
              uploadedAt: new Date().toISOString(),
              quality: '1080p',
              codec: 'H.264',
              bitrate: '4.2 Mbps'
            };

            setUploadedVideo(videoData);
            setIsProcessing(false);
            return;
          } else if (video.status === 'failed') {
            throw new Error('Video processing failed');
          } else if (video.status === 'processing') {
            // Update progress based on time elapsed
            const progress = Math.min((attempts / maxAttempts) * 100, 95);
            setSegmentationProgress(progress);
            setProcessingStage(`Đang tạo segments... ${Math.round(progress)}%`);
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkProgress, 5000); // Check every 5 seconds
        } else {
          throw new Error('Processing timeout');
        }

      } catch (error) {
        console.error('Progress check error:', error);
        setIsProcessing(false);
        alert(`Lỗi xử lý video: ${error.message}`);
      }
    };

    checkProgress();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleConfirmUpload = () => {
    if (uploadedVideo) {
      onVideoUploaded(uploadedVideo);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <Video className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Tải Video Lên</h2>
              <p className="text-blue-100">
                {seriesTitle} - Tập {episodeNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!uploadedVideo ? (
            <>
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">
                  Kéo thả video vào đây
                </h3>
                <p className="text-gray-400 mb-4">
                  Hoặc click để chọn file từ máy tính
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Chọn Video
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    <span className="text-white font-medium">{processingStage}</span>
                  </div>
                  
                  {/* Upload Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Upload Progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Segmentation Progress */}
                  {uploadProgress === 100 && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Segmentation Progress</span>
                        <span>{Math.round(segmentationProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${segmentationProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2 flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Hệ thống streaming PostgreSQL:</span>
                </h4>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• 📹 Upload video lên server với PostgreSQL database</li>
                  <li>• 🔄 FFmpeg tự động chia thành segments .ts</li>
                  <li>• 📊 Lưu metadata và segments vào PostgreSQL</li>
                  <li>• 🎬 Tạo HLS playlist (.m3u8) cho streaming</li>
                  <li>• 📡 Progressive loading từng segment 6 giây</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Upload Success */}
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-xl mb-2">
                  Video đã được xử lý thành công!
                </h3>
                <p className="text-gray-400">
                  Video đã sẵn sàng để streaming với {uploadedVideo.totalSegments} segments
                </p>
              </div>

              {/* Video Info */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h4 className="text-white font-semibold mb-4">Thông tin video</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <FileVideo className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Tên tập</p>
                      <p className="text-white font-medium">{uploadedVideo.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Thời lượng</p>
                      <p className="text-white font-medium">{uploadedVideo.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <HardDrive className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Kích thước</p>
                      <p className="text-white font-medium">{formatFileSize(uploadedVideo.fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Segments</p>
                      <p className="text-white font-medium">{uploadedVideo.totalSegments} files</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Info */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                  <Database className="h-5 w-5 text-green-400" />
                  <span>PostgreSQL Storage</span>
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Video ID:</span>
                    <span className="text-white font-mono text-xs">{uploadedVideo.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">HLS Manifest:</span>
                    <span className="text-green-400">playlist.m3u8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Segments stored:</span>
                    <span className="text-white">{uploadedVideo.totalSegments} .ts files</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Ready for streaming</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleConfirmUpload}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Xác Nhận & Thêm Vào Episode</span>
                </button>
                <button
                  onClick={() => setUploadedVideo(null)}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Tải Lại
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoUploadModal;