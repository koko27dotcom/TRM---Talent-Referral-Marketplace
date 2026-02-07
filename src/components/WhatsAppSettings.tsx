import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, Check, X, AlertCircle, Loader2, Globe } from 'lucide-react';

interface WhatsAppSettingsProps {
  className?: string;
}

interface OptInStatus {
  optedIn: boolean;
  phoneNumber: string | null;
  optedInAt: string | null;
  language: string;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ className = '' }) => {
  const [optInStatus, setOptInStatus] = useState<OptInStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [language, setLanguage] = useState<'my' | 'en'>('my');

  // Fetch opt-in status on mount
  useEffect(() => {
    checkOptInStatus();
  }, []);

  const checkOptInStatus = async () => {
    try {
      setIsChecking(true);
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
      console.error('Error checking opt-in status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleOptIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setMessage({ type: 'error', text: language === 'my' ? 'ဖုန်းနံပါတ်ထည့်ပါ' : 'Please enter phone number' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/whatsapp/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: language === 'my' 
            ? 'WhatsApp မက်ဆေ့ချ်များလက်ခံခြင်းအောင်မြင်ပါသည်!' 
            : 'Successfully subscribed to WhatsApp messages!' 
        });
        setOptInStatus({
          optedIn: true,
          phoneNumber: phoneNumber.trim(),
          optedInAt: new Date().toISOString(),
          language: language,
        });
        setPhoneNumber('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Error opting in' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: language === 'my' ? 'အမှားတစ်ခုဖြစ်သွားပါသည်' : 'An error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptOut = async () => {
    if (!window.confirm(language === 'my' 
      ? 'WhatsApp မက်ဆေ့ချ်များရပ်ဆိုင်းလိုပါသလား?' 
      : 'Are you sure you want to unsubscribe?')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/whatsapp/opt-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: language === 'my' 
            ? 'WhatsApp မက်ဆေ့ချ်များရပ်ဆိုင်းပြီးပါပြီ' 
            : 'Successfully unsubscribed' 
        });
        setOptInStatus(prev => prev ? { ...prev, optedIn: false } : null);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Error opting out' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: language === 'my' ? 'အမှားတစ်ခုဖြစ်သွားပါသည်' : 'An error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Myanmar phone number for display
    if (phone.startsWith('+95')) {
      return phone.replace(/(\+95)(\d{1,2})(\d{3})(\d{3,4})/, '$1 $2 $3 $4');
    }
    return phone;
  };

  if (isChecking) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-full">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {language === 'my' ? 'WhatsApp ဆက်တင်များ' : 'WhatsApp Settings'}
          </h3>
          <p className="text-sm text-gray-500">
            {language === 'my' 
              ? 'မက်ဆေ့ချ်အပ်ဒိတ်များလက်ခံခြင်းကိုစီမံပါ' 
              : 'Manage your message notification preferences'}
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {optInStatus?.optedIn ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">
                {language === 'my' ? 'ချိတ်ဆက်ထားပါသည်' : 'Connected'}
              </p>
              <p className="text-sm text-green-700">
                {formatPhoneNumber(optInStatus.phoneNumber || '')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              {language === 'my' ? 'လက်ခံမည့်မက်ဆေ့ချ်များ' : 'You will receive:'}
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {language === 'my' ? 'လွှဲပြောင်းခြင်းအခြေအနေများ' : 'Referral status updates'}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {language === 'my' ? 'ငွေထုတ်ယူခြင်းအပ်ဒိတ်များ' : 'Payout notifications'}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {language === 'my' ? 'အလုပ်အကိုင်အသစ်များ' : 'New job alerts'}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {language === 'my' ? 'အဆင့်တိုးမြင့်မှုသတင်းများ' : 'Tier upgrade notifications'}
              </li>
            </ul>
          </div>

          <button
            onClick={handleOptOut}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {language === 'my' ? 'မက်ဆေ့ချ်များရပ်ဆိုင်းရန်' : 'Unsubscribe'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleOptIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {language === 'my' ? 'WhatsApp ဖုန်းနံပါတ်' : 'WhatsApp Phone Number'}
              </span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={language === 'my' ? '09XXXXXXXXX' : '+959123456789'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {language === 'my' 
                ? 'ဥပမာ: 09123456789 သို့မဟုတ် +959123456789' 
                : 'Example: 09123456789 or +959123456789'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {language === 'my' ? 'ဘာသာစကား' : 'Language'}
              </span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'my' | 'en')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="my">မြန်မာ (Burmese)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              {language === 'my' 
                ? 'မက်ဆေ့ချ်များလက်ခံခြင်းဖြင့် သင်သည် WhatsApp Business Terms နှင့် Privacy Policy ကိုလက်ခံသည်။' 
                : 'By subscribing, you agree to WhatsApp Business Terms and Privacy Policy.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            {language === 'my' ? 'WhatsApp မှတစ်ဆင့်လက်ခံမည်' : 'Subscribe via WhatsApp'}
          </button>
        </form>
      )}
    </div>
  );
};

export default WhatsAppSettings;
