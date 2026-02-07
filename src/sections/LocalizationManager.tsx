import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  Eye,
  Save,
  X,
  RefreshCw,
  Globe,
  Check,
  MoreHorizontal,
  Copy
} from 'lucide-react';

// Types
interface Translation {
  _id?: string;
  key: string;
  namespace: string;
  section: string;
  values: Record<string, string>;
  description?: string;
  lastModified?: string;
  modifiedBy?: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

interface CompletionStatus {
  language: string;
  total: number;
  translated: number;
  percentage: number;
}

interface Namespace {
  name: string;
  count: number;
}

type TranslationStatus = 'complete' | 'incomplete' | 'missing';
type TabType = 'all' | 'namespace' | 'import-export';

// Mock data for development
const mockLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲', rtl: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
];

const mockTranslations: Translation[] = [
  { _id: '1', key: 'common.welcome', namespace: 'common', section: 'general', values: { en: 'Welcome', my: 'ကြိုဆိုပါတယ်', th: 'ยินดีต้อนรับ', zh: '欢迎' }, description: 'Welcome message', lastModified: '2024-01-20T10:00:00Z' },
  { _id: '2', key: 'common.login', namespace: 'common', section: 'auth', values: { en: 'Login', my: 'လော့ဂ်အင်ဝင်ရန်', th: 'เข้าสู่ระบบ', zh: '登录' }, description: 'Login button', lastModified: '2024-01-19T15:30:00Z' },
  { _id: '3', key: 'common.logout', namespace: 'common', section: 'auth', values: { en: 'Logout', my: 'ထွက်ရန်', th: 'ออกจากระบบ', zh: '退出' }, description: 'Logout button', lastModified: '2024-01-19T15:30:00Z' },
  { _id: '4', key: 'jobs.title', namespace: 'jobs', section: 'general', values: { en: 'Jobs', my: 'အလုပ်များ', th: 'งาน', zh: '工作' }, description: 'Jobs page title', lastModified: '2024-01-18T09:00:00Z' },
  { _id: '5', key: 'jobs.apply', namespace: 'jobs', section: 'actions', values: { en: 'Apply Now', my: 'လျှောက်ထားရန်', th: 'สมัครเลย', zh: '立即申请' }, description: 'Apply button', lastModified: '2024-01-18T09:00:00Z' },
  { _id: '6', key: 'referrals.title', namespace: 'referrals', section: 'general', values: { en: 'Referrals', my: 'အကြံပေးခြင်း', th: 'การแนะนำ', zh: '推荐' }, description: 'Referrals page title', lastModified: '2024-01-17T14:00:00Z' },
  { _id: '7', key: 'payouts.pending', namespace: 'payouts', section: 'status', values: { en: 'Pending', my: 'စောင့်ဆိုင်းနေသည်', th: 'รอดำเนินการ', zh: '待处理' }, description: 'Pending status', lastModified: '2024-01-16T11:00:00Z' },
  { _id: '8', key: 'errors.generic', namespace: 'errors', section: 'general', values: { en: 'An error occurred', my: '', th: '', zh: '' }, description: 'Generic error message', lastModified: '2024-01-15T10:00:00Z' },
];

const mockNamespaces: Namespace[] = [
  { name: 'common', count: 45 },
  { name: 'jobs', count: 32 },
  { name: 'referrals', count: 28 },
  { name: 'payouts', count: 24 },
  { name: 'errors', count: 18 },
  { name: 'auth', count: 22 },
];

const mockCompletion: CompletionStatus[] = [
  { language: 'en', total: 169, translated: 169, percentage: 100 },
  { language: 'my', total: 169, translated: 145, percentage: 86 },
  { language: 'th', total: 169, translated: 120, percentage: 71 },
  { language: 'zh', total: 169, translated: 98, percentage: 58 },
];

// Toast notification component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

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

// Modal component
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

export default function LocalizationManager() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<TranslationStatus | 'all'>('all');
  const [translations, setTranslations] = useState<Translation[]>(mockTranslations);
  const [languages] = useState<Language[]>(mockLanguages);
  const [namespaces] = useState<Namespace[]>(mockNamespaces);
  const [completion] = useState<CompletionStatus[]>(mockCompletion);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  
  // Selection
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  
  // Form states
  const [newTranslation, setNewTranslation] = useState<Partial<Translation>>({
    key: '',
    namespace: 'common',
    section: 'general',
    values: {},
    description: ''
  });
  
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importPreview, setImportPreview] = useState<Translation[] | null>(null);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch translations
  const fetchTranslations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/localization/translations/${selectedLanguage}`);
      if (response.ok) {
        const data = await response.json();
        // In a real implementation, this would merge with English translations
        // to determine status
      }
    } catch (error) {
      console.error('Failed to fetch translations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  // Get translation status
  const getTranslationStatus = (translation: Translation): TranslationStatus => {
    const hasEnglish = translation.values['en'] && translation.values['en'].trim() !== '';
    const hasSelectedLang = translation.values[selectedLanguage] && translation.values[selectedLanguage].trim() !== '';
    
    if (!hasEnglish) return 'missing';
    if (!hasSelectedLang) return 'missing';
    if (hasSelectedLang && hasEnglish) return 'complete';
    return 'incomplete';
  };

  // Filter translations
  const filteredTranslations = translations.filter(translation => {
    const matchesSearch = 
      translation.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.values['en']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.values[selectedLanguage]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.namespace.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNamespace = namespaceFilter === 'all' || translation.namespace === namespaceFilter;
    const status = getTranslationStatus(translation);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesNamespace && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTranslations.length / itemsPerPage);
  const paginatedTranslations = filteredTranslations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleAddTranslation = async () => {
    if (!newTranslation.key || !newTranslation.namespace) {
      addToast('error', 'Key and namespace are required');
      return;
    }

    try {
      const response = await fetch('/api/localization/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTranslation)
      });

      if (response.ok) {
        const data = await response.json();
        setTranslations(prev => [...prev, data.data]);
        setIsAddModalOpen(false);
        setNewTranslation({ key: '', namespace: 'common', section: 'general', values: {}, description: '' });
        addToast('success', 'Translation added successfully');
      } else {
        throw new Error('Failed to add translation');
      }
    } catch (error) {
      // Mock success for development
      const mockNewTranslation: Translation = {
        _id: Math.random().toString(36).substr(2, 9),
        key: newTranslation.key!,
        namespace: newTranslation.namespace!,
        section: newTranslation.section || 'general',
        values: newTranslation.values || {},
        description: newTranslation.description,
        lastModified: new Date().toISOString()
      };
      setTranslations(prev => [...prev, mockNewTranslation]);
      setIsAddModalOpen(false);
      setNewTranslation({ key: '', namespace: 'common', section: 'general', values: {}, description: '' });
      addToast('success', 'Translation added successfully');
    }
  };

  const handleEditTranslation = async () => {
    if (!editingTranslation) return;

    try {
      const response = await fetch('/api/localization/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTranslation)
      });

      if (response.ok) {
        setTranslations(prev => prev.map(t => t._id === editingTranslation._id ? editingTranslation : t));
        setIsEditModalOpen(false);
        setEditingTranslation(null);
        addToast('success', 'Translation updated successfully');
      }
    } catch (error) {
      // Mock success
      setTranslations(prev => prev.map(t => t._id === editingTranslation._id ? editingTranslation : t));
      setIsEditModalOpen(false);
      setEditingTranslation(null);
      addToast('success', 'Translation updated successfully');
    }
  };

  const handleDeleteTranslation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this translation?')) return;

    try {
      // API call would go here
      setTranslations(prev => prev.filter(t => t._id !== id));
      addToast('success', 'Translation deleted successfully');
    } catch (error) {
      addToast('error', 'Failed to delete translation');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'delete') => {
    if (selectedTranslations.length === 0) return;

    try {
      if (action === 'delete') {
        if (!confirm(`Delete ${selectedTranslations.length} translations?`)) return;
        setTranslations(prev => prev.filter(t => !selectedTranslations.includes(t._id!)));
        addToast('success', `${selectedTranslations.length} translations deleted`);
      } else {
        // Bulk approve logic
        addToast('success', `${selectedTranslations.length} translations approved`);
      }
      setSelectedTranslations([]);
    } catch (error) {
      addToast('error', 'Bulk action failed');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/localization/export?format=${format}&language=${selectedLanguage}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations-${selectedLanguage}.${format}`;
        a.click();
        addToast('success', `Exported to ${format.toUpperCase()}`);
      }
    } catch (error) {
      // Mock export
      const data = JSON.stringify(translations, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-${selectedLanguage}.json`;
      a.click();
      addToast('success', 'Exported to JSON');
    }
  };

  const handleImportPreview = () => {
    try {
      let preview: Translation[] = [];
      if (importFormat === 'json') {
        preview = JSON.parse(importData);
      } else {
        // Simple CSV parsing
        const lines = importData.split('\n');
        const headers = lines[0].split(',');
        preview = lines.slice(1).map((line, i) => {
          const values = line.split(',');
          return {
            key: values[0] || '',
            namespace: values[1] || 'common',
            section: values[2] || 'general',
            values: { en: values[3] || '' },
            description: values[4] || ''
          };
        }).filter(t => t.key);
      }
      setImportPreview(preview);
    } catch (error) {
      addToast('error', 'Invalid import data format');
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;

    try {
      const response = await fetch('/api/localization/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData, format: importFormat })
      });

      if (response.ok) {
        const data = await response.json();
        addToast('success', `Imported ${data.data.imported} translations`);
        setIsImportModalOpen(false);
        setImportData('');
        setImportPreview(null);
        fetchTranslations();
      }
    } catch (error) {
      // Mock import
      setTranslations(prev => [...prev, ...importPreview]);
      addToast('success', `Imported ${importPreview.length} translations`);
      setIsImportModalOpen(false);
      setImportData('');
      setImportPreview(null);
    }
  };

  const getStatusIcon = (status: TranslationStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'incomplete':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusLabel = (status: TranslationStatus) => {
    switch (status) {
      case 'complete':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Complete</span>;
      case 'incomplete':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Incomplete</span>;
      case 'missing':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Missing</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Languages className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Localization Manager</h1>
                <p className="text-xs text-slate-500">Manage translations and language settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Translation
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'All Translations', icon: Globe },
              { id: 'namespace', label: 'By Namespace', icon: Filter },
              { id: 'import-export', label: 'Import/Export', icon: Upload }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* All Translations Tab */}
          {activeTab === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Translation Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {completion.map((lang) => {
                    const language = languages.find(l => l.code === lang.language);
                    return (
                      <div key={lang.language} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{language?.flag}</span>
                          <span className="font-medium text-slate-900">{language?.name}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-500">{lang.translated}/{lang.total} keys</span>
                          <span className={`text-sm font-bold ${
                            lang.percentage >= 90 ? 'text-green-600' :
                            lang.percentage >= 70 ? 'text-amber-600' : 'text-red-600'
                          }`}>{lang.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              lang.percentage >= 90 ? 'bg-green-500' :
                              lang.percentage >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${lang.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by key, text, or namespace..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={namespaceFilter}
                    onChange={(e) => setNamespaceFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Namespaces</option>
                    {namespaces.map(ns => (
                      <option key={ns.name} value={ns.name}>{ns.name}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TranslationStatus | 'all')}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="missing">Missing</option>
                  </select>
                  {selectedTranslations.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{selectedTranslations.length} selected</span>
                      <button
                        onClick={() => handleBulkAction('approve')}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleBulkAction('delete')}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Translations Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedTranslations.length === paginatedTranslations.length && paginatedTranslations.length > 0}
                          onChange={(e) => setSelectedTranslations(e.target.checked ? paginatedTranslations.map(t => t._id!) : [])}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Key</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Namespace</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">English</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">{languages.find(l => l.code === selectedLanguage)?.name}</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                          <p className="mt-2 text-slate-500">Loading translations...</p>
                        </td>
                      </tr>
                    ) : paginatedTranslations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          No translations found
                        </td>
                      </tr>
                    ) : (
                      paginatedTranslations.map((translation) => {
                        const status = getTranslationStatus(translation);
                        return (
                          <tr key={translation._id} className="hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedTranslations.includes(translation._id!)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTranslations([...selectedTranslations, translation._id!]);
                                  } else {
                                    setSelectedTranslations(selectedTranslations.filter(id => id !== translation._id));
                                  }
                                }}
                                className="rounded border-slate-300"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <code className="text-sm font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {translation.key}
                              </code>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {translation.namespace}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 max-w-xs truncate">
                              {translation.values['en'] || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700 max-w-xs truncate">
                              {translation.values[selectedLanguage] || '-'}
                            </td>
                            <td className="px-4 py-4">
                              {getStatusLabel(status)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTranslation(translation);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTranslation(translation._id!)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                  <span className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTranslations.length)} of {filteredTranslations.length} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg font-medium ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* By Namespace Tab */}
          {activeTab === 'namespace' && (
            <motion.div
              key="namespace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {namespaces.map((ns) => {
                  const nsTranslations = translations.filter(t => t.namespace === ns.name);
                  const completeCount = nsTranslations.filter(t => getTranslationStatus(t) === 'complete').length;
                  const percentage = Math.round((completeCount / nsTranslations.length) * 100) || 0;
                  
                  return (
                    <motion.div
                      key={ns.name}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer"
                      onClick={() => {
                        setNamespaceFilter(ns.name);
                        setActiveTab('all');
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Filter className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{percentage}%</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1 capitalize">{ns.name}</h3>
                      <p className="text-sm text-slate-500 mb-4">{nsTranslations.length} translation keys</p>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            percentage >= 90 ? 'bg-green-500' :
                            percentage >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          {completeCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          {nsTranslations.length - completeCount}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import-export' && (
            <motion.div
              key="import-export"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Export Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Export Translations</h3>
                      <p className="text-sm text-slate-500">Download translations in various formats</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Languages</option>
                        {languages.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Namespace</label>
                      <select
                        value={namespaceFilter}
                        onChange={(e) => setNamespaceFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Namespaces</option>
                        {namespaces.map(ns => (
                          <option key={ns.name} value={ns.name}>{ns.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleExport('json')}
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <FileJson className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-slate-700">Export JSON</span>
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
                      >
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-slate-700">Export CSV</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Import Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Import Translations</h3>
                      <p className="text-sm text-slate-500">Upload translations from file</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setImportFormat('json')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
                            importFormat === 'json'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <FileJson className="w-4 h-4" />
                          JSON
                        </button>
                        <button
                          onClick={() => setImportFormat('csv')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
                            importFormat === 'csv'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          CSV
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium"
                    >
                      <Upload className="w-5 h-5" />
                      Import Translations
                    </button>

                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Importing will preview changes before applying. 
                        Make sure your file follows the correct format.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Translation Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-slate-900">{translations.length}</p>
                    <p className="text-sm text-slate-500">Total Keys</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {translations.filter(t => getTranslationStatus(t) === 'complete').length}
                    </p>
                    <p className="text-sm text-slate-500">Complete</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {translations.filter(t => getTranslationStatus(t) === 'incomplete').length}
                    </p>
                    <p className="text-sm text-slate-500">Incomplete</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {translations.filter(t => getTranslationStatus(t) === 'missing').length}
                    </p>
                    <p className="text-sm text-slate-500">Missing</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Translation Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Translation">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Translation Key *</label>
            <input
              type="text"
              value={newTranslation.key}
              onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
              placeholder="e.g., common.welcomeMessage"
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Use dot notation for namespacing (e.g., namespace.key)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Namespace *</label>
              <select
                value={newTranslation.namespace}
                onChange={(e) => setNewTranslation({ ...newTranslation, namespace: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                {namespaces.map(ns => (
                  <option key={ns.name} value={ns.name}>{ns.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <input
                type="text"
                value={newTranslation.section}
                onChange={(e) => setNewTranslation({ ...newTranslation, section: e.target.value })}
                placeholder="e.g., general"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">English (Default)</label>
            <input
              type="text"
              value={newTranslation.values?.en || ''}
              onChange={(e) => setNewTranslation({ 
                ...newTranslation, 
                values: { ...newTranslation.values, en: e.target.value }
              })}
              placeholder="English translation"
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {languages.filter(l => l.code !== 'en').map(lang => (
            <div key={lang.code}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {lang.flag} {lang.name}
              </label>
              <input
                type="text"
                value={newTranslation.values?.[lang.code] || ''}
                onChange={(e) => setNewTranslation({ 
                  ...newTranslation, 
                  values: { ...newTranslation.values, [lang.code]: e.target.value }
                })}
                placeholder={`${lang.name} translation`}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={newTranslation.description}
              onChange={(e) => setNewTranslation({ ...newTranslation, description: e.target.value })}
              placeholder="Optional description for context"
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
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
              onClick={handleAddTranslation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Translation
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Translation Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Translation">
        {editingTranslation && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Translation Key</label>
              <code className="block w-full px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-mono">
                {editingTranslation.key}
              </code>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Namespace</label>
                <input
                  type="text"
                  value={editingTranslation.namespace}
                  onChange={(e) => setEditingTranslation({ ...editingTranslation, namespace: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                <input
                  type="text"
                  value={editingTranslation.section}
                  onChange={(e) => setEditingTranslation({ ...editingTranslation, section: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">English (Default)</label>
              <input
                type="text"
                value={editingTranslation.values.en || ''}
                onChange={(e) => setEditingTranslation({ 
                  ...editingTranslation, 
                  values: { ...editingTranslation.values, en: e.target.value }
                })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {languages.filter(l => l.code !== 'en').map(lang => (
              <div key={lang.code}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {lang.flag} {lang.name}
                </label>
                <input
                  type="text"
                  value={editingTranslation.values[lang.code] || ''}
                  onChange={(e) => setEditingTranslation({ 
                    ...editingTranslation, 
                    values: { ...editingTranslation.values, [lang.code]: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={editingTranslation.description || ''}
                onChange={(e) => setEditingTranslation({ ...editingTranslation, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
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
                onClick={handleEditTranslation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Update Translation
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Translations" size="lg">
        <div className="space-y-4">
          {!importPreview ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Import Format</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportFormat('json')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
                      importFormat === 'json'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={() => setImportFormat('csv')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors ${
                      importFormat === 'csv'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Paste {importFormat.toUpperCase()} Data
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder={importFormat === 'json' 
                    ? '[{"key": "common.hello", "namespace": "common", "values": {"en": "Hello"}}]'
                    : 'key,namespace,section,en,my,th,zh'
                  }
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportPreview}
                  disabled={!importData.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  Previewing <strong>{importPreview.length}</strong> translations to import
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Key</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Namespace</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">English</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {importPreview.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm font-mono">{t.key}</td>
                        <td className="px-4 py-2 text-sm">{t.namespace}</td>
                        <td className="px-4 py-2 text-sm">{t.values?.en || '-'}</td>
                      </tr>
                    ))}
                    {importPreview.length > 10 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-sm text-slate-500">
                          ...and {importPreview.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import {importPreview.length} Translations
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
