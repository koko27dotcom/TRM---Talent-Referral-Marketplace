import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Star, 
  Download, 
  TrendingUp, 
  BarChart3, 
  FileText, 
  Database,
  ChevronRight,
  X,
  Check,
  Clock,
  CreditCard,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

interface DataProduct {
  _id: string;
  productId: string;
  name: string;
  description: string;
  type: 'salary-report' | 'market-intelligence' | 'custom-report' | 'data-api';
  category: string;
  price: number;
  currency: string;
  accessType: 'one-time' | 'subscription';
  subscriptionPeriod?: string;
  rating: {
    average: number;
    count: number;
  };
  salesCount: number;
  features: string[];
  previewImages?: string[];
  isFeatured: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'all', name: 'All Products', icon: <Database className="w-5 h-5" /> },
  { id: 'salary-report', name: 'Salary Reports', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'market-intelligence', name: 'Market Intelligence', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'custom-report', name: 'Custom Reports', icon: <FileText className="w-5 h-5" /> },
];

const DataMarketplace: React.FC = () => {
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DataProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [selectedProduct, setSelectedProduct] = useState<DataProduct | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<string[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchMyPurchases();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchQuery, priceRange]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/data-products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Use sample data for development
      setProducts(getSampleProducts());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyPurchases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/data-products/my-purchases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMyPurchases(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.type === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter(p => 
      p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    setFilteredProducts(filtered);
  };

  const handlePurchase = async (product: DataProduct) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/data-products/${product._id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod: 'credit-card' })
      });

      const data = await response.json();
      if (data.success) {
        setShowPurchaseModal(false);
        fetchMyPurchases();
        alert('Purchase successful!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'MMK') {
      return `${price.toLocaleString()} MMK`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'salary-report':
        return <BarChart3 className="w-5 h-5" />;
      case 'market-intelligence':
        return <TrendingUp className="w-5 h-5" />;
      case 'custom-report':
        return <FileText className="w-5 h-5" />;
      case 'data-api':
        return <Database className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const hasAccess = (productId: string) => {
    return myPurchases.some(p => 
      p.productId._id === productId && 
      p.accessGranted && 
      new Date(p.accessExpiresAt) > new Date()
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Data Marketplace</h1>
                <p className="mt-2 text-slate-600">
                  Access premium market intelligence, salary reports, and custom analytics
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCart([])}
                  className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Filters</h3>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Categories</h4>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat.icon}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Price Range (MMK)</h4>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>0</span>
                      <span>{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* My Purchases Link */}
                <div className="pt-6 border-t border-slate-200">
                  <button
                    onClick={() => window.location.href = '/my-purchases'}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <span>My Purchases</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search data products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Products Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                      <div className="h-48 bg-slate-200 rounded-lg mb-4" />
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-slate-600">
                    Showing {filteredProducts.length} products
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                      <motion.div
                        key={product._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Product Image/Preview */}
                        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                          {getTypeIcon(product.type)}
                          {product.isFeatured && (
                            <span className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded-full">
                              Featured
                            </span>
                          )}
                          {hasAccess(product._id) && (
                            <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Owned
                            </span>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                              {product.type.replace('-', ' ')}
                            </span>
                            <div className="flex items-center gap-1 text-amber-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm font-medium">{product.rating.average.toFixed(1)}</span>
                            </div>
                          </div>

                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                            {product.name}
                          </h3>
                          
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {product.description}
                          </p>

                          {/* Features */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {product.features?.slice(0, 3).map((feature, idx) => (
                              <span 
                                key={idx}
                                className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>

                          {/* Price and Actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div>
                              <span className="text-2xl font-bold text-slate-900">
                                {formatPrice(product.price, product.currency)}
                              </span>
                              {product.accessType === 'subscription' && (
                                <span className="text-sm text-slate-500">/{product.subscriptionPeriod}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowPreviewModal(true);
                                }}
                                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              {hasAccess(product._id) ? (
                                <button
                                  onClick={() => window.location.href = `/reports/${product._id}`}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  Access
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowPurchaseModal(true);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  Buy
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
                      <p className="text-slate-600">Try adjusting your filters or search query</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Modal */}
        <AnimatePresence>
          {showPurchaseModal && selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPurchaseModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-lg w-full p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Complete Purchase</h2>
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-slate-900 mb-2">{selectedProduct.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{selectedProduct.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Price</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {formatPrice(selectedProduct.price, selectedProduct.currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="font-medium text-slate-900">What's included:</h4>
                  <ul className="space-y-2">
                    {selectedProduct.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePurchase(selectedProduct)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pay Now
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreviewModal && selectedProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPreviewModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Preview: {selectedProduct.name}</h2>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-100 rounded-xl p-8 mb-6">
                  <div className="text-center">
                    {getTypeIcon(selectedProduct.type)}
                    <p className="mt-4 text-slate-600">Sample data preview would appear here</p>
                    <p className="text-sm text-slate-500 mt-2">
                      This is a preview of the data structure and format
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                  {!hasAccess(selectedProduct._id) && (
                    <button
                      onClick={() => {
                        setShowPreviewModal(false);
                        setShowPurchaseModal(true);
                      }}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Purchase Now
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

// Sample products for development
const getSampleProducts = (): DataProduct[] => [
  {
    _id: '1',
    productId: 'PROD-001',
    name: 'Myanmar Tech Salary Report 2024',
    description: 'Comprehensive salary data for tech roles across Myanmar, including trends and benchmarks.',
    type: 'salary-report',
    category: 'industry',
    price: 49900,
    currency: 'MMK',
    accessType: 'one-time',
    rating: { average: 4.8, count: 124 },
    salesCount: 456,
    features: ['50+ job roles', '5-year trends', 'Regional breakdown', 'PDF & Excel'],
    isFeatured: true
  },
  {
    _id: '2',
    productId: 'PROD-002',
    name: 'Yangon vs Mandalay Salary Comparison',
    description: 'Detailed comparison of salary differences between Myanmar\'s two largest cities.',
    type: 'salary-report',
    category: 'location',
    price: 29900,
    currency: 'MMK',
    accessType: 'one-time',
    rating: { average: 4.5, count: 89 },
    salesCount: 234,
    features: ['City comparison', 'Cost of living adjusted', 'Industry breakdown'],
    isFeatured: false
  },
  {
    _id: '3',
    productId: 'PROD-003',
    name: 'Q1 2024 Hiring Trends Report',
    description: 'Analysis of hiring patterns, in-demand roles, and market movements in Q1 2024.',
    type: 'market-intelligence',
    category: 'general',
    price: 149000,
    currency: 'MMK',
    accessType: 'one-time',
    rating: { average: 4.9, count: 67 },
    salesCount: 189,
    features: ['Quarterly analysis', 'Predictive insights', 'Industry breakdown', 'Interactive charts'],
    isFeatured: true
  },
  {
    _id: '4',
    productId: 'PROD-004',
    name: 'In-Demand Skills Analysis',
    description: 'Deep dive into the most sought-after skills across industries in Myanmar.',
    type: 'market-intelligence',
    category: 'skill',
    price: 79900,
    currency: 'MMK',
    accessType: 'one-time',
    rating: { average: 4.6, count: 45 },
    salesCount: 156,
    features: ['Skill rankings', 'Trend analysis', 'Salary correlation', 'Future predictions'],
    isFeatured: false
  },
  {
    _id: '5',
    productId: 'PROD-005',
    name: 'Custom Market Research Report',
    description: 'Tailored research report based on your specific requirements and questions.',
    type: 'custom-report',
    category: 'general',
    price: 499000,
    currency: 'MMK',
    accessType: 'one-time',
    rating: { average: 5.0, count: 12 },
    salesCount: 23,
    features: ['Custom scope', 'Expert analyst', 'Presentation included', 'Consultation call'],
    isFeatured: true
  },
  {
    _id: '6',
    productId: 'PROD-006',
    name: 'Data API Access - Pro',
    description: 'Real-time API access to job market data with 10,000 requests per month.',
    type: 'data-api',
    category: 'general',
    price: 99000,
    currency: 'MMK',
    accessType: 'subscription',
    subscriptionPeriod: 'monthly',
    rating: { average: 4.7, count: 34 },
    salesCount: 78,
    features: ['10K requests/month', 'Real-time data', 'Technical support', 'API documentation'],
    isFeatured: false
  }
];

export default DataMarketplace;
