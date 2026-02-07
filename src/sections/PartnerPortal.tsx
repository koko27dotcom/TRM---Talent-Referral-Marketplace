import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  DollarSign, 
  Users, 
  Link as LinkIcon, 
  TrendingUp, 
  Award,
  BarChart3,
  Key,
  Palette,
  ArrowRight,
  Copy,
  Check,
  Wallet,
  Target,
  Zap
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardData {
  partner: {
    partnerId: string;
    name: string;
    type: string;
    status: string;
    tier: string;
    commissionRate: number;
    affiliateCode: string;
  };
  revenue: {
    totalRevenue: number;
    totalPayout: number;
    pendingPayout: number;
    availableBalance: number;
    last30Days: number;
  };
  referrals: {
    totalReferrals: number;
    totalClicks: number;
    converted: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  tierProgress: {
    currentTier: string;
    nextTier: string;
    referralsProgress: {
      current: number;
      required: number;
      percentage: number;
    };
    revenueProgress: {
      current: number;
      required: number;
      percentage: number;
    };
  } | null;
}

const PartnerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/partners/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have an active partner account. Please apply to become a partner.');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    if (dashboardData?.partner.affiliateCode) {
      const link = `${window.location.origin}/ref/${dashboardData.partner.affiliateCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tierColors: Record<string, string> = {
    bronze: 'from-amber-700 to-amber-600',
    silver: 'from-gray-400 to-gray-300',
    gold: 'from-yellow-500 to-yellow-400',
    platinum: 'from-purple-600 to-purple-500',
  };

  const tierBenefits: Record<string, string[]> = {
    bronze: ['10% Commission', 'Basic API Access', 'Standard Support'],
    silver: ['15% Commission', 'Advanced API Access', 'Priority Support', 'White-Label Option'],
    gold: ['20% Commission', 'Full API Access', 'Dedicated Account Manager', 'Custom Integrations'],
    platinum: ['25% Commission', 'Unlimited API Access', 'Custom Development', 'Revenue Share on Marketplace'],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Become a Partner</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/partner/apply')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { partner, revenue, referrals, tierProgress } = dashboardData;

  const revenueChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Revenue',
        data: [revenue.last30Days * 0.2, revenue.last30Days * 0.3, revenue.last30Days * 0.25, revenue.last30Days * 0.25],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const conversionChartData = {
    labels: ['Converted', 'Pending', 'Expired'],
    datasets: [
      {
        data: [referrals.converted, referrals.totalReferrals - referrals.converted, 0],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Portal</h1>
              <p className="text-gray-600 mt-1">Manage your partnership and track performance</p>
            </div>
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${tierColors[partner.tier]} text-white font-semibold capitalize`}>
              {partner.tier} Partner
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenue.totalRevenue.toLocaleString()} MMK
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenue.availableBalance.toLocaleString()} MMK
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{referrals.totalReferrals}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {referrals.totalReferrals > 0
                    ? ((referrals.converted / referrals.totalReferrals) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Affiliate Link */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Affiliate Link</h2>
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 border rounded-lg px-4 py-3 font-mono text-sm text-gray-600 truncate">
                  {window.location.origin}/ref/{partner.affiliateCode}
                </div>
                <button
                  onClick={copyAffiliateLink}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Share this link to earn {partner.commissionRate}% commission on all referred revenue
              </p>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Status</h3>
                <Doughnut data={conversionChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              </div>
            </div>

            {/* Tier Progress */}
            {tierProgress && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Tier Progress</h2>
                  <span className="text-sm text-gray-500">
                    Current: <span className="font-semibold capitalize">{tierProgress.currentTier}</span> → Next:{' '}
                    <span className="font-semibold capitalize">{tierProgress.nextTier}</span>
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Referrals</span>
                      <span className="font-medium">
                        {tierProgress.referralsProgress.current} / {tierProgress.referralsProgress.required}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(tierProgress.referralsProgress.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-medium">
                        {tierProgress.revenueProgress.current.toLocaleString()} /{' '}
                        {tierProgress.revenueProgress.required.toLocaleString()} MMK
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(tierProgress.revenueProgress.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {tierProgress.nextTier} Tier Benefits:
                  </h3>
                  <ul className="space-y-1">
                    {tierBenefits[tierProgress.nextTier]?.map((benefit, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/affiliates/links')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-700">Generate Links</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/partners/earnings')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-700">View Reports</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/partners/api-keys')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-700">Manage API Keys</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>

                {['silver', 'gold', 'platinum'].includes(partner.tier) && (
                  <button
                    onClick={() => navigate('/partners/white-label')}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Palette className="w-5 h-5 text-pink-600" />
                      <span className="font-medium text-gray-700">Configure White-Label</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Current Benefits */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Benefits</h2>
              <ul className="space-y-3">
                {tierBenefits[partner.tier]?.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-700">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Commission Info */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6" />
                <h2 className="text-lg font-semibold">Commission Rate</h2>
              </div>
              <p className="text-4xl font-bold mb-2">{partner.commissionRate}%</p>
              <p className="text-blue-100 text-sm">
                On all referred revenue from companies and referrers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPortal;
