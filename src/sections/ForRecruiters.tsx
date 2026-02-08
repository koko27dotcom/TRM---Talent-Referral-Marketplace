import { Link } from 'react-router-dom'
import Navigation from './Navigation'
import MobileNav from '../components/MobileNav'

export default function ForRecruiters() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            For Recruiters
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find top talent through our referral network and job board
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-xl font-semibold mb-3">Post Jobs</h3>
            <p className="text-gray-600 mb-4">
              Reach thousands of qualified candidates through our platform
            </p>
            <Link
              to="/post-job"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Post a job &rarr;
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-3">Referral Network</h3>
            <p className="text-gray-600 mb-4">
              Tap into our network of referrers who can recommend candidates
            </p>
            <Link
              to="/referrals"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Explore network &rarr;
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-3">Analytics</h3>
            <p className="text-gray-600 mb-4">
              Track your hiring metrics and performance
            </p>
            <Link
              to="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View analytics &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-blue-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to find your next hire?
          </h2>
          <p className="mb-6 text-blue-100">
            Join thousands of companies hiring through our platform
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
