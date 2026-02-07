import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Briefcase,
  DollarSign,
  MapPin,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface TrendData {
  month: string;
  jobCount: number;
  avgSalary: number;
  applications: number;
}

interface SkillData {
  skill: string;
  demand: number;
  trend: 'up' | 'down' | 'stable';
  avgSalary: number;
}

interface SalaryData {
  role: string;
  min: number;
  max: number;
  median: number;
  count: number;
}

interface IndustryInsight {
  industry: string;
  jobCount: number;
  growth: number;
  avgSalary: number;
  topSkills: string[];
}

const MarketIntelligenceDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6m');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [skillData, setSkillData] = useState<SkillData[]>([]);
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [industryInsights, setIndustryInsights] = useState<IndustryInsight[]>([]);

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedIndustry, selectedLocation]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch hiring trends
      const trendsRes = await fetch(`/api/market-intelligence/trends?timeRange=${timeRange}`);
      const trendsData = await trendsRes.json();
      if (trendsData.success) {
        setTrendData(trendsData.data.monthlyData || getSampleTrendData());
      }

      // Fetch skill demand
      const skillsRes = await fetch('/api/market-intelligence/skills');
      const skillsData = await skillsRes.json();
      if (skillsData.success) {
        setSkillData(skillsData.data.topSkills || getSampleSkillData());
      }

      // Fetch salary benchmarks
      const salaryRes = await fetch('/api/market-intelligence/salaries');
      const salaryData = await salaryRes.json();
      if (salaryData.success) {
        setSalaryData(salaryData.data.benchmarks || getSampleSalaryData());
      }

      // Fetch industry insights
      const industryRes = await fetch('/api/market-intelligence/industries/all');
      const industryData = await industryRes.json();
      if (industryData.success) {
        setIndustryInsights(industryData.data.industries || getSampleIndustryData());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Use sample data
      setTrendData(getSampleTrendData());
      setSkillData(getSampleSkillData());
      setSalaryData(getSampleSalaryData());
      setIndustryInsights(getSampleIndustryData());
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `${(value / 1000).toFixed(0)}K MMK`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-slate-500" />;
    }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Market Intelligence</h1>
            <p className="mt-2 text-slate-600">
              Real-time insights into Myanmar's job market
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Filters:</span>
            </div>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="1m">Last Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
            </select>

            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Industries</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="yangon">Yangon</option>
              <option value="mandalay">Mandalay</option>
              <option value="naypyitaw">Naypyitaw</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 inline-flex">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'skills', label: 'Skills', icon: BarChart3 },
            { id: 'salaries', label: 'Salaries', icon: DollarSign },
            { id: 'industries', label: 'Industries', icon: PieChart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Briefcase className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4" />
                        +12.5%
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">2,847</h3>
                    <p className="text-sm text-slate-600">Active Job Postings</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4" />
                        +8.3%
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">15,432</h3>
                    <p className="text-sm text-slate-600">Active Candidates</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <ArrowDownRight className="w-4 h-4" />
                        -2.1%
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">850K</h3>
                    <p className="text-sm text-slate-600">Avg. Salary (MMK)</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <Calendar className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4" />
                        +5.7%
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">28</h3>
                    <p className="text-sm text-slate-600">Avg. Days to Hire</p>
                  </motion.div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Hiring Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                        <YAxis stroke="#64748B" fontSize={12} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="jobCount"
                          stroke="#3B82F6"
                          fillOpacity={1}
                          fill="url(#colorJobs)"
                          name="Job Postings"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Top Skills in Demand</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={skillData.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis type="number" stroke="#64748B" fontSize={12} />
                        <YAxis dataKey="skill" type="category" stroke="#64748B" fontSize={12} width={100} />
                        <Tooltip />
                        <Bar dataKey="demand" fill="#8B5CF6" name="Demand Score" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Market Trends Analysis</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" />
                    <YAxis yAxisId="left" stroke="#64748B" />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748B" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="jobCount"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Job Postings"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="applications"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Applications"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">Skills Demand Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Skill</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Demand Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trend</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg. Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {skillData.map((skill, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{skill.skill}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(skill.demand / 100) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-slate-600">{skill.demand}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getTrendIcon(skill.trend)}
                              <span className={`text-sm capitalize ${
                                skill.trend === 'up' ? 'text-green-600' :
                                skill.trend === 'down' ? 'text-red-600' :
                                'text-slate-600'
                              }`}>
                                {skill.trend}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-900">
                            {formatCurrency(skill.avgSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Salaries Tab */}
            {activeTab === 'salaries' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Salary Benchmarks by Role</h3>
                  <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salaryData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="role" stroke="#64748B" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#64748B" tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="min" fill="#94A3B8" name="Min Salary" />
                    <Bar dataKey="median" fill="#3B82F6" name="Median Salary" />
                    <Bar dataKey="max" fill="#8B5CF6" name="Max Salary" />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Industries Tab */}
            {activeTab === 'industries' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Industry Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={industryInsights}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="jobCount"
                        nameKey="industry"
                      >
                        {industryInsights.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Industry Performance</h3>
                  <div className="space-y-4">
                    {industryInsights.map((industry, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">{industry.industry}</h4>
                          <p className="text-sm text-slate-600">{industry.jobCount} jobs</p>
                        </div>
                        <div className="text-right">
                          <span className={`flex items-center gap-1 text-sm font-medium ${
                            industry.growth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {industry.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {Math.abs(industry.growth)}%
                          </span>
                          <p className="text-sm text-slate-600">{formatCurrency(industry.avgSalary)} avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Sample data functions
const getSampleTrendData = (): TrendData[] => [
  { month: 'Jan', jobCount: 1200, avgSalary: 800000, applications: 3500 },
  { month: 'Feb', jobCount: 1350, avgSalary: 820000, applications: 3800 },
  { month: 'Mar', jobCount: 1400, avgSalary: 830000, applications: 4100 },
  { month: 'Apr', jobCount: 1550, avgSalary: 850000, applications: 4500 },
  { month: 'May', jobCount: 1600, avgSalary: 860000, applications: 4800 },
  { month: 'Jun', jobCount: 1750, avgSalary: 880000, applications: 5200 },
];

const getSampleSkillData = (): SkillData[] => [
  { skill: 'React', demand: 95, trend: 'up', avgSalary: 1200000 },
  { skill: 'Node.js', demand: 88, trend: 'up', avgSalary: 1100000 },
  { skill: 'Python', demand: 85, trend: 'up', avgSalary: 1300000 },
  { skill: 'Java', demand: 78, trend: 'stable', avgSalary: 1150000 },
  { skill: 'AWS', demand: 82, trend: 'up', avgSalary: 1400000 },
  { skill: 'SQL', demand: 75, trend: 'stable', avgSalary: 1000000 },
  { skill: 'Docker', demand: 70, trend: 'up', avgSalary: 1250000 },
  { skill: 'TypeScript', demand: 68, trend: 'up', avgSalary: 1150000 },
  { skill: 'PHP', demand: 55, trend: 'down', avgSalary: 900000 },
  { skill: 'Angular', demand: 52, trend: 'down', avgSalary: 1050000 },
];

const getSampleSalaryData = (): SalaryData[] => [
  { role: 'Software Engineer', min: 600000, max: 2500000, median: 1200000, count: 245 },
  { role: 'Senior Developer', min: 1200000, max: 4000000, median: 2200000, count: 189 },
  { role: 'DevOps Engineer', min: 1000000, max: 3500000, median: 2000000, count: 98 },
  { role: 'Data Scientist', min: 1500000, max: 5000000, median: 2800000, count: 67 },
  { role: 'Product Manager', min: 1800000, max: 5500000, median: 3200000, count: 54 },
  { role: 'UI/UX Designer', min: 500000, max: 2000000, median: 1000000, count: 123 },
  { role: 'QA Engineer', min: 400000, max: 1500000, median: 800000, count: 87 },
  { role: 'Tech Lead', min: 2000000, max: 6000000, median: 3800000, count: 45 },
];

const getSampleIndustryData = (): IndustryInsight[] => [
  { industry: 'Technology', jobCount: 850, growth: 15.5, avgSalary: 1500000, topSkills: ['React', 'Node.js', 'Python'] },
  { industry: 'Finance', jobCount: 420, growth: 8.3, avgSalary: 1800000, topSkills: ['SQL', 'Excel', 'Python'] },
  { industry: 'Healthcare', jobCount: 380, growth: 12.1, avgSalary: 1200000, topSkills: ['Data Entry', 'EMR', 'Communication'] },
  { industry: 'Manufacturing', jobCount: 290, growth: -2.5, avgSalary: 900000, topSkills: ['Quality Control', 'Lean', 'Safety'] },
  { industry: 'Retail', jobCount: 250, growth: 5.2, avgSalary: 700000, topSkills: ['Sales', 'Customer Service', 'Inventory'] },
  { industry: 'Education', jobCount: 180, growth: 3.8, avgSalary: 800000, topSkills: ['Teaching', 'Curriculum', 'Assessment'] },
];

export default MarketIntelligenceDashboard;
