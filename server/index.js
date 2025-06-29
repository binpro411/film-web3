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

// Enhanced CORS configuration for HLS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
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

// CRITICAL: Enhanced HLS static file serving with proper headers
app.use('/segments', express.static(SEGMENTS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

app.use('/videos', express.static(VIDEOS_DIR));

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
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 * 1024,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
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
    version: '4.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
    features: ['Series Management', 'Episode Management', 'Video Upload', 'HLS Streaming']
  });
});

// ==================== SERIES ENDPOINTS ====================

// Get all series
app.get('/api/series', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             COUNT(e.id) as actual_episode_count,
             COUNT(v.id) as videos_count
      FROM series s
      LEFT JOIN episodes e ON s.id = e.series_id
      LEFT JOIN videos v ON s.id = v.series_id AND v.status = 'completed'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      series: result.rows
    });
  } catch (error) {
    console.error('❌ Get series error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single series with episodes
app.get('/api/series/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get series info
    const seriesResult = await pool.query('SELECT * FROM series WHERE id = $1', [id]);
    
    if (seriesResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Get episodes for this series
    const episodesResult = await pool.query(`
      SELECT e.*, 
             v.id as video_id,
             v.status as video_status,
             v.hls_manifest_path
      FROM episodes e
      LEFT JOIN videos v ON e.id = v.episode_id AND v.status = 'completed'
      WHERE e.series_id = $1
      ORDER BY e.number ASC
    `, [id]);

    const series = seriesResult.rows[0];
    series.episodes = episodesResult.rows;

    res.json({
      success: true,
      series
    });
  } catch (error) {
    console.error('❌ Get series error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new series
app.post('/api/series', async (req, res) => {
  const {
    title, title_vietnamese, description, year, rating, genre, director, studio,
    thumbnail, banner, trailer, featured, new: isNew, popular, episode_count,
    total_duration, status, air_day, air_time
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO series (
        title, title_vietnamese, description, year, rating, genre, director, studio,
        thumbnail, banner, trailer, featured, new, popular, episode_count,
        total_duration, status, air_day, air_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      title, title_vietnamese, description, year, rating, genre, director, studio,
      thumbnail, banner, trailer, featured, isNew, popular, episode_count,
      total_duration, status, air_day, air_time
    ]);

    res.json({
      success: true,
      series: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Create series error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update series
app.put('/api/series/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title, title_vietnamese, description, year, rating, genre, director, studio,
    thumbnail, banner, trailer, featured, new: isNew, popular, episode_count,
    total_duration, status, air_day, air_time
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE series SET
        title = $1, title_vietnamese = $2, description = $3, year = $4, rating = $5,
        genre = $6, director = $7, studio = $8, thumbnail = $9, banner = $10,
        trailer = $11, featured = $12, new = $13, popular = $14, episode_count = $15,
        total_duration = $16, status = $17, air_day = $18, air_time = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `, [
      title, title_vietnamese, description, year, rating, genre, director, studio,
      thumbnail, banner, trailer, featured, isNew, popular, episode_count,
      total_duration, status, air_day, air_time, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    res.json({
      success: true,
      series: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update series error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete series
app.delete('/api/series/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM series WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    res.json({
      success: true,
      message: 'Series deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete series error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EPISODES ENDPOINTS ====================

// Get episodes for a series
app.get('/api/series/:seriesId/episodes', async (req, res) => {
  const { seriesId } = req.params;

  try {
    const result = await pool.query(`
      SELECT e.*, 
             v.id as video_id,
             v.status as video_status,
             v.hls_manifest_path,
             v.total_segments
      FROM episodes e
      LEFT JOIN videos v ON e.id = v.episode_id AND v.status = 'completed'
      WHERE e.series_id = $1
      ORDER BY e.number ASC
    `, [seriesId]);

    res.json({
      success: true,
      episodes: result.rows
    });
  } catch (error) {
    console.error('❌ Get episodes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new episode
app.post('/api/series/:seriesId/episodes', async (req, res) => {
  const { seriesId } = req.params;
  const {
    number, title, title_vietnamese, description, duration, thumbnail,
    release_date, rating, has_behind_scenes, has_commentary, guest_cast, director_notes
  } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO episodes (
        series_id, number, title, title_vietnamese, description, duration,
        thumbnail, release_date, rating, has_behind_scenes, has_commentary,
        guest_cast, director_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      seriesId, number, title, title_vietnamese, description, duration,
      thumbnail, release_date, rating, has_behind_scenes, has_commentary,
      guest_cast, director_notes
    ]);

    res.json({
      success: true,
      episode: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Create episode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update episode
app.put('/api/episodes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    number, title, title_vietnamese, description, duration, thumbnail,
    release_date, rating, has_behind_scenes, has_commentary, guest_cast, director_notes
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE episodes SET
        number = $1, title = $2, title_vietnamese = $3, description = $4,
        duration = $5, thumbnail = $6, release_date = $7, rating = $8,
        has_behind_scenes = $9, has_commentary = $10, guest_cast = $11,
        director_notes = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      number, title, title_vietnamese, description, duration, thumbnail,
      release_date, rating, has_behind_scenes, has_commentary, guest_cast,
      director_notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    res.json({
      success: true,
      episode: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Update episode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete episode
app.delete('/api/episodes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM episodes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }

    res.json({
      success: true,
      message: 'Episode deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete episode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== VIDEO UPLOAD ENDPOINTS ====================

// Upload video for episode
app.post('/api/episodes/:episodeId/upload-video', upload.single('video'), async (req, res) => {
  console.log('🎬 Video upload request received for episode');
  
  const { episodeId } = req.params;
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No video file uploaded'
      });
    }

    // Get episode and series info
    const episodeResult = await client.query(`
      SELECT e.*, s.title as series_title, s.title_vietnamese as series_title_vietnamese
      FROM episodes e
      JOIN series s ON e.series_id = s.id
      WHERE e.id = $1
    `, [episodeId]);

    if (episodeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Episode not found'
      });
    }

    const episode = episodeResult.rows[0];
    const uploadedFile = req.file;
    const videoPath = uploadedFile.path;

    console.log(`📹 Processing video for: ${episode.series_title} - Tập ${episode.number}`);

    // Get video metadata using FFmpeg
    const metadata = await getVideoMetadata(videoPath);
    
    // Insert video record into PostgreSQL
    const insertVideoQuery = `
      INSERT INTO videos (
        title, series_id, episode_id, episode_number, original_filename, safe_filename,
        duration, file_size, video_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const result = await client.query(insertVideoQuery, [
      `${episode.series_title} - Tập ${episode.number}`,
      episode.series_id,
      episodeId,
      episode.number,
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
        estimatedSegments: Math.ceil(metadata.duration / 6)
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

// FFmpeg processing function (updated)
async function processVideoWithFFmpeg(videoId, videoPath, duration) {
  const client = await pool.connect();
  
  try {
    console.log(`🎬 Starting FFmpeg HLS processing for video ${videoId}`);
    
    const videoSegmentsDir = path.join(SEGMENTS_DIR, videoId);
    await fs.ensureDir(videoSegmentsDir);

    const hlsManifestPath = path.join(videoSegmentsDir, 'playlist.m3u8');
    const segmentPattern = path.join(videoSegmentsDir, 'segment_%03d.ts');

    await client.query(
      'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['processing', videoId]
    );

    await new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOption('-preset', 'fast')
        .addOption('-crf', '23')
        .addOption('-profile:v', 'baseline')
        .addOption('-level', '3.0')
        .addOption('-pix_fmt', 'yuv420p')
        .addOption('-ar', '44100')
        .addOption('-ac', '2')
        .addOption('-b:a', '128k')
        .addOption('-f', 'hls')
        .addOption('-hls_time', '6')
        .addOption('-hls_list_size', '0')
        .addOption('-hls_segment_type', 'mpegts')
        .addOption('-hls_segment_filename', segmentPattern)
        .addOption('-hls_flags', 'independent_segments+program_date_time')
        .addOption('-g', '48')
        .addOption('-keyint_min', '48')
        .addOption('-sc_threshold', '0')
        .output(hlsManifestPath)
        .on('progress', async (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent > 0 && percent <= 100 && percent % 10 === 0) {
            try {
              await client.query(
                'UPDATE videos SET processing_progress = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [percent, videoId]
              );
            } catch (dbError) {
              console.error('❌ Progress update error:', dbError);
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

      command.run();
    });

    // Read generated segments and save to database
    const segmentFiles = await fs.readdir(videoSegmentsDir);
    const tsFiles = segmentFiles.filter(file => file.endsWith('.ts')).sort();

    // Clear existing segments for this video
    await client.query('DELETE FROM segments WHERE video_id = $1', [videoId]);

    for (let i = 0; i < tsFiles.length; i++) {
      const filename = tsFiles[i];
      const filePath = path.join(videoSegmentsDir, filename);
      const stats = await fs.stat(filePath);
      
      const segmentDur = i === tsFiles.length - 1 
        ? duration - (i * 6)
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

  } catch (error) {
    console.error('❌ FFmpeg processing error:', error);
    
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

    res.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        seriesId: video.series_id,
        episodeId: video.episode_id,
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

// Get videos by series and episode
app.get('/api/videos/:seriesId/:episodeNumber', async (req, res) => {
  const { seriesId, episodeNumber } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT v.* FROM videos v
      JOIN episodes e ON v.episode_id = e.id
      WHERE v.series_id = $1 AND e.number = $2 AND v.status = $3
    `, [seriesId, parseInt(episodeNumber), 'completed']);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found or not ready' 
      });
    }

    const video = result.rows[0];
    
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

// Get VIP plans
app.get('/api/vip-plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vip_plans ORDER BY duration ASC');
    res.json({
      success: true,
      plans: result.rows
    });
  } catch (error) {
    console.error('❌ Get VIP plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payment methods
app.get('/api/payment-methods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payment_methods WHERE active = true');
    res.json({
      success: true,
      methods: result.rows
    });
  } catch (error) {
    console.error('❌ Get payment methods error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update watch progress
app.post('/api/progress', async (req, res) => {
  const { userId, videoId, progress, duration } = req.body;
  
  if (!userId || !videoId || progress === undefined || duration === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, videoId, progress, duration'
    });
  }

  const validDuration = Math.max(parseFloat(duration) || 1, 1);
  const validProgress = Math.max(parseFloat(progress) || 0, 0);
  const percentage = Math.min((validProgress / validDuration) * 100, 100);

  try {
    // Get video info to get series_id and episode_id
    const videoResult = await pool.query('SELECT series_id, episode_id FROM videos WHERE id = $1', [videoId]);
    
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const { series_id, episode_id } = videoResult.rows[0];

    await pool.query(
      `INSERT INTO watch_progress (user_id, series_id, episode_id, video_id, progress, duration, percentage, last_watched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, episode_id) 
       DO UPDATE SET 
         progress = EXCLUDED.progress,
         duration = EXCLUDED.duration,
         percentage = EXCLUDED.percentage,
         last_watched_at = CURRENT_TIMESTAMP`,
      [userId, series_id, episode_id, videoId, validProgress, validDuration, percentage]
    );
    
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
    const dbResult = await pool.query('SELECT NOW()');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      server: 'AnimeStream Video Server',
      version: '4.0.0',
      port: PORT,
      database: {
        type: 'PostgreSQL',
        status: 'connected',
        timestamp: dbResult.rows[0].now
      },
      features: ['Series Management', 'Episode Management', 'Video Upload', 'HLS Streaming', 'PostgreSQL Storage']
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
    message: 'AnimeStream Video Server - PostgreSQL + Series Management',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AnimeStream Video Server running on http://localhost:${PORT}`);
  console.log(`🐘 Database: PostgreSQL (${process.env.DB_NAME})`);
  console.log(`🎬 FFmpeg: ${process.env.FFMPEG_PATH || 'system path'}`);
  console.log(`📡 Series Management API ready!`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});