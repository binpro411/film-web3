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

    // Create series table
    await client.query(`
      CREATE TABLE IF NOT EXISTS series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        title_vietnamese VARCHAR(255) NOT NULL,
        description TEXT,
        year INTEGER NOT NULL,
        rating DECIMAL(3,1) DEFAULT 0,
        genre TEXT[] DEFAULT '{}',
        director VARCHAR(255),
        studio VARCHAR(255),
        thumbnail TEXT,
        banner TEXT,
        trailer TEXT,
        featured BOOLEAN DEFAULT false,
        new BOOLEAN DEFAULT false,
        popular BOOLEAN DEFAULT false,
        episode_count INTEGER DEFAULT 0,
        total_duration VARCHAR(50),
        status VARCHAR(20) DEFAULT 'upcoming',
        air_day VARCHAR(20),
        air_time VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Series table created');

    // Create episodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS episodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        title_vietnamese VARCHAR(255) NOT NULL,
        description TEXT,
        duration VARCHAR(20),
        thumbnail TEXT,
        release_date DATE,
        rating DECIMAL(3,1) DEFAULT 0,
        watched BOOLEAN DEFAULT false,
        watch_progress INTEGER DEFAULT 0,
        last_watched_at TIMESTAMP,
        has_behind_scenes BOOLEAN DEFAULT false,
        has_commentary BOOLEAN DEFAULT false,
        guest_cast TEXT[],
        director_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(series_id, number)
      )
    `);
    console.log('✅ Episodes table created');

    // Create videos table (updated)
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        series_id UUID REFERENCES series(id) ON DELETE CASCADE,
        episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Videos table updated');

    // Create segments table
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

    // Create watch_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS watch_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        series_id UUID REFERENCES series(id) ON DELETE CASCADE,
        episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        progress REAL NOT NULL,
        duration REAL NOT NULL,
        percentage REAL NOT NULL,
        last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, episode_id)
      )
    `);
    console.log('✅ Watch progress table created');

    // Create vip_plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vip_plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        duration INTEGER NOT NULL,
        price INTEGER NOT NULL,
        original_price INTEGER,
        discount INTEGER,
        popular BOOLEAN DEFAULT false,
        features TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ VIP plans table created');

    // Create payment_methods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10) NOT NULL,
        qr_code TEXT NOT NULL,
        account_info TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Payment methods table created');

    // Create comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        series_id UUID REFERENCES series(id) ON DELETE CASCADE,
        episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_avatar TEXT,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        likes INTEGER DEFAULT 0,
        parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table created');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_series_featured ON series(featured);
      CREATE INDEX IF NOT EXISTS idx_series_new ON series(new);
      CREATE INDEX IF NOT EXISTS idx_series_popular ON series(popular);
      CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id);
      CREATE INDEX IF NOT EXISTS idx_episodes_number ON episodes(series_id, number);
      CREATE INDEX IF NOT EXISTS idx_videos_series_episode ON videos(series_id, episode_number);
      CREATE INDEX IF NOT EXISTS idx_segments_video_id ON segments(video_id);
      CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_series ON comments(series_id);
    `);
    console.log('✅ Database indexes created');

    // Insert default VIP plans
    await client.query(`
      INSERT INTO vip_plans (id, name, duration, price, features) VALUES
      ('monthly', 'VIP Tháng', 1, 99000, ARRAY[
        'Xem không giới hạn tất cả nội dung',
        'Chất lượng video Full HD (1080p)',
        'Không có quảng cáo',
        'Tải xuống để xem offline',
        'Hỗ trợ khách hàng ưu tiên'
      ]),
      ('quarterly', 'VIP 3 Tháng', 3, 249000, ARRAY[
        'Tất cả tính năng VIP Tháng',
        'Chất lượng video 4K (khi có)',
        'Truy cập sớm nội dung mới',
        'Xem đồng thời trên 3 thiết bị',
        'Tính năng xem cùng bạn bè',
        'Tiết kiệm 16% so với VIP Tháng'
      ]),
      ('yearly', 'VIP Năm', 12, 799000, ARRAY[
        'Tất cả tính năng VIP 3 Tháng',
        'Chất lượng video 8K (khi có)',
        'Nội dung độc quyền VIP',
        'Xem đồng thời không giới hạn',
        'Quà tặng sinh nhật đặc biệt',
        'Tiết kiệm 33% so với VIP Tháng',
        'Ưu tiên hỗ trợ 24/7'
      ])
      ON CONFLICT (id) DO NOTHING
    `);

    // Update quarterly and yearly plans with original price and discount
    await client.query(`
      UPDATE vip_plans SET original_price = 297000, discount = 16, popular = true WHERE id = 'quarterly';
      UPDATE vip_plans SET original_price = 1188000, discount = 33 WHERE id = 'yearly';
    `);

    // Insert default payment methods
    await client.query(`
      INSERT INTO payment_methods (id, name, icon, qr_code, account_info) VALUES
      ('momo', 'Ví MoMo', '💳', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300', 'Quét mã QR hoặc chuyển khoản đến số điện thoại: 0123456789'),
      ('banking', 'Chuyển khoản ngân hàng', '🏦', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300', 'Vietcombank - STK: 1234567890 - Chủ TK: ANIMESTREAM'),
      ('zalopay', 'ZaloPay', '💰', 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300', 'Quét mã QR hoặc chuyển khoản đến số điện thoại: 0123456789')
      ON CONFLICT (id) DO NOTHING
    `);

    // Insert sample series data
    const seriesData = [
      {
        title: "A Record of Mortal's Journey to Immortality",
        title_vietnamese: "Phàm Nhân Tu Tiên",
        description: "Câu chuyện về Han Li, một chàng trai bình thường từ làng nghèo, bước vào con đường tu tiên đầy gian khó. Với ý chí kiên cường và trí tuệ, anh ta vượt qua vô số thử thách để trở thành một tu sĩ mạnh mẽ.",
        year: 2020,
        rating: 9.2,
        genre: ['Hành Động', 'Phiêu Lưu', 'Tu Tiên', 'Drama'],
        director: 'Wang Wei',
        studio: 'Wan Wei Mao Donghua',
        thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
        banner: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1200',
        featured: true,
        new: true,
        popular: true,
        episode_count: 60,
        total_duration: '24 giờ',
        status: 'ongoing',
        air_day: 'saturday',
        air_time: '20:00'
      },
      {
        title: "Battle Through the Heavens",
        title_vietnamese: "Đấu Phá Thương Khung",
        description: "Xiao Yan, một thiên tài tu luyện trẻ tuổi, đột nhiên mất đi sức mạnh. Với sự giúp đỡ của linh hồn cổ đại, anh ta bắt đầu hành trình lấy lại vinh quang và trở thành Đấu Đế.",
        year: 2018,
        rating: 8.8,
        genre: ['Hành Động', 'Tu Tiên', 'Romance', 'Phiêu Lưu'],
        director: 'Li Ming',
        studio: 'Motion Magic',
        thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
        banner: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=1200',
        featured: true,
        popular: true,
        episode_count: 45,
        total_duration: '15 giờ',
        status: 'completed',
        air_day: 'sunday',
        air_time: '19:30'
      },
      {
        title: "Soul Land",
        title_vietnamese: "Đấu La Đại Lục",
        description: "Tang San, một đệ tử của môn phái ẩn dật, tái sinh vào thế giới Đấu La Đại Lục. Nơi đây, sức mạnh được quyết định bởi Võn Hồn và Hồn Kỹ.",
        year: 2018,
        rating: 9.0,
        genre: ['Hành Động', 'Tu Tiên', 'Phiêu Lưu', 'Siêu Nhiên'],
        director: 'Zhang San',
        studio: 'Sparkly Key Animation',
        thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400',
        banner: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=1200',
        featured: true,
        popular: true,
        episode_count: 40,
        total_duration: '13.3 giờ',
        status: 'completed',
        air_day: 'friday',
        air_time: '20:30'
      }
    ];

    for (const series of seriesData) {
      const result = await client.query(`
        INSERT INTO series (
          title, title_vietnamese, description, year, rating, genre, director, studio,
          thumbnail, banner, featured, new, popular, episode_count, total_duration,
          status, air_day, air_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id
      `, [
        series.title, series.title_vietnamese, series.description, series.year,
        series.rating, series.genre, series.director, series.studio,
        series.thumbnail, series.banner, series.featured, series.new,
        series.popular, series.episode_count, series.total_duration,
        series.status, series.air_day, series.air_time
      ]);

      const seriesId = result.rows[0].id;

      // Add sample episodes for each series
      for (let i = 1; i <= Math.min(5, series.episode_count); i++) {
        await client.query(`
          INSERT INTO episodes (
            series_id, number, title, title_vietnamese, description, duration,
            thumbnail, release_date, rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          seriesId,
          i,
          `${series.title} - Tập ${i}`,
          `${series.title_vietnamese} - Tập ${i}`,
          `Tập ${i} của series ${series.title_vietnamese}`,
          '24:00',
          series.thumbnail,
          new Date(2024, 0, i).toISOString().split('T')[0],
          8.5 + Math.random() * 1.5
        ]);
      }
    }

    console.log('✅ Sample data inserted');

    await client.end();
    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup error:', error);
    process.exit(1);
  }
};

setupDatabase();