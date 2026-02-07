import React, { useState } from 'react';
import { Share2, MessageCircle, Check, Copy, X, Send } from 'lucide-react';

interface WhatsAppShareButtonProps {
  referralCode: string;
  referralLink: string;
  jobTitle?: string;
  companyName?: string;
  bonusAmount?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon' | 'floating';
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  referralCode,
  referralLink,
  jobTitle,
  companyName,
  bonusAmount,
  className = '',
  size = 'md',
  variant = 'button',
}) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState<'my' | 'en'>('my');

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const generateShareMessage = () => {
    if (language === 'my') {
      let message = `🎯 အလုပ်အကိုင် အခွင့်အလမ်း!\n\n`;
      
      if (jobTitle && companyName) {
        message += `အလုပ်: ${jobTitle}\nကုမ္ပဏီ: ${companyName}\n`;
      }
      
      if (bonusAmount) {
        message += `လွှဲပြောင်းရဘောနပ်: ${bonusAmount} MMK\n\n`;
      }
      
      message += `ဤလင့်ခ်မှတဆင့် လျှောက်ထားနိုင်ပါသည်:\n${referralLink}\n\n`;
      message += `TRM Referral Platform မှ ကူညီပေးပါသည်။`;
      
      return message;
    } else {
      let message = `🎯 Job Opportunity!\n\n`;
      
      if (jobTitle && companyName) {
        message += `Position: ${jobTitle}\nCompany: ${companyName}\n`;
      }
      
      if (bonusAmount) {
        message += `Referral Bonus: ${bonusAmount} MMK\n\n`;
      }
      
      message += `Apply through this link:\n${referralLink}\n\n`;
      message += `Powered by TRM Referral Platform`;
      
      return message;
    }
  };

  const handleShare = () => {
    const message = generateShareMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Close modal if open
    setShowModal(false);
  };

  const handleCopy = async () => {
    const message = generateShareMessage();
    
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDirectShare = () => {
    if (variant === 'icon') {
      handleShare();
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={handleDirectShare}
          className={`fixed bottom-6 right-6 z-50 p-4 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 ${className}`}
          title="Share via WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {showModal && (
          <ShareModal
            language={language}
            setLanguage={setLanguage}
            message={generateShareMessage()}
            onShare={handleShare}
            onCopy={handleCopy}
            copied={copied}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDirectShare}
        className={`p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors ${className}`}
        title="Share via WhatsApp"
      >
        <MessageCircle className={iconSizes[size]} />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleDirectShare}
        className={`inline-flex items-center gap-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors ${sizeClasses[size]} ${className}`}
      >
        <MessageCircle className={iconSizes[size]} />
        <span>{language === 'my' ? 'WhatsApp ဖြင့် မျှဝေရန်' : 'Share on WhatsApp'}</span>
      </button>

      {showModal && (
        <ShareModal
          language={language}
          setLanguage={setLanguage}
          message={generateShareMessage()}
          onShare={handleShare}
          onCopy={handleCopy}
          copied={copied}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

// Share Modal Component
interface ShareModalProps {
  language: 'my' | 'en';
  setLanguage: (lang: 'my' | 'en') => void;
  message: string;
  onShare: () => void;
  onCopy: () => void;
  copied: boolean;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  language,
  setLanguage,
  message,
  onShare,
  onCopy,
  copied,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-full">
              <Share2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'my' ? 'မျှဝေရန်' : 'Share'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Language Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('my')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                language === 'my'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              မြန်မာ
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              English
            </button>
          </div>

          {/* Message Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'my' ? 'မက်ဆေ့ချ်' : 'Message'}
            </label>
            <textarea
              value={message}
              readOnly
              rows={6}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span>{language === 'my' ? 'ကူးယူပြီး' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{language === 'my' ? 'ကူးယူရန်' : 'Copy'}</span>
                </>
              )}
            </button>
            <button
              onClick={onShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'my' ? 'WhatsApp သို့' : 'Send to WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppShareButton;
