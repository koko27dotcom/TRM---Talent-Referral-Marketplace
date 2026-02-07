import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Check,
  DollarSign,
  CreditCard,
  Shield,
  ToggleLeft,
  ToggleRight,
  Users,
  Wallet,
  MapPin,
  Languages,
  MoreHorizontal,
  Eye,
  Filter
} from 'lucide-react';

// Types
interface Region {
  _id?: string;
  code: string;
  name: string;
  localName: string;
  flag: string;
  status: 'active' | 'preparing' | 'inactive';
  defaultCurrency: string;
  supportedCurrencies: string[];
  timezone: string;
  languages: { code: string; name: string; isDefault: boolean }[];
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  features: {
    referrals: boolean;
    payouts: boolean;
    kyc: boolean;
    whatsapp: boolean;
    email: boolean;
    analytics: boolean;
  };
  compliance: {
    kycRequired: boolean;
    minAge: number;
    taxReporting: boolean;
    dataRetention: number;
  };
  paymentProviders: {
    name: string;
    enabled: boolean;
    config: Record<string, any>;
  }[];
  referralLimits: {
    minAmount: number;
    maxAmount: number;
    currency: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

interface PaymentProvider {
  id: string;
  name: string;
  icon: string;
  supportedRegions: string[];
}

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Mock data
const mockRegions: Region[] = [
  {
    _id: '1',
    code: 'MM',
    name: 'Myanmar',
    localName: 'မြန်မာ',
    flag: '🇲🇲',
    status: 'active',
    defaultCurrency: 'MMK',
    supportedCurrencies: ['MMK', 'USD', 'THB'],
    timezone: 'Asia/Yangon',
    languages: [
      { code: 'my', name: 'Burmese', isDefault: true },
      { code: 'en', name: 'English', isDefault: false }
    ],
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: '#,##0.00',
    features: {
      referrals: true,
      payouts: true,
      kyc: true,
      whatsapp: true,
      email: true,
      analytics: true
    },
    compliance: {
      kycRequired: true,
      minAge: 18,
      taxReporting: true,
      dataRetention: 7
    },
    paymentProviders: [
      { name: 'KBZ Pay', enabled: true, config: {} },
      { name: 'Wave Pay', enabled: true, config: {} },
      { name: 'CB Pay', enabled: true, config: {} }
    ],
    referralLimits: {
      minAmount: 50000,
      maxAmount: 500000,
      currency: 'MMK'
    },
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z'
  },
  {
    _id: '2',
    code: 'TH',
    name: 'Thailand',
    localName: 'ประเทศไทย',
    flag: '🇹🇭',
    status: 'preparing',
    defaultCurrency: 'THB',
    supportedCurrencies: ['THB', 'USD'],
    timezone: 'Asia/Bangkok',
    languages: [
      { code: 'th', name: 'Thai', isDefault: true },
      { code: 'en', name: 'English', isDefault: false }
    ],
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '#,##0.00',
    features: {
      referrals: true,
      payouts: false,
      kyc: true,
      whatsapp: false,
      email: true,
      analytics: true
    },
    compliance: {
      kycRequired: true,
      minAge: 20,
      taxReporting: true,
      dataRetention: 10
    },
    paymentProviders: [
      { name: 'PromptPay', enabled: false, config: {} },
      { name: 'TrueMoney', enabled: false, config: {} }
    ],
    referralLimits: {
      minAmount: 1000,
      maxAmount: 50000,
      currency: 'THB'
    },
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z'
  },
  {
    _id: '3',
    code: 'SG',
    name: 'Singapore',
    localName: 'Singapore',
    flag: '🇸🇬',
    status: 'inactive',
    defaultCurrency: 'SGD',
    supportedCurrencies: ['SGD', 'USD'],
    timezone: 'Asia/Singapore',
    languages: [
      { code: 'en', name: 'English', isDefault: true },
      { code: 'zh', name: 'Chinese', isDefault: false }
    ],
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '#,##0.00',
    features: {
      referrals: false,
      payouts: false,
      kyc: false,
      whatsapp: false,
      email: true,
      analytics: false
    },
    compliance: {
      kycRequired: true,
      minAge: 21,
      taxReporting: true,
      dataRetention: 7
    },
    paymentProviders: [
      { name: 'PayNow', enabled: false, config: {} }
    ],
    referralLimits: {
      minAmount: 100,
      maxAmount: 5000,
      currency: 'SGD'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockCurrencies: Currency[] = [
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
];

const mockPaymentProviders: PaymentProvider[] = [
  { id: 'kbz', name: 'KBZ Pay', icon: '💳', supportedRegions: ['MM'] },
  { id: 'wave', name: 'Wave Pay', icon: '🌊', supportedRegions: ['MM'] },
  { id: 'cb', name: 'CB Pay', icon: '🏦', supportedRegions: ['MM'] },
  { id: 'promptpay', name: 'PromptPay', icon: '💸', supportedRegions: ['TH'] },
  { id: 'truemoney', name: 'TrueMoney', icon: '💰', supportedRegions: ['TH'] },
  { id: 'paynow', name: 'PayNow', icon: '📱', supportedRegions: ['SG'] },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏛️', supportedRegions: ['MM', 'TH', 'SG'] },
];

const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'my', name: 'Burmese' },
  { code: 'th', name: 'Thai' },
  { code: 'zh', name: 'Chinese' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'km', name: 'Khmer' },
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
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
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
    lg: 'max-w-3xl',
    xl: 'max-w-5xl'
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

export default function RegionConfiguration() {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<Region[]>(mockRegions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Region['status'] | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'languages' | 'payments' | 'compliance' | 'features'>('basic');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Region>>({
    code: '',
    name: '',
    localName: '',
    flag: '🌍',
    status: 'preparing',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    timezone: 'UTC',
    languages: [],
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: '#,##0.00',
    features: {
      referrals: true,
      payouts: true,
      kyc: true,
      whatsapp: false,
      email: true,
      analytics: true
    },
    compliance: {
      kycRequired: true,
      minAge: 18,
      taxReporting: false,
      dataRetention: 7
    },
    paymentProviders: [],
    referralLimits: {
      minAmount: 0,
      maxAmount: 100000,
      currency: 'USD'
    }
  });

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch regions
  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/regions');
      if (response.ok) {
        const data = await response.json();
        // setRegions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // Filter regions
  const filteredRegions = regions.filter(region => {
    const matchesSearch = 
      region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      region.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      region.localName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || region.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreateRegion = async () => {
    if (!formData.code || !formData.name || !formData.defaultCurrency) {
      addToast('error', 'Code, name, and default currency are required');
      return;
    }

    try {
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setRegions(prev => [...prev, data.data]);
        setIsCreateModalOpen(false);
        resetForm();
        addToast('success', 'Region created successfully');
      }
    } catch (error) {
      // Mock success
      const newRegion: Region = {
        ...formData as Region,
        _id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setRegions(prev => [...prev, newRegion]);
      setIsCreateModalOpen(false);
      resetForm();
      addToast('success', 'Region created successfully');
    }
  };

  const handleUpdateRegion = async () => {
    if (!selectedRegion?._id) return;

    try {
      const response = await fetch(`/api/regions/${selectedRegion.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setRegions(prev => prev.map(r => r._id === selectedRegion._id ? data.data : r));
        setIsEditModalOpen(false);
        setSelectedRegion(null);
        addToast('success', 'Region updated successfully');
      }
    } catch (error) {
      // Mock success
      setRegions(prev => prev.map(r => r._id === selectedRegion._id ? { ...r, ...formData, updatedAt: new Date().toISOString() } as Region : r));
      setIsEditModalOpen(false);
      setSelectedRegion(null);
      addToast('success', 'Region updated successfully');
    }
  };

  const handleDeleteRegion = async (region: Region) => {
    if (!confirm(`Are you sure you want to delete ${region.name}?`)) return;

    try {
      // API call would go here
      setRegions(prev => prev.filter(r => r._id !== region._id));
      addToast('success', 'Region deleted successfully');
    } catch (error) {
      addToast('error', 'Failed to delete region');
    }
  };

  const handleCloneRegion = (region: Region) => {
    const clonedRegion: Partial<Region> = {
      ...region,
      _id: undefined,
      code: `${region.code}_COPY`,
      name: `${region.name} (Copy)`,
      status: 'preparing',
      createdAt: undefined,
      updatedAt: undefined
    };
    setFormData(clonedRegion);
    setIsCreateModalOpen(true);
    addToast('info', 'Region cloned. Please update the code and name.');
  };

  const handleToggleStatus = async (region: Region) => {
    const newStatus = region.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/regions/${region.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setRegions(prev => prev.map(r => r._id === region._id ? { ...r, status: newStatus } : r));
        addToast('success', `Region ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      setRegions(prev => prev.map(r => r._id === region._id ? { ...r, status: newStatus } : r));
      addToast('success', `Region ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      localName: '',
      flag: '🌍',
      status: 'preparing',
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD'],
      timezone: 'UTC',
      languages: [],
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: '#,##0.00',
      features: {
        referrals: true,
        payouts: true,
        kyc: true,
        whatsapp: false,
        email: true,
        analytics: true
      },
      compliance: {
        kycRequired: true,
        minAge: 18,
        taxReporting: false,
        dataRetention: 7
      },
      paymentProviders: [],
      referralLimits: {
        minAmount: 0,
        maxAmount: 100000,
        currency: 'USD'
      }
    });
    setActiveFormTab('basic');
  };

  const openEditModal = (region: Region) => {
    setSelectedRegion(region);
    setFormData({ ...region });
    setIsEditModalOpen(true);
    setActiveFormTab('basic');
  };

  const openViewModal = (region: Region) => {
    setSelectedRegion(region);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: Region['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case 'preparing':
        return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Preparing</span>;
      case 'inactive':
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>;
    }
  };

  // Form Tab Button
  const FormTabButton = ({ id, label, icon: Icon }: { id: typeof activeFormTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveFormTab(id)}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
        activeFormTab === id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {activeFormTab === id && (
        <motion.div layoutId="formTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Region Configuration</h1>
                <p className="text-xs text-slate-500">Manage regions and localization settings</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Region
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search regions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Region['status'] | 'all')}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="preparing">Preparing</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Regions Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-12 h-12 text-slate-400 animate-spin" />
            <p className="mt-4 text-slate-500">Loading regions...</p>
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No regions found</h3>
            <p className="text-slate-500 mb-6">Create your first region to get started</p>
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Create Region
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegions.map((region) => (
              <motion.div
                key={region._id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{region.flag}</span>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{region.name}</h3>
                        <p className="text-sm text-slate-500">{region.localName}</p>
                      </div>
                    </div>
                    {getStatusBadge(region.status)}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Code</span>
                      <code className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{region.code}</code>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Currency</span>
                      <span className="font-medium text-slate-700">{region.defaultCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Languages</span>
                      <div className="flex items-center gap-1">
                        {region.languages.map((lang, i) => (
                          <span key={lang.code} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {lang.code.toUpperCase()}
                            {lang.isDefault && ' ★'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Timezone</span>
                      <span className="text-slate-700">{region.timezone.split('/')[1]}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {region.features.referrals && (
                      <span className="p-1.5 bg-green-100 text-green-600 rounded-lg" title="Referrals">
                        <Users className="w-4 h-4" />
                      </span>
                    )}
                    {region.features.payouts && (
                      <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg" title="Payouts">
                        <Wallet className="w-4 h-4" />
                      </span>
                    )}
                    {region.features.kyc && (
                      <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg" title="KYC">
                        <Shield className="w-4 h-4" />
                      </span>
                    )}
                    {region.features.whatsapp && (
                      <span className="p-1.5 bg-green-100 text-green-600 rounded-lg" title="WhatsApp">
                        <MapPin className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => openViewModal(region)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(region)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCloneRegion(region)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Clone
                    </button>
                    <button
                      onClick={() => handleToggleStatus(region)}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                        region.status === 'active'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {region.status === 'active' ? (
                        <><XCircle className="w-4 h-4" /> Deactivate</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Activate</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Region Modal */}
      <Modal 
        isOpen={isCreateModalOpen || isEditModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedRegion(null);
        }} 
        title={isEditModalOpen ? 'Edit Region' : 'Create Region'}
        size="xl"
      >
        <div className="space-y-6">
          {/* Form Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <FormTabButton id="basic" label="Basic Info" icon={Globe} />
            <FormTabButton id="languages" label="Languages" icon={Languages} />
            <FormTabButton id="payments" label="Payments" icon={CreditCard} />
            <FormTabButton id="compliance" label="Compliance" icon={Shield} />
            <FormTabButton id="features" label="Features" icon={ToggleLeft} />
          </div>

          {/* Basic Info Tab */}
          {activeFormTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Region Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="MM"
                    maxLength={2}
                    disabled={isEditModalOpen}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">2-letter ISO country code</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Flag Emoji</label>
                  <input
                    type="text"
                    value={formData.flag}
                    onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                    placeholder="🇲🇲"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Region Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Myanmar"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Local Name</label>
                <input
                  type="text"
                  value={formData.localName}
                  onChange={(e) => setFormData({ ...formData, localName: e.target.value })}
                  placeholder="မြန်မာ"
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Region['status'] })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="preparing">Preparing</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Yangon">Asia/Yangon (Myanmar)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (Thailand)</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (Vietnam)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency *</label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      defaultCurrency: e.target.value,
                      supportedCurrencies: [e.target.value, ...(formData.supportedCurrencies?.filter(c => c !== e.target.value) || [])]
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    {mockCurrencies.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                  <select
                    value={formData.dateFormat}
                    onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supported Currencies</label>
                <div className="flex flex-wrap gap-2">
                  {mockCurrencies.map(currency => (
                    <label key={currency.code} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.supportedCurrencies?.includes(currency.code)}
                        onChange={(e) => {
                          const current = formData.supportedCurrencies || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, supportedCurrencies: [...current, currency.code] });
                          } else if (currency.code !== formData.defaultCurrency) {
                            setFormData({ ...formData, supportedCurrencies: current.filter(c => c !== currency.code) });
                          }
                        }}
                        disabled={currency.code === formData.defaultCurrency}
                        className="rounded border-slate-300"
                      />
                      <span>{currency.flag} {currency.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Languages Tab */}
          {activeFormTab === 'languages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">Supported Languages</h4>
                <select
                  onChange={(e) => {
                    if (e.target.value && !formData.languages?.find(l => l.code === e.target.value)) {
                      const lang = availableLanguages.find(l => l.code === e.target.value);
                      if (lang) {
                        setFormData({
                          ...formData,
                          languages: [...(formData.languages || []), { ...lang, isDefault: formData.languages?.length === 0 }]
                        });
                      }
                    }
                    e.target.value = '';
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">+ Add Language</option>
                  {availableLanguages.filter(l => !formData.languages?.find(fl => fl.code === l.code)).map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {formData.languages?.map((lang, index) => (
                  <div key={lang.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-900">{lang.name}</span>
                      <code className="text-xs bg-slate-200 px-2 py-0.5 rounded">{lang.code}</code>
                      {lang.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!lang.isDefault && (
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              languages: formData.languages?.map(l => ({ ...l, isDefault: l.code === lang.code }))
                            });
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            languages: formData.languages?.filter(l => l.code !== lang.code)
                          });
                        }}
                        disabled={formData.languages?.length === 1}
                        className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.languages || formData.languages.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No languages added yet</p>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeFormTab === 'payments' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Providers</label>
                <div className="space-y-2">
                  {mockPaymentProviders.map(provider => (
                    <label key={provider.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{provider.icon}</span>
                        <div>
                          <p className="font-medium text-slate-900">{provider.name}</p>
                          <p className="text-xs text-slate-500">Supported: {provider.supportedRegions.join(', ')}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.paymentProviders?.some(p => p.name === provider.name && p.enabled)}
                        onChange={(e) => {
                          const current = formData.paymentProviders || [];
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              paymentProviders: [...current, { name: provider.name, enabled: true, config: {} }]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              paymentProviders: current.filter(p => p.name !== provider.name)
                            });
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-900 mb-4">Referral Limits</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount</label>
                    <input
                      type="number"
                      value={formData.referralLimits?.minAmount}
                      onChange={(e) => setFormData({
                        ...formData,
                        referralLimits: { ...formData.referralLimits!, minAmount: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount</label>
                    <input
                      type="number"
                      value={formData.referralLimits?.maxAmount}
                      onChange={(e) => setFormData({
                        ...formData,
                        referralLimits: { ...formData.referralLimits!, maxAmount: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select
                      value={formData.referralLimits?.currency}
                      onChange={(e) => setFormData({
                        ...formData,
                        referralLimits: { ...formData.referralLimits!, currency: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {formData.supportedCurrencies?.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeFormTab === 'compliance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Age</label>
                  <input
                    type="number"
                    value={formData.compliance?.minAge}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance!, minAge: parseInt(e.target.value) || 18 }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Retention (years)</label>
                  <input
                    type="number"
                    value={formData.compliance?.dataRetention}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance!, dataRetention: parseInt(e.target.value) || 7 }
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-slate-900">KYC Required</p>
                      <p className="text-xs text-slate-500">Require identity verification</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.compliance?.kycRequired}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance!, kycRequired: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">Tax Reporting</p>
                      <p className="text-xs text-slate-500">Enable tax reporting features</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.compliance?.taxReporting}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance!, taxReporting: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeFormTab === 'features' && (
            <div className="space-y-3">
              {[
                { key: 'referrals', label: 'Referrals', desc: 'Enable referral system', icon: Users },
                { key: 'payouts', label: 'Payouts', desc: 'Enable payout processing', icon: Wallet },
                { key: 'kyc', label: 'KYC', desc: 'Enable KYC verification', icon: Shield },
                { key: 'whatsapp', label: 'WhatsApp', desc: 'Enable WhatsApp integration', icon: MapPin },
                { key: 'email', label: 'Email', desc: 'Enable email notifications', icon: Globe },
                { key: 'analytics', label: 'Analytics', desc: 'Enable analytics dashboard', icon: Filter },
              ].map(({ key, label, desc, icon: Icon }) => (
                <label key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.features?.[key as keyof Region['features']]}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: { ...formData.features!, [key]: e.target.checked }
                    })}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedRegion(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isEditModalOpen ? handleUpdateRegion : handleCreateRegion}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isEditModalOpen ? 'Update Region' : 'Create Region'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Region Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Region Details" size="lg">
        {selectedRegion && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
              <span className="text-6xl">{selectedRegion.flag}</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedRegion.name}</h2>
                <p className="text-lg text-slate-500">{selectedRegion.localName}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(selectedRegion.status)}
                  <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">{selectedRegion.code}</code>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Timezone</span>
                    <span className="font-medium">{selectedRegion.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date Format</span>
                    <span className="font-medium">{selectedRegion.dateFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Default Currency</span>
                    <span className="font-medium">{selectedRegion.defaultCurrency}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRegion.languages.map(lang => (
                    <span key={lang.code} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {lang.name} {lang.isDefault && '★'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-2">Features</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(selectedRegion.features).map(([key, enabled]) => (
                  <div key={key} className={`flex items-center gap-2 p-2 rounded-lg ${enabled ? 'bg-green-50' : 'bg-slate-50'}`}>
                    {enabled ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                    <span className={`text-sm capitalize ${enabled ? 'text-green-700' : 'text-slate-500'}`}>{key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-2">Payment Providers</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRegion.paymentProviders.map(provider => (
                  <span key={provider.name} className={`px-3 py-1 rounded-full text-sm ${provider.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {provider.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Created: {new Date(selectedRegion.createdAt!).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(selectedRegion.updatedAt!).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
