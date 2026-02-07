import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Code,
  Database,
  Key,
  BarChart3,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Globe,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters: Parameter[];
  exampleResponse: any;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

interface QueryHistory {
  id: string;
  endpoint: string;
  timestamp: Date;
  status: 'success' | 'error';
  executionTime: number;
  creditsUsed: number;
}

const endpoints: Endpoint[] = [
  {
    id: 'jobs',
    method: 'GET',
    path: '/api/data-api/jobs',
    description: 'Get job market data with filtering options',
    parameters: [
      { name: 'industry', type: 'string', required: false, description: 'Filter by industry' },
      { name: 'location', type: 'string', required: false, description: 'Filter by location' },
      { name: 'experienceLevel', type: 'string', required: false, description: 'Entry, Mid, Senior, etc.' },
      { name: 'skills', type: 'array', required: false, description: 'Filter by required skills' },
      { name: 'salaryMin', type: 'number', required: false, description: 'Minimum salary' },
      { name: 'salaryMax', type: 'number', required: false, description: 'Maximum salary' },
      { name: 'limit', type: 'number', required: false, description: 'Results limit (max 1000)', default: '100' },
      { name: 'skip', type: 'number', required: false, description: 'Results offset', default: '0' }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'Yangon',
          salary: { min: 1500000, max: 3000000 },
          skills: ['React', 'Node.js', 'TypeScript']
        }
      ],
      meta: {
        executionTime: 45,
        creditsUsed: 1,
        resultCount: 1
      }
    }
  },
  {
    id: 'candidates',
    method: 'GET',
    path: '/api/data-api/candidates',
    description: 'Get anonymized candidate pool data',
    parameters: [
      { name: 'skills', type: 'array', required: false, description: 'Filter by skills' },
      { name: 'location', type: 'string', required: false, description: 'Filter by location' },
      { name: 'experienceMin', type: 'number', required: false, description: 'Minimum years of experience' },
      { name: 'experienceMax', type: 'number', required: false, description: 'Maximum years of experience' },
      { name: 'limit', type: 'number', required: false, description: 'Results limit (max 500)', default: '100' }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          skills: ['Python', 'Django', 'PostgreSQL'],
          location: 'Yangon',
          yearsOfExperience: 5,
          expectedSalary: 2000000
        }
      ],
      meta: {
        executionTime: 32,
        creditsUsed: 1,
        resultCount: 1
      }
    }
  },
  {
    id: 'salaries',
    method: 'GET',
    path: '/api/data-api/salaries',
    description: 'Get salary benchmarks by role and industry',
    parameters: [
      { name: 'industry', type: 'string', required: false, description: 'Filter by industry' },
      { name: 'location', type: 'string', required: false, description: 'Filter by location' },
      { name: 'experienceLevel', type: 'string', required: false, description: 'Experience level' },
      { name: 'limit', type: 'number', required: false, description: 'Results limit', default: '100' }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          industry: 'Technology',
          role: 'Software Engineer',
          experienceLevel: 'Senior',
          count: 245,
          salaryRange: { min: 1200000, max: 4500000 },
          averageSalary: { min: 1800000, max: 3500000 },
          median: 2500000
        }
      ],
      meta: {
        executionTime: 28,
        creditsUsed: 1,
        resultCount: 1
      }
    }
  },
  {
    id: 'skills',
    method: 'GET',
    path: '/api/data-api/skills',
    description: 'Get skill analytics and demand data',
    parameters: [
      { name: 'industry', type: 'string', required: false, description: 'Filter by industry' },
      { name: 'limit', type: 'number', required: false, description: 'Results limit', default: '50' }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          skill: 'React',
          demand: 95,
          avgSalary: 2200000,
          industryCount: 12
        }
      ],
      meta: {
        executionTime: 22,
        creditsUsed: 1,
        resultCount: 1
      }
    }
  }
];

const APIConsole: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(endpoints[0]);
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'docs' | 'history'>('console');
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [usageStats, setUsageStats] = useState({
    totalQueries: 0,
    creditsUsed: 0,
    remainingCredits: 100
  });

  useEffect(() => {
    fetchUsageStats();
    fetchQueryHistory();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/data-api/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsageStats({
          totalQueries: data.data.summary.totalQueries || 0,
          creditsUsed: data.data.summary.totalCreditsUsed || 0,
          remainingCredits: 100 - (data.data.summary.totalCreditsUsed || 0)
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const fetchQueryHistory = async () => {
    // In production, fetch from API
    setQueryHistory([
      {
        id: '1',
        endpoint: '/api/data-api/jobs',
        timestamp: new Date(Date.now() - 3600000),
        status: 'success',
        executionTime: 45,
        creditsUsed: 1
      },
      {
        id: '2',
        endpoint: '/api/data-api/salaries',
        timestamp: new Date(Date.now() - 7200000),
        status: 'success',
        executionTime: 32,
        creditsUsed: 1
      }
    ]);
  };

  const executeQuery = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      const token = localStorage.getItem('token');
      const queryString = new URLSearchParams(queryParams).toString();
      const url = `${selectedEndpoint.path}${queryString ? `?${queryString}` : ''}`;

      const startTime = Date.now();
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': apiKey
        }
      });

      const data = await res.json();
      const executionTime = Date.now() - startTime;

      setResponse({
        status: res.status,
        data,
        executionTime
      });

      // Add to history
      setQueryHistory(prev => [{
        id: Date.now().toString(),
        endpoint: selectedEndpoint.path,
        timestamp: new Date(),
        status: res.ok ? 'success' : 'error' as 'success' | 'error',
        executionTime,
        creditsUsed: data.meta?.creditsUsed || 1
      }, ...prev].slice(0, 50));

      fetchUsageStats();
    } catch (error) {
      setResponse({
        status: 500,
        error: 'Failed to execute query',
        executionTime: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCodeExample = (language: 'javascript' | 'python' | 'curl') => {
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `https://api.trm.com${selectedEndpoint.path}${queryString ? `?${queryString}` : ''}`;

    switch (language) {
      case 'javascript':
        return `fetch('${url}', {
  method: '${selectedEndpoint.method}',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`;

      case 'python':
        return `import requests

url = "${url}"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "X-API-Key": "YOUR_API_KEY"
}

response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers)
data = response.json()
print(data)`;

      case 'curl':
        return `curl -X ${selectedEndpoint.method} \\
  '${url}' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'X-API-Key: YOUR_API_KEY'`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">API Console</h1>
                <p className="text-slate-600">Test and explore the TRM Data API</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-600">Credits: </span>
                <span className="font-semibold text-slate-900">{usageStats.remainingCredits}</span>
                <span className="text-sm text-slate-600"> / 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'console', label: 'API Console', icon: Terminal },
            { id: 'docs', label: 'Documentation', icon: Code },
            { id: 'history', label: 'Query History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Console Tab */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Endpoint Selection */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Endpoints</h3>
                <div className="space-y-2">
                  {endpoints.map(endpoint => (
                    <button
                      key={endpoint.id}
                      onClick={() => {
                        setSelectedEndpoint(endpoint);
                        setQueryParams({});
                        setResponse(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEndpoint.id === endpoint.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                          endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {endpoint.path}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {endpoint.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">API Key</h3>
                </div>
                <input
                  type="text"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Your API key is used for authentication and rate limiting.
                </p>
              </div>
            </div>

            {/* Query Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Parameters */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Parameters</h3>
                  <span className="text-sm text-slate-500">
                    {selectedEndpoint.path}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {selectedEndpoint.parameters.map(param => (
                    <div key={param.name} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <span className="text-xs text-slate-500">{param.type}</span>
                      </div>
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder={param.default || param.description}
                          value={queryParams[param.name] || ''}
                          onChange={(e) => setQueryParams(prev => ({
                            ...prev,
                            [param.name]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={executeQuery}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isLoading ? 'Executing...' : 'Execute'}
                  </button>
                  <button
                    onClick={() => setQueryParams({})}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Response */}
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        response.status >= 200 && response.status < 300
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {response.status}
                      </span>
                      <span className="text-sm text-slate-600">
                        {response.executionTime}ms
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-6 bg-slate-900 overflow-x-auto">
                    <pre className="text-sm text-green-400 font-mono">
                      {JSON.stringify(response.data || response.error, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* Code Examples */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Code Examples</h3>
                <div className="space-y-4">
                  {(['javascript', 'python', 'curl'] as const).map(lang => (
                    <div key={lang}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 capitalize">{lang}</span>
                        <button
                          onClick={() => copyToClipboard(generateCodeExample(lang))}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto">
                        <code>{generateCodeExample(lang)}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">API Documentation</h2>
              <p className="text-slate-600 mt-2">
                Complete reference for the TRM Data API endpoints
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {endpoints.map(endpoint => (
                <div key={endpoint.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {endpoint.method}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{endpoint.path}</h3>
                      <p className="text-slate-600 mt-1">{endpoint.description}</p>
                      
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Parameters</h4>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Required</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {endpoint.parameters.map(param => (
                              <tr key={param.name}>
                                <td className="px-4 py-2 font-mono text-slate-900">{param.name}</td>
                                <td className="px-4 py-2 text-slate-600">{param.type}</td>
                                <td className="px-4 py-2">
                                  {param.required ? (
                                    <span className="text-red-600">Yes</span>
                                  ) : (
                                    <span className="text-slate-500">No</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-slate-600">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Example Response</h4>
                        <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(endpoint.exampleResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Query History</h2>
              <p className="text-slate-600 mt-2">
                Your recent API queries and their results
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Execution Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {queryHistory.map(query => (
                    <tr key={query.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-sm text-slate-900">{query.endpoint}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {query.timestamp.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          query.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {query.status === 'success' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {query.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{query.executionTime}ms</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{query.creditsUsed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIConsole;
