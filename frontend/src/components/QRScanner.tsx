import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Wifi, CheckCircle2 } from 'lucide-react';

interface QRScannerProps {
  onConnected: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onConnected }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'generating' | 'ready' | 'scanning' | 'connected'>('generating');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    setStatus('generating');
    setLoading(true);
    
    try {
      const response = await fetch('/api/whatsapp/qr-code');
      const data = await response.json();
      
      if (data.success) {
        if (data.qrCode) {
          setQrCode(data.qrCode);
          setStatus('ready');
        } else {
          // Retry after a short delay if QR code is not ready
          setTimeout(() => {
            generateQRCode();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      // Retry on error
      setTimeout(() => {
        generateQRCode();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setStatus('scanning');
    setLoading(true);
    
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus('connected');
        setTimeout(() => {
          onConnected();
        }, 1500);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setStatus('ready');
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'generating':
        return 'Generating QR Code...';
      case 'ready':
        return 'Scan QR Code with WhatsApp';
      case 'scanning':
        return 'Connecting to WhatsApp...';
      case 'connected':
        return 'Successfully Connected!';
      default:
        return 'Ready to Connect';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <QrCode className="w-8 h-8 text-green-500 animate-spin" />;
      case 'ready':
        return <Smartphone className="w-8 h-8 text-blue-500" />;
      case 'scanning':
        return <Wifi className="w-8 h-8 text-yellow-500 animate-pulse" />;
      case 'connected':
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      default:
        return <QrCode className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              {getStatusIcon()}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp Manager</h1>
          <p className="text-gray-600">Connect your WhatsApp account to get started</p>
        </div>

        {qrCode && status === 'ready' && (
          <div className="mb-6 flex justify-center">
            <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-green-100">
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              status === 'connected' ? 'bg-green-500' : 
              status === 'scanning' ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {getStatusMessage()}
            </span>
          </div>
          
          {status === 'ready' && (
            <p className="text-xs text-gray-500 mb-4">
              Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
            </p>
          )}
        </div>

        {status === 'ready' && (
          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <QrCode className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect WhatsApp'}
          </button>
        )}

        {status === 'generating' && (
          <button
            onClick={generateQRCode}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Generate New QR Code
          </button>
        )}

        {status === 'connected' && (
          <div className="text-center">
            <div className="text-green-600 font-medium mb-2">Connection Successful!</div>
            <div className="text-sm text-gray-500">Redirecting to dashboard...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;