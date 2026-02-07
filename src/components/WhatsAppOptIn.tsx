import React, { useState, useEffect } from 'react';
import { MessageCircle, Check, X, Loader2, Bell, BellOff } from 'lucide-react';

interface WhatsAppOptInProps {
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
  onOptIn?: () => void;
  onOptOut?: () => void;
}

interface OptInStatus {
  optedIn: boolean;
  phoneNumber: string | null;
  optedInAt: string | null;
}

export const WhatsAppOptIn: React.FC<WhatsAppOptInProps> = ({
  className = '',
  variant = 'banner',
  onOptIn,
  onOptOut,
}) => {
  const [optInStatus, setOptInStatus] = useState<OptInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState<'my' | 'en'>('my');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/opt-in-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOptInStatus(data.data);
        if (data.data.language) {
          setLanguage(data.data.language === 'my' ? 'my' : 'en');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptIn = async () => {
    if (!phoneNumber.trim()) {
      setShowPhoneInput(true);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/v1/whatsapp/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptInStatus({
          optedIn: true,
          phoneNumber: phoneNumber.trim(),
          optedInAt: new Date().toISOString(),
        });
        setShowPhoneInput(false);
        onOptIn?.();
      }
    } catch (error) {
      console.error('Error opting in:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOptOut = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/v1/whatsapp/opt-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setOptInStatus(prev => prev ? { ...prev, optedIn: false } : null);
        onOptOut?.();
      }
    } catch (error) {
      console.error('Error opting out:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const texts = {
    my: {
      title: 'WhatsApp အပ်ဒိတ်များ',
      description: 'သင့်လွှဲပြောင်းခြင်းများနှင့် ငွေထုတ်ယူမှုများကို WhatsApp မှတစ်ဆင့်ရယူပါ',
      optIn: 'လက်ခံမည်',
      optOut: 'ရပ်ဆိုင်းမည်',
      phonePlaceholder: '09XXXXXXXXX',
      connected: 'ချိတ်ဆက်ထားပါသည်',
      benefits: ['လွှဲပြောင်းခြင်းအခြေအနေများ', 'ငွေထုတ်ယူခြင်းအပ်ဒိတ်များ', 'အလုပ်အကိုင်အသစ်များ'],
    },
    en: {
      title: 'WhatsApp Updates',
      description: 'Get your referral and payout updates via WhatsApp',
      optIn: 'Subscribe',
      optOut: 'Unsubscribe',
      phonePlaceholder: '09XXXXXXXXX',
      connected: 'Connected',
      benefits: ['Referral status updates', 'Payout notifications', 'New job alerts'],
    },
  };

  const t = texts[language];

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    if (optInStatus?.optedIn) {
      return (
        <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{t.connected}</p>
                <p className="text-sm text-green-700">{optInStatus.phoneNumber}</p>
              </div>
            </div>
            <button
              onClick={handleOptOut}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.optOut}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-blue-900">{t.title}</p>
            <p className="text-sm text-blue-700 mb-3">{t.description}</p>
            
            {showPhoneInput ? (
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleOptIn}
                  disabled={isUpdating || !phoneNumber.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.optIn}
                </button>
                <button
                  onClick={() => setShowPhoneInput(false)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPhoneInput(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t.optIn}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${optInStatus?.optedIn ? 'bg-green-100' : 'bg-gray-100'}`}>
            {optInStatus?.optedIn ? (
              <Check className="w-6 h-6 text-green-600" />
            ) : (
              <BellOff className="w-6 h-6 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t.title}</h3>
            <p className="text-sm text-gray-500">
              {optInStatus?.optedIn ? t.connected : t.description}
            </p>
          </div>
        </div>

        {!optInStatus?.optedIn && (
          <ul className="space-y-2 mb-4">
            {t.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                {benefit}
              </li>
            ))}
          </ul>
        )}

        {optInStatus?.optedIn ? (
          <button
            onClick={handleOptOut}
            disabled={isUpdating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.optOut}
          </button>
        ) : showPhoneInput ? (
          <div className="space-y-3">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPhoneInput(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOptIn}
                disabled={isUpdating || !phoneNumber.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> {t.optIn}</>}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPhoneInput(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t.optIn}
          </button>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {optInStatus?.optedIn ? (
        <>
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="w-4 h-4" />
            WhatsApp
          </span>
          <button
            onClick={handleOptOut}
            disabled={isUpdating}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            {t.optOut}
          </button>
        </>
      ) : showPhoneInput ? (
        <div className="flex items-center gap-2">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={t.phonePlaceholder}
            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
            autoFocus
          />
          <button
            onClick={handleOptIn}
            disabled={isUpdating || !phoneNumber.trim()}
            className="text-sm text-green-600 hover:text-green-700"
          >
            {t.optIn}
          </button>
          <button
            onClick={() => setShowPhoneInput(false)}
            className="text-sm text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPhoneInput(true)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600"
        >
          <Bell className="w-4 h-4" />
          WhatsApp
        </button>
      )}
    </div>
  );
};

export default WhatsAppOptIn;
