import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Wifi, CheckCircle2 } from 'lucide-react';

interface QRScannerProps {
  onConnected: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onConnected }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'initial' | 'generating' | 'ready' | 'scanning' | 'connected'>('initial');
  const [loading, setLoading] = useState(false);

  // Don't auto-generate QR code on mount
  // useEffect(() => {
  //   generateQRCode();
  // }, []);
  
  const generateQRCode = async () => {
    setStatus('generating');
    setLoading(true);
    setQrCode(''); // Clear any existing QR code

    try {
      console.log('Requesting QR code from backend...');
      const response = await fetch('/api/whatsapp/qr-code');
      const data = await response.json();
      console.log('QR code response:', data);

      if (data.success) {
        if (data.qrCode) {
          setQrCode(data.qrCode);
          setStatus('ready');
          console.log('QR code set, status changed to ready');
        } else {
          // QR code not ready yet, try polling for it
          console.log('QR code not ready, polling...');
          pollForQRCode();
        }
      } else {
        console.log('Failed to generate QR code:', data.error);
        setStatus('initial'); // Go back to initial state
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setStatus('initial'); // Go back to initial state on error
    } finally {
      setLoading(false);
    }
  };

  const pollForQRCode = async () => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max

    const poll = async () => {
      try {
        const response = await fetch('/api/whatsapp/qr-code');
        const data = await response.json();

        if (data.success && data.qrCode) {
          setQrCode(data.qrCode);
          setStatus('ready');
          console.log('QR code received via polling');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 500); // Poll every 500ms
        } else {
          console.log('Polling timeout, no QR code received');
          setStatus('initial');
        }
      } catch (error) {
        console.error('Error polling for QR code:', error);
        setStatus('initial');
      }
    };

    poll();
  };


  const handleConnect = async () => {
    setStatus('scanning');
    setLoading(true);

    try {
      console.log('Attempting to connect to WhatsApp...');
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
      });
      const data = await response.json();
      console.log('Connection response:', data);

      if (data.success) {
        setStatus('connected');
        setTimeout(() => {
          onConnected();
        }, 1500);
      } else {
        console.error('Connection failed:', data.error);
        setStatus('ready'); // Go back to ready state
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setStatus('ready'); // Go back to ready state
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'initial':
        return 'Ready to Connect';
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

        {/* Button logic - only show one button at a time */}
        {status === 'initial' && (
          <button
            onClick={generateQRCode}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <QrCode className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        )}

        {status === 'generating' && (
          <button
            disabled={true}
            className="w-full bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Generating QR Code...
          </button>
        )}

        {status === 'ready' && qrCode && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Smartphone className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Ready to Connect'}
          </button>
        )}

        {status === 'scanning' && (
          <button
            disabled={true}
            className="w-full bg-yellow-500 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Connecting to WhatsApp...
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