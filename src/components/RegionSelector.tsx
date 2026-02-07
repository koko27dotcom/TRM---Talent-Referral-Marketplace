import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Region {
  code: string;
  name: string;
  localName: string;
  flag: string;
  currency: string;
  status: 'active' | 'preparing' | 'inactive';
  languages: string[];
}

interface RegionSelectorProps {
  variant?: 'dropdown' | 'cards' | 'minimal';
  showFlags?: boolean;
  className?: string;
  onRegionChange?: (region: Region) => void;
  filterByStatus?: ('active' | 'preparing' | 'inactive')[];
}

const STATUS_CONFIG: Record<
  Region['status'],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  preparing: {
    label: 'Coming Soon',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
  },
  inactive: {
    label: 'Inactive',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
};

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  variant = 'dropdown',
  showFlags = true,
  className = '',
  onRegionChange,
  filterByStatus = ['active', 'preparing'],
}) => {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<Region[]>([]);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter regions by status
  const filteredRegions = regions.filter((region) =>
    filterByStatus.includes(region.status)
  );

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

  // Fetch regions from API
  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/regions');
      
      if (!response.ok) {
        throw new Error(t('errors.fetchRegions', 'Failed to fetch regions'));
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setRegions(data.data);
        
        // Set current region from localStorage or first active region
        const savedRegionCode = localStorage.getItem('userRegion');
        const activeRegion = data.data.find(
          (r: Region) => r.code === savedRegionCode && r.status === 'active'
        ) || data.data.find((r: Region) => r.status === 'active');
        
        if (activeRegion) {
          setCurrentRegion(activeRegion);
        }
      } else {
        throw new Error(t('errors.invalidData', 'Invalid data format'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown', 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial fetch
  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Save region preference to user profile
  const saveRegionPreference = async (regionCode: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/region', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ regionCode }),
      });

      if (!response.ok) {
        console.error('Failed to save region preference');
      }
    } catch (err) {
      console.error('Error saving region preference:', err);
    }
  };

  const handleRegionChange = async (region: Region) => {
    if (region.status === 'inactive') return;
    
    if (region.code === currentRegion?.code) {
      setIsOpen(false);
      return;
    }

    setCurrentRegion(region);
    localStorage.setItem('userRegion', region.code);
    
    // Save to user profile if authenticated
    await saveRegionPreference(region.code);
    
    onRegionChange?.(region);
    setIsOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t('common.loading', 'Loading...')}</span>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
        <button
          onClick={fetchRegions}
          className="p-1 hover:bg-red-50 rounded transition-colors"
          title={t('common.retry', 'Retry')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Cards variant - grid of region cards
  if (variant === 'cards') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {filteredRegions.map((region) => {
          const isCurrent = currentRegion?.code === region.code;
          const isDisabled = region.status === 'inactive';
          const statusConfig = STATUS_CONFIG[region.status];

          return (
            <button
              key={region.code}
              onClick={() => handleRegionChange(region)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50'
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              {/* Status Badge */}
              <span
                className={`
                  absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full
                  ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border
                `}
              >
                {statusConfig.label}
              </span>

              <div className="flex items-start gap-3">
                {showFlags && (
                  <span className="text-3xl" role="img" aria-label={region.name}>
                    {region.flag}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {region.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{region.localName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('region.currency', 'Currency')}: {region.currency}
                  </p>
                </div>
              </div>

              {/* Checkmark for current region */}
              {isCurrent && (
                <div className="absolute bottom-3 right-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Minimal variant - simple text with chevron
  if (variant === 'minimal') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={filteredRegions.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className="w-4 h-4 text-gray-500" />
          {showFlags && currentRegion && (
            <span className="text-lg" role="img" aria-label={currentRegion.name}>
              {currentRegion.flag}
            </span>
          )}
          <span className="text-sm font-medium text-gray-700">
            {currentRegion?.code.toUpperCase() || t('region.select', 'Select')}
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
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50"
              role="listbox"
              aria-label={t('region.selectRegion', 'Select region')}
            >
              {filteredRegions.map((region) => {
                const isCurrent = currentRegion?.code === region.code;
                const isDisabled = region.status === 'inactive';
                const statusConfig = STATUS_CONFIG[region.status];

                return (
                  <button
                    key={region.code}
                    onClick={() => handleRegionChange(region)}
                    disabled={isDisabled}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors duration-150
                      ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700'
                          : isDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                    role="option"
                    aria-selected={isCurrent}
                    aria-disabled={isDisabled}
                  >
                    {showFlags && (
                      <span className="text-lg" role="img" aria-label={region.name}>
                        {region.flag}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{region.name}</p>
                    </div>
                    {region.status === 'preparing' && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    )}
                    {isCurrent && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
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
        disabled={filteredRegions.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        {showFlags && currentRegion && (
          <span className="text-lg" role="img" aria-label={currentRegion.name}>
            {currentRegion.flag}
          </span>
        )}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-gray-700">
            {currentRegion ? currentRegion.name : t('region.selectRegion', 'Select Region')}
          </span>
        </div>
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
            className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
            role="listbox"
            aria-label={t('region.selectRegion', 'Select region')}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('region.selectRegion', 'Select Region')}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredRegions.map((region) => {
                const isCurrent = currentRegion?.code === region.code;
                const isDisabled = region.status === 'inactive';
                const statusConfig = STATUS_CONFIG[region.status];

                return (
                  <button
                    key={region.code}
                    onClick={() => handleRegionChange(region)}
                    disabled={isDisabled}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-colors duration-150
                      ${
                        isCurrent
                          ? 'bg-blue-50'
                          : isDisabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50'
                      }
                    `}
                    role="option"
                    aria-selected={isCurrent}
                    aria-disabled={isDisabled}
                  >
                    {showFlags && (
                      <span className="text-2xl" role="img" aria-label={region.name}>
                        {region.flag}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            isCurrent ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {region.name}
                        </p>
                        {region.status !== 'active' && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}
                          >
                            {statusConfig.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{region.localName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {region.currency} • {region.languages.join(', ')}
                      </p>
                    </div>
                    {isCurrent && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegionSelector;
