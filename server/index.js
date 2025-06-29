import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure FFmpeg paths
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  console.log(`🎬 FFmpeg path set to: ${process.env.FFMPEG_PATH}`);
}

if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
  console.log(`🔍 FFprobe path set to: ${process.env.FFPROBE_PATH}`);
}

// Test FFmpeg installation
try {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.error('❌ FFmpeg test failed:', err.message);
      console.log('💡 Please check your FFmpeg installation and paths in .env file');
    } else {
      console.log('✅ FFmpeg is working correctly');
    }
  });
} catch (error) {
  console.error('❌ FFmpeg configuration error:', error.message);
}

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const UPLOAD_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
const SEGMENTS_DIR = path.resolve(__dirname, process.env.SEGMENTS_DIR || 'segments');
const VIDEOS_DIR = path.resolve(__dirname, process.env.VIDEOS_DIR || 'videos');

// Ensure directories exist
await fs.ensureDir(UPLOAD_DIR);
await fs.ensureDir(SEGMENTS_DIR);
await fs.ensureDir(VIDEOS_DIR);

console.log('📁 Directories initialized:');
console.log(`   Upload: ${UPLOAD_DIR}`);
console.log(`   Segments: ${SEGMENTS_DIR}`);
console.log(`   Videos: ${VIDEOS_DIR}`);

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
try {
  const client = await pool.connect();
  console.log('✅ Connected to PostgreSQL database');
  client.release();
} catch (error) {
  console.error('❌ PostgreSQL connection error:', error);
  console.log('💡 Please run: npm run setup-db');
  process.exit(1);
}

// Rate limiting for API requests
const requestTracker = new Map();

const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestTracker.has(clientIP)) {
      requestTracker.set(clientIP, []);
    }
    
    const requests = requestTracker.get(clientIP);
    
    // Clean old requests
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    validRequests.push(now);
    requestTracker.set(clientIP, validRequests);
    
    next();
  };
};

// Serve static files with proper HLS headers
app.use('/segments', express.static(SEGMENTS_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache segments for 1 year
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

app.use('/videos', express.static(VIDEOS_DIR));

// Apply rate limiting to API routes
app.use('/api/progress', rateLimit(6, 60000)); // 6 requests per minute

// Utility functions
const createSafeFilename = (originalName) => {
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0];
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  return `${timestamp}_${uuid}_${baseName}${ext}`;
};

const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('❌ FFprobe error:', err);
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        const size = metadata.format.size || 0;
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({ 
          duration, 
          size,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          bitrate: metadata.format.bit_rate || 0
        });
      }
    });
  });
};

// Enhanced multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeFilename = createSafeFilename(file.originalname);
    cb(null, safeFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 * 1024, // 10GB default
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
    }
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AnimeStream Video Server',
    version: '3.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
    ffmpeg: {
      path: process.env.FFMPEG_PATH || 'system',
      status: 'configured'
    },
    features: ['Video Upload', 'FFmpeg HLS Segmentation', 'Native Browser HLS', 'Watch Progress'],
    endpoints: {
      uploadVideo: 'POST /api/upload-video',
      getVideo: 'GET /api/video/:videoId',
      getVideoByEpisode: 'GET /api/videos/:seriesId/:episodeNumber',
      hlsManifest: 'GET /segments/:videoId/playlist.m3u8',
      hlsSegment: 'GET /segments/:videoId/segment_XXX.ts',
      updateProgress: 'POST /api/progress',
      getProgress: 'GET /api/progress/:userId/:videoId'
    }
  });
});

// Upload video endpoint
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  console.log('🎬 Video upload request received');
  console.log('📋 Request body:', req.body);
  console.log('📁 File info:', req.file);

  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No video file uploaded'
      });
    }

    const { seriesId, episodeNumber, title } = req.body;
    
    if (!seriesId || !episodeNumber || !title) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: seriesId, episodeNumber, title'
      });
    }

    const uploadedFile = req.file;
    const videoPath = uploadedFile.path;

    console.log(`📹 Processing video: ${title}`);
    console.log(`📊 File: ${uploadedFile.originalname} (${uploadedFile.size} bytes)`);

    // Get video metadata using FFmpeg
    console.log('🔍 Analyzing video with FFmpeg...');
    const metadata = await getVideoMetadata(videoPath);
    
    console.log(`⏱️  Duration: ${metadata.duration}s`);
    console.log(`📐 Resolution: ${metadata.width}x${metadata.height}`);
    console.log(`🎥 Video Codec: ${metadata.videoCodec}`);
    console.log(`🔊 Audio Codec: ${metadata.audioCodec}`);

    // Insert video record into PostgreSQL
    const insertVideoQuery = `
      INSERT INTO videos (
        title, series_id, episode_number, original_filename, safe_filename,
        duration, file_size, video_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const result = await client.query(insertVideoQuery, [
      title,
      seriesId,
      parseInt(episodeNumber),
      uploadedFile.originalname,
      uploadedFile.filename,
      metadata.duration,
      metadata.size,
      videoPath,
      'processing'
    ]);

    const videoId = result.rows[0].id;
    console.log(`💾 Video saved to PostgreSQL with ID: ${videoId}`);

    // Start FFmpeg processing in background
    console.log('🔄 Starting FFmpeg HLS segmentation...');
    processVideoWithFFmpeg(videoId, videoPath, metadata.duration);

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully. FFmpeg HLS processing started...',
      metadata: {
        duration: Math.floor(metadata.duration),
        fileSize: metadata.size,
        resolution: `${metadata.width}x${metadata.height}`,
        videoCodec: metadata.videoCodec,
        audioCodec: metadata.audioCodec,
        estimatedSegments: Math.ceil(metadata.duration / 6),
        originalFilename: uploadedFile.originalname,
        safeFilename: uploadedFile.filename
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// FFmpeg video processing function - FIXED for HLS
async function processVideoWithFFmpeg(videoId, videoPath, duration) {
  const client = await pool.connect();
  
  try {
    console.log(`🎬 Starting FFmpeg HLS processing for video ${videoId}`);
    
    // Create segments directory for this video
    const videoSegmentsDir = path.join(SEGMENTS_DIR, videoId);
    await fs.ensureDir(videoSegmentsDir);

    const hlsManifestPath = path.join(videoSegmentsDir, 'playlist.m3u8');
    const segmentPattern = path.join(videoSegmentsDir, 'segment_%03d.ts');

    // Update status to processing
    await client.query(
      'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['processing', videoId]
    );

    console.log(`🔧 FFmpeg HLS segmentation: 6s segments`);
    console.log(`📁 Output directory: ${videoSegmentsDir}`);
    console.log(`📁 Segment pattern: ${segmentPattern}`);
    
    await new Promise((resolve, reject) => {
      // CORRECT FFmpeg HLS command
      const command = ffmpeg(videoPath)
        .videoCodec('libx264')           // Video codec
        .audioCodec('aac')               // Audio codec
        .addOption('-preset', 'fast')    // Encoding speed
        .addOption('-crf', '23')         // Quality (lower = better)
        .addOption('-sc_threshold', '0') // Disable scene change detection
        .addOption('-g', '48')           // GOP size (keyframe every 48 frames)
        .addOption('-keyint_min', '48')  // Min keyframe interval
        .addOption('-hls_time', '6')     // Segment duration (6 seconds)
        .addOption('-hls_list_size', '0') // Keep all segments in playlist
        .addOption('-hls_segment_type', 'mpegts') // Use MPEG-TS format
        .addOption('-hls_segment_filename', segmentPattern) // Segment file pattern
        .addOption('-hls_flags', 'independent_segments') // Each segment is independent
        .format('hls')                   // Output format
        .output(hlsManifestPath)         // Output manifest file
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg command:', commandLine);
        })
        .on('progress', async (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent > 0 && percent <= 100) {
            console.log(`⏳ Processing: ${percent}% (${progress.timemark}) - Speed: ${progress.currentKbps || 0}kbps`);
            
            // Update progress in database (throttled)
            if (percent % 10 === 0) { // Update every 10%
              try {
                await client.query(
                  'UPDATE videos SET processing_progress = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                  [percent, videoId]
                );
              } catch (dbError) {
                console.error('❌ Progress update error:', dbError);
              }
            }
          }
        })
        .on('end', async () => {
          console.log('✅ FFmpeg HLS processing completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err);
          reject(err);
        });

      // Start the conversion
      command.run();
    });

    // Read generated segments and save to database
    console.log('📊 Reading generated HLS segments...');
    const segmentFiles = await fs.readdir(videoSegmentsDir);
    const tsFiles = segmentFiles.filter(file => file.endsWith('.ts')).sort();

    console.log(`📁 Found ${tsFiles.length} HLS segment files`);

    // Clear existing segments for this video
    await client.query('DELETE FROM segments WHERE video_id = $1', [videoId]);

    for (let i = 0; i < tsFiles.length; i++) {
      const filename = tsFiles[i];
      const filePath = path.join(videoSegmentsDir, filename);
      const stats = await fs.stat(filePath);
      
      // Calculate segment duration (approximate)
      const segmentDur = i === tsFiles.length - 1 
        ? duration - (i * 6) // Last segment might be shorter
        : 6;

      await client.query(
        `INSERT INTO segments (video_id, segment_number, filename, file_path, duration, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [videoId, i + 1, filename, filePath, segmentDur, stats.size]
      );
    }

    // Update video status to completed
    await client.query(
      `UPDATE videos SET 
        status = $1, 
        hls_manifest_path = $2, 
        total_segments = $3,
        processing_progress = 100,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      ['completed', hlsManifestPath, tsFiles.length, videoId]
    );

    console.log(`🎉 Video ${videoId} HLS processing completed successfully!`);
    console.log(`📁 HLS manifest: ${hlsManifestPath}`);
    console.log(`📊 Total segments: ${tsFiles.length}`);
    console.log(`🌐 HLS URL: http://localhost:${PORT}/segments/${videoId}/playlist.m3u8`);

  } catch (error) {
    console.error('❌ FFmpeg processing error:', error);
    
    // Update status to failed
    await client.query(
      'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['failed', videoId]
    );
  } finally {
    client.release();
  }
}

// Get video info
app.get('/api/video/:videoId', async (req, res) => {
  const { videoId } = req.params;
  console.log(`📹 Getting video info for: ${videoId}`);

  try {
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }

    const video = result.rows[0];
    console.log(`✅ Video found: ${video.title} (${video.status})`);

    res.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        seriesId: video.series_id,
        episodeNumber: video.episode_number,
        duration: video.duration,
        fileSize: video.file_size,
        status: video.status,
        processingProgress: video.processing_progress,
        totalSegments: video.total_segments,
        hlsUrl: video.status === 'completed' ? `/segments/${video.id}/playlist.m3u8` : null,
        createdAt: video.created_at,
        updatedAt: video.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get videos by series and episode - SIMPLIFIED
app.get('/api/videos/:seriesId/:episodeNumber', async (req, res) => {
  const { seriesId, episodeNumber } = req.params;
  console.log(`🔍 Looking for video: ${seriesId} episode ${episodeNumber}`);

  try {
    const result = await pool.query(
      'SELECT * FROM videos WHERE series_id = $1 AND episode_number = $2 AND status = $3',
      [seriesId, parseInt(episodeNumber), 'completed']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found or not ready' 
      });
    }

    const video = result.rows[0];
    console.log(`✅ Found video: ${video.title}`);

    res.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        hlsUrl: `/segments/${video.id}/playlist.m3u8`,
        status: video.status,
        totalSegments: video.total_segments
      }
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update watch progress with proper validation and throttling
app.post('/api/progress', async (req, res) => {
  const { userId, videoId, progress, duration } = req.body;
  
  // Validate input data
  if (!userId || !videoId || progress === undefined || duration === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, videoId, progress, duration'
    });
  }

  // Ensure duration is not null or zero
  const validDuration = Math.max(duration || 1, 1); // Minimum 1 second
  const validProgress = Math.max(progress || 0, 0);
  const percentage = (validProgress / validDuration) * 100;

  console.log(`📊 Updating progress: User ${userId}, Video ${videoId}, ${percentage.toFixed(1)}% (${validProgress}/${validDuration}s)`);

  try {
    await pool.query(
      `INSERT INTO watch_progress (user_id, video_id, progress, duration, percentage, last_watched_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, video_id) 
       DO UPDATE SET 
         progress = EXCLUDED.progress,
         duration = EXCLUDED.duration,
         percentage = EXCLUDED.percentage,
         last_watched_at = CURRENT_TIMESTAMP`,
      [userId, videoId, validProgress, validDuration, percentage]
    );

    console.log('✅ Progress updated successfully');
    res.json({ success: true, message: 'Progress updated' });

  } catch (error) {
    console.error('❌ Progress update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get watch progress
app.get('/api/progress/:userId/:videoId', async (req, res) => {
  const { userId, videoId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM watch_progress WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );
    
    res.json({
      success: true,
      progress: result.rows[0] || null
    });

  } catch (error) {
    console.error('❌ Progress fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      server: 'AnimeStream Video Server',
      version: '3.0.0',
      port: PORT,
      database: {
        type: 'PostgreSQL',
        status: 'connected',
        timestamp: dbResult.rows[0].now
      },
      ffmpeg: {
        path: process.env.FFMPEG_PATH || 'system',
        status: 'configured'
      },
      features: ['Video Upload', 'FFmpeg HLS Segmentation', 'Native Browser HLS', 'PostgreSQL Storage', 'Watch Progress', 'Rate Limiting']
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Maximum size is 10GB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({ 
      success: false,
      error: `Upload error: ${error.message}`,
      code: error.code
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'AnimeStream Video Server - PostgreSQL + FFmpeg HLS',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AnimeStream Video Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload: ${UPLOAD_DIR}`);
  console.log(`📁 Segments: ${SEGMENTS_DIR}`);
  console.log(`📁 Videos: ${VIDEOS_DIR}`);
  console.log(`🐘 Database: PostgreSQL (${process.env.DB_NAME})`);
  console.log(`🎬 FFmpeg: ${process.env.FFMPEG_PATH || 'system path'}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
  console.log(`🛡️  Rate limiting enabled`);
  console.log(`📡 HLS streaming ready!`);
  console.log(`\n🎯 HLS URLs will be: http://localhost:${PORT}/segments/{videoId}/playlist.m3u8`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});