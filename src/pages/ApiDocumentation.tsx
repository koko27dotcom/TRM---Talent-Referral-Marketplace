import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Code, Copy, Check, Search, ChevronRight, ChevronDown,
  Terminal, FileJson, Globe, Lock, Zap, AlertCircle, Server,
  Webhook, Key, Shield, Clock, RefreshCw, ExternalLink, Menu,
  X, Moon, Sun, Hash, Type, Braces, AlertTriangle, Info,
  Cpu, Database, Layers, Settings, Users, Briefcase, BarChart3,
  Palette, HelpCircle, MessageSquare, FileCode, Play, Eye,
  EyeOff, Download, Maximize2, Minimize2
} from 'lucide-react'

// API Configuration
const API_BASE_URL: string = '/api'

// Types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Endpoint {
  id: string
  method: HttpMethod
  path: string
  category: string
  title: string
  description: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Response[]
  codeExamples: CodeExamples
}

interface Parameter {
  name: string
  type: string
  required: boolean
  description: string
  example?: string
}

interface RequestBody {
  contentType: string
  schema: object
  example: object
}

interface Response {
  status: number
  description: string
  schema?: object
  example?: object
}

interface CodeExamples {
  curl: string
  javascript: string
  typescript: string
  python: string
}

interface WebhookEvent {
  name: string
  description: string
  payload: object
}

interface ErrorCode {
  code: string
  status: number
  description: string
}

// Endpoint Data
const endpoints: Endpoint[] = [
  {
    id: 'dashboard',
    method: 'GET',
    path: '/api/v1/enterprise/dashboard',
    category: 'overview',
    title: 'Get Dashboard',
    description: 'Retrieve enterprise dashboard data including metrics, recent activities, and subscription status.',
    responses: [
      {
        status: 200,
        description: 'Dashboard data retrieved successfully',
        example: {
          metrics: {
            totalJobs: 156,
            activeJobs: 42,
            totalApplications: 2847,
            newApplicationsThisWeek: 156
          },
          subscription: {
            plan: 'Enterprise',
            status: 'active',
            expiresAt: '2026-12-31T23:59:59Z'
          },
          recentActivities: []
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/dashboard" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`,
      typescript: `interface DashboardResponse {
  metrics: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    newApplicationsThisWeek: number;
  };
  subscription: {
    plan: string;
    status: string;
    expiresAt: string;
  };
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data: DashboardResponse = await response.json();`,
      python: `import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/dashboard',
    headers=headers
)

data = response.json()
print(data)`
    }
  },
  {
    id: 'plans',
    method: 'GET',
    path: '/api/v1/enterprise/plans',
    category: 'subscription',
    title: 'Get Plans',
    description: 'List all available enterprise subscription plans with pricing and features.',
    responses: [
      {
        status: 200,
        description: 'List of enterprise plans',
        example: {
          plans: [
            {
              id: 'enterprise-starter',
              name: 'Enterprise Starter',
              tier: 'starter',
              pricing: { monthly: 299, yearly: 2990, currency: 'USD' },
              features: { apiAccess: true, bulkJobPosting: true, customBranding: false }
            }
          ]
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/plans" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/plans', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const plans = await response.json();`,
      typescript: `interface Plan {
  id: string;
  name: string;
  tier: string;
  pricing: { monthly: number; yearly: number; currency: string };
  features: Record<string, boolean>;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/plans', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { plans }: { plans: Plan[] } = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/plans',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
plans = response.json()['plans']`
    }
  },
  {
    id: 'subscribe',
    method: 'POST',
    path: '/api/v1/enterprise/subscribe',
    category: 'subscription',
    title: 'Subscribe to Plan',
    description: 'Subscribe to an enterprise plan or upgrade/downgrade existing subscription.',
    requestBody: {
      contentType: 'application/json',
      schema: {
        planId: 'string',
        billingCycle: 'monthly | yearly',
        paymentMethodId: 'string'
      },
      example: {
        planId: 'enterprise-professional',
        billingCycle: 'yearly',
        paymentMethodId: 'pm_1234567890'
      }
    },
    responses: [
      {
        status: 201,
        description: 'Subscription created successfully',
        example: {
          subscriptionId: 'sub_123456',
          status: 'active',
          currentPeriodEnd: '2026-12-31T23:59:59Z'
        }
      },
      {
        status: 400,
        description: 'Invalid plan or payment method'
      }
    ],
    codeExamples: {
      curl: `curl -X POST "${API_BASE_URL}/v1/enterprise/subscribe" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "planId": "enterprise-professional",
    "billingCycle": "yearly",
    "paymentMethodId": "pm_1234567890"
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'enterprise-professional',
    billingCycle: 'yearly',
    paymentMethodId: 'pm_1234567890'
  })
});`,
      typescript: `interface SubscribeRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'enterprise-professional',
    billingCycle: 'yearly',
    paymentMethodId: 'pm_1234567890'
  } as SubscribeRequest)
});`,
      python: `import requests

payload = {
    'planId': 'enterprise-professional',
    'billingCycle': 'yearly',
    'paymentMethodId': 'pm_1234567890'
}

response = requests.post(
    '${API_BASE_URL}/v1/enterprise/subscribe',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)`
    }
  },
  {
    id: 'get-team',
    method: 'GET',
    path: '/api/v1/enterprise/team',
    category: 'team',
    title: 'Get Team Members',
    description: 'Retrieve all team members associated with the enterprise account.',
    responses: [
      {
        status: 200,
        description: 'List of team members',
        example: {
          members: [
            {
              id: 'user_123',
              name: 'John Doe',
              email: 'john@company.com',
              role: 'admin',
              joinedAt: '2026-01-15T10:30:00Z'
            }
          ]
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/team" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/team', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { members } = await response.json();`,
      typescript: `interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  joinedAt: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/team', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { members }: { members: TeamMember[] } = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/team',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
members = response.json()['members']`
    }
  },
  {
    id: 'add-team-member',
    method: 'POST',
    path: '/api/v1/enterprise/team',
    category: 'team',
    title: 'Add Team Member',
    description: 'Invite a new member to the enterprise team.',
    requestBody: {
      contentType: 'application/json',
      schema: { email: 'string', role: 'string', name: 'string' },
      example: { email: 'newmember@company.com', role: 'member', name: 'Jane Smith' }
    },
    responses: [
      {
        status: 201,
        description: 'Team member invited successfully',
        example: {
          id: 'invite_123',
          email: 'newmember@company.com',
          status: 'pending',
          inviteUrl: 'https://api.example.com/invite/abc123'
        }
      }
    ],
    codeExamples: {
      curl: `curl -X POST "${API_BASE_URL}/v1/enterprise/team" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "email": "newmember@company.com",
    "role": "member",
    "name": "Jane Smith"
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/team', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newmember@company.com',
    role: 'member',
    name: 'Jane Smith'
  })
});`,
      typescript: `interface AddTeamMemberRequest {
  email: string;
  role: 'admin' | 'manager' | 'member';
  name: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/team', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newmember@company.com',
    role: 'member',
    name: 'Jane Smith'
  } as AddTeamMemberRequest)
});`,
      python: `import requests

payload = {
    'email': 'newmember@company.com',
    'role': 'member',
    'name': 'Jane Smith'
}

response = requests.post(
    '${API_BASE_URL}/v1/enterprise/team',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)`
    }
  },
  {
    id: 'remove-team-member',
    method: 'DELETE',
    path: '/api/v1/enterprise/team/:id',
    category: 'team',
    title: 'Remove Team Member',
    description: 'Remove a team member from the enterprise account.',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Team member user ID', example: 'user_123' }
    ],
    responses: [
      { status: 204, description: 'Team member removed successfully' },
      { status: 404, description: 'Team member not found' }
    ],
    codeExamples: {
      curl: `curl -X DELETE "${API_BASE_URL}/v1/enterprise/team/user_123" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/team/user_123', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

if (response.status === 204) {
  console.log('Team member removed');
}`,
      typescript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/team/user_123', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

if (response.status === 204) {
  console.log('Team member removed');
}`,
      python: `import requests

response = requests.delete(
    '${API_BASE_URL}/v1/enterprise/team/user_123',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

if response.status_code == 204:
    print('Team member removed')`
    }
  },
  {
    id: 'bulk-jobs',
    method: 'POST',
    path: '/api/v1/enterprise/jobs/bulk',
    category: 'jobs',
    title: 'Bulk Create Jobs',
    description: 'Create multiple job postings in a single request.',
    requestBody: {
      contentType: 'application/json',
      schema: { jobs: 'array' },
      example: {
        jobs: [
          {
            title: 'Senior Software Engineer',
            department: 'Engineering',
            location: 'Remote',
            description: 'We are looking for...',
            requirements: ['5+ years experience', 'React expertise']
          }
        ]
      }
    },
    responses: [
      {
        status: 201,
        description: 'Jobs created successfully',
        example: {
          created: 1,
          failed: 0,
          jobs: [{ id: 'job_123', title: 'Senior Software Engineer', status: 'active' }]
        }
      }
    ],
    codeExamples: {
      curl: `curl -X POST "${API_BASE_URL}/v1/enterprise/jobs/bulk" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "jobs": [
      {
        "title": "Senior Software Engineer",
        "department": "Engineering",
        "location": "Remote",
        "description": "We are looking for...",
        "requirements": ["5+ years experience", "React expertise"]
      }
    ]
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/jobs/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobs: [
      {
        title: 'Senior Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        description: 'We are looking for...',
        requirements: ['5+ years experience', 'React expertise']
      }
    ]
  })
});`,
      typescript: `interface JobInput {
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/jobs/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobs: [{
      title: 'Senior Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      description: 'We are looking for...',
      requirements: ['5+ years experience', 'React expertise']
    }]
  })
});`,
      python: `import requests

payload = {
    'jobs': [
        {
            'title': 'Senior Software Engineer',
            'department': 'Engineering',
            'location': 'Remote',
            'description': 'We are looking for...',
            'requirements': ['5+ years experience', 'React expertise']
        }
    ]
}

response = requests.post(
    '${API_BASE_URL}/v1/enterprise/jobs/bulk',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)`
    }
  },
  {
    id: 'get-api-keys',
    method: 'GET',
    path: '/api/v1/enterprise/api-keys',
    category: 'api-keys',
    title: 'List API Keys',
    description: 'Retrieve all API keys associated with the enterprise account.',
    responses: [
      {
        status: 200,
        description: 'List of API keys',
        example: {
          keys: [
            {
              id: 'key_123',
              name: 'Production Key',
              prefix: 'pk_live_...',
              createdAt: '2026-01-15T10:30:00Z',
              lastUsedAt: '2026-01-31T08:45:00Z',
              permissions: ['read', 'write']
            }
          ]
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/api-keys" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { keys } = await response.json();`,
      typescript: `interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string;
  permissions: string[];
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { keys }: { keys: ApiKey[] } = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/api-keys',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
keys = response.json()['keys']`
    }
  },
  {
    id: 'create-api-key',
    method: 'POST',
    path: '/api/v1/enterprise/api-keys',
    category: 'api-keys',
    title: 'Create API Key',
    description: 'Generate a new API key for the enterprise account.',
    requestBody: {
      contentType: 'application/json',
      schema: { name: 'string', permissions: 'array' },
      example: { name: 'Integration Key', permissions: ['read', 'write'] }
    },
    responses: [
      {
        status: 201,
        description: 'API key created successfully',
        example: {
          id: 'key_456',
          name: 'Integration Key',
          key: 'pk_live_abc123xyz789',
          permissions: ['read', 'write'],
          createdAt: '2026-01-31T10:00:00Z'
        }
      }
    ],
    codeExamples: {
      curl: `curl -X POST "${API_BASE_URL}/v1/enterprise/api-keys" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "name": "Integration Key",
    "permissions": ["read", "write"]
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Integration Key',
    permissions: ['read', 'write']
  })
});
const { key } = await response.json();
console.log('New API Key:', key);`,
      typescript: `interface CreateApiKeyRequest {
  name: string;
  permissions: ('read' | 'write' | 'admin')[];
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Integration Key',
    permissions: ['read', 'write']
  } as CreateApiKeyRequest)
});`,
      python: `import requests

payload = {
    'name': 'Integration Key',
    'permissions': ['read', 'write']
}

response = requests.post(
    '${API_BASE_URL}/v1/enterprise/api-keys',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)
new_key = response.json()['key']`
    }
  },
  {
    id: 'delete-api-key',
    method: 'DELETE',
    path: '/api/v1/enterprise/api-keys/:id',
    category: 'api-keys',
    title: 'Delete API Key',
    description: 'Revoke and delete an API key.',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'API key ID', example: 'key_123' }
    ],
    responses: [
      { status: 204, description: 'API key deleted successfully' },
      { status: 404, description: 'API key not found' }
    ],
    codeExamples: {
      curl: `curl -X DELETE "${API_BASE_URL}/v1/enterprise/api-keys/key_123" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys/key_123', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

if (response.status === 204) {
  console.log('API key deleted');
}`,
      typescript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/api-keys/key_123', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

if (response.status === 204) {
  console.log('API key deleted');
}`,
      python: `import requests

response = requests.delete(
    '${API_BASE_URL}/v1/enterprise/api-keys/key_123',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

if response.status_code == 204:
    print('API key deleted')`
    }
  },
  {
    id: 'get-webhooks',
    method: 'GET',
    path: '/api/v1/enterprise/webhooks',
    category: 'webhooks',
    title: 'Get Webhooks',
    description: 'Retrieve configured webhook endpoints.',
    responses: [
      {
        status: 200,
        description: 'List of webhooks',
        example: {
          webhooks: [
            {
              id: 'wh_123',
              url: 'https://company.com/webhooks/jobs',
              events: ['job.created', 'job.updated'],
              status: 'active',
              createdAt: '2026-01-15T10:30:00Z'
            }
          ]
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/webhooks" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/webhooks', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { webhooks } = await response.json();`,
      typescript: `interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/webhooks', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const { webhooks }: { webhooks: Webhook[] } = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/webhooks',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
webhooks = response.json()['webhooks']`
    }
  },
  {
    id: 'update-webhooks',
    method: 'PUT',
    path: '/api/v1/enterprise/webhooks',
    category: 'webhooks',
    title: 'Update Webhooks',
    description: 'Configure or update webhook endpoints.',
    requestBody: {
      contentType: 'application/json',
      schema: { url: 'string', events: 'array', secret: 'string' },
      example: {
        url: 'https://company.com/webhooks/jobs',
        events: ['job.created', 'job.updated', 'application.received'],
        secret: 'whsec_your_webhook_secret'
      }
    },
    responses: [
      {
        status: 200,
        description: 'Webhook updated successfully',
        example: {
          id: 'wh_123',
          url: 'https://company.com/webhooks/jobs',
          events: ['job.created', 'job.updated', 'application.received'],
          status: 'active'
        }
      }
    ],
    codeExamples: {
      curl: `curl -X PUT "${API_BASE_URL}/v1/enterprise/webhooks" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "url": "https://company.com/webhooks/jobs",
    "events": ["job.created", "job.updated", "application.received"],
    "secret": "whsec_your_webhook_secret"
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/webhooks', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://company.com/webhooks/jobs',
    events: ['job.created', 'job.updated', 'application.received'],
    secret: 'whsec_your_webhook_secret'
  })
});`,
      typescript: `interface UpdateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/webhooks', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://company.com/webhooks/jobs',
    events: ['job.created', 'job.updated', 'application.received'],
    secret: 'whsec_your_webhook_secret'
  } as UpdateWebhookRequest)
});`,
      python: `import requests

payload = {
    'url': 'https://company.com/webhooks/jobs',
    'events': ['job.created', 'job.updated', 'application.received'],
    'secret': 'whsec_your_webhook_secret'
}

response = requests.put(
    '${API_BASE_URL}/v1/enterprise/webhooks',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)`
    }
  },
  {
    id: 'get-branding',
    method: 'GET',
    path: '/api/v1/enterprise/branding',
    category: 'branding',
    title: 'Get Branding',
    description: 'Retrieve custom branding configuration.',
    responses: [
      {
        status: 200,
        description: 'Branding configuration',
        example: {
          companyName: 'Acme Corp',
          logoUrl: 'https://cdn.example.com/logos/acme.png',
          primaryColor: '#0066CC',
          secondaryColor: '#00AA44',
          customDomain: 'jobs.acme.com',
          faviconUrl: 'https://cdn.example.com/favicons/acme.ico'
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/branding" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/branding', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const branding = await response.json();`,
      typescript: `interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
  faviconUrl?: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/branding', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const branding: BrandingConfig = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/branding',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
branding = response.json()`
    }
  },
  {
    id: 'update-branding',
    method: 'PUT',
    path: '/api/v1/enterprise/branding',
    category: 'branding',
    title: 'Update Branding',
    description: 'Update custom branding configuration.',
    requestBody: {
      contentType: 'application/json',
      schema: { companyName: 'string', logoUrl: 'string', primaryColor: 'string' },
      example: {
        companyName: 'Acme Corp',
        logoUrl: 'https://cdn.example.com/logos/acme.png',
        primaryColor: '#0066CC',
        secondaryColor: '#00AA44'
      }
    },
    responses: [
      {
        status: 200,
        description: 'Branding updated successfully',
        example: {
          companyName: 'Acme Corp',
          logoUrl: 'https://cdn.example.com/logos/acme.png',
          primaryColor: '#0066CC',
          updatedAt: '2026-01-31T10:00:00Z'
        }
      }
    ],
    codeExamples: {
      curl: `curl -X PUT "${API_BASE_URL}/v1/enterprise/branding" \\\
  -H "Authorization: Bearer YOUR_API_KEY" \\\
  -H "Content-Type: application/json" \\\
  -d '{
    "companyName": "Acme Corp",
    "logoUrl": "https://cdn.example.com/logos/acme.png",
    "primaryColor": "#0066CC",
    "secondaryColor": "#00AA44"
  }'`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/branding', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    companyName: 'Acme Corp',
    logoUrl: 'https://cdn.example.com/logos/acme.png',
    primaryColor: '#0066CC',
    secondaryColor: '#00AA44'
  })
});`,
      typescript: `interface UpdateBrandingRequest {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor?: string;
  customDomain?: string;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/branding', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    companyName: 'Acme Corp',
    logoUrl: 'https://cdn.example.com/logos/acme.png',
    primaryColor: '#0066CC',
    secondaryColor: '#00AA44'
  } as UpdateBrandingRequest)
});`,
      python: `import requests

payload = {
    'companyName': 'Acme Corp',
    'logoUrl': 'https://cdn.example.com/logos/acme.png',
    'primaryColor': '#0066CC',
    'secondaryColor': '#00AA44'
}

response = requests.put(
    '${API_BASE_URL}/v1/enterprise/branding',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json=payload
)`
    }
  },
  {
    id: 'advanced-reports',
    method: 'GET',
    path: '/api/v1/enterprise/reports/advanced',
    category: 'analytics',
    title: 'Get Advanced Reports',
    description: 'Retrieve advanced analytics and reporting data.',
    parameters: [
      { name: 'startDate', type: 'string', required: false, description: 'Start date (ISO 8601)', example: '2026-01-01' },
      { name: 'endDate', type: 'string', required: false, description: 'End date (ISO 8601)', example: '2026-01-31' },
      { name: 'type', type: 'string', required: false, description: 'Report type', example: 'applications' }
    ],
    responses: [
      {
        status: 200,
        description: 'Advanced report data',
        example: {
          period: { start: '2026-01-01', end: '2026-01-31' },
          metrics: {
            totalViews: 15420,
            totalApplications: 892,
            conversionRate: 5.78,
            topSources: ['LinkedIn', 'Direct', 'Google']
          },
          trends: []
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/reports/advanced?startDate=2026-01-01&endDate=2026-01-31&type=applications" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const params = new URLSearchParams({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  type: 'applications'
});

const response = await fetch(\`\${API_BASE_URL}/v1/enterprise/reports/advanced?\${params}\`, {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const report = await response.json();`,
      typescript: `interface ReportParams {
  startDate: string;
  endDate: string;
  type?: string;
}

const params = new URLSearchParams({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  type: 'applications'
});

const response = await fetch(\`\${API_BASE_URL}/v1/enterprise/reports/advanced?\${params}\`, {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const report = await response.json();`,
      python: `import requests

params = {
    'startDate': '2026-01-01',
    'endDate': '2026-01-31',
    'type': 'applications'
}

response = requests.get(
    f'{API_BASE_URL}/v1/enterprise/reports/advanced',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    params=params
)
report = response.json()`
    }
  },
  {
    id: 'support',
    method: 'GET',
    path: '/api/v1/enterprise/support',
    category: 'support',
    title: 'Get Support Info',
    description: 'Retrieve support contact information and ticket status.',
    responses: [
      {
        status: 200,
        description: 'Support information',
        example: {
          supportLevel: 'enterprise',
          responseTimeHours: 4,
          dedicatedManager: {
            name: 'Sarah Johnson',
            email: 'sarah.j@example.com',
            phone: '+1-555-0123'
          },
          openTickets: 2,
          recentTickets: []
        }
      }
    ],
    codeExamples: {
      curl: `curl -X GET "${API_BASE_URL}/v1/enterprise/support" \\\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `const response = await fetch('${API_BASE_URL}/v1/enterprise/support', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const support = await response.json();`,
      typescript: `interface SupportInfo {
  supportLevel: string;
  responseTimeHours: number;
  dedicatedManager?: {
    name: string;
    email: string;
    phone?: string;
  };
  openTickets: number;
}

const response = await fetch('${API_BASE_URL}/v1/enterprise/support', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const support: SupportInfo = await response.json();`,
      python: `import requests

response = requests.get(
    '${API_BASE_URL}/v1/enterprise/support',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
support = response.json()`
    }
  }
]

// Webhook Events
const webhookEvents: WebhookEvent[] = [
  {
    name: 'job.created',
    description: 'Triggered when a new job is created',
    payload: {
      event: 'job.created',
      timestamp: '2026-01-31T10:00:00Z',
      data: {
        jobId: 'job_123',
        title: 'Senior Software Engineer',
        department: 'Engineering',
        createdAt: '2026-01-31T10:00:00Z'
      }
    }
  },
  {
    name: 'job.updated',
    description: 'Triggered when a job is updated',
    payload: {
      event: 'job.updated',
      timestamp: '2026-01-31T10:05:00Z',
      data: {
        jobId: 'job_123',
        changes: ['status', 'description'],
        updatedAt: '2026-01-31T10:05:00Z'
      }
    }
  },
  {
    name: 'application.received',
    description: 'Triggered when a new application is submitted',
    payload: {
      event: 'application.received',
      timestamp: '2026-01-31T10:10:00Z',
      data: {
        applicationId: 'app_456',
        jobId: 'job_123',
        applicant: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        submittedAt: '2026-01-31T10:10:00Z'
      }
    }
  },
  {
    name: 'team.member.invited',
    description: 'Triggered when a team member is invited',
    payload: {
      event: 'team.member.invited',
      timestamp: '2026-01-31T10:15:00Z',
      data: {
        inviteId: 'invite_789',
        email: 'newmember@company.com',
        role: 'member',
        invitedBy: 'user_123'
      }
    }
  },
  {
    name: 'subscription.updated',
    description: 'Triggered when subscription is changed',
    payload: {
      event: 'subscription.updated',
      timestamp: '2026-01-31T10:20:00Z',
      data: {
        subscriptionId: 'sub_123',
        plan: 'enterprise-professional',
        status: 'active',
        previousPlan: 'enterprise-starter'
      }
    }
  }
]

// Error Codes
const errorCodes: ErrorCode[] = [
  { code: 'UNAUTHORIZED', status: 401, description: 'Invalid or missing API key' },
  { code: 'FORBIDDEN', status: 403, description: 'Insufficient permissions for this operation' },
  { code: 'NOT_FOUND', status: 404, description: 'Requested resource not found' },
  { code: 'VALIDATION_ERROR', status: 422, description: 'Request validation failed' },
  { code: 'RATE_LIMITED', status: 429, description: 'Too many requests, rate limit exceeded' },
  { code: 'INTERNAL_ERROR', status: 500, description: 'Internal server error' },
  { code: 'SERVICE_UNAVAILABLE', status: 503, description: 'Service temporarily unavailable' }
]

// Categories
const categories = [
  { id: 'overview', name: 'Overview', icon: BookOpen },
  { id: 'authentication', name: 'Authentication', icon: Key },
  { id: 'subscription', name: 'Subscription', icon: Zap },
  { id: 'team', name: 'Team Management', icon: Users },
  { id: 'jobs', name: 'Jobs', icon: Briefcase },
  { id: 'api-keys', name: 'API Keys', icon: Lock },
  { id: 'webhooks', name: 'Webhooks', icon: Webhook },
  { id: 'branding', name: 'Branding', icon: Palette },
  { id: 'analytics', name: 'Analytics', icon: BarChart3 },
  { id: 'support', name: 'Support', icon: HelpCircle }
]

// Components
const MethodBadge = ({ method }: { method: HttpMethod }) => {
  const colors = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-mono font-semibold ${colors[method]}`}>
      {method}
    </span>
  )
}

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto rounded-b-lg">
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  )
}

const EndpointCard = ({ endpoint }: { endpoint: Endpoint }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'typescript' | 'python'>('curl')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <MethodBadge method={endpoint.method} />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">{endpoint.title}</h3>
            <code className="text-sm text-gray-500 dark:text-gray-400 font-mono">{endpoint.path}</code>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 space-y-6">
              <p className="text-gray-600 dark:text-gray-300">{endpoint.description}</p>

              {endpoint.parameters && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Path Parameters
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Name</th>
                          <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Type</th>
                          <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Required</th>
                          <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-400">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.parameters.map((param) => (
                          <tr key={param.name} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2 font-mono text-gray-900 dark:text-white">{param.name}</td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{param.type}</td>
                            <td className="px-4 py-2">
                              {param.required ? (
                                <span className="text-red-600 dark:text-red-400">Required</span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-500">Optional</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {endpoint.requestBody && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Braces className="w-4 h-4" />
                    Request Body
                  </h4>
                  <CodeBlock
                    code={JSON.stringify(endpoint.requestBody.example, null, 2)}
                    language="json"
                  />
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Responses
                </h4>
                <div className="space-y-3">
                  {endpoint.responses.map((response) => (
                    <div
                      key={response.status}
                      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          response.status < 300
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : response.status < 400
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {response.status}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{response.description}</span>
                      </div>
                      {response.example && (
                        <CodeBlock
                          code={JSON.stringify(response.example, null, 2)}
                          language="json"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Code Examples
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {(['curl', 'javascript', 'typescript', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveTab(lang)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                          activeTab === lang
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {lang === 'curl' ? 'cURL' : lang}
                      </button>
                    ))}
                  </div>
                  <CodeBlock
                    code={endpoint.codeExamples[activeTab]}
                    language={activeTab === 'curl' ? 'bash' : activeTab}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const Sidebar = ({
  activeCategory,
  onCategoryChange,
  isOpen,
  onClose
}: {
  activeCategory: string
  onCategoryChange: (id: string) => void
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed lg:sticky lg:translate-x-0 top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 overflow-y-auto`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">API Docs</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id)
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              )
            })}
          </nav>
        </div>
      </motion.aside>
    </>
  )
}

const AuthenticationSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The Enterprise API uses API keys to authenticate requests. You can view and manage your API keys in the Enterprise Portal.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Keep your API keys secure</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Do not share your API keys in publicly accessible areas such as GitHub, client-side code, etc.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Key Authentication</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Include your API key in the Authorization header of all API requests:
        </p>
        <CodeBlock
          code={`Authorization: Bearer YOUR_API_KEY`}
          language="http"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Example Request</h3>
        <CodeBlock
          code={`curl -X GET "${API_BASE_URL}/v1/enterprise/dashboard" \\
  -H "Authorization: Bearer sk_live_1234567890abcdef" \\
  -H "Content-Type: application/json"`}
          language="bash"
        />
      </div>
    </div>
  )
}

const WebhooksSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Webhooks</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Webhooks allow you to receive real-time notifications when events occur in your enterprise account.
          Configure webhook endpoints to receive HTTP POST requests with event data.
        </p>
      </div>

      <div className="grid gap-4">
        {webhookEvents.map((event) => (
          <motion.div
            key={event.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center gap-3 mb-3">
              <Webhook className="w-5 h-5 text-purple-500" />
              <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{event.name}</code>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{event.description}</p>
            <CodeBlock
              code={JSON.stringify(event.payload, null, 2)}
              language="json"
            />
          </motion.div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Webhook Security</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Each webhook request includes a signature header. Verify this signature using your webhook secret
              to ensure the request came from our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const RateLimitingSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rate Limiting</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          To ensure fair usage and system stability, API requests are rate limited. Rate limits vary by plan tier.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { tier: 'Starter', requests: '1,000', burst: '100' },
          { tier: 'Professional', requests: '10,000', burst: '500' },
          { tier: 'Enterprise', requests: '100,000', burst: '2,000' }
        ].map((plan) => (
          <div
            key={plan.tier}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{plan.tier}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Requests/hour</span>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{plan.requests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Burst limit</span>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{plan.burst}/min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rate Limit Headers</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Each API response includes headers indicating your current rate limit status:
        </p>
        <CodeBlock
          code={`X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9999
X-RateLimit-Reset: 1643723400`}
          language="http"
        />
      </div>
    </div>
  )
}

const ErrorCodesSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Codes</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The API uses conventional HTTP response codes to indicate the success or failure of requests.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {errorCodes.map((error) => (
              <tr key={error.code}>
                <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">{error.code}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                    error.status >= 500
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : error.status >= 400
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {error.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{error.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Error Response Format</h3>
        <CodeBlock
          code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}`}
          language="json"
        />
      </div>
    </div>
  )
}

// Main Component
export default function ApiDocumentation() {
  const [activeCategory, setActiveCategory] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Check system dark mode preference
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }, [isDarkMode])

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery) return endpoints
    const query = searchQuery.toLowerCase()
    return endpoints.filter(
      (endpoint) =>
        endpoint.title.toLowerCase().includes(query) ||
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const categoryEndpoints = useMemo(() => {
    return filteredEndpoints.filter((endpoint) => endpoint.category === activeCategory)
  }, [filteredEndpoints, activeCategory])

  const renderContent = () => {
    switch (activeCategory) {
      case 'authentication':
        return <AuthenticationSection />
      case 'webhooks':
        return <WebhooksSection />
      default:
        return (
          <div className="space-y-6">
            {searchQuery && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Found {categoryEndpoints.length} result{categoryEndpoints.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
            )}
            {categoryEndpoints.length > 0 ? (
              categoryEndpoints.map((endpoint) => (
                <EndpointCard key={endpoint.id} endpoint={endpoint} />
              ))
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No endpoints found</p>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search endpoints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <a
                  href="https://enterprise.example.com/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Support
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl">
            {/* Overview Section */}
            {activeCategory === 'overview' && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Enterprise API Documentation
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                  Welcome to the Enterprise API. Build powerful integrations with our comprehensive
                  REST API designed for enterprise-scale operations.
                </p>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Zap, title: 'RESTful API', desc: 'Standard HTTP methods and JSON responses' },
                    { icon: Shield, title: 'Secure', desc: 'API key authentication with HTTPS only' },
                    { icon: Clock, title: 'Real-time', desc: 'Webhooks for instant event notifications' },
                    { icon: BarChart3, title: 'Analytics', desc: 'Advanced reporting and insights' },
                    { icon: Users, title: 'Team Management', desc: 'Multi-user enterprise accounts' },
                    { icon: Globe, title: 'Custom Branding', desc: 'White-label options available' }
                  ].map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
                    >
                      <feature.icon className="w-8 h-8 text-blue-500 mb-3" />
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 space-y-8">
                  <RateLimitingSection />
                  <ErrorCodesSection />
                </div>
              </motion.div>
            )}

            {/* Category Content */}
            {activeCategory !== 'overview' && renderContent()}

            {/* Search Results for Overview */}
            {activeCategory === 'overview' && searchQuery && renderContent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <p>© 2026 Enterprise Portal. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>API Version: v1</span>
              <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <span>Base URL: {API_BASE_URL}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
