import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  Terminal,
  FileCode,
  BookOpen,
  Github,
  Package,
  Code2
} from 'lucide-react';

interface SDK {
  id: string;
  name: string;
  language: string;
  version: string;
  description: string;
  installCommand: string;
  importCode: string;
  exampleCode: string;
  docsUrl: string;
  githubUrl: string;
  packageUrl: string;
  icon: React.ReactNode;
  color: string;
}

const SDKDownloads: React.FC = () => {
  const [activeSDK, setActiveSDK] = useState('javascript');
  const [copied, setCopied] = useState<string | null>(null);

  const sdks: SDK[] = [
    {
      id: 'javascript',
      name: 'JavaScript SDK',
      language: 'JavaScript',
      version: '1.0.0',
      description: 'Official JavaScript SDK for Node.js and browsers',
      installCommand: 'npm install @trm/sdk',
      importCode: `const { TRM } = require('@trm/sdk');
// or
import { TRM } from '@trm/sdk';`,
      exampleCode: `const trm = new TRM('your_api_key');

// List jobs
const jobs = await trm.listJobs();
console.log(jobs.data);

// Create a referral
const referral = await trm.createReferral({
  jobId: 'job_123',
  candidate: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});`,
      docsUrl: 'https://docs.trm.com/sdks/javascript',
      githubUrl: 'https://github.com/trm/sdk-javascript',
      packageUrl: 'https://www.npmjs.com/package/@trm/sdk',
      icon: <FileCode className="w-6 h-6" />,
      color: 'bg-yellow-500'
    },
    {
      id: 'python',
      name: 'Python SDK',
      language: 'Python',
      version: '1.0.0',
      description: 'Official Python SDK for Python 3.7+',
      installCommand: 'pip install trm-sdk',
      importCode: `from trm_sdk import TRMClient

# Initialize client
trm = TRMClient('your_api_key')`,
      exampleCode: `# List jobs
jobs = trm.list_jobs()
print(jobs['data'])

# Create a referral
referral = trm.create_referral({
    'jobId': 'job_123',
    'candidate': {
        'name': 'John Doe',
        'email': 'john@example.com'
    }
})`,
      docsUrl: 'https://docs.trm.com/sdks/python',
      githubUrl: 'https://github.com/trm/sdk-python',
      packageUrl: 'https://pypi.org/project/trm-sdk/',
      icon: <Terminal className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      id: 'php',
      name: 'PHP SDK',
      language: 'PHP',
      version: '1.0.0',
      description: 'Official PHP SDK for PHP 7.4+',
      installCommand: 'composer require trm/sdk',
      importCode: `require_once 'vendor/autoload.php';

use TRM\TRMClient;

$trm = new TRMClient('your_api_key');`,
      exampleCode: `// List jobs
$jobs = $trm->listJobs();
print_r($jobs['data']);

// Create a referral
$referral = $trm->createReferral([
    'jobId' => 'job_123',
    'candidate' => [
        'name' => 'John Doe',
        'email' => 'john@example.com'
    ]
]);`,
      docsUrl: 'https://docs.trm.com/sdks/php',
      githubUrl: 'https://github.com/trm/sdk-php',
      packageUrl: 'https://packagist.org/packages/trm/sdk',
      icon: <Code2 className="w-6 h-6" />,
      color: 'bg-purple-500'
    }
  ];

  const activeSdkData = sdks.find(sdk => sdk.id === activeSDK) || sdks[0];

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">SDKs & Tools</h2>
        <p className="text-gray-600 mt-1">
          Official SDKs to help you integrate TRM into your applications faster
        </p>
      </div>

      {/* SDK Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sdks.map((sdk) => (
          <button
            key={sdk.id}
            onClick={() => setActiveSDK(sdk.id)}
            className={`
              p-6 rounded-lg border-2 text-left transition-all
              ${activeSDK === sdk.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className={`${sdk.color} text-white p-2 rounded-lg`}>
                {sdk.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{sdk.name}</h3>
                <p className="text-sm text-gray-500">v{sdk.version}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">{sdk.description}</p>
          </button>
        ))}
      </div>

      {/* Active SDK Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`${activeSdkData.color} text-white p-3 rounded-lg`}>
                {activeSdkData.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{activeSdkData.name}</h3>
                <p className="text-gray-600">Version {activeSdkData.version}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href={activeSdkData.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Documentation
              </a>
              <a
                href={activeSdkData.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5 mr-2" />
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Installation */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Installation</h4>
            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-4">
                <code className="text-green-400 text-sm">{activeSdkData.installCommand}</code>
              </div>
              <button
                onClick={() => copyToClipboard(activeSdkData.installCommand, 'install')}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
              >
                {copied === 'install' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Import */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Import</h4>
            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{activeSdkData.importCode}</code>
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(activeSdkData.importCode, 'import')}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
              >
                {copied === 'import' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Example */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Quick Start Example</h4>
            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{activeSdkData.exampleCode}</code>
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(activeSdkData.exampleCode, 'example')}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
              >
                {copied === 'example' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Package Link */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-gray-600">Package Repository</span>
            <a
              href={activeSdkData.packageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <Package className="w-5 h-5 mr-2" />
              View on {activeSdkData.language === 'JavaScript' ? 'npm' : activeSdkData.language === 'Python' ? 'PyPI' : 'Packagist'}
              <Download className="w-4 h-4 ml-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Reference</h3>
          <p className="text-gray-600 mb-4">
            Explore the complete API reference with detailed endpoint documentation, 
            request/response examples, and error codes.
          </p>
          <a
            href="/docs/api"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            View API Reference
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Postman Collection</h3>
          <p className="text-gray-600 mb-4">
            Download our Postman collection to quickly test all API endpoints 
            and explore the API capabilities.
          </p>
          <a
            href="/docs/trm-api-postman-collection.json"
            download
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Collection
          </a>
        </div>
      </div>

      {/* Support */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-blue-800 mb-4">
          Having trouble with the SDK? Check out our documentation, GitHub issues, 
          or contact our developer support team.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://docs.trm.com"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Documentation
          </a>
          <a
            href="https://github.com/trm"
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            <Github className="w-5 h-5 mr-2" />
            GitHub
          </a>
          <a
            href="mailto:api-support@trm.com"
            className="inline-flex items-center px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SDKDownloads;
