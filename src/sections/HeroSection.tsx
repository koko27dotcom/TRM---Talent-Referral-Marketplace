import { motion } from 'framer-motion'
import { 
  Briefcase, Users, TrendingUp, Sparkles, ArrowRight, 
  Wallet, Building2, UserCheck, Globe, Award, Zap,
  Shield, Clock, Target
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeroSectionProps {
  totalJobs: number
  categories: string[]
  selectedCategory: string
  setSelectedCategory: (category: string) => void
}

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return <span>{count.toLocaleString()}{suffix}</span>
}

export default function HeroSection({ 
  totalJobs, 
  categories, 
  selectedCategory, 
  setSelectedCategory 
}: HeroSectionProps) {
  const [activeTab, setActiveTab] = useState<'referrer' | 'jobseeker' | 'recruiter'>('referrer')

  const benefits = {
    referrer: [
      { icon: Wallet, title: 'Earn Up to 300K MMK', desc: 'Get rewarded for every successful hire you refer' },
      { icon: Zap, title: 'Instant Payouts', desc: 'Fast and secure payment directly to your account' },
      { icon: Award, title: 'Exclusive Perks', desc: 'Access premium rewards and recognition programs' },
      { icon: Globe, title: 'Unlimited Referrals', desc: 'No cap on how many people you can refer' },
    ],
    jobseeker: [
      { icon: Target, title: 'Trusted Connections', desc: 'Get referred by professionals in your network' },
      { icon: Clock, title: 'Fast-Track Hiring', desc: 'Referred candidates get priority consideration' },
      { icon: Shield, title: 'Verified Companies', desc: 'All employers are vetted and trustworthy' },
      { icon: Award, title: 'Career Support', desc: 'Get guidance throughout your job search' },
    ],
    recruiter: [
      { icon: Users, title: 'Quality Candidates', desc: 'Access pre-screened, referred talent pool' },
      { icon: TrendingUp, title: 'Higher Success Rate', desc: 'Referred hires perform 25% better' },
      { icon: Building2, title: 'Brand Exposure', desc: 'Showcase your company to top talent' },
      { icon: UserCheck, title: 'Reduced Time-to-Hire', desc: 'Fill positions 40% faster' },
    ],
  }

  const stats = [
    { icon: Briefcase, value: totalJobs, label: 'Active Jobs', suffix: '+' },
    { icon: Users, value: 15000, label: 'Job Seekers', suffix: '+' },
    { icon: Building2, value: 850, label: 'Companies', suffix: '+' },
    { icon: Wallet, value: 45, label: 'MMK Rewards', suffix: 'M+' },
  ]

  return (
    <div className="relative">
      {/* Main Hero Section */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 min-h-screen">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
            transition={{ duration: 20, repeat: Infinity }} 
            className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], rotate: [0, -45, 0] }} 
            transition={{ duration: 15, repeat: Infinity }} 
            className="absolute top-40 -left-20 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], y: [0, 50, 0] }} 
            transition={{ duration: 10, repeat: Infinity }} 
            className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" 
          />
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Top Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 text-white">
              <Sparkles size={18} className="text-yellow-400" />
              <span className="text-sm font-medium">Myanmar's #1 Referral-Based Job Platform</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">Trusted by 850+ Companies</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Connect. Refer.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                Earn & Hire.
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              The world's most trusted referral platform connecting top talent with leading companies. 
              Earn rewards for referrals, find your dream job, or hire the best candidates.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <button className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold flex items-center gap-2 hover:shadow-2xl hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1">
              Start Referring
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-all">
              Post a Job
            </button>
            <button className="px-8 py-4 bg-emerald-500/20 backdrop-blur-md text-emerald-300 rounded-full font-semibold border border-emerald-500/30 hover:bg-emerald-500/30 transition-all">
              Find Jobs
            </button>
          </motion.div>

          {/* Stats Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <stat.icon size={28} className="text-blue-400" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Benefits Tabs Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {[
                { id: 'referrer', label: 'For Referrers', icon: Wallet, color: 'from-amber-400 to-orange-500' },
                { id: 'jobseeker', label: 'For Job Seekers', icon: UserCheck, color: 'from-blue-400 to-cyan-500' },
                { id: 'recruiter', label: 'For Recruiters', icon: Building2, color: 'from-emerald-400 to-green-500' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'referrer' | 'jobseeker' | 'recruiter')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits[activeTab].map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-white/20 transition-all hover:shadow-xl hover:shadow-blue-500/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <benefit.icon size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">How It Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Three simple steps to start earning, hiring, or finding your dream job
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                step: '01', 
                title: 'Create Your Profile', 
                desc: 'Sign up as a referrer, job seeker, or recruiter and complete your profile in minutes.',
                icon: Users,
                color: 'from-blue-500 to-blue-600'
              },
              { 
                step: '02', 
                title: 'Connect & Share', 
                desc: 'Browse jobs, share referral links, or post positions. Our AI matches the best opportunities.',
                icon: Globe,
                color: 'from-purple-500 to-purple-600'
              },
              { 
                step: '03', 
                title: 'Earn & Grow', 
                desc: 'Get hired, earn referral bonuses, or find perfect candidates. Everyone wins together.',
                icon: Award,
                color: 'from-emerald-500 to-emerald-600'
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100 h-full hover:shadow-xl transition-shadow">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                    <item.icon size={28} />
                  </div>
                  <span className="text-5xl font-bold text-slate-100 absolute top-6 right-6">{item.step}</span>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight size={32} className="text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
              Trusted by Industry Leaders
            </span>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Success Stories</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Join thousands of satisfied users who have transformed their careers and hiring processes
            </p>
          </motion.div>

          {/* Company Logos */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-16 opacity-60"
          >
            {['Unicharm', 'RK Steel', 'TOMO', 'Delight', 'Universal'].map((company, idx) => (
              <div key={idx} className="text-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors">
                {company}
              </div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I've earned over 500K MMK in referral bonuses while helping my friends find great jobs. It's a win-win!",
                author: "Thura Aung",
                role: "Top Referrer",
                avatar: "TA",
                rating: 5
              },
              {
                quote: "Got hired within 2 weeks through a referral. The process was smooth and the company was exactly what I was looking for.",
                author: "Su Su",
                role: "Marketing Manager",
                avatar: "SS",
                rating: 5
              },
              {
                quote: "We reduced our hiring time by 50% and found quality candidates who stayed longer. Highly recommended!",
                author: "Min Thu",
                role: "HR Director",
                avatar: "MT",
                rating: 5
              },
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Sparkles key={i} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{testimonial.author}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              Got Questions?
            </span>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: "How much can I earn as a referrer?",
                a: "Referral bonuses range from 50,000 MMK to 300,000 MMK depending on the job position and company. There's no limit to how much you can earn!"
              },
              {
                q: "Is it free for job seekers?",
                a: "Yes! Our platform is completely free for job seekers. You can browse jobs, apply, and get referred without any charges."
              },
              {
                q: "How do companies benefit from referrals?",
                a: "Referred candidates have 25% higher retention rates and perform better. Companies also save on recruitment costs and time-to-hire is reduced by 40%."
              },
              {
                q: "When do I get paid for referrals?",
                a: "Referral bonuses are paid within 7 days after the referred candidate completes their probation period (typically 3 months)."
              },
              {
                q: "Can I refer someone for multiple jobs?",
                a: "Absolutely! You can refer the same person for different positions. Each successful hire earns you a separate bonus."
              },
            ].map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <h3 className="font-bold text-slate-800 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Career or Hiring?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join 15,000+ professionals who are already earning, hiring, and growing with TRM Referral
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-8 py-4 bg-white text-blue-600 rounded-full font-bold hover:shadow-2xl hover:scale-105 transition-all">
                Get Started Free
              </button>
              <button className="px-8 py-4 bg-white/10 text-white rounded-full font-bold border border-white/30 hover:bg-white/20 transition-all">
                Contact Sales
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Pills - Original functionality preserved */}
      <section className="py-8 px-4 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-500 mb-4 text-sm">Browse jobs by category</p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }} 
            className="flex flex-wrap justify-center gap-3"
          >
            {categories.map((category) => (
              <button 
                key={category} 
                onClick={() => setSelectedCategory(category)} 
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
