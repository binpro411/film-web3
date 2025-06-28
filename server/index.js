import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

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
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SEGMENTS_DIR = path.join(__dirname, 'segments');
const VIDEOS_DIR = path.join(__dirname, 'videos');

// Ensure directories exist
await fs.ensureDir(UPLOAD_DIR);
await fs.ensureDir(SEGMENTS_DIR);
await fs.ensureDir(VIDEOS_DIR);

console.log('📁 Directories created:');
console.log(`   Upload: ${UPLOAD_DIR}`);
console.log(`   Segments: ${SEGMENTS_DIR}`);
console.log(`   Videos: ${VIDEOS_DIR}`);

// Serve static files with proper headers
app.use('/segments', express.static(SEGMENTS_DIR, {
  setHeaders: (res, path) => {
    if (path.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (path.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

app.use('/videos', express.static(VIDEOS_DIR));

// Database setup with better error handling
const dbPath = path.join(__dirname, 'streaming.db');
console.log(`💾 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Initialize database tables
db.serialize(() => {
  // Videos table
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    series_id TEXT NOT NULL,
    episode_number INTEGER NOT NULL,
    original_filename TEXT NOT NULL,
    duration REAL NOT NULL,
    file_size INTEGER NOT NULL,
    video_path TEXT NOT NULL,
    hls_manifest_path TEXT,
    status TEXT DEFAULT 'processing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating videos table:', err);
    else console.log('✅ Videos table ready');
  });

  // Segments table
  db.run(`CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration REAL NOT NULL,
    file_size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id)
  )`, (err) => {
    if (err) console.error('Error creating segments table:', err);
    else console.log('✅ Segments table ready');
  });

  // Watch progress table
  db.run(`CREATE TABLE IF NOT EXISTS watch_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    progress REAL NOT NULL,
    duration REAL NOT NULL,
    percentage REAL NOT NULL,
    last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
  )`, (err) => {
    if (err) console.error('Error creating watch_progress table:', err);
    else console.log('✅ Watch progress table ready');
  });
});

// Enhanced multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB limit
    fieldSize: 50 * 1024 * 1024 // 50MB field size
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
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
    name: 'Video Streaming Server',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: ['Video Upload', 'HLS Segmentation', 'Progressive Streaming', 'Watch Progress'],
    endpoints: {
      uploadVideo: 'POST /api/upload-video',
      getVideo: 'GET /api/video/:videoId',
      getSegments: 'GET /api/video/:videoId/segments',
      getSegment: 'GET /segments/:filename',
      updateProgress: 'POST /api/progress',
      getProgress: 'GET /api/progress/:userId/:videoId'
    },
    directories: {
      upload: UPLOAD_DIR,
      segments: SEGMENTS_DIR,
      videos: VIDEOS_DIR
    }
  });
});

// Enhanced upload video endpoint
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  console.log('🎬 Upload request received');
  console.log('📋 Request body:', req.body);
  console.log('📁 File info:', req.file);

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'No video file uploaded',
        received: {
          body: req.body,
          files: req.files,
          file: req.file
        }
      });
    }

    const { seriesId, episodeNumber, title } = req.body;
    
    if (!seriesId || !episodeNumber || !title) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: seriesId, episodeNumber, title',
        received: req.body
      });
    }

    const videoId = uuidv4();
    const uploadedFile = req.file;

    console.log(`📹 Processing video upload: ${title}`);
    console.log(`📊 File details:`, {
      originalname: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      path: uploadedFile.path
    });

    // Check if file exists
    const fileExists = await fs.pathExists(uploadedFile.path);
    if (!fileExists) {
      throw new Error(`Uploaded file not found at: ${uploadedFile.path}`);
    }

    // Get basic file info without ffprobe for now
    const duration = 1800; // Default 30 minutes for demo
    const fileSize = uploadedFile.size;

    console.log(`💾 Saving to database...`);

    // Save video info to database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO videos (id, title, series_id, episode_number, original_filename, duration, file_size, video_path, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
        [videoId, title, seriesId, episodeNumber, uploadedFile.originalname, duration, fileSize, uploadedFile.path],
        function(err) {
          if (err) {
            console.error('❌ Database insert error:', err);
            reject(err);
          } else {
            console.log('✅ Video saved to database with ID:', videoId);
            resolve(this);
          }
        }
      );
    });

    // Start processing in background
    console.log('🔄 Starting background processing...');
    processVideoToSegments(videoId, uploadedFile.path, duration);

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully. Processing segments...',
      metadata: {
        duration: Math.floor(duration),
        fileSize,
        estimatedSegments: Math.ceil(duration / 6),
        originalFilename: uploadedFile.originalname
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Simplified video processing (without FFmpeg for now)
async function processVideoToSegments(videoId, videoPath, duration) {
  try {
    console.log(`🔄 Starting segmentation for video ${videoId}`);
    
    const videoSegmentsDir = path.join(SEGMENTS_DIR, videoId);
    await fs.ensureDir(videoSegmentsDir);

    // Create a simple HLS manifest for demo
    const hlsManifestPath = path.join(videoSegmentsDir, 'playlist.m3u8');
    
    // Create demo segments (just copy the original file for now)
    const segmentCount = Math.ceil(duration / 6);
    console.log(`📊 Creating ${segmentCount} demo segments...`);

    // Create demo manifest
    let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n';
    
    for (let i = 0; i < segmentCount; i++) {
      const segmentFilename = `segment_${i.toString().padStart(3, '0')}.ts`;
      const segmentPath = path.join(videoSegmentsDir, segmentFilename);
      
      // For demo, just create empty files
      await fs.writeFile(segmentPath, Buffer.alloc(1024 * 100)); // 100KB demo file
      
      manifest += `#EXTINF:6.0,\n${segmentFilename}\n`;
      
      // Save segment info to database
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO segments (id, video_id, segment_number, filename, file_path, duration, file_size)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), videoId, i + 1, segmentFilename, segmentPath, 6.0, 1024 * 100],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }
    
    manifest += '#EXT-X-ENDLIST\n';
    await fs.writeFile(hlsManifestPath, manifest);

    console.log(`✅ Demo segmentation completed for ${videoId}`);
    console.log(`📁 Manifest created: ${hlsManifestPath}`);
    
    // Update video status
    await updateVideoStatus(videoId, 'completed', hlsManifestPath);

  } catch (error) {
    console.error('❌ Segmentation error:', error);
    await updateVideoStatus(videoId, 'failed');
  }
}

// Update video status
async function updateVideoStatus(videoId, status, hlsManifestPath = null) {
  return new Promise((resolve, reject) => {
    const query = hlsManifestPath 
      ? `UPDATE videos SET status = ?, hls_manifest_path = ? WHERE id = ?`
      : `UPDATE videos SET status = ? WHERE id = ?`;
    
    const params = hlsManifestPath 
      ? [status, hlsManifestPath, videoId]
      : [status, videoId];

    db.run(query, params, function(err) {
      if (err) {
        console.error('❌ Status update error:', err);
        reject(err);
      } else {
        console.log(`✅ Video ${videoId} status updated to: ${status}`);
        resolve(this);
      }
    });
  });
}

// Get video info
app.get('/api/video/:videoId', (req, res) => {
  const { videoId } = req.params;
  console.log(`📹 Getting video info for: ${videoId}`);

  db.get(
    `SELECT * FROM videos WHERE id = ?`,
    [videoId],
    (err, video) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!video) {
        console.log(`❌ Video not found: ${videoId}`);
        return res.status(404).json({ success: false, error: 'Video not found' });
      }

      console.log(`✅ Video found:`, video);

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
          hlsUrl: video.hls_manifest_path ? `/segments/${video.id}/playlist.m3u8` : null,
          createdAt: video.created_at
        }
      });
    }
  );
});

// Get video segments
app.get('/api/video/:videoId/segments', (req, res) => {
  const { videoId } = req.params;
  console.log(`📊 Getting segments for video: ${videoId}`);

  db.all(
    `SELECT * FROM segments WHERE video_id = ? ORDER BY segment_number`,
    [videoId],
    (err, segments) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }

      console.log(`✅ Found ${segments.length} segments for video ${videoId}`);

      const segmentList = segments.map(segment => ({
        id: segment.id,
        number: segment.segment_number,
        filename: segment.filename,
        url: `/segments/${videoId}/${segment.filename}`,
        duration: segment.duration,
        fileSize: segment.file_size
      }));

      res.json({
        success: true,
        videoId,
        totalSegments: segments.length,
        segments: segmentList
      });
    }
  );
});

// Get videos by series and episode
app.get('/api/videos/:seriesId/:episodeNumber', (req, res) => {
  const { seriesId, episodeNumber } = req.params;
  console.log(`🔍 Looking for video: ${seriesId} episode ${episodeNumber}`);

  db.get(
    `SELECT * FROM videos WHERE series_id = ? AND episode_number = ? AND status = 'completed'`,
    [seriesId, episodeNumber],
    (err, video) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!video) {
        console.log(`❌ No completed video found for ${seriesId} episode ${episodeNumber}`);
        return res.status(404).json({ success: false, error: 'Video not found' });
      }

      console.log(`✅ Found video:`, video);

      res.json({
        success: true,
        video: {
          id: video.id,
          title: video.title,
          duration: video.duration,
          hlsUrl: `/segments/${video.id}/playlist.m3u8`,
          status: video.status
        }
      });
    }
  );
});

// Update watch progress
app.post('/api/progress', (req, res) => {
  const { userId, videoId, progress, duration } = req.body;
  const percentage = duration > 0 ? (progress / duration) * 100 : 0;

  console.log(`📊 Updating progress: User ${userId}, Video ${videoId}, ${percentage.toFixed(1)}%`);

  db.run(
    `INSERT OR REPLACE INTO watch_progress (id, user_id, video_id, progress, duration, percentage, last_watched_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [uuidv4(), userId, videoId, progress, duration, percentage],
    function(err) {
      if (err) {
        console.error('❌ Progress update error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      console.log('✅ Progress updated successfully');
      res.json({ success: true, message: 'Progress updated' });
    }
  );
});

// Get watch progress
app.get('/api/progress/:userId/:videoId', (req, res) => {
  const { userId, videoId } = req.params;

  db.get(
    `SELECT * FROM watch_progress WHERE user_id = ? AND video_id = ?`,
    [userId, videoId],
    (err, progress) => {
      if (err) {
        console.error('❌ Progress fetch error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      
      res.json({
        success: true,
        progress: progress || null
      });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Video Streaming Server',
    port: PORT,
    database: 'SQLite',
    features: ['Video Upload', 'Demo HLS Segmentation', 'Watch Progress']
  });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Maximum size is 5GB.',
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
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'This is the Video Streaming Server backend',
    requestedUrl: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/upload-video',
      'GET /api/video/:videoId',
      'GET /api/video/:videoId/segments',
      'GET /api/videos/:seriesId/:episodeNumber',
      'POST /api/progress',
      'GET /api/progress/:userId/:videoId'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Video Streaming Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload: ${UPLOAD_DIR}`);
  console.log(`📁 Segments: ${SEGMENTS_DIR}`);
  console.log(`📁 Videos: ${VIDEOS_DIR}`);
  console.log(`💾 Database: SQLite at ${dbPath}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
  console.log(`📡 Ready to accept video uploads!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});