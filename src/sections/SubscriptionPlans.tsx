import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle,
  Star,
  Loader2,
  ArrowRight,
  Building2,
  Users,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Types
interface SubscriptionPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  jobPostings: number;
  featuredJobs: number;
  resumeViews: number;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  isPopular?: boolean;
}

interface CurrentSubscription {
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodEnd: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function SubscriptionPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subscriptionRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
      ]);

      if (plansRes.data.success) {
        setPlans(plansRes.data.data);
      }
      if (subscriptionRes.data.success) {
        setCurrentSubscription(subscriptionRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setProcessing(true);
      const response = await api.post('/billing/subscribe', { planId, billingCycle });
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Subscription updated successfully',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Error',
        description: 'Failed to process subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'starter':
        return <Zap className="w-6 h-6" />;
      case 'professional':
        return <Building2 className="w-6 h-6" />;
      case 'enterprise':
        return <Shield className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
              <p className="mt-2 text-gray-600">
                Choose the perfect plan for your hiring needs
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save 20%
                </Badge>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div key={plan._id} variants={itemVariants}>
              <Card
                className={`relative h-full ${
                  plan.isPopular
                    ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20'
                    : ''
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {currentSubscription?.planId === plan._id && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-600 text-white px-4 py-1">
                      Current Plan
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.currency} {plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-500">/{billingCycle}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        {plan.jobPostings} job postings
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        {plan.featuredJobs} featured job slots
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        {plan.resumeViews.toLocaleString()} resume views
                      </span>
                    </li>
                    {plan.analyticsAccess && (
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Advanced analytics</span>
                      </li>
                    )}
                    {plan.prioritySupport && (
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Priority support</span>
                      </li>
                    )}
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={currentSubscription?.planId === plan._id ? 'outline' : 'default'}
                    disabled={processing || currentSubscription?.planId === plan._id}
                    onClick={() => handleSubscribe(plan._id)}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : currentSubscription?.planId === plan._id ? (
                      'Current Plan'
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Why Upgrade?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Reach More Candidates
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get your jobs in front of thousands of qualified candidates
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Faster Hiring
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Featured jobs get 5x more applications on average
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Premium Support
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get dedicated support to help you hire the best talent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default SubscriptionPlans;
