import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons' | 'minimal';
  showFlags?: boolean;
  className?: string;
  onLanguageChange?: (language: string) => void;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'my', name: 'Burmese', flag: '🇲🇲', nativeName: 'မြန်မာ' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾', nativeName: 'Bahasa Melayu' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
];

const STORAGE_KEY = 'i18nextLng';

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showFlags = true,
  className = '',
  onLanguageChange,
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === i18n.language) {
      setIsOpen(false);
      return;
    }

    try {
      await i18n.changeLanguage(languageCode);
      localStorage.setItem(STORAGE_KEY, languageCode);
      onLanguageChange?.(languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
    setIsOpen(false);
  };

  // Buttons variant - row of flag buttons
  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              relative p-2 rounded-lg transition-all duration-200
              hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${i18n.language === language.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
            `}
            title={`${language.name} (${language.nativeName})`}
            aria-label={`Switch to ${language.name}`}
            aria-pressed={i18n.language === language.code}
          >
            <span className="text-xl" role="img" aria-label={language.name}>
              {showFlags ? language.flag : language.code.toUpperCase()}
            </span>
            {i18n.language === language.code && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Minimal variant - just current language with chevron
  if (variant === 'minimal') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {showFlags && (
            <span className="text-lg" role="img" aria-label={currentLanguage.name}>
              {currentLanguage.flag}
            </span>
          )}
          <span className="text-sm font-medium text-gray-700">
            {currentLanguage.code.toUpperCase()}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50"
              role="listbox"
              aria-label={t('common.selectLanguage', 'Select language')}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    transition-colors duration-150
                    ${
                      i18n.language === language.code
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                  role="option"
                  aria-selected={i18n.language === language.code}
                >
                  {showFlags && (
                    <span className="text-lg" role="img" aria-label={language.name}>
                      {language.flag}
                    </span>
                  )}
                  <span className="flex-1 text-sm">{language.nativeName}</span>
                  {i18n.language === language.code && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        {showFlags && (
          <span className="text-lg" role="img" aria-label={currentLanguage.name}>
            {currentLanguage.flag}
          </span>
        )}
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLanguage.nativeName}
        </span>
        <span className="text-sm font-medium text-gray-700 sm:hidden">
          {currentLanguage.code.toUpperCase()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
            role="listbox"
            aria-label={t('common.selectLanguage', 'Select language')}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('common.selectLanguage', 'Select Language')}
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-colors duration-150
                    ${
                      i18n.language === language.code
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                  role="option"
                  aria-selected={i18n.language === language.code}
                >
                  {showFlags && (
                    <span className="text-2xl" role="img" aria-label={language.name}>
                      {language.flag}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{language.nativeName}</p>
                    <p className="text-xs text-gray-500 truncate">{language.name}</p>
                  </div>
                  {i18n.language === language.code && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
