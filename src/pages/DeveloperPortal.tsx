import React, { useState } from 'react';
import { 
  Code, 
  Key, 
  Webhook, 
  Book, 
  Terminal, 
  ChevronRight,
  Shield,
  Zap,
  Globe,
  FileJson,
  AlertCircle
} from 'lucide-react';
import APIDocumentation from '../sections/APIDocumentation';
import APIKeyManager from '../sections/APIKeyManager';
import WebhookManager from '../sections/WebhookManager';
import SDKDownloads from '../sections/SDKDownloads';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const DeveloperPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Globe className="w-5 h-5" />,
      component: <DeveloperOverview />
    },
    {
      id: 'documentation',
      label: 'API Documentation',
      icon: <Book className="w-5 h-5" />,
      component: <APIDocumentation />
    },
    {
      id: 'keys',
      label: 'API Keys',
      icon: <Key className="w-5 h-5" />,
      component: <APIKeyManager />
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      icon: <Webhook className="w-5 h-5" />,
      component: <WebhookManager />
    },
    {
      id: 'sdks',
      label: 'SDKs',
      icon: <Code className="w-5 h-5" />,
      component: <SDKDownloads />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <Terminal className="w-8 h-8" />
            <span className="text-blue-200 font-medium">Developer Portal</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Build on the TRM Platform
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            Access powerful APIs, webhooks, and SDKs to integrate referral 
            recruitment into your applications.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};

// Overview Component
const DeveloperOverview: React.FC = () => {
  const features = [
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: 'Secure API Access',
      description: 'API key authentication with granular permissions and IP whitelisting.'
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: 'Real-time Webhooks',
      description: 'Get instant notifications for referral status changes and job updates.'
    },
    {
      icon: <Code className="w-8 h-8 text-blue-500" />,
      title: 'Multi-language SDKs',
      description: 'Official SDKs for JavaScript, Python, and PHP with comprehensive examples.'
    },
    {
      icon: <FileJson className="w-8 h-8 text-purple-500" />,
      title: 'RESTful API',
      description: 'Clean, predictable REST API with JSON responses and standard HTTP codes.'
    }
  ];

  const quickStartSteps = [
    {
      step: 1,
      title: 'Get Your API Key',
      description: 'Generate an API key from the API Keys section with the permissions you need.',
      action: 'Get API Key',
      link: '#keys'
    },
    {
      step: 2,
      title: 'Make Your First Request',
      description: 'Use our interactive API explorer or SDK to make your first API call.',
      action: 'View Docs',
      link: '#documentation'
    },
    {
      step: 3,
      title: 'Set Up Webhooks',
      description: 'Configure webhooks to receive real-time updates about referrals and jobs.',
      action: 'Configure Webhooks',
      link: '#webhooks'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Features Grid */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guide</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {quickStartSteps.map((step, index) => (
            <div
              key={index}
              className={`p-6 flex items-start space-x-4 ${
                index !== quickStartSteps.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">{step.step}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {step.title}
                </h3>
                <p className="text-gray-600 mb-3">{step.description}</p>
                <a
                  href={step.link}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  {step.action}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Example Request</h2>
        <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <pre className="text-sm text-gray-300">
            <code>{`// JavaScript Example
const { TRM } = require('@trm/sdk');

const trm = new TRM('your_api_key');

// List active jobs
const jobs = await trm.listJobs({ status: 'active' });
console.log(jobs.data);

// Create a referral
const referral = await trm.createReferral({
  jobId: 'job_123',
  candidate: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});`}</code>
          </pre>
        </div>
      </section>

      {/* Rate Limits */}
      <section>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Rate Limits
              </h3>
              <p className="text-yellow-800 mb-2">
                API requests are rate limited based on your plan:
              </p>
              <ul className="list-disc list-inside text-yellow-800 space-y-1">
                <li>Free: 60 requests/minute, 1,000/hour</li>
                <li>Pro: 120 requests/minute, 5,000/hour</li>
                <li>Enterprise: Custom limits</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DeveloperPortal;
