import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, Clock, AlertCircle, QrCode } from 'lucide-react';
import { VipPlan, PaymentMethod, PaymentTransaction } from '../types';
import { paymentMethods } from '../data/vipPlans';
import { useAuth } from '../contexts/AuthContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: VipPlan | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedPlan }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(paymentMethods[0]);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [copied, setCopied] = useState(false);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    if (transaction && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [transaction, timeLeft]);

  if (!isOpen || !selectedPlan) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const createTransaction = () => {
    const newTransaction: PaymentTransaction = {
      id: Date.now().toString(),
      userId: user?.id || '',
      planId: selectedPlan.id,
      amount: selectedPlan.price,
      paymentMethod: selectedMethod.id,
      status: 'pending',
      qrCode: selectedMethod.qrCode,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
    setTransaction(newTransaction);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmPayment = () => {
    if (transaction && user) {
      // Simulate payment confirmation
      const updatedUser = {
        ...user,
        isVip: true,
        vipExpiry: new Date(Date.now() + selectedPlan.duration * 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      updateUser(updatedUser);
      
      setTransaction({
        ...transaction,
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });
      
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Thanh Toán</h2>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">{selectedPlan.name}</span>
              <span className="text-white font-bold text-xl">{formatPrice(selectedPlan.price)}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!transaction ? (
            <>
              {/* Payment Method Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Chọn phương thức thanh toán</h3>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMethod.id === method.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedMethod(method)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="text-white font-medium">{method.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Payment Button */}
              <button
                onClick={createTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Tạo Mã Thanh Toán
              </button>
            </>
          ) : (
            <>
              {/* Payment Status */}
              <div className="text-center mb-6">
                {transaction.status === 'pending' && (
                  <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-2">
                    <Clock className="h-5 w-5" />
                    <span>Đang chờ thanh toán</span>
                  </div>
                )}
                {transaction.status === 'confirmed' && (
                  <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Thanh toán thành công!</span>
                  </div>
                )}
                
                {transaction.status === 'pending' && (
                  <div className="text-white">
                    <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
                    <p className="text-gray-400 text-sm">Thời gian còn lại</p>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="bg-white p-6 rounded-xl mb-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-gray-600 mr-2" />
                  <span className="text-gray-800 font-medium">Quét mã QR để thanh toán</span>
                </div>
                <img
                  src={transaction.qrCode}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto mb-4 border border-gray-300 rounded-lg"
                />
                <p className="text-gray-600 text-sm">
                  Sử dụng ứng dụng {selectedMethod.name} để quét mã
                </p>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-3">Thông tin thanh toán</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Số tiền:</span>
                    <span className="text-white font-medium">{formatPrice(transaction.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phương thức:</span>
                    <span className="text-white">{selectedMethod.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mã giao dịch:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono">{transaction.id}</span>
                      <button
                        onClick={() => copyToClipboard(transaction.id)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-700">
                    <p className="text-gray-400">{selectedMethod.accountInfo}</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Hướng dẫn thanh toán:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-200">
                      <li>Mở ứng dụng {selectedMethod.name}</li>
                      <li>Quét mã QR hoặc nhập thông tin chuyển khoản</li>
                      <li>Nhập số tiền chính xác: {formatPrice(transaction.amount)}</li>
                      <li>Hoàn tất giao dịch</li>
                      <li>Nhấn "Xác nhận đã chuyển tiền" bên dưới</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {transaction.status === 'pending' && (
                <div className="flex space-x-4">
                  <button
                    onClick={confirmPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Xác Nhận Đã Chuyển Tiền
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              )}

              {transaction.status === 'confirmed' && (
                <div className="text-center">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                    <p className="text-green-400 font-medium">
                      🎉 Chúc mừng! Bạn đã trở thành thành viên VIP
                    </p>
                    <p className="text-green-300 text-sm mt-1">
                      Tài khoản của bạn đã được nâng cấp thành công
                    </p>
                  </div>
                </div>
              )}

              {/* Copy Success Message */}
              {copied && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
                  Đã sao chép!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;