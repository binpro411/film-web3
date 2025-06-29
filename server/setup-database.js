import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const setupDatabase = async () => {
  console.log('🔧 Setting up PostgreSQL database...');
  
  // First connect to postgres database to create our database
  const adminClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Create database if it doesn't exist
    try {
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`✅ Database '${process.env.DB_NAME}' created`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`ℹ️  Database '${process.env.DB_NAME}' already exists`);
      } else {
        throw error;
      }
    }

    await adminClient.end();

    // Now connect to our database and create tables
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await client.connect();
    console.log(`✅ Connected to database '${process.env.DB_NAME}'`);

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        series_id VARCHAR(100) NOT NULL,
        episode_number INTEGER NOT NULL,
        original_filename TEXT NOT NULL,
        safe_filename TEXT NOT NULL,
        duration REAL NOT NULL DEFAULT 0,
        file_size BIGINT NOT NULL DEFAULT 0,
        video_path TEXT NOT NULL,
        hls_manifest_path TEXT,
        thumbnail_path TEXT,
        status VARCHAR(20) DEFAULT 'uploading',
        processing_progress INTEGER DEFAULT 0,
        total_segments INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(series_id, episode_number)
      )
    `);
    console.log('✅ Videos table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        segment_number INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        duration REAL NOT NULL,
        file_size BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, segment_number)
      )
    `);
    console.log('✅ Segments table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS watch_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        progress REAL NOT NULL,
        duration REAL NOT NULL,
        percentage REAL NOT NULL,
        last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id)
      )
    `);
    console.log('✅ Watch progress table created');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_series_episode ON videos(series_id, episode_number);
      CREATE INDEX IF NOT EXISTS idx_segments_video_id ON segments(video_id);
      CREATE INDEX IF NOT EXISTS idx_watch_progress_user_video ON watch_progress(user_id, video_id);
    `);
    console.log('✅ Database indexes created');

    await client.end();
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  }
};

setupDatabase();