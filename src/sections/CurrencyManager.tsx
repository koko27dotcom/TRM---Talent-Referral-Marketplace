import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calculator,
  Settings,
  Save,
  X,
  Download,
  History,
  Globe,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowRight,
  AlertCircle,
  Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
interface ExchangeRate {
  _id?: string;
  from: string;
  to: string;
  rate: number;
  source: string;
  lastUpdated: string;
  isStale: boolean;
  change24h?: number;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  decimalPlaces: number;
  format: string;
}

interface RateHistory {
  date: string;
  rate: number;
}

interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  timestamp: string;
}

interface AutoSyncSettings {
  enabled: boolean;
  frequency: number; // minutes
  pairs: string[];
  lastSync?: string;
}

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Mock data
const mockCurrencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimalPlaces: 2, format: '${amount}' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲', decimalPlaces: 0, format: '{amount} K' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', decimalPlaces: 2, format: '฿{amount}' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', decimalPlaces: 2, format: 'S${amount}' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', decimalPlaces: 2, format: '¥{amount}' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimalPlaces: 2, format: '€{amount}' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', decimalPlaces: 0, format: '¥{amount}' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', decimalPlaces: 0, format: '₩{amount}' },
];

const mockRates: ExchangeRate[] = [
  { _id: '1', from: 'USD', to: 'MMK', rate: 2095.50, source: 'CBM', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: 0.5 },
  { _id: '2', from: 'USD', to: 'THB', rate: 35.25, source: 'BOT', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: -0.2 },
  { _id: '3', from: 'USD', to: 'SGD', rate: 1.34, source: 'MAS', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: 0.1 },
  { _id: '4', from: 'USD', to: 'CNY', rate: 7.19, source: 'PBOC', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: -0.3 },
  { _id: '5', from: 'USD', to: 'EUR', rate: 0.92, source: 'ECB', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: 0.2 },
  { _id: '6', from: 'THB', to: 'MMK', rate: 59.45, source: 'Calculated', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: 0.8 },
  { _id: '7', from: 'SGD', to: 'MMK', rate: 1563.80, source: 'Calculated', lastUpdated: '2024-01-20T09:00:00Z', isStale: true, change24h: 0.3 },
  { _id: '8', from: 'USD', to: 'JPY', rate: 148.50, source: 'BOJ', lastUpdated: '2024-01-20T10:30:00Z', isStale: false, change24h: -0.5 },
];

const mockHistory: RateHistory[] = [
  { date: '2024-01-01', rate: 2080.00 },
  { date: '2024-01-05', rate: 2085.50 },
  { date: '2024-01-10', rate: 2090.25 },
  { date: '2024-01-15', rate: 2092.00 },
  { date: '2024-01-20', rate: 2095.50 },
];

// Toast Container
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-blue-600 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Modal Component
function Modal({ isOpen, onClose, title, children, size = 'md' }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function CurrencyManager() {
  const { t } = useTranslation();
  const [rates, setRates] = useState<ExchangeRate[]>(mockRates);
  const [currencies] = useState<Currency[]>(mockCurrencies);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastSync, setLastSync] = useState<string>('2024-01-20T10:30:00Z');
  const [staleRates, setStaleRates] = useState<ExchangeRate[]>([]);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  
  // Calculator
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFrom, setCalcFrom] = useState<string>('USD');
  const [calcTo, setCalcTo] = useState<string>('MMK');
  const [calcResult, setCalcResult] = useState<ConversionResult | null>(null);
  
  // Form states
  const [newRate, setNewRate] = useState<Partial<ExchangeRate>>({
    from: '',
    to: '',
    rate: 0,
    source: 'Manual'
  });
  
  const [editRate, setEditRate] = useState<Partial<ExchangeRate>>({
    rate: 0,
    source: 'Manual'
  });
  
  const [autoSyncSettings, setAutoSyncSettings] = useState<AutoSyncSettings>({
    enabled: true,
    frequency: 60,
    pairs: ['USD/MMK', 'USD/THB', 'USD/SGD'],
    lastSync: '2024-01-20T10:30:00Z'
  });

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch rates
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/currency/rates');
      if (response.ok) {
        const data = await response.json();
        // setRates(data.data.rates);
        // setLastSync(data.data.timestamp);
      }
      
      // Fetch stale rates
      const staleResponse = await fetch('/api/currency/stale');
      if (staleResponse.ok) {
        const staleData = await staleResponse.json();
        // setStaleRates(staleData.data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch rates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // Set stale rates from mock
    setStaleRates(mockRates.filter(r => r.isStale));
  }, [fetchRates]);

  // Filter rates
  const filteredRates = rates.filter(rate => {
    const matchesSearch = 
      rate.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currencies.find(c => c.code === rate.from)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currencies.find(c => c.code === rate.to)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBase = rate.from === baseCurrency;
    return matchesSearch && matchesBase;
  });

  // Handlers
  const handleSyncRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/currency/sync', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setLastSync(new Date().toISOString());
        addToast('success', `Synced ${data.data.success.length} rates successfully`);
        fetchRates();
      }
    } catch (error) {
      // Mock success
      setLastSync(new Date().toISOString());
      addToast('success', 'Rates synced successfully');
      setRates(prev => prev.map(r => ({ ...r, lastUpdated: new Date().toISOString(), isStale: false })));
      setStaleRates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRate = async () => {
    if (!newRate.from || !newRate.to || !newRate.rate) {
      addToast('error', 'From, To, and Rate are required');
      return;
    }

    try {
      // API call would go here
      const rate: ExchangeRate = {
        _id: Math.random().toString(36).substr(2, 9),
        from: newRate.from!,
        to: newRate.to!,
        rate: newRate.rate!,
        source: newRate.source || 'Manual',
        lastUpdated: new Date().toISOString(),
        isStale: false
      };
      setRates(prev => [...prev, rate]);
      setIsAddModalOpen(false);
      setNewRate({ from: '', to: '', rate: 0, source: 'Manual' });
      addToast('success', 'Exchange rate added successfully');
    } catch (error) {
      addToast('error', 'Failed to add rate');
    }
  };

  const handleUpdateRate = async () => {
    if (!selectedRate?._id || !editRate.rate) return;

    try {
      // API call would go here
      setRates(prev => prev.map(r => 
        r._id === selectedRate._id 
          ? { ...r, rate: editRate.rate!, source: 'Manual', lastUpdated: new Date().toISOString(), isStale: false }
          : r
      ));
      setIsEditModalOpen(false);
      setSelectedRate(null);
      addToast('success', 'Exchange rate updated successfully');
    } catch (error) {
      addToast('error', 'Failed to update rate');
    }
  };

  const handleDeleteRate = async (rate: ExchangeRate) => {
    if (!confirm(`Delete ${rate.from}/${rate.to} rate?`)) return;

    try {
      setRates(prev => prev.filter(r => r._id !== rate._id));
      addToast('success', 'Rate deleted successfully');
    } catch (error) {
      addToast('error', 'Failed to delete rate');
    }
  };

  const handleConvert = async () => {
    try {
      const response = await fetch('/api/currency/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: calcAmount, from: calcFrom, to: calcTo })
      });

      if (response.ok) {
        const data = await response.json();
        setCalcResult(data.data);
      }
    } catch (error) {
      // Mock conversion
      const rate = rates.find(r => r.from === calcFrom && r.to === calcTo)?.rate || 
                   (1 / (rates.find(r => r.from === calcTo && r.to === calcFrom)?.rate || 1));
      setCalcResult({
        amount: calcAmount,
        from: calcFrom,
        to: calcTo,
        result: calcAmount * rate,
        rate: rate,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      // API call would go here
      setIsSettingsModalOpen(false);
      addToast('success', 'Auto-sync settings saved');
    } catch (error) {
      addToast('error', 'Failed to save settings');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const curr = currencies.find(c => c.code === currency);
    if (!curr) return amount.toString();
    
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: curr.decimalPlaces,
      maximumFractionDigits: curr.decimalPlaces
    });
    
    return curr.format.replace('{amount}', formatted);
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Currency Manager</h1>
                <p className="text-xs text-slate-500">Manage exchange rates and currency settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleSyncRates}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Rates
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exchange Rates */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats & Warnings */}
            {staleRates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-800">Stale Exchange Rates</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {staleRates.length} rate{staleRates.length > 1 ? 's are' : ' is'} older than 2 hours. 
                    Consider syncing for accurate conversions.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {staleRates.map(rate => (
                      <span key={rate._id} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        {rate.from}/{rate.to}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSyncRates}
                  className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Sync Now
                </button>
              </div>
            )}

            {/* Last Sync Info */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Last synced: <span className="font-medium text-slate-900">{getTimeSince(lastSync)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Base Currency:</span>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="font-medium text-slate-900 bg-slate-100 rounded-lg px-2 py-1"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rates Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Exchange Rates</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search currency..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rate
                  </button>
                </div>
              </div>

              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Currency Pair</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">24h Change</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredRates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No rates found
                      </td>
                    </tr>
                  ) : (
                    filteredRates.map((rate) => {
                      const fromCurr = currencies.find(c => c.code === rate.from);
                      const toCurr = currencies.find(c => c.code === rate.to);
                      
                      return (
                        <tr key={rate._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{fromCurr?.flag}</span>
                              <span className="font-medium text-slate-900">{rate.from}</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="text-lg">{toCurr?.flag}</span>
                              <span className="font-medium text-slate-900">{rate.to}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">
                              {rate.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {rate.change24h !== undefined && (
                              <span className={`flex items-center gap-1 text-sm ${rate.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {rate.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {rate.change24h > 0 ? '+' : ''}{rate.change24h}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{rate.source}</span>
                          </td>
                          <td className="px-4 py-3">
                            {rate.isStale ? (
                              <span className="flex items-center gap-1 text-amber-600 text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Stale
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                Current
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedRate(rate);
                                  setShowHistory(showHistory === rate._id ? null : rate._id!);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View History"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRate(rate);
                                  setEditRate({ rate: rate.rate, source: rate.source });
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRate(rate)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rate History Chart */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900">
                      30-Day Rate History: {rates.find(r => r._id === showHistory)?.from}/{rates.find(r => r._id === showHistory)?.to}
                    </h3>
                    <button
                      onClick={() => setShowHistory(null)}
                      className="p-1 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Calculator & Currency Info */}
          <div className="space-y-6">
            {/* Conversion Calculator */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-bold text-slate-900">Conversion Calculator</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
                    <select
                      value={calcFrom}
                      onChange={(e) => setCalcFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const temp = calcFrom;
                      setCalcFrom(calcTo);
                      setCalcTo(temp);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mb-0.5"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                    <select
                      value={calcTo}
                      onChange={(e) => setCalcTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleConvert}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Convert
                </button>

                {calcResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 rounded-xl text-center"
                  >
                    <p className="text-sm text-slate-500 mb-1">
                      {formatCurrency(calcResult.amount, calcResult.from)} =
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(calcResult.result, calcResult.to)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Rate: 1 {calcResult.from} = {calcResult.rate.toFixed(4)} {calcResult.to}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Currency Info Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Supported Currencies</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currencies.map((currency) => (
                  <div key={currency.code} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currency.flag}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{currency.name}</span>
                          <code className="text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{currency.code}</code>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span>Symbol: {currency.symbol}</span>
                          <span>Decimals: {currency.decimalPlaces}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-400">
                        Format: {currency.format.replace('{amount}', '1,234.56')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-4">Rate Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-green-100">Total Pairs</span>
                  <span className="font-bold">{rates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Current Rates</span>
                  <span className="font-bold">{rates.filter(r => !r.isStale).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Stale Rates</span>
                  <span className="font-bold">{staleRates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Auto Sync</span>
                  <span className="font-bold">{autoSyncSettings.enabled ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Rate Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Exchange Rate">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Currency</label>
              <select
                value={newRate.from}
                onChange={(e) => setNewRate({ ...newRate, from: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To Currency</label>
              <select
                value={newRate.to}
                onChange={(e) => setNewRate({ ...newRate, to: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Rate</label>
            <input
              type="number"
              step="0.0001"
              value={newRate.rate || ''}
              onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) })}
              placeholder="1.0000"
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">How many "To" units per 1 "From" unit</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <input
              type="text"
              value={newRate.source}
              onChange={(e) => setNewRate({ ...newRate, source: e.target.value })}
              placeholder="Manual, CBM, BOT, etc."
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Add Rate
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Rate Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Exchange Rate">
        {selectedRate && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Editing rate for</p>
              <p className="text-lg font-bold text-slate-900">
                {selectedRate.from} → {selectedRate.to}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exchange Rate</label>
              <input
                type="number"
                step="0.0001"
                value={editRate.rate || ''}
                onChange={(e) => setEditRate({ ...editRate, rate: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <input
                type="text"
                value={editRate.source}
                onChange={(e) => setEditRate({ ...editRate, source: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Update Rate
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Auto-Sync Settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <h4 className="font-medium text-slate-900">Enable Auto-Sync</h4>
              <p className="text-sm text-slate-500">Automatically sync rates from external sources</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncSettings.enabled}
                onChange={(e) => setAutoSyncSettings({ ...autoSyncSettings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {autoSyncSettings.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sync Frequency</label>
                <select
                  value={autoSyncSettings.frequency}
                  onChange={(e) => setAutoSyncSettings({ ...autoSyncSettings, frequency: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Every 24 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Enabled Currency Pairs</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rates.map(rate => (
                    <label key={rate._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncSettings.pairs.includes(`${rate.from}/${rate.to}`)}
                        onChange={(e) => {
                          const pair = `${rate.from}/${rate.to}`;
                          if (e.target.checked) {
                            setAutoSyncSettings({ ...autoSyncSettings, pairs: [...autoSyncSettings.pairs, pair] });
                          } else {
                            setAutoSyncSettings({ ...autoSyncSettings, pairs: autoSyncSettings.pairs.filter(p => p !== pair) });
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm">{rate.from}/{rate.to}</span>
                    </label>
                  ))}
                </div>
              </div>

              {autoSyncSettings.lastSync && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  Last auto-sync: {getTimeSince(autoSyncSettings.lastSync)}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
