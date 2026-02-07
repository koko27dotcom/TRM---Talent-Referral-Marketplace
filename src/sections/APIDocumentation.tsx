import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Code, 
  Copy, 
  Check,
  Globe,
  Server,
  Shield,
  AlertCircle,
  FileJson
} from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  parameters?: Parameter[];
  responses?: Response[];
  example?: string;
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Response {
  code: number;
  description: string;
  example?: string;
}

const APIDocumentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('jobs');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const sections = {
    jobs: {
      title: 'Jobs',
      description: 'Manage job postings and listings',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/jobs',
          description: 'List all jobs with filtering and pagination',
          parameters: [
            { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
            { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
            { name: 'status', type: 'string', required: false, description: 'Filter by status: active, closed, draft' },
            { name: 'company', type: 'string', required: false, description: 'Filter by company ID' },
            { name: 'location', type: 'string', required: false, description: 'Filter by location' },
            { name: 'search', type: 'string', required: false, description: 'Search in title and description' }
          ],
          responses: [
            {
              code: 200,
              description: 'Successful response',
              example: JSON.stringify({
                success: true,
                data: [
                  {
                    id: 'job_123',
                    title: 'Senior Software Engineer',
                    company: { name: 'Tech Corp' },
                    location: { city: 'San Francisco', country: 'USA' },
                    jobType: 'full-time',
                    status: 'active'
                  }
                ],
                meta: { pagination: { page: 1, total: 100 } }
              }, null, 2)
            }
          ]
        },
        {
          method: 'GET',
          path: '/api/v1/jobs/{id}',
          description: 'Get detailed information about a specific job',
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'Job ID or slug' }
          ],
          responses: [
            { code: 200, description: 'Job found' },
            { code: 404, description: 'Job not found' }
          ]
        },
        {
          method: 'POST',
          path: '/api/v1/jobs',
          description: 'Create a new job posting (requires jobs:write permission)',
          parameters: [
            { name: 'title', type: 'string', required: true, description: 'Job title' },
            { name: 'company', type: 'string', required: true, description: 'Company ID' },
            { name: 'description', type: 'string', required: true, description: 'Job description' },
            { name: 'location', type: 'object', required: false, description: 'Location object with city, country' },
            { name: 'jobType', type: 'string', required: false, description: 'full-time, part-time, contract' }
          ],
          responses: [
            { code: 201, description: 'Job created successfully' },
            { code: 400, description: 'Validation error' },
            { code: 403, description: 'Insufficient permissions' }
          ]
        },
        {
          method: 'PUT',
          path: '/api/v1/jobs/{id}',
          description: 'Update an existing job (requires jobs:write permission)'
        },
        {
          method: 'DELETE',
          path: '/api/v1/jobs/{id}',
          description: 'Delete (close) a job (requires jobs:write permission)'
        }
      ]
    },
    referrals: {
      title: 'Referrals',
      description: 'Manage candidate referrals',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/referrals',
          description: 'List referrals with filtering',
          parameters: [
            { name: 'status', type: 'string', required: false, description: 'Filter by status' },
            { name: 'job', type: 'string', required: false, description: 'Filter by job ID' }
          ]
        },
        {
          method: 'POST',
          path: '/api/v1/referrals',
          description: 'Create a new referral',
          parameters: [
            { name: 'jobId', type: 'string', required: true, description: 'Job ID' },
            { name: 'candidate', type: 'object', required: true, description: 'Candidate info (name, email, phone)' },
            { name: 'notes', type: 'string', required: false, description: 'Additional notes' }
          ],
          example: JSON.stringify({
            jobId: 'job_123',
            candidate: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890'
            },
            notes: 'Great candidate with 5 years experience'
          }, null, 2)
        },
        {
          method: 'PATCH',
          path: '/api/v1/referrals/{id}/status',
          description: 'Update referral status',
          parameters: [
            { name: 'status', type: 'string', required: true, description: 'New status: submitted, screening, interview_scheduled, hired, rejected' },
            { name: 'notes', type: 'string', required: false, description: 'Status change notes' }
          ]
        }
      ]
    },
    companies: {
      title: 'Companies',
      description: 'Manage company profiles',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/companies',
          description: 'List all companies'
        },
        {
          method: 'GET',
          path: '/api/v1/companies/{id}',
          description: 'Get company details'
        },
        {
          method: 'GET',
          path: '/api/v1/companies/{id}/jobs',
          description: 'Get jobs for a specific company'
        }
      ]
    },
    users: {
      title: 'Users',
      description: 'User profile management',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/users/me',
          description: 'Get current user profile'
        },
        {
          method: 'PUT',
          path: '/api/v1/users/me',
          description: 'Update current user profile'
        },
        {
          method: 'GET',
          path: '/api/v1/users/me/referrals',
          description: 'Get current user referrals'
        },
        {
          method: 'GET',
          path: '/api/v1/users/me/stats',
          description: 'Get user statistics'
        }
      ]
    },
    auth: {
      title: 'Authentication',
      description: 'API key management',
      endpoints: [
        {
          method: 'POST',
          path: '/api/v1/auth/apikey',
          description: 'Generate a new API key'
        },
        {
          method: 'GET',
          path: '/api/v1/auth/apikeys',
          description: 'List all API keys'
        },
        {
          method: 'POST',
          path: '/api/v1/auth/verify',
          description: 'Verify current API key'
        }
      ]
    },
    webhooks: {
      title: 'Webhooks',
      description: 'Webhook configuration',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/webhooks',
          description: 'List webhooks'
        },
        {
          method: 'POST',
          path: '/api/v1/webhooks',
          description: 'Create a new webhook'
        },
        {
          method: 'POST',
          path: '/api/v1/webhooks/{id}/test',
          description: 'Send test event to webhook'
        }
      ]
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-24">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">API Reference</h3>
          </div>
          <nav className="p-2 space-y-1">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeSection === key
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Authentication Info */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-semibold">Authentication</h3>
          </div>
          <p className="text-gray-400 mb-4">
            All API requests require authentication using an API key. Include your key in the 
            <code className="text-green-400 mx-1">X-API-Key</code> header.
          </p>
          <div className="bg-gray-800 rounded p-3">
            <code className="text-sm text-gray-300">
              curl -H "X-API-Key: your_api_key" https://api.trm.com/v1/jobs
            </code>
          </div>
        </div>

        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {(sections as any)[activeSection].title}
          </h2>
          <p className="text-gray-600 mt-1">
            {(sections as any)[activeSection].description}
          </p>
        </div>

        {/* Endpoints */}
        <div className="space-y-4">
          {(sections as any)[activeSection].endpoints.map((endpoint: Endpoint, index: number) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setExpandedEndpoint(
                  expandedEndpoint === `${activeSection}-${index}` 
                    ? null 
                    : `${activeSection}-${index}`
                )}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className={`
                    px-2 py-1 text-xs font-bold rounded
                    ${getMethodColor(endpoint.method)}
                  `}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm text-gray-700">{endpoint.path}</code>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 hidden sm:block">
                    {endpoint.description}
                  </span>
                  {expandedEndpoint === `${activeSection}-${index}` ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedEndpoint === `${activeSection}-${index}` && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <p className="text-gray-700 mb-4">{endpoint.description}</p>

                  {/* Parameters */}
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Parameters</h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Required</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {endpoint.parameters.map((param, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 font-mono text-gray-900">{param.name}</td>
                                <td className="px-4 py-2 text-gray-600">{param.type}</td>
                                <td className="px-4 py-2">
                                  {param.required ? (
                                    <span className="text-red-600 font-medium">Required</span>
                                  ) : (
                                    <span className="text-gray-500">Optional</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-gray-600">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Example Request */}
                  {endpoint.example && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">Example Request</h4>
                        <button
                          onClick={() => copyToClipboard(endpoint.example!, `${activeSection}-${index}-example`)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copied === `${activeSection}-${index}-example` ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{endpoint.example}</code>
                      </pre>
                    </div>
                  )}

                  {/* Responses */}
                  {endpoint.responses && endpoint.responses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Responses</h4>
                      <div className="space-y-2">
                        {endpoint.responses.map((response, i) => (
                          <div key={i} className="flex items-start space-x-3">
                            <span className={`
                              px-2 py-1 text-xs font-bold rounded flex-shrink-0
                              ${response.code < 300 ? 'bg-green-100 text-green-800' : 
                                response.code < 400 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}
                            `}>
                              {response.code}
                            </span>
                            <span className="text-sm text-gray-600">{response.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Rate Limits */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Rate Limits</h3>
              <p className="text-yellow-800 mb-3">
                API requests are rate limited. Check the response headers for your current limit status:
              </p>
              <ul className="list-disc list-inside text-yellow-800 space-y-1 text-sm">
                <li><code>X-RateLimit-Limit</code> - Maximum requests allowed</li>
                <li><code>X-RateLimit-Remaining</code> - Remaining requests in current window</li>
                <li><code>X-RateLimit-Reset</code> - Unix timestamp when limit resets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIDocumentation;
