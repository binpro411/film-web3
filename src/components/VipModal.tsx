import React, { useState } from 'react';
import { X, Crown, Check, Star, Zap } from 'lucide-react';
import { VipPlan } from '../types';
import { vipPlans } from '../data/vipPlans';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: VipPlan) => void;
}

const VipModal: React.FC<VipModalProps> = ({ isOpen, onClose, onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('quarterly');

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-orange-500 p-8 rounded-t-2xl">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Crown className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">Nâng Cấp VIP</h2>
            <p className="text-yellow-100 text-lg">
              Trải nghiệm xem phim chất lượng cao không giới hạn
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {vipPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-gray-800 rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                  selectedPlan === plan.id
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                } ${plan.popular ? 'ring-2 ring-yellow-500/50' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>PHỔ BIẾN NHẤT</span>
                    </div>
                  </div>
                )}

                {/* Discount Badge */}
                {plan.discount && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    -{plan.discount}%
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {plan.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        {formatPrice(plan.originalPrice)}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    {formatPrice(plan.price)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {plan.duration === 1 ? 'mỗi tháng' : `cho ${plan.duration} tháng`}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3 text-gray-300">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Selection Indicator */}
                <div className={`w-full h-1 rounded-full transition-colors ${
                  selectedPlan === plan.id ? 'bg-yellow-500' : 'bg-gray-700'
                }`} />
              </div>
            ))}
          </div>

          {/* Benefits Section */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Zap className="h-6 w-6 text-yellow-400" />
              <span>Tại sao chọn VIP?</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Chất lượng video cao nhất (4K/8K)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Không có quảng cáo làm gián đoạn</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Tải xuống để xem offline</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">Truy cập sớm nội dung mới</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={() => {
                const plan = vipPlans.find(p => p.id === selectedPlan);
                if (plan) {
                  onSelectPlan(plan);
                }
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
            >
              <Crown className="h-6 w-6" />
              <span>Tiếp Tục Thanh Toán</span>
            </button>
            <p className="text-gray-400 text-sm mt-4">
              Bạn có thể hủy bất cứ lúc nào. Không có cam kết dài hạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipModal;