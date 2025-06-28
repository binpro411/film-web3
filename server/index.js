import express from 'express';
import cors from 'cors';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SEGMENTS_DIR = path.join(__dirname, 'segments');
const VIDEOS_DIR = path.join(__dirname, 'videos');

await fs.ensureDir(UPLOAD_DIR);
await fs.ensureDir(SEGMENTS_DIR);
await fs.ensureDir(VIDEOS_DIR);

// Serve static files
app.use('/segments', express.static(SEGMENTS_DIR));
app.use('/videos', express.static(VIDEOS_DIR));

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'streaming.db'));

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
  )`);

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
  )`);

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
  )`);
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Video Streaming Server',
    version: '2.0.0',
    status: 'running',
    features: ['Video Upload', 'HLS Segmentation', 'Progressive Streaming', 'Watch Progress'],
    endpoints: {
      uploadVideo: 'POST /api/upload-video',
      getVideo: 'GET /api/video/:videoId',
      getSegments: 'GET /api/video/:videoId/segments',
      getSegment: 'GET /segments/:filename',
      updateProgress: 'POST /api/progress',
      getProgress: 'GET /api/progress/:userId/:videoId'
    }
  });
});

// Upload video endpoint
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { seriesId, episodeNumber, title } = req.body;
    const videoId = uuidv4();
    const uploadedFile = req.file;

    console.log(`📹 Processing video upload: ${title}`);

    // Get video metadata
    const videoInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(uploadedFile.path, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const duration = videoInfo.format.duration;
    const fileSize = uploadedFile.size;

    // Save video info to database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO videos (id, title, series_id, episode_number, original_filename, duration, file_size, video_path, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
        [videoId, title, seriesId, episodeNumber, uploadedFile.originalname, duration, fileSize, uploadedFile.path],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // Process video in background
    processVideoToSegments(videoId, uploadedFile.path, duration);

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully. Processing segments...',
      metadata: {
        duration: Math.floor(duration),
        fileSize,
        estimatedSegments: Math.ceil(duration / 6)
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process video to segments
async function processVideoToSegments(videoId, videoPath, duration) {
  try {
    console.log(`🔄 Starting segmentation for video ${videoId}`);
    
    const videoSegmentsDir = path.join(SEGMENTS_DIR, videoId);
    await fs.ensureDir(videoSegmentsDir);

    const hlsManifestPath = path.join(videoSegmentsDir, 'playlist.m3u8');
    const segmentPattern = path.join(videoSegmentsDir, 'segment_%03d.ts');

    // Create HLS segments using FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-hls_time 6',
          '-hls_list_size 0',
          '-hls_segment_filename', segmentPattern,
          '-f hls'
        ])
        .output(hlsManifestPath)
        .on('start', (commandLine) => {
          console.log('🎬 FFmpeg started:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📊 Processing: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', async () => {
          console.log('✅ Segmentation completed');
          await saveSegmentsToDatabase(videoId, videoSegmentsDir, duration);
          await updateVideoStatus(videoId, 'completed', hlsManifestPath);
        })
        .on('error', (error) => {
          console.error('❌ FFmpeg error:', error);
          updateVideoStatus(videoId, 'failed');
          reject(error);
        })
        .run();
    });

  } catch (error) {
    console.error('Segmentation error:', error);
    await updateVideoStatus(videoId, 'failed');
  }
}

// Save segments info to database
async function saveSegmentsToDatabase(videoId, segmentsDir, totalDuration) {
  try {
    const segmentFiles = await fs.readdir(segmentsDir);
    const tsFiles = segmentFiles.filter(file => file.endsWith('.ts')).sort();

    for (let i = 0; i < tsFiles.length; i++) {
      const filename = tsFiles[i];
      const filePath = path.join(segmentsDir, filename);
      const stats = await fs.stat(filePath);
      const segmentDuration = Math.min(6, totalDuration - (i * 6)); // 6 seconds per segment

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO segments (id, video_id, segment_number, filename, file_path, duration, file_size)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), videoId, i + 1, filename, filePath, segmentDuration, stats.size],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }

    console.log(`💾 Saved ${tsFiles.length} segments to database`);
  } catch (error) {
    console.error('Error saving segments:', error);
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
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Get video info
app.get('/api/video/:videoId', (req, res) => {
  const { videoId } = req.params;

  db.get(
    `SELECT * FROM videos WHERE id = ?`,
    [videoId],
    (err, video) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

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

  db.all(
    `SELECT * FROM segments WHERE video_id = ? ORDER BY segment_number`,
    [videoId],
    (err, segments) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

  db.get(
    `SELECT * FROM videos WHERE series_id = ? AND episode_number = ? AND status = 'completed'`,
    [seriesId, episodeNumber],
    (err, video) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

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

  db.run(
    `INSERT OR REPLACE INTO watch_progress (id, user_id, video_id, progress, duration, percentage, last_watched_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [uuidv4(), userId, videoId, progress, duration, percentage],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
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
        return res.status(500).json({ error: err.message });
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
    features: ['Video Upload', 'HLS Segmentation', 'Watch Progress']
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5GB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'This is the Video Streaming Server backend',
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

app.listen(PORT, () => {
  console.log(`🚀 Video Streaming Server running on http://localhost:${PORT}`);
  console.log(`📁 Upload: ${UPLOAD_DIR}`);
  console.log(`📁 Segments: ${SEGMENTS_DIR}`);
  console.log(`📁 Videos: ${VIDEOS_DIR}`);
  console.log(`💾 Database: SQLite`);
  
  // Check FFmpeg
  try {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.warn('⚠️  FFmpeg not found. Install: https://ffmpeg.org/download.html');
      } else {
        console.log('✅ FFmpeg is available and ready');
      }
    });
  } catch (error) {
    console.warn('⚠️  FFmpeg check failed:', error.message);
  }
});