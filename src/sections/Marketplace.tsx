import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  ExternalLink,
  Puzzle,
  Plug,
  ChevronRight,
  Check,
  X,
  Grid,
  List,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface Plugin {
  pluginId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  icon: string;
  author: {
    name: string;
    verified: boolean;
  };
  stats: {
    rating: number;
    reviewCount: number;
    downloads: number;
  };
  pricing: {
    type: 'free' | 'paid' | 'subscription' | 'freemium';
    price: number;
  };
  isInstalled?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
}

interface Integration {
  integrationId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  provider: {
    name: string;
    logo: string;
  };
  stats: {
    rating: number;
    reviewCount: number;
    installCount: number;
  };
  isFeatured?: boolean;
  isVerified?: boolean;
}

type MarketplaceItem = Plugin | Integration;

function isPlugin(item: MarketplaceItem): item is Plugin {
  return 'pluginId' in item;
}

function isIntegration(item: MarketplaceItem): item is Integration {
  return 'integrationId' in item;
}

function getItemId(item: MarketplaceItem): string {
  if (isPlugin(item)) return item.pluginId;
  return item.integrationId;
}

const Marketplace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plugins' | 'integrations'>('plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [featuredPlugins, setFeaturedPlugins] = useState<Plugin[]>([]);
  const [featuredIntegrations, setFeaturedIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  const categories = {
    plugins: [
      { id: 'all', name: 'All Plugins' },
      { id: 'analytics', name: 'Analytics' },
      { id: 'automation', name: 'Automation' },
      { id: 'communication', name: 'Communication' },
      { id: 'crm', name: 'CRM' },
      { id: 'customization', name: 'Customization' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'productivity', name: 'Productivity' },
      { id: 'reporting', name: 'Reporting' },
      { id: 'security', name: 'Security' },
    ],
    integrations: [
      { id: 'all', name: 'All Integrations' },
      { id: 'job-board', name: 'Job Boards' },
      { id: 'hris', name: 'HRIS' },
      { id: 'crm', name: 'CRM' },
      { id: 'ats', name: 'ATS' },
      { id: 'analytics', name: 'Analytics' },
      { id: 'communication', name: 'Communication' },
      { id: 'productivity', name: 'Productivity' },
    ],
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'plugins') {
        const [pluginsRes, featuredRes] = await Promise.all([
          fetch('/api/marketplace/plugins'),
          fetch('/api/marketplace/plugins/featured'),
        ]);
        
        if (pluginsRes.ok) {
          const data = await pluginsRes.json();
          setPlugins(data.plugins || []);
        }
        
        if (featuredRes.ok) {
          const data = await featuredRes.json();
          setFeaturedPlugins(data.plugins || []);
        }
      } else {
        const [integrationsRes, featuredRes] = await Promise.all([
          fetch('/api/marketplace/integrations'),
          fetch('/api/marketplace/integrations/featured'),
        ]);
        
        if (integrationsRes.ok) {
          const data = await integrationsRes.json();
          setIntegrations(data.integrations || []);
        }
        
        if (featuredRes.ok) {
          const data = await featuredRes.json();
          setFeaturedIntegrations(data.integrations || []);
        }
      }
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (id: string, type: 'plugin' | 'integration') => {
    setInstalling(id);
    try {
      const endpoint = type === 'plugin' 
        ? `/api/marketplace/plugins/${id}/install`
        : `/api/marketplace/integrations/${id}/connect`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        if (type === 'plugin') {
          setPlugins(plugins.map(p => 
            p.pluginId === id ? { ...p, isInstalled: true } : p
          ));
        }
      }
    } catch (error) {
      console.error('Error installing:', error);
    } finally {
      setInstalling(null);
    }
  };

  const filteredItems = activeTab === 'plugins' 
    ? plugins.filter(plugin => {
        const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
    : integrations.filter(integration => {
        const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            integration.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const renderPrice = (pricing: Plugin['pricing']) => {
    if (pricing.type === 'free') {
      return <span className="text-green-600 font-medium">Free</span>;
    }
    if (pricing.type === 'freemium') {
      return <span className="text-blue-600 font-medium">Freemium</span>;
    }
    return <span className="text-gray-900 font-medium">{pricing.price.toLocaleString()} MMK</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-gray-600 mt-1">Discover plugins and integrations to extend your platform</p>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('plugins')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'plugins'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Puzzle className="w-4 h-4" />
                Plugins
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'integrations'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plug className="w-4 h-4" />
                Integrations
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories[activeTab].map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <div className="flex bg-white border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Section */}
        {!searchQuery && selectedCategory === 'all' && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Featured {activeTab === 'plugins' ? 'Plugins' : 'Integrations'}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'plugins' ? featuredPlugins : featuredIntegrations).map((item) => (
                <div
                  key={getItemId(item)}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {activeTab === 'plugins' ? (
                      <Puzzle className="w-12 h-12 text-white" />
                    ) : (
                      <Plug className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.isVerified && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.shortDescription || item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {renderStars(item.stats.rating)}
                      <button
                        onClick={() => handleInstall(
                          getItemId(item),
                          activeTab === 'plugins' ? 'plugin' : 'integration'
                        )}
                        disabled={installing === getItemId(item)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {installing === getItemId(item)
                          ? 'Installing...'
                          : activeTab === 'plugins' && isPlugin(item) && item.isInstalled
                          ? 'Installed'
                          : 'Install'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              All {activeTab === 'plugins' ? 'Plugins' : 'Integrations'}
            </h2>
            <span className="text-gray-500">
              {filteredItems.length} results
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={getItemId(item)}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {activeTab === 'plugins' ? (
                        <Puzzle className="w-6 h-6 text-gray-600" />
                      ) : (
                        <Plug className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        {item.isVerified && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        by {isPlugin(item)
                          ? item.author.name
                          : item.provider.name}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-4 line-clamp-2">
                    {item.shortDescription || item.description}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {item.stats.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {isPlugin(item)
                          ? item.stats.downloads.toLocaleString()
                          : item.stats.installCount.toLocaleString()}
                      </span>
                    </div>
                    
                    {activeTab === 'plugins' && isPlugin(item) && (
                      <div className="text-sm">
                        {renderPrice(item.pricing)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleInstall(
                      getItemId(item),
                      activeTab === 'plugins' ? 'plugin' : 'integration'
                    )}
                    disabled={installing === getItemId(item) || (activeTab === 'plugins' && isPlugin(item) && item.isInstalled)}
                    className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'plugins' && isPlugin(item) && item.isInstalled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    }`}
                  >
                    {installing === getItemId(item)
                      ? 'Installing...'
                      : activeTab === 'plugins' && isPlugin(item) && item.isInstalled
                      ? 'Installed'
                      : 'Install'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border divide-y">
              {filteredItems.map((item) => (
                <div
                  key={getItemId(item)}
                  className="p-6 flex items-center gap-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {activeTab === 'plugins' ? (
                      <Puzzle className="w-8 h-8 text-gray-600" />
                    ) : (
                      <Plug className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.isVerified && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.shortDescription || item.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>by {isPlugin(item)
                        ? item.author.name
                        : item.provider.name}</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {item.stats.rating.toFixed(1)} ({item.stats.reviewCount})
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {isPlugin(item)
                          ? item.stats.downloads.toLocaleString()
                          : item.stats.installCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {activeTab === 'plugins' && isPlugin(item) && (
                      <div className="text-right">
                        {renderPrice(item.pricing)}
                      </div>
                    )}
                    <button
                      onClick={() => handleInstall(
                        getItemId(item),
                        activeTab === 'plugins' ? 'plugin' : 'integration'
                      )}
                      disabled={installing === getItemId(item) || (activeTab === 'plugins' && isPlugin(item) && item.isInstalled)}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'plugins' && isPlugin(item) && item.isInstalled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      }`}
                    >
                      {installing === getItemId(item)
                        ? 'Installing...'
                        : activeTab === 'plugins' && isPlugin(item) && item.isInstalled
                        ? 'Installed'
                        : 'Install'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
