import { Series, Episode, Comment } from '../types';

const generateEpisodes = (seriesId: string, count: number, seriesTitle: string): Episode[] => {
  const episodes: Episode[] = [];
  
  // Tên tập cho Phàm Nhân Tu Tiên
  const phamNhanEpisodeTitles = [
    'Khởi Đầu Tu Tiên', 'Gia Nhập Hoàng Phong Cốc', 'Bí Mật Luyện Khí', 'Thử Thách Đầu Tiên', 'Sức Mạnh Ẩn Giấu',
    'Đối Đầu Đồng Môn', 'Khám Phá Bí Thuật', 'Trận Chiến Sinh Tử', 'Đột Phá Cảnh Giới', 'Nhiệm Vụ Nguy Hiểm',
    'Gặp Gỡ Cao Nhân', 'Học Hỏi Thần Thông', 'Báo Thù Ân Oán', 'Tìm Kiếm Linh Dược', 'Đại Hội Môn Phái',
    'Chiến Đấu Ác Liệt', 'Thăng Tiến Tu Vi', 'Khám Phá Di Tích', 'Đối Mặt Ma Đạo', 'Cứu Nguy Đồng Môn'
  ];

  const defaultTitles = [
    'The Awakening', 'First Steps', 'Hidden Powers', 'The Challenge', 'Rising Storm',
    'Ancient Secrets', 'The Battle Begins', 'Allies and Enemies', 'The Turning Point', 'Final Stand',
    'New Horizons', 'The Journey Continues', 'Unexpected Allies', 'The Dark Truth', 'Redemption',
    'The Last Hope', 'Victory and Loss', 'New Beginnings', 'The Final Chapter', 'Legacy'
  ];

  const episodeTitles = seriesTitle === 'Phàm Nhân Tu Tiên' ? phamNhanEpisodeTitles : defaultTitles;

  for (let i = 0; i < count; i++) {
    const titleIndex = i % episodeTitles.length;
    const baseTitle = episodeTitles[titleIndex];
    
    episodes.push({
      id: `${seriesId}-ep-${i + 1}`,
      number: i + 1,
      title: seriesTitle === 'Phàm Nhân Tu Tiên' ? baseTitle : `${baseTitle} ${Math.floor(i / episodeTitles.length) + 1}`,
      titleVietnamese: seriesTitle === 'Phàm Nhân Tu Tiên' ? baseTitle : `Tập ${i + 1}`,
      description: seriesTitle === 'Phàm Nhân Tu Tiên' 
        ? `Hành trình tu tiên của Hàn Lập tiếp tục với những thử thách mới và khám phá sức mạnh tiềm ẩn.`
        : `Tập ${i + 1} tiếp tục hành trình sử thi với những thử thách và tiết lộ mới.`,
      duration: `${22 + Math.floor(Math.random() * 8)} phút`,
      thumbnail: `https://images.pexels.com/photos/${1729931 + (i % 20)}/pexels-photo-${1729931 + (i % 20)}.jpeg?auto=compress&cs=tinysrgb&w=400`,
      releaseDate: new Date(2024, 0, 1 + i * 7).toISOString(),
      rating: 8.0 + Math.random() * 1.5,
      watched: Math.random() > 0.7,
      watchProgress: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined,
      lastWatchedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      guestCast: Math.random() > 0.7 ? ['Diễn viên lồng tiếng khách mời', 'Nhân vật đặc biệt'] : undefined,
      directorNotes: Math.random() > 0.8 ? 'Những hiểu biết đặc biệt hậu trường cho tập này.' : undefined,
      hasBehindScenes: Math.random() > 0.6,
      hasCommentary: Math.random() > 0.8
    });
  }

  return episodes;
};

const generateComments = (count: number): Comment[] => {
  const comments: Comment[] = [];
  const userNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E', 'Sarah', 'Mike', 'Vũ Thị F'];
  const phamNhanComments = [
    'Phim tu tiên hay nhất tôi từng xem! Hàn Lập quá ngầu!',
    'Chất lượng hoạt hình 3D tuyệt vời, từng chi tiết đều sống động.',
    'Cốt truyện hấp dẫn, không thể rời mắt khỏi màn hình.',
    'Yêu thích cách xây dựng thế giới tu tiên trong phim.',
    'Những trận chiến pháp thuật thật sự ấn tượng và mãn nhãn.',
    'Hàn Lập từ một phàm nhân trở thành cao thủ, quá inspiring!',
    'Không thể chờ đợi tập tiếp theo! Khi nào ra tập mới?',
    'Đội ngũ sản xuất Tencent thực sự tâm huyết với dự án này.'
  ];

  for (let i = 0; i < count; i++) {
    comments.push({
      id: `comment-${i + 1}`,
      userId: `user-${i + 1}`,
      userName: userNames[i % userNames.length],
      userAvatar: `https://images.pexels.com/photos/${1000000 + i}/pexels-photo-${1000000 + i}.jpeg?auto=compress&cs=tinysrgb&w=100`,
      content: phamNhanComments[i % phamNhanComments.length],
      rating: 4 + Math.floor(Math.random() * 2),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      likes: Math.floor(Math.random() * 100) + 10
    });
  }

  return comments;
};

export const series: Series[] = [
  {
    id: 'series-1',
    title: 'Phàm Nhân Tu Tiên',
    titleVietnamese: 'Phàm Nhân Tu Tiên',
    description: 'Hàn Lập, một thanh niên bình thường từ làng quê nghèo khó với tư chất tu luyện tầm thường, tình cờ gia nhập Hoàng Phong Cốc - một môn phái tu tiên hạng ba. Mặc dù không có thiên phú xuất sắc như những đồng môn khác, nhưng nhờ vào sự cần cù, kiên trì và một chút may mắn, cùng với những bí thuật và cơ duyên đặc biệt, Hàn Lập từng bước vượt qua mọi thử thách, đối mặt với những kẻ thù mạnh mẽ và dần dần trở thành một trong những tu sĩ hùng mạnh nhất trong thế giới tu tiên. Câu chuyện không chỉ là hành trình tu luyện mà còn là cuộc đấu tranh sinh tồn trong thế giới tu tiên tàn khốc, nơi mà sức mạnh quyết định tất cả.',
    year: 2024,
    rating: 9.3,
    genre: ['Tu Tiên', 'Hành Động', 'Phiêu Lưu', 'Giả Tưởng', 'Chính Kịch'],
    director: 'Wang Weiming',
    studio: 'Tencent Animation',
    thumbnail: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=800',
    banner: 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=1920',
    trailer: '#',
    featured: true,
    new: true,
    popular: true,
    episodeCount: 149,
    episodes: generateEpisodes('series-1', 149, 'Phàm Nhân Tu Tiên'),
    totalDuration: '62 giờ 5 phút',
    status: 'ongoing',
    comments: generateComments(25),
    similarSeries: ['series-2', 'series-3'],
    topEpisodes: ['series-1-ep-15', 'series-1-ep-37', 'series-1-ep-89', 'series-1-ep-125']
  },
  {
    id: 'series-2',
    title: 'Dragon Blade Chronicles',
    titleVietnamese: 'Biên Niên Sử Kiếm Rồng',
    description: 'Một câu chuyện sử thi kéo dài nhiều mùa, theo chân một chiến binh trẻ phải thành thạo nghệ thuật chiến đấu bằng kiếm rồng cổ đại để cứu quê hương khỏi cuộc xâm lược từ thế giới khác. Mỗi tập phim tiết lộ những bí ẩn mới về nền văn minh rồng cổ đại và sức mạnh thực sự ẩn chứa trong những thanh kiếm huyền thoại.',
    year: 2024,
    rating: 9.2,
    genre: ['Hành Động', 'Giả Tưởng', 'Phiêu Lưu'],
    director: 'Zhang Wei',
    studio: 'Celestial Animation Studios',
    thumbnail: 'https://images.pexels.com/photos/2418664/pexels-photo-2418664.jpeg?auto=compress&cs=tinysrgb&w=800',
    banner: 'https://images.pexels.com/photos/2418664/pexels-photo-2418664.jpeg?auto=compress&cs=tinysrgb&w=1920',
    trailer: '#',
    featured: true,
    new: true,
    popular: true,
    episodeCount: 12,
    episodes: generateEpisodes('series-2', 12, 'Dragon Blade Chronicles'),
    totalDuration: '4 giờ 32 phút',
    status: 'ongoing',
    comments: generateComments(15),
    similarSeries: ['series-1', 'series-3'],
    topEpisodes: ['series-2-ep-3', 'series-2-ep-7', 'series-2-ep-10']
  },
  {
    id: 'series-3',
    title: 'Mystic Realm Warriors',
    titleVietnamese: 'Chiến Binh Vương Quốc Huyền Bí',
    description: 'Một nhóm anh hùng tuổi teen khám phá ra họ có siêu năng lực và phải đoàn kết để bảo vệ thế giới khỏi các thế lực ác cổ đại. Lấy bối cảnh trong một vương quốc huyền bí được chế tác đẹp mắt nơi phép thuật và công nghệ hiện đại cùng tồn tại.',
    year: 2024,
    rating: 8.8,
    genre: ['Giả Tưởng', 'Hành Động', 'Trưởng Thành'],
    director: 'Li Ming',
    studio: 'Phoenix Digital Arts',
    thumbnail: 'https://images.pexels.com/photos/1424246/pexels-photo-1424246.jpeg?auto=compress&cs=tinysrgb&w=800',
    banner: 'https://images.pexels.com/photos/1424246/pexels-photo-1424246.jpeg?auto=compress&cs=tinysrgb&w=1920',
    trailer: '#',
    featured: true,
    new: true,
    popular: false,
    episodeCount: 16,
    episodes: generateEpisodes('series-3', 16, 'Mystic Realm Warriors'),
    totalDuration: '6 giờ 8 phút',
    status: 'ongoing',
    comments: generateComments(12),
    similarSeries: ['series-1', 'series-4'],
    topEpisodes: ['series-3-ep-5', 'series-3-ep-12', 'series-3-ep-14']
  },
  {
    id: 'series-4',
    title: 'Celestial Guardian',
    titleVietnamese: 'Người Bảo Vệ Thiên Giới',
    description: 'Trong một thế giới nơi phép thuật và công nghệ cùng tồn tại, một người bảo vệ trẻ tuổi phải bảo vệ sự cân bằng giữa cõi thiên giới và phàm trần. Series được giới phê bình đánh giá cao này có hiệu ứng hình ảnh tuyệt đẹp và cốt truyện hấp dẫn.',
    year: 2023,
    rating: 9.5,
    genre: ['Giả Tưởng', 'Khoa Học Viễn Tưởng', 'Chính Kịch'],
    director: 'Wang Lei',
    studio: 'Starlight Productions',
    thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=800',
    banner: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1920',
    trailer: '#',
    featured: false,
    new: false,
    popular: true,
    episodeCount: 20,
    episodes: generateEpisodes('series-4', 20, 'Celestial Guardian'),
    totalDuration: '8 giờ 15 phút',
    status: 'completed',
    comments: generateComments(25),
    similarSeries: ['series-1', 'series-5'],
    topEpisodes: ['series-4-ep-8', 'series-4-ep-15', 'series-4-ep-20']
  }
];