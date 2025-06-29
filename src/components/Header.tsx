import React, { useState } from 'react';
import { Search, Menu, X, Play, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';

interface HeaderProps {
  onSearch: (query: string) => void;
  onOpenAuth: () => void;
  onOpenVip: () => void;
  onOpenAdmin?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onSearch, 
  onOpenAuth, 
  onOpenVip,
  onOpenAdmin
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, isLoading, user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <Play className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AnimeStream</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Hoạt Hình 3D Trung Quốc</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-white hover:text-blue-400 transition-colors font-medium">Trang Chủ</a>
            <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Mới Nhất</a>
            <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Phổ Biến</a>
            <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Thể Loại</a>
            <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Yêu Thích</a>
          </nav>

          {/* Search & User */}
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="hidden sm:block relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm phim hoạt hình..."
                className="bg-gray-800 text-white placeholder-gray-400 rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-700 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </form>

            {/* Admin Button - Only for Admin */}
            {user?.isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
                title="Admin Panel"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* User Authentication */}
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <UserMenu onOpenVip={onOpenVip} />
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline">Đăng Nhập</span>
                  </button>
                )}
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4">
            <div className="flex flex-col space-y-4">
              <form onSubmit={handleSearch} className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm phim hoạt hình..."
                  className="bg-gray-800 text-white placeholder-gray-400 rounded-full pl-10 pr-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </form>
              <a href="#" className="text-white hover:text-blue-400 transition-colors font-medium">Trang Chủ</a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Mới Nhất</a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Phổ Biến</a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Thể Loại</a>
              <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">Yêu Thích</a>
              
              {/* Admin Button Mobile */}
              {user?.isAdmin && onOpenAdmin && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    setIsMenuOpen(false);
                  }}
                  className="text-left text-purple-400 hover:text-purple-300 transition-colors font-medium flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin Panel</span>
                </button>
              )}
              
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setIsMenuOpen(false);
                  }}
                  className="text-left text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Đăng Nhập / Đăng Ký
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;