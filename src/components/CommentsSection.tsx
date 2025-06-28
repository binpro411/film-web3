import React, { useState } from 'react';
import { Star, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { Comment } from '../types';

interface CommentsSectionProps {
  comments: Comment[];
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ comments }) => {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'oldest':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const filteredComments = filterRating 
    ? sortedComments.filter(comment => comment.rating === filterRating)
    : sortedComments;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating')}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="rating">Đánh giá</option>
          </select>
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Lọc theo đánh giá:</span>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                  filterRating === rating 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Star className="h-3 w-3 fill-current" />
                <span>{rating}</span>
              </button>
            ))}
          </div>
        </div>
        
        <p className="text-gray-400 text-sm">
          {filteredComments.length} bình luận
        </p>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.map((comment) => (
          <div key={comment.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <img
                src={comment.userAvatar}
                alt={comment.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-white font-semibold">{comment.userName}</h4>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < comment.rating 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{formatDate(comment.timestamp)}</span>
                </div>
                
                <p className="text-gray-300 mb-3 leading-relaxed">{comment.content}</p>
                
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{comment.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">Trả lời</span>
                  </button>
                  <button className="flex items-center space-x-1 text-gray-400 hover:text-green-400 transition-colors">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-sm">Thích</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Comment */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Viết bình luận</h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">Đánh giá:</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} className="text-gray-600 hover:text-yellow-400 transition-colors">
                <Star className="h-5 w-5" />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Đăng bình luận
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsSection;