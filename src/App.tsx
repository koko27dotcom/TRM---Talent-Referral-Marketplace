import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PostJob from './sections/PostJob'
import Navigation from './sections/Navigation'
import HeroSection from './sections/HeroSection'
import JobsSection from './sections/JobsSection'
import JobDetail from './sections/JobDetail'
import ReferralDashboard from './sections/ReferralDashboard'
import MobileNav from './components/MobileNav'
import Login from './sections/Login'
import Register from './sections/Register'
import Dashboard from './sections/Dashboard'
import EditJob from './EditJob'
import CorporateDashboard from './sections/CorporateDashboard'
import AdminDashboard from './sections/AdminDashboard'
import ReferralTracking from './sections/ReferralTracking'
import LandingPage from './sections/LandingPage'
import BillingDashboard from './sections/BillingDashboard'
import SubscriptionPlans from './sections/SubscriptionPlans'
import LeadScoreDashboard from './sections/LeadScoreDashboard'
import EmailCampaignManager from './sections/EmailCampaignManager'
import ResumeOptimizer from './sections/ResumeOptimizer'
import ForRecruiters from './sections/ForRecruiters'

export interface Job {
  id: number
  title: string
  company: string
  location: string
  type: string
  salary: string
  posted: string
  urgent: boolean
  featured?: boolean
  featuredPriority?: number
  category: string
  description: string
  requirements: string[]
  benefits: string[]
  referralBonus: string
}

// ALL 25 JOBS WITH SALARY-BASED REFERRAL BONUSES (50K - 300K MMK)
const jobsData: Job[] = [
  {
    id: 1,
    title: "Senior Supervisor",
    company: "RK Yangon Steel",
    location: "Thanlyin",
    type: "Full-time",
    salary: "7.5 - 10 Lakhs",
    posted: "Urgent",
    urgent: true,
    category: "Operations",
    description: "Lead and supervise daily operations at steel manufacturing facility",
    requirements: ["5+ years experience", "Leadership skills", "Steel industry knowledge"],
    benefits: ["Health insurance", "Performance bonus", "Transportation"],
    referralBonus: "150,000 MMK"
  },
  {
    id: 2,
    title: "Warehouse Supervisor",
    company: "Universal Energy",
    location: "Thingangyun",
    type: "Full-time",
    salary: "Negotiable",
    posted: "Urgent",
    urgent: true,
    category: "Operations",
    description: "Manage warehouse operations and inventory control",
    requirements: ["3+ years warehouse experience", "Inventory management", "Team leadership"],
    benefits: ["Competitive salary", "Career growth", "Training provided"],
    referralBonus: "120,000 MMK"
  },
  {
    id: 3,
    title: "Interior Designer",
    company: "Delight Amatat",
    location: "Thingangyun",
    type: "Full-time",
    salary: "10 - 15 Lakhs",
    posted: "Urgent",
    urgent: true,
    category: "Design",
    description: "Create interior designs for residential and commercial projects",
    requirements: ["Degree in Interior Design", "Proficiency in AutoCAD", "Creative vision"],
    benefits: ["High commission", "Flexible hours", "Creative freedom"],
    referralBonus: "200,000 MMK"
  },
  {
    id: 4,
    title: "Senior Page Admin",
    company: "TOMO",
    location: "Tamwe",
    type: "Full-time",
    salary: "Negotiable",
    posted: "Urgent",
    urgent: true,
    category: "Marketing",
    description: "Lead social media strategy and content creation",
    requirements: ["3+ years social media management", "Content strategy", "Analytics"],
    benefits: ["Startup equity", "Flexible remote work", "Creative environment"],
    referralBonus: "100,000 MMK"
  },
  {
    id: 5,
    title: "Assistant Brand Manager",
    company: "Unicharm Myanmar",
    location: "Yankin",
    type: "Full-time",
    salary: "15 - 17 Lakhs",
    posted: "2 days ago",
    urgent: false,
    category: "Marketing",
    description: "Drive brand growth for leading Japanese FMCG company",
    requirements: ["5+ years brand management", "FMCG experience", "Strategic thinking"],
    benefits: ["MNC experience", "Health insurance", "Annual training"],
    referralBonus: "300,000 MMK"
  },
  {
    id: 6,
    title: "Brand Executive",
    company: "Unicharm Myanmar",
    location: "Yankin",
    type: "Full-time",
    salary: "7 - 9 Lakhs",
    posted: "2 days ago",
    urgent: false,
    category: "Marketing",
    description: "Execute marketing campaigns and brand activations",
    requirements: ["2+ years marketing", "Good communication", "Creative thinking"],
    benefits: ["MNC environment", "Product discounts", "Career development"],
    referralBonus: "140,000 MMK"
  },
  {
    id: 7,
    title: "Accountant",
    company: "Universal Energy",
    location: "Thingangyun",
    type: "Full-time",
    salary: "6 - 7 Lakhs",
    posted: "3 days ago",
    urgent: false,
    category: "Accounting",
    description: "Manage full spectrum of accounting functions",
    requirements: ["3+ years accounting", "CPA preferred", "Attention to detail"],
    benefits: ["Stable company", "Annual review", "Professional development"],
    referralBonus: "130,000 MMK"
  },
  {
    id: 8,
    title: "Junior Accountant",
    company: "Unicharm Myanmar",
    location: "Yankin",
    type: "Full-time",
    salary: "3.5 - 4 Lakhs",
    posted: "3 days ago",
    urgent: false,
    category: "Accounting",
    description: "Support senior accounting team in daily operations",
    requirements: ["Fresh grad welcome", "Accounting degree", "Excel skills"],
    benefits: ["MNC training", "Career foundation", "Health insurance"],
    referralBonus: "80,000 MMK"
  },
  {
    id: 9,
    title: "Graphic Designer",
    company: "WOW Sport",
    location: "Kamaryut",
    type: "Full-time",
    salary: "Around 10 Lakhs",
    posted: "1 week ago",
    urgent: false,
    category: "Design",
    description: "Create visual content for sports brand marketing",
    requirements: ["Strong portfolio", "Adobe Creative Suite", "Creative mindset"],
    benefits: ["Sport industry", "Free gym membership", "Creative freedom"],
    referralBonus: "180,000 MMK"
  },
  {
    id: 10,
    title: "Senior Sales Executive",
    company: "WOW Sport",
    location: "Kamaryut",
    type: "Full-time",
    salary: "10 Lakhs + Commission",
    posted: "1 week ago",
    urgent: false,
    category: "Sales",
    description: "Lead sales team and drive revenue growth",
    requirements: ["5+ years sales", "B2B experience", "Leadership skills"],
    benefits: ["High commission", "Leadership role", "Sport perks"],
    referralBonus: "200,000 MMK"
  },
  {
    id: 11,
    title: "Content Writer",
    company: "Shwe Taung Htun",
    location: "Mingalar Taung Nyunt",
    type: "Full-time",
    salary: "4 - 6 Lakhs",
    posted: "2 days ago",
    urgent: false,
    category: "Marketing",
    description: "Create compelling content and scripts for marketing",
    requirements: ["Excellent writing", "Creative storytelling", "Digital marketing trends"],
    benefits: ["Creative environment", "Flexible hours", "Skill development"],
    referralBonus: "100,000 MMK"
  },
  {
    id: 12,
    title: "Site Engineer",
    company: "Sun Myat Tun",
    location: "Botahtaung",
    type: "Full-time",
    salary: "7.5 Lakhs",
    posted: "4 days ago",
    urgent: false,
    category: "Engineering",
    description: "Supervise construction sites and ensure project quality",
    requirements: ["Civil Engineering degree", "2+ years site experience", "AutoCAD"],
    benefits: ["Project bonuses", "Site allowances", "Career growth"],
    referralBonus: "150,000 MMK"
  },
  {
    id: 13,
    title: "Data Collector",
    company: "NielsenIQ Myanmar",
    location: "Multiple Locations",
    type: "Full-time",
    salary: "3.5 Lakhs + Allowances",
    posted: "5 days ago",
    urgent: false,
    category: "Research",
    description: "Collect market research data across Myanmar",
    requirements: ["Willingness to travel", "Good communication", "Basic computer skills"],
    benefits: ["Travel allowances", "Flexible schedule", "Training provided"],
    referralBonus: "80,000 MMK"
  },
  {
    id: 14,
    title: "Loan Officer",
    company: "Real Aid Microfinance",
    location: "Ayeyarwady",
    type: "Full-time",
    salary: "4 - 5 Lakhs + Incentives",
    posted: "1 week ago",
    urgent: false,
    category: "Finance",
    description: "Evaluate loan applications and build client relationships",
    requirements: ["Finance background", "Interpersonal skills", "Local knowledge"],
    benefits: ["Performance incentives", "Rural development impact", "Career progression"],
    referralBonus: "100,000 MMK"
  },
  {
    id: 15,
    title: "Cashier",
    company: "Real Aid Microfinance",
    location: "Ayeyarwady",
    type: "Full-time",
    salary: "Above 3 Lakhs",
    posted: "1 week ago",
    urgent: false,
    category: "Finance",
    description: "Handle cash transactions and maintain records",
    requirements: ["Basic math skills", "Honesty", "Customer service"],
    benefits: ["Stable employment", "Growth opportunities", "Friendly team"],
    referralBonus: "70,000 MMK"
  },
  {
    id: 16,
    title: "Sales Representative",
    company: "AMI",
    location: "Kamaryut",
    type: "Full-time",
    salary: "5 - 6.5 Lakhs",
    posted: "6 days ago",
    urgent: false,
    category: "Sales",
    description: "Develop and manage agency partnerships",
    requirements: ["Agency sales experience", "Relationship building", "Target-driven"],
    benefits: ["Agency network", "Performance bonus", "Career growth"],
    referralBonus: "120,000 MMK"
  },
  {
    id: 17,
    title: "Receptionist",
    company: "Myanmar Information Technology",
    location: "Insein",
    type: "Full-time",
    salary: "3 - 4 Lakhs",
    posted: "3 days ago",
    urgent: false,
    category: "Admin",
    description: "Front desk management and visitor coordination",
    requirements: ["Pleasant personality", "Good communication", "Basic computer skills"],
    benefits: ["IT company exposure", "Professional development", "Modern office"],
    referralBonus: "75,000 MMK"
  },
  {
    id: 18,
    title: "Assistant Accountant",
    company: "KBZ Life Insurance",
    location: "Bahan",
    type: "Full-time",
    salary: "4 - 5 Lakhs",
    posted: "4 days ago",
    urgent: false,
    category: "Accounting",
    description: "Support accounting operations for insurance company",
    requirements: ["Accounting degree", "1-2 years experience", "Excel proficiency"],
    benefits: ["Insurance industry experience", "KBZ benefits", "Training programs"],
    referralBonus: "100,000 MMK"
  },
  {
    id: 19,
    title: "Online Sale",
    company: "Salpyar",
    location: "North Dagon",
    type: "Full-time",
    salary: "2.4 Lakhs + Commission",
    posted: "5 days ago",
    urgent: false,
    category: "Sales",
    description: "Manage online sales channels and customer inquiries",
    requirements: ["Social media savvy", "Sales mindset", "Customer service"],
    benefits: ["Commission on sales", "Flexible work", "Learn e-commerce"],
    referralBonus: "80,000 MMK"
  },
  {
    id: 20,
    title: "Agency Sales",
    company: "AMI",
    location: "Kamaryut",
    type: "Full-time",
    salary: "5 - 6.5 Lakhs",
    posted: "6 days ago",
    urgent: false,
    category: "Sales",
    description: "Manage agency partnerships and sales channels",
    requirements: ["Agency sales experience", "Relationship building", "Negotiation skills"],
    benefits: ["Agency network access", "Performance bonuses", "Career growth"],
    referralBonus: "120,000 MMK"
  },
  {
    id: 21,
    title: "Admin Supervisor",
    company: "TOMO",
    location: "South Dagon",
    type: "Full-time",
    salary: "5 - 6 Lakhs",
    posted: "1 week ago",
    urgent: false,
    category: "Admin",
    description: "Supervise administrative team and office operations",
    requirements: ["Admin supervision experience", "Organizational skills", "Team leadership"],
    benefits: ["Startup environment", "Learning opportunities", "Modern workplace"],
    referralBonus: "110,000 MMK"
  },
  {
    id: 22,
    title: "IT Supervisor",
    company: "Wave Plus",
    location: "Mingalardon",
    type: "Full-time",
    salary: "6 Lakhs",
    posted: "4 days ago",
    urgent: false,
    category: "IT",
    description: "Manage IT infrastructure and support team",
    requirements: ["IT degree", "Network management", "Team leadership"],
    benefits: ["Tech environment", "Certification support", "Growth to IT Manager"],
    referralBonus: "140,000 MMK"
  },
  {
    id: 23,
    title: "Sales Staff",
    company: "Yangoods",
    location: "Pyin Oo Lwin",
    type: "Full-time",
    salary: "2.04 Lakhs + Commission",
    posted: "2 weeks ago",
    urgent: false,
    category: "Sales",
    description: "Retail sales and customer service",
    requirements: ["Sales interest", "Customer friendly", "Local resident preferred"],
    benefits: ["Pyin Oo Lwin location", "Sales commissions", "Product discounts"],
    referralBonus: "70,000 MMK"
  },
  {
    id: 24,
    title: "Junior Page Admin",
    company: "TOMO",
    location: "Tamwe",
    type: "Full-time",
    salary: "3 - 3.5 Lakhs",
    posted: "1 week ago",
    urgent: false,
    category: "Marketing",
    description: "Assist in social media management and content creation",
    requirements: ["Social media knowledge", "Basic design skills", "Writing ability"],
    benefits: ["Entry-level friendly", "Skill development", "Startup culture"],
    referralBonus: "75,000 MMK"
  },
  {
    id: 25,
    title: "Accountant",
    company: "GK International Company",
    location: "Kamaryut",
    type: "Full-time",
    salary: "6.5 - 8 Lakhs",
    posted: "5 days ago",
    urgent: false,
    category: "Accounting",
    description: "Full accounting responsibilities for international company",
    requirements: ["5+ years accounting", "International experience", "English proficiency"],
    benefits: ["International exposure", "Competitive salary", "Professional growth"],
    referralBonus: "200,000 MMK"
  }
]

// Import additional sections for routes
import CommunityFeed from './sections/CommunityFeed'
import EventManager from './sections/EventManager'
import GamificationDashboard from './sections/GamificationDashboard'
import InsightsDashboard from './sections/InsightsDashboard'
import AnalyticsAdminDashboard from './sections/AnalyticsAdminDashboard'
import RevenueDashboard from './sections/RevenueDashboard'
import PayoutDashboard from './sections/PayoutDashboard'
import TalentPoolDashboard from './sections/TalentPoolDashboard'
import EnterprisePortal from './sections/EnterprisePortal'
import PartnerPortal from './sections/PartnerPortal'
import DataMarketplace from './sections/DataMarketplace'
import APIDocumentation from './sections/APIDocumentation'
import APIKeyManager from './sections/APIKeyManager'
import DesignSystem from './pages/DesignSystem'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<><Navigation /><JobsSection jobs={jobsData} /><MobileNav /></>} />
          <Route path="/job/:id" element={<><Navigation /><JobDetail jobs={jobsData} /><MobileNav /></>} />
          <Route path="/referrals" element={<><Navigation /><ReferralDashboard /><MobileNav /></>} />
          <Route path="/post-job" element={<><Navigation /><PostJob /><MobileNav /></>} />
          <Route path="/login" element={<><Navigation /><Login /><MobileNav /></>} />
          <Route path="/register" element={<><Navigation /><Register /><MobileNav /></>} />
          <Route path="/dashboard" element={<><Navigation /><Dashboard /><MobileNav /></>} />
          <Route path="/corporate" element={<CorporateDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/leads" element={<><Navigation /><LeadScoreDashboard /><MobileNav /></>} />
          <Route path="/admin/email" element={<><Navigation /><EmailCampaignManager /><MobileNav /></>} />
          <Route path="/admin/analytics" element={<><Navigation /><AnalyticsAdminDashboard /><MobileNav /></>} />
          <Route path="/admin/revenue" element={<><Navigation /><RevenueDashboard /><MobileNav /></>} />
          <Route path="/admin/payouts" element={<><Navigation /><PayoutDashboard /><MobileNav /></>} />
          <Route path="/resume-optimizer" element={<><Navigation /><ResumeOptimizer /><MobileNav /></>} />
          <Route path="/billing" element={<><Navigation /><BillingDashboard /><MobileNav /></>} />
          <Route path="/plans" element={<><Navigation /><SubscriptionPlans /><MobileNav /></>} />
          <Route path="/referral-tracking" element={<><Navigation /><ReferralTracking /><MobileNav /></>} />
          <Route path="/for-recruiters" element={<><Navigation /><ForRecruiters /><MobileNav /></>} />
          <Route path="/edit-job/:id" element={<><Navigation /><EditJob /><MobileNav /></>} />
          <Route path="/community" element={<><Navigation /><CommunityFeed /><MobileNav /></>} />
          <Route path="/events" element={<><Navigation /><EventManager /><MobileNav /></>} />
          <Route path="/gamification" element={<><Navigation /><GamificationDashboard /><MobileNav /></>} />
          <Route path="/insights" element={<><Navigation /><InsightsDashboard /><MobileNav /></>} />
          <Route path="/talent-pool" element={<><Navigation /><TalentPoolDashboard /><MobileNav /></>} />
          <Route path="/enterprise" element={<EnterprisePortal />} />
          <Route path="/partner" element={<PartnerPortal />} />
          <Route path="/data-marketplace" element={<><Navigation /><DataMarketplace /><MobileNav /></>} />
          <Route path="/api-docs" element={<><Navigation /><APIDocumentation /><MobileNav /></>} />
          <Route path="/api-keys" element={<><Navigation /><APIKeyManager /><MobileNav /></>} />
          <Route path="/design-system" element={<DesignSystem />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
