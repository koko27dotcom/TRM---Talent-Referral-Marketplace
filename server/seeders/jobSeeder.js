/**
 * Job Seeder
 * Seeds sample job postings for Myanmar market
 */

const mongoose = require('mongoose');
const Job = require('../models/Job.js');
const Company = require('../models/Company.js');
const { connectDatabase } = require('../config/database.js');

// Real companies from actual clients
const realCompanies = [
  {
    name: 'RK Yangon Steel',
    email: 'careers@rkyangonsteel.com',
    phone: '+95 9 123 456 789',
    website: 'https://rkyangonsteel.com',
    description: 'Leading steel manufacturing company in Myanmar, specializing in construction steel products.',
    industry: 'Manufacturing',
    size: '201-500 employees',
    location: {
      address: 'Thanlyin Industrial Zone',
      city: 'Thanlyin',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Universal Energy',
    email: 'hr@universalenergy.mm',
    phone: '+95 9 234 567 890',
    website: 'https://universalenergy.mm',
    description: 'Energy solutions provider offering petroleum products and energy services across Myanmar.',
    industry: 'Energy',
    size: '51-200 employees',
    location: {
      address: 'Thingangyun Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Delight Amatat',
    email: 'jobs@delightamatat.com',
    phone: '+95 9 345 678 901',
    website: 'https://delightamatat.com',
    description: 'Interior design and architecture firm creating beautiful spaces for residential and commercial clients.',
    industry: 'Design & Architecture',
    size: '11-50 employees',
    location: {
      address: 'Thingangyun Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'TOMO',
    email: 'careers@tomo.my',
    phone: '+95 9 456 789 012',
    website: 'https://tomo.my',
    description: 'Fast-growing startup specializing in social media management and digital marketing solutions.',
    industry: 'Technology',
    size: '11-50 employees',
    location: {
      address: 'Tamwe Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Unicharm Myanmar',
    email: 'careers@unicharm.mm',
    phone: '+95 9 567 890 123',
    website: 'https://unicharm.com/mm',
    description: 'Leading Japanese FMCG company manufacturing personal care and hygiene products.',
    industry: 'FMCG',
    size: '501-1000 employees',
    location: {
      address: 'Yankin Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'WOW Sport',
    email: 'jobs@wowsport.mm',
    phone: '+95 9 678 901 234',
    website: 'https://wowsport.mm',
    description: 'Sports brand and retailer offering athletic wear, equipment, and fitness services.',
    industry: 'Sports & Retail',
    size: '51-200 employees',
    location: {
      address: 'Kamaryut Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Shwe Taung Htun',
    email: 'careers@shwetaunghtun.com',
    phone: '+95 9 789 012 345',
    website: 'https://shwetaunghtun.com',
    description: 'Media and marketing company specializing in content creation and brand storytelling.',
    industry: 'Media & Marketing',
    size: '11-50 employees',
    location: {
      address: 'Mingalar Taung Nyunt Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Sun Myat Tun',
    email: 'hr@sunmyattun.com',
    phone: '+95 9 890 123 456',
    website: 'https://sunmyattun.com',
    description: 'Construction company building residential and commercial projects across Myanmar.',
    industry: 'Construction',
    size: '51-200 employees',
    location: {
      address: 'Botahtaung Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'NielsenIQ Myanmar',
    email: 'careers.myanmar@nielseniq.com',
    phone: '+95 9 901 234 567',
    website: 'https://nielseniq.com',
    description: 'Global market research firm providing consumer insights and data analytics.',
    industry: 'Market Research',
    size: '51-200 employees',
    location: {
      address: 'Multiple Locations',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Real Aid Microfinance',
    email: 'jobs@realaidmm.com',
    phone: '+95 9 012 345 678',
    website: 'https://realaidmm.com',
    description: 'Microfinance institution providing financial services to rural communities.',
    industry: 'Financial Services',
    size: '51-200 employees',
    location: {
      address: 'Ayeyarwady Region',
      city: 'Pathein',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'AMI',
    email: 'careers@ami-mm.com',
    phone: '+95 9 123 456 789',
    website: 'https://ami-mm.com',
    description: 'Insurance company offering life and general insurance products through agency network.',
    industry: 'Insurance',
    size: '201-500 employees',
    location: {
      address: 'Kamaryut Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Myanmar Information Technology',
    email: 'hr@mit.com.mm',
    phone: '+95 9 234 567 890',
    website: 'https://mit.com.mm',
    description: 'Leading IT solutions provider offering software development and IT services.',
    industry: 'Technology',
    size: '201-500 employees',
    location: {
      address: 'Insein Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'KBZ Life Insurance',
    email: 'careers@kbzlife.com.mm',
    phone: '+95 9 345 678 901',
    website: 'https://kbzlife.com.mm',
    description: 'One of Myanmar\'s largest life insurance companies, part of KBZ Group.',
    industry: 'Insurance',
    size: '1000+ employees',
    location: {
      address: 'Bahan Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Salpyar',
    email: 'jobs@salpyar.com',
    phone: '+95 9 456 789 012',
    website: 'https://salpyar.com',
    description: 'E-commerce platform specializing in online retail and digital sales.',
    industry: 'E-commerce',
    size: '11-50 employees',
    location: {
      address: 'North Dagon Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Wave Plus',
    email: 'careers@waveplus.mm',
    phone: '+95 9 567 890 123',
    website: 'https://waveplus.mm',
    description: 'Technology company providing IT infrastructure and support services.',
    industry: 'Technology',
    size: '51-200 employees',
    location: {
      address: 'Mingalardon Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'Yangoods',
    email: 'jobs@yangoods.com',
    phone: '+95 9 678 901 234',
    website: 'https://yangoods.com',
    description: 'Retail company offering quality goods and products in Pyin Oo Lwin.',
    industry: 'Retail',
    size: '11-50 employees',
    location: {
      address: 'Pyin Oo Lwin',
      city: 'Mandalay',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
  {
    name: 'GK International Company',
    email: 'hr@gk-international.com',
    phone: '+95 9 789 012 345',
    website: 'https://gk-international.com',
    description: 'International trading and services company with global operations.',
    industry: 'Trading',
    size: '51-200 employees',
    location: {
      address: 'Kamaryut Township',
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  },
];

// Real jobs from actual clients
const realJobs = [
  {
    title: 'Senior Supervisor',
    description: 'Lead and supervise daily operations at steel manufacturing facility. Oversee production teams, ensure quality standards, and manage workflow efficiency.',
    requirements: ['5+ years experience in manufacturing', 'Leadership skills', 'Steel industry knowledge', 'Team management', 'Quality control'],
    responsibilities: ['Supervise daily operations', 'Manage production teams', 'Ensure quality standards', 'Optimize workflow', 'Report to management'],
    benefits: ['Health insurance', 'Performance bonus', 'Transportation allowance', 'Meals provided', 'Annual leave'],
    location: {
      type: 'onsite',
      city: 'Thanlyin',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 750000,
      max: 1000000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Operations',
    referralBonus: 150000,
    status: 'active',
    isFeatured: true,
    isUrgent: true,
  },
  {
    title: 'Warehouse Supervisor',
    description: 'Manage warehouse operations and inventory control. Coordinate with logistics team and ensure efficient stock management.',
    requirements: ['3+ years warehouse experience', 'Inventory management', 'Team leadership', 'Logistics knowledge', 'Computer skills'],
    responsibilities: ['Manage warehouse operations', 'Control inventory', 'Coordinate logistics', 'Supervise staff', 'Maintain records'],
    benefits: ['Competitive salary', 'Career growth', 'Training provided', 'Health insurance', 'Performance bonus'],
    location: {
      type: 'onsite',
      city: 'Thingangyun',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 500000,
      max: 800000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Operations',
    referralBonus: 120000,
    status: 'active',
    isFeatured: true,
    isUrgent: true,
  },
  {
    title: 'Interior Designer',
    description: 'Create interior designs for residential and commercial projects. Work with clients to bring their vision to life.',
    requirements: ['Degree in Interior Design', 'Proficiency in AutoCAD', 'Creative vision', '3+ years experience', 'Portfolio required'],
    responsibilities: ['Design interior spaces', 'Create 3D renderings', 'Select materials', 'Client consultations', 'Project coordination'],
    benefits: ['High commission', 'Flexible hours', 'Creative freedom', 'Professional development', 'Project bonuses'],
    location: {
      type: 'onsite',
      city: 'Thingangyun',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 1000000,
      max: 1500000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Design',
    referralBonus: 200000,
    status: 'active',
    isFeatured: true,
    isUrgent: true,
  },
  {
    title: 'Senior Page Admin',
    description: 'Lead social media strategy and content creation for multiple brand pages. Manage team of content creators.',
    requirements: ['3+ years social media management', 'Content strategy', 'Analytics knowledge', 'Team leadership', 'Creative thinking'],
    responsibilities: ['Develop social strategy', 'Create content calendar', 'Manage page admins', 'Analyze performance', 'Engage with audience'],
    benefits: ['Startup equity', 'Flexible remote work', 'Creative environment', 'Learning opportunities', 'Modern tools'],
    location: {
      type: 'onsite',
      city: 'Tamwe',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 600000,
      max: 900000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Marketing',
    referralBonus: 100000,
    status: 'active',
    isFeatured: true,
    isUrgent: true,
  },
  {
    title: 'Assistant Brand Manager',
    description: 'Drive brand growth for leading Japanese FMCG company. Support brand strategy and marketing initiatives.',
    requirements: ['5+ years brand management', 'FMCG experience', 'Strategic thinking', 'English proficiency', 'Leadership skills'],
    responsibilities: ['Develop brand strategy', 'Execute marketing plans', 'Manage brand budget', 'Coordinate with agencies', 'Analyze market trends'],
    benefits: ['MNC experience', 'Health insurance', 'Annual training', 'Career advancement', 'International exposure'],
    location: {
      type: 'onsite',
      city: 'Yankin',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 1500000,
      max: 1700000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Marketing',
    referralBonus: 300000,
    status: 'active',
    isFeatured: true,
    isUrgent: false,
  },
  {
    title: 'Brand Executive',
    description: 'Execute marketing campaigns and brand activations for FMCG products. Support brand manager in daily operations.',
    requirements: ['2+ years marketing', 'Good communication', 'Creative thinking', 'Project management', 'Team player'],
    responsibilities: ['Execute campaigns', 'Coordinate activations', 'Manage vendors', 'Track budgets', 'Report performance'],
    benefits: ['MNC environment', 'Product discounts', 'Career development', 'Training programs', 'Health benefits'],
    location: {
      type: 'onsite',
      city: 'Yankin',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 700000,
      max: 900000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Marketing',
    referralBonus: 140000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Accountant',
    description: 'Manage full spectrum of accounting functions for energy company. Handle financial reporting and compliance.',
    requirements: ['3+ years accounting', 'CPA preferred', 'Attention to detail', 'Excel proficiency', 'Tax knowledge'],
    responsibilities: ['Manage accounts', 'Prepare reports', 'Handle tax compliance', 'Reconcile statements', 'Support audits'],
    benefits: ['Stable company', 'Annual review', 'Professional development', 'Health insurance', 'Performance bonus'],
    location: {
      type: 'onsite',
      city: 'Thingangyun',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 600000,
      max: 700000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Accounting',
    referralBonus: 130000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Junior Accountant',
    description: 'Support senior accounting team in daily operations. Learn and grow in MNC environment.',
    requirements: ['Fresh grad welcome', 'Accounting degree', 'Excel skills', 'Eager to learn', 'Detail-oriented'],
    responsibilities: ['Process transactions', 'Maintain records', 'Assist in reporting', 'Support senior staff', 'Learn systems'],
    benefits: ['MNC training', 'Career foundation', 'Health insurance', 'Mentorship', 'Growth opportunities'],
    location: {
      type: 'onsite',
      city: 'Yankin',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 350000,
      max: 400000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Accounting',
    referralBonus: 80000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Graphic Designer',
    description: 'Create visual content for sports brand marketing. Design campaigns for digital and print media.',
    requirements: ['Strong portfolio', 'Adobe Creative Suite', 'Creative mindset', '2+ years experience', 'Sports interest'],
    responsibilities: ['Create visual content', 'Design marketing materials', 'Brand consistency', 'Social media graphics', 'Print designs'],
    benefits: ['Sport industry', 'Free gym membership', 'Creative freedom', 'Modern tools', 'Team events'],
    location: {
      type: 'onsite',
      city: 'Kamaryut',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 900000,
      max: 1100000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Design',
    referralBonus: 180000,
    status: 'active',
    isFeatured: true,
    isUrgent: false,
  },
  {
    title: 'Senior Sales Executive',
    description: 'Lead sales team and drive revenue growth for sports brand. Develop B2B partnerships.',
    requirements: ['5+ years sales', 'B2B experience', 'Leadership skills', 'Target-driven', 'Relationship building'],
    responsibilities: ['Lead sales team', 'Drive revenue', 'Develop partnerships', 'Set targets', 'Report to management'],
    benefits: ['High commission', 'Leadership role', 'Sport perks', 'Travel opportunities', 'Career growth'],
    location: {
      type: 'onsite',
      city: 'Kamaryut',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 1000000,
      max: 1200000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Sales',
    referralBonus: 200000,
    status: 'active',
    isFeatured: true,
    isUrgent: false,
  },
  {
    title: 'Content Writer',
    description: 'Create compelling content and scripts for marketing campaigns. Write for various digital platforms.',
    requirements: ['Excellent writing', 'Creative storytelling', 'Digital marketing trends', '2+ years experience', 'Bilingual preferred'],
    responsibilities: ['Write content', 'Create scripts', 'SEO optimization', 'Social media content', 'Brand storytelling'],
    benefits: ['Creative environment', 'Flexible hours', 'Skill development', 'Portfolio building', 'Modern workspace'],
    location: {
      type: 'onsite',
      city: 'Mingalar Taung Nyunt',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 400000,
      max: 600000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Marketing',
    referralBonus: 100000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Site Engineer',
    description: 'Supervise construction sites and ensure project quality. Coordinate with contractors and architects.',
    requirements: ['Civil Engineering degree', '2+ years site experience', 'AutoCAD', 'Project management', 'Site safety'],
    responsibilities: ['Supervise sites', 'Ensure quality', 'Coordinate teams', 'Manage schedules', 'Safety compliance'],
    benefits: ['Project bonuses', 'Site allowances', 'Career growth', 'Training provided', 'Health insurance'],
    location: {
      type: 'onsite',
      city: 'Botahtaung',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 750000,
      max: 800000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Engineering',
    referralBonus: 150000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Data Collector',
    description: 'Collect market research data across Myanmar. Travel to various locations for data gathering.',
    requirements: ['Willingness to travel', 'Good communication', 'Basic computer skills', 'Reliable', 'Own transport preferred'],
    responsibilities: ['Collect data', 'Conduct surveys', 'Travel to sites', 'Record information', 'Report findings'],
    benefits: ['Travel allowances', 'Flexible schedule', 'Training provided', 'Career growth', 'Field experience'],
    location: {
      type: 'onsite',
      city: 'Multiple Locations',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 350000,
      max: 450000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Research',
    referralBonus: 80000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Loan Officer',
    description: 'Evaluate loan applications and build client relationships in microfinance. Support rural development.',
    requirements: ['Finance background', 'Interpersonal skills', 'Local knowledge', 'Sales mindset', 'Bicycle/motorbike'],
    responsibilities: ['Evaluate applications', 'Build relationships', 'Assess credit risk', 'Collect payments', 'Grow portfolio'],
    benefits: ['Performance incentives', 'Rural development impact', 'Career progression', 'Training provided', 'Travel allowance'],
    location: {
      type: 'onsite',
      city: 'Ayeyarwady',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 400000,
      max: 500000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Finance',
    referralBonus: 100000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Cashier',
    description: 'Handle cash transactions and maintain records for microfinance branch. Provide excellent customer service.',
    requirements: ['Basic math skills', 'Honesty', 'Customer service', 'Computer basics', 'Reliable'],
    responsibilities: ['Process transactions', 'Maintain cash records', 'Customer service', 'Balance cash', 'Report discrepancies'],
    benefits: ['Stable employment', 'Growth opportunities', 'Friendly team', 'Training provided', 'Health benefits'],
    location: {
      type: 'onsite',
      city: 'Ayeyarwady',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 300000,
      max: 350000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Finance',
    referralBonus: 70000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Sales Representative',
    description: 'Develop and manage agency partnerships for insurance products. Build strong agent network.',
    requirements: ['Agency sales experience', 'Relationship building', 'Target-driven', 'Communication skills', 'Self-motivated'],
    responsibilities: ['Recruit agents', 'Train partners', 'Meet targets', 'Build network', 'Report performance'],
    benefits: ['Agency network', 'Performance bonus', 'Career growth', 'Training provided', 'Travel allowance'],
    location: {
      type: 'onsite',
      city: 'Kamaryut',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 500000,
      max: 650000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Sales',
    referralBonus: 120000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Receptionist',
    description: 'Front desk management and visitor coordination for IT company. Be the face of the company.',
    requirements: ['Pleasant personality', 'Good communication', 'Basic computer skills', 'Professional appearance', 'Organized'],
    responsibilities: ['Welcome visitors', 'Manage calls', 'Coordinate meetings', 'Administrative tasks', 'Maintain reception area'],
    benefits: ['IT company exposure', 'Professional development', 'Modern office', 'Learning opportunities', 'Career growth'],
    location: {
      type: 'onsite',
      city: 'Insein',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 300000,
      max: 400000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Admin',
    referralBonus: 75000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Assistant Accountant',
    description: 'Support accounting operations for insurance company. Learn from experienced professionals.',
    requirements: ['Accounting degree', '1-2 years experience', 'Excel proficiency', 'Detail-oriented', 'Eager to learn'],
    responsibilities: ['Process transactions', 'Maintain records', 'Assist in reporting', 'Reconcile accounts', 'Support team'],
    benefits: ['Insurance industry experience', 'KBZ benefits', 'Training programs', 'Career growth', 'Stable company'],
    location: {
      type: 'onsite',
      city: 'Bahan',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 400000,
      max: 500000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Accounting',
    referralBonus: 100000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Online Sale',
    description: 'Manage online sales channels and customer inquiries for e-commerce platform. Drive online revenue.',
    requirements: ['Social media savvy', 'Sales mindset', 'Customer service', 'Basic computer skills', 'Quick learner'],
    responsibilities: ['Manage online channels', 'Handle inquiries', 'Process orders', 'Customer follow-up', 'Report sales'],
    benefits: ['Commission on sales', 'Flexible work', 'Learn e-commerce', 'Growth opportunities', 'Modern tools'],
    location: {
      type: 'onsite',
      city: 'North Dagon',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 240000,
      max: 300000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Sales',
    referralBonus: 80000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Agency Sales',
    description: 'Manage agency partnerships and sales channels for insurance products. Grow agent network.',
    requirements: ['Agency sales experience', 'Relationship building', 'Negotiation skills', 'Target-driven', 'Communication'],
    responsibilities: ['Manage agents', 'Meet targets', 'Build relationships', 'Train partners', 'Report performance'],
    benefits: ['Agency network access', 'Performance bonuses', 'Career growth', 'Training', 'Travel allowance'],
    location: {
      type: 'onsite',
      city: 'Kamaryut',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 500000,
      max: 650000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Sales',
    referralBonus: 120000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Admin Supervisor',
    description: 'Supervise administrative team and office operations for startup. Ensure smooth office functioning.',
    requirements: ['Admin supervision experience', 'Organizational skills', 'Team leadership', 'Multi-tasking', 'Problem-solving'],
    responsibilities: ['Supervise admin team', 'Manage office ops', 'Coordinate schedules', 'Handle vendors', 'Report to management'],
    benefits: ['Startup environment', 'Learning opportunities', 'Modern workplace', 'Growth potential', 'Flexible culture'],
    location: {
      type: 'onsite',
      city: 'South Dagon',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 500000,
      max: 600000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Admin',
    referralBonus: 110000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'IT Supervisor',
    description: 'Manage IT infrastructure and support team. Ensure system reliability and security.',
    requirements: ['IT degree', 'Network management', 'Team leadership', '3+ years experience', 'Problem-solving'],
    responsibilities: ['Manage IT team', 'Maintain infrastructure', 'Ensure security', 'Support users', 'Plan upgrades'],
    benefits: ['Tech environment', 'Certification support', 'Growth to IT Manager', 'Modern tools', 'Learning opportunities'],
    location: {
      type: 'onsite',
      city: 'Mingalardon',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 600000,
      max: 650000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'IT',
    referralBonus: 140000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Sales Staff',
    description: 'Retail sales and customer service in Pyin Oo Lwin. Represent the brand with excellence.',
    requirements: ['Sales interest', 'Customer friendly', 'Local resident preferred', 'Reliable', 'Presentable'],
    responsibilities: ['Assist customers', 'Process sales', 'Maintain store', 'Stock management', 'Customer service'],
    benefits: ['Pyin Oo Lwin location', 'Sales commissions', 'Product discounts', 'Friendly team', 'Growth opportunities'],
    location: {
      type: 'onsite',
      city: 'Pyin Oo Lwin',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 204000,
      max: 250000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Sales',
    referralBonus: 70000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Junior Page Admin',
    description: 'Assist in social media management and content creation. Entry-level opportunity at startup.',
    requirements: ['Social media knowledge', 'Basic design skills', 'Writing ability', 'Eager to learn', 'Creative'],
    responsibilities: ['Assist page admins', 'Create content', 'Schedule posts', 'Engage audience', 'Learn strategies'],
    benefits: ['Entry-level friendly', 'Skill development', 'Startup culture', 'Mentorship', 'Growth opportunities'],
    location: {
      type: 'onsite',
      city: 'Tamwe',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 300000,
      max: 350000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: false,
    },
    category: 'Marketing',
    referralBonus: 75000,
    status: 'active',
    isFeatured: false,
    isUrgent: false,
  },
  {
    title: 'Accountant',
    description: 'Full accounting responsibilities for international company. Handle multi-currency transactions.',
    requirements: ['5+ years accounting', 'International experience', 'English proficiency', 'CPA preferred', 'Detail-oriented'],
    responsibilities: ['Manage accounts', 'Financial reporting', 'Tax compliance', 'Audit support', 'International transactions'],
    benefits: ['International exposure', 'Competitive salary', 'Professional growth', 'Health insurance', 'Annual bonus'],
    location: {
      type: 'onsite',
      city: 'Kamaryut',
      country: 'Myanmar',
    },
    employmentType: 'full-time',
    salary: {
      min: 650000,
      max: 800000,
      currency: 'MMK',
      period: 'monthly',
      isNegotiable: true,
    },
    category: 'Accounting',
    referralBonus: 200000,
    status: 'active',
    isFeatured: true,
    isUrgent: false,
  },
];

// Map jobs to companies (by index)
const jobCompanyMapping = [
  0,  // Senior Supervisor -> RK Yangon Steel
  1,  // Warehouse Supervisor -> Universal Energy
  2,  // Interior Designer -> Delight Amatat
  3,  // Senior Page Admin -> TOMO
  4,  // Assistant Brand Manager -> Unicharm Myanmar
  4,  // Brand Executive -> Unicharm Myanmar
  1,  // Accountant -> Universal Energy
  4,  // Junior Accountant -> Unicharm Myanmar
  5,  // Graphic Designer -> WOW Sport
  5,  // Senior Sales Executive -> WOW Sport
  6,  // Content Writer -> Shwe Taung Htun
  7,  // Site Engineer -> Sun Myat Tun
  8,  // Data Collector -> NielsenIQ Myanmar
  9,  // Loan Officer -> Real Aid Microfinance
  9,  // Cashier -> Real Aid Microfinance
  10, // Sales Representative -> AMI
  11, // Receptionist -> Myanmar Information Technology
  12, // Assistant Accountant -> KBZ Life Insurance
  13, // Online Sale -> Salpyar
  10, // Agency Sales -> AMI
  3,  // Admin Supervisor -> TOMO
  14, // IT Supervisor -> Wave Plus
  15, // Sales Staff -> Yangoods
  3,  // Junior Page Admin -> TOMO
  16, // Accountant -> GK International Company
];

async function seedJobs() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing jobs and companies...');
    await Job.deleteMany({});
    await Company.deleteMany({});

    console.log('Creating companies...');
    const createdCompanies = [];
    for (const companyData of realCompanies) {
      const company = await Company.create({
        ...companyData,
        slug: companyData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      });
      createdCompanies.push(company);
      console.log(`Created company: ${company.name}`);
    }

    console.log('\nCreating jobs...');
    const createdJobs = [];
    
    // Find or create admin user for postedBy
    const User = require('../models/User.js');
    let adminUser = await User.findOne({ role: 'platform_admin' });
    
    if (!adminUser) {
      console.log('Creating admin user for job postings...');
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@trm.com',
        password: 'admin123', // Will be hashed by pre-save hook
        role: 'platform_admin',
        status: 'active',
      });
    }

    for (let i = 0; i < realJobs.length; i++) {
      const jobData = realJobs[i];
      const companyIndex = jobCompanyMapping[i];
      const company = createdCompanies[companyIndex];
      
      const job = await Job.create({
        ...jobData,
        companyId: company._id,
        postedBy: adminUser._id,
        type: jobData.employmentType || 'full-time',
        slug: `${jobData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`,
        publishedAt: new Date(),
      });
      
      createdJobs.push(job);
      console.log(`Created job: ${job.title} at ${company.name}`);
    }

    console.log(`\n✅ Successfully seeded ${createdCompanies.length} companies`);
    console.log(`✅ Successfully seeded ${createdJobs.length} jobs`);
    console.log('\n📊 Job Summary:');
    console.log(`  - Featured jobs: ${createdJobs.filter(j => j.isFeatured).length}`);
    console.log(`  - Urgent jobs: ${createdJobs.filter(j => j.isUrgent).length}`);
    console.log(`  - Active jobs: ${createdJobs.filter(j => j.status === 'active').length}`);
    console.log(`  - Total referral bonus pool: ${createdJobs.reduce((sum, j) => sum + j.referralBonus, 0).toLocaleString()} MMK`);
    
    console.log('\n📋 Jobs by Category:');
    const categoryCount = {};
    createdJobs.forEach(job => {
      categoryCount[job.category] = (categoryCount[job.category] || 0) + 1;
    });
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });

  } catch (error) {
    console.error('Error seeding jobs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedJobs();
}

module.exports = seedJobs;
