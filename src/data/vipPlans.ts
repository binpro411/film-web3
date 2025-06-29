import { VipPlan, PaymentMethod } from '../types';

export const vipPlans: VipPlan[] = [
  {
    id: 'monthly',
    name: 'VIP Tháng',
    duration: 1,
    price: 99000,
    features: [
      'Xem không giới hạn tất cả nội dung',
      'Chất lượng video Full HD (1080p)',
      'Không có quảng cáo',
      'Tải xuống để xem offline',
      'Hỗ trợ khách hàng ưu tiên'
    ]
  },
  {
    id: 'quarterly',
    name: 'VIP 3 Tháng',
    duration: 3,
    price: 249000,
    originalPrice: 297000,
    discount: 16,
    popular: true,
    features: [
      'Tất cả tính năng VIP Tháng',
      'Chất lượng video 4K (khi có)',
      'Truy cập sớm nội dung mới',
      'Xem đồng thời trên 3 thiết bị',
      'Tính năng xem cùng bạn bè',
      'Tiết kiệm 16% so với VIP Tháng'
    ]
  },
  {
    id: 'yearly',
    name: 'VIP Năm',
    duration: 12,
    price: 799000,
    originalPrice: 1188000,
    discount: 33,
    features: [
      'Tất cả tính năng VIP 3 Tháng',
      'Chất lượng video 8K (khi có)',
      'Nội dung độc quyền VIP',
      'Xem đồng thời không giới hạn',
      'Quà tặng sinh nhật đặc biệt',
      'Tiết kiệm 33% so với VIP Tháng',
      'Ưu tiên hỗ trợ 24/7'
    ]
  }
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'momo',
    name: 'Ví MoMo',
    icon: '💳',
    qrCode: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'Quét mã QR hoặc chuyển khoản đến số điện thoại: 0123456789'
  },
  {
    id: 'banking',
    name: 'Chuyển khoản ngân hàng',
    icon: '🏦',
    qrCode: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'Vietcombank - STK: 1234567890 - Chủ TK: ANIMESTREAM'
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    icon: '💰',
    qrCode: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300',
    accountInfo: 'Quét mã QR hoặc chuyển khoản đến số điện thoại: 0123456789'
  }
];