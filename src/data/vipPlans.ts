import { VipPlan, PaymentMethod } from '../types';

export const vipPlans: VipPlan[] = [
  {
    id: 'monthly',
    name: 'Gói Tháng',
    duration: 1,
    price: 99000,
    originalPrice: 129000,
    discount: 23,
    features: [
      'Xem phim chất lượng HD',
      'Không quảng cáo',
      'Tải xuống offline',
      'Xem trên 2 thiết bị',
      'Phụ đề đa ngôn ngữ'
    ]
  },
  {
    id: 'quarterly',
    name: 'Gói 3 Tháng',
    duration: 3,
    price: 249000,
    originalPrice: 387000,
    discount: 36,
    popular: true,
    features: [
      'Tất cả tính năng gói tháng',
      'Xem phim chất lượng 4K',
      'Xem trên 4 thiết bị',
      'Nội dung độc quyền',
      'Ưu tiên hỗ trợ khách hàng',
      'Tiết kiệm 36%'
    ]
  },
  {
    id: 'yearly',
    name: 'Gói Năm',
    duration: 12,
    price: 799000,
    originalPrice: 1548000,
    discount: 48,
    features: [
      'Tất cả tính năng gói 3 tháng',
      'Xem phim chất lượng 8K',
      'Xem không giới hạn thiết bị',
      'Truy cập sớm nội dung mới',
      'Tặng kèm merchandise',
      'Tiết kiệm 48%'
    ]
  }
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'momo',
    name: 'MoMo',
    icon: '💳',
    qrCode: 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'Số điện thoại: 0123456789'
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    icon: '💰',
    qrCode: 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'Số điện thoại: 0123456789'
  },
  {
    id: 'banking',
    name: 'Chuyển khoản ngân hàng',
    icon: '🏦',
    qrCode: 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'STK: 1234567890 - Ngân hàng Vietcombank'
  }
];