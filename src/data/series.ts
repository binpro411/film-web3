import { Series } from '../types';

export const series: Series[] = [
  {
    id: 'series-1',
    title: 'A Record of Mortal\'s Journey to Immortality',
    titleVietnamese: 'Phàm Nhân Tu Tiên',
    description: 'Câu chuyện về Han Li, một chàng trai bình thường từ làng nghèo, bước vào con đường tu tiên đầy gian khó. Với ý chí kiên cường và trí tuệ, anh ta vượt qua vô số thử thách để trở thành một tu sĩ mạnh mẽ trong thế giới tu tiên đầy nguy hiểm.',
    year: 2020,
    rating: 9.2,
    genre: ['Hành Động', 'Phiêu Lưu', 'Tu Tiên', 'Drama'],
    director: 'Wang Wei',
    studio: 'Wan Wei Mao Donghua',
    thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
    banner: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1200',
    trailer: '',
    featured: true,
    new: true,
    popular: true,
    episodeCount: 60,
    totalDuration: '24 giờ',
    status: 'ongoing',
    episodes: [
      {
        id: 'ep-1-1',
        number: 1,
        title: 'The Beginning of the Journey',
        titleVietnamese: 'Khởi Đầu Hành Trình',
        description: 'Han Li, một chàng trai từ làng nghèo, được nhận vào môn phái Hoàng Phong Cốc và bắt đầu hành trình tu tiên của mình.',
        duration: '24:30',
        thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-07-25',
        rating: 9.1,
        watched: false,
        watchProgress: 0
      },
      {
        id: 'ep-1-2',
        number: 2,
        title: 'First Cultivation',
        titleVietnamese: 'Tu Luyện Đầu Tiên',
        description: 'Han Li học được những kỹ thuật tu luyện cơ bản và khám phá ra bí mật của chai nhỏ xanh.',
        duration: '24:15',
        thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-08-01',
        rating: 9.0,
        watched: false,
        watchProgress: 0
      },
      {
        id: 'ep-1-3',
        number: 3,
        title: 'The Mysterious Bottle',
        titleVietnamese: 'Chai Nhỏ Bí Ẩn',
        description: 'Han Li khám phá sức mạnh thật sự của chai nhỏ xanh và cách nó có thể giúp anh tu luyện nhanh hơn.',
        duration: '24:45',
        thumbnail: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-08-08',
        rating: 9.3,
        watched: false,
        watchProgress: 0
      }
    ],
    comments: [],
    similarSeries: ['series-2', 'series-3'],
    topEpisodes: ['ep-1-1', 'ep-1-3']
  },
  {
    id: 'series-2',
    title: 'Battle Through the Heavens',
    titleVietnamese: 'Đấu Phá Thương Khung',
    description: 'Xiao Yan, một thiên tài tu luyện trẻ tuổi, đột nhiên mất đi sức mạnh. Với sự giúp đỡ của linh hồn cổ đại Yao Lao, anh ta bắt đầu hành trình lấy lại vinh quang và trở thành Đấu Đế.',
    year: 2018,
    rating: 8.8,
    genre: ['Hành Động', 'Tu Tiên', 'Romance', 'Phiêu Lưu'],
    director: 'Li Ming',
    studio: 'Motion Magic',
    thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
    banner: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=1200',
    trailer: '',
    featured: true,
    new: false,
    popular: true,
    episodeCount: 45,
    totalDuration: '15 giờ',
    status: 'completed',
    episodes: [
      {
        id: 'ep-2-1',
        number: 1,
        title: 'The Fallen Genius',
        titleVietnamese: 'Thiên Tài Sa Đọa',
        description: 'Xiao Yan, từng là thiên tài của gia tộc, giờ đây trở thành kẻ bị mọi người coi thường.',
        duration: '20:30',
        thumbnail: 'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-01-30',
        rating: 8.5,
        watched: false,
        watchProgress: 0
      }
    ],
    comments: [],
    similarSeries: ['series-1', 'series-3'],
    topEpisodes: ['ep-2-1']
  },
  {
    id: 'series-3',
    title: 'Soul Land',
    titleVietnamese: 'Đấu La Đại Lục',
    description: 'Tang San, một đệ tử của môn phái ẩn dật Đường Môn, tái sinh vào thế giới Đấu La Đại Lục. Nơi đây, sức mạnh được quyết định bởi Võn Hồn và Hồn Kỹ.',
    year: 2018,
    rating: 9.0,
    genre: ['Hành Động', 'Tu Tiên', 'Phiêu Lưu', 'Siêu Nhiên'],
    director: 'Zhang San',
    studio: 'Sparkly Key Animation',
    thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400',
    banner: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=1200',
    trailer: '',
    featured: true,
    new: false,
    popular: true,
    episodeCount: 40,
    totalDuration: '13.3 giờ',
    status: 'ongoing',
    episodes: [
      {
        id: 'ep-3-1',
        number: 1,
        title: 'Rebirth',
        titleVietnamese: 'Tái Sinh',
        description: 'Tang San tái sinh vào thế giới Đấu La Đại Lục và khám phá ra hệ thống Võn Hồn.',
        duration: '20:00',
        thumbnail: 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-01-20',
        rating: 9.2,
        watched: false,
        watchProgress: 0
      }
    ],
    comments: [],
    similarSeries: ['series-1', 'series-2'],
    topEpisodes: ['ep-3-1']
  }
];