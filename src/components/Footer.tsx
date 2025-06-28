import React from 'react';
import { Play, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AnimeStream</h3>
                <p className="text-sm text-gray-400">Nền tảng phim hoạt hình 3D Trung Quốc</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Chuyên cung cấp nội dung phim hoạt hình 3D Trung Quốc chất lượng cao, mang đến trải nghiệm thị giác đắm chìm và cốt truyện hấp dẫn cho khán giả.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Liên Kết Nhanh</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trang Chủ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Phim Mới Nhất</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Phổ Biến</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Thể Loại</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Yêu Thích</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Hỗ Trợ</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trung Tâm Trợ Giúp</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Liên Hệ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Điều Khoản Sử Dụng</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Chính Sách Bảo Mật</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bản Quyền</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 AnimeStream. Bảo lưu mọi quyền. Chuyên về phim hoạt hình 3D Trung Quốc, truyền tải tinh hoa văn hóa.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;