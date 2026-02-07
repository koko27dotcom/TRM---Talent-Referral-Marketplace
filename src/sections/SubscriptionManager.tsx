import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Check,
  X,
  Sparkles,
  ArrowRight,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  Headphones,
  Globe,
  Building2,
  Briefcase,
  Database,
  Star,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Types
interface Tier {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  yearlyPrice?: number;
  currency: string;
  features: {
    jobPostingLimit?: number;
    userLimit?: number;
    storageLimit?: number;
    apiAccess?: boolean;
    prioritySupport?: boolean;
    customBranding?: boolean;
    whiteLabel?: boolean;
    advancedAnalytics?: boolean;
    dedicatedManager?: boolean;
    bulkImport?: boolean;
    customIntegrations?: boolean;
    featuredJobs?: boolean;
    resumeDatabase?: boolean;
    talentPool?: boolean;
  };
  isActive: boolean;
  recommended?: boolean;
}

interface Subscription {
  _id: string;
  planId: Tier;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  cancelAtPeriodEnd: boolean;
}

interface FeatureComparison {
  name: string;
  key: string;
  tiers: Record<string, string | boolean | number>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Feature comparison data for companies
const companyFeatures: FeatureComparison[] = [
  { name: 'Active Job Slots', key: 'jobPostingLimit', tiers: { basic: 3, growth: 10, enterprise: 'Unlimited' } },
  { name: 'Featured Job Placements', key: 'featuredJobs', tiers: { basic: false, growth: true, enterprise: true } },
  { name: 'Resume Database Access', key: 'resumeDatabase', tiers: { basic: false, growth: true, enterprise: true } },
  { name: 'Talent Pool Access', key: 'talentPool', tiers: { basic: false, growth: false, enterprise: true } },
  { name: 'Priority Support', key: 'prioritySupport', tiers: { basic: false, growth: true, enterprise: true } },
  { name: 'Advanced Analytics', key: 'advancedAnalytics', tiers: { basic: false, growth: true, enterprise: true } },
  { name: 'API Access', key: 'apiAccess', tiers: { basic: false, growth: false, enterprise: true } },
  { name: 'Custom Branding', key: 'customBranding', tiers: { basic: false, growth: false, enterprise: true } },
  { name: 'White Label Option', key: 'whiteLabel', tiers: { basic: false, growth: false, enterprise: true } },
  { name: 'Dedicated Manager', key: 'dedicatedManager', tiers: { basic: false, growth: false, enterprise: true } },
  { name: 'Custom Integrations', key: 'customIntegrations', tiers: { basic: false, growth: false, enterprise: true } },
];

// Feature comparison data for referrers
const referrerFeatures: FeatureComparison[] = [
  { name: 'Commission Rate', key: 'commissionRate', tiers: { free: '50%', pro: '70%', elite: '85%' } },
  { name: 'Priority Job Matching', key: 'priorityMatching', tiers: { free: false, pro: true, elite: true } },
  { name: 'Advanced Analytics', key: 'advancedAnalytics', tiers: { free: false, pro: true, elite: true } },
  { name: 'Early Access to Jobs', key: 'earlyAccess', tiers: { free: false, pro: true, elite: true } },
  { name: 'Instant Payouts', key: 'instantPayout', tiers: { free: false, pro: false, elite: true } },
  { name: 'Dedicated Support', key: 'dedicatedSupport', tiers: { free: false, pro: false, elite: true } },
  { name: 'API Access', key: 'apiAccess', tiers: { free: false, pro: false, elite: true } },
  { name: 'Custom Referral Links', key: 'customLinks', tiers: { free: false, pro: false, elite: true } },
  { name: 'White Label Options', key: 'whiteLabel', tiers: { free: false, pro: false, elite: true } },
  { name: 'Exclusive Job Access', key: 'exclusiveJobs', tiers: { free: false, pro: false, elite: true } },
];

const ANNUAL_DISCOUNT = 20;

export function SubscriptionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const isCompany = user?.role === 'company' || user?.role === 'employer';
  const features = isCompany ? companyFeatures : referrerFeatures;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiersRes, subRes] = await Promise.all([
        api.get(`/subscriptions/tiers?type=${isCompany ? 'company' : 'user'}`),
        api.get('/subscriptions/my-subscription'),
      ]);

      if (tiersRes.data.success) {
        setTiers(tiersRes.data.data);
      }

      if (subRes.data.success) {
        setCurrentSubscription(subRes.data.data);
        if (subRes.data.data) {
          setIsYearly(subRes.data.data.billingCycle === 'yearly');
        }
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: Tier) => {
    if (currentSubscription) {
      setSelectedTier(tier);
      setShowUpgradeModal(true);
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post('/subscriptions/subscribe', {
        tierId: tier._id,
        billingCycle: isYearly ? 'yearly' : 'monthly',
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Subscription created successfully!',
        });
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier || !currentSubscription) return;

    try {
      setProcessing(true);
      const response = await api.put('/subscriptions/upgrade', {
        newTierId: selectedTier._id,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Subscription upgraded successfully!',
        });
        setShowUpgradeModal(false);
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to upgrade subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;

    try {
      setProcessing(true);
      const response = await api.put('/subscriptions/cancel', {
        atPeriodEnd: true,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Subscription will be cancelled at the end of the billing period',
        });
        setShowCancelModal(false);
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleChangeBillingCycle = async () => {
    if (!currentSubscription) return;

    try {
      setProcessing(true);
      const response = await api.post('/subscriptions/change-cycle', {
        billingCycle: isYearly ? 'yearly' : 'monthly',
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Billing cycle updated successfully!',
        });
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update billing cycle',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const calculateYearlyPrice = (monthlyPrice: number) => {
    const yearlyTotal = monthlyPrice * 12;
    const discount = yearlyTotal * (ANNUAL_DISCOUNT / 100);
    return Math.round(yearlyTotal - discount);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {isCompany ? 'Company Plans' : 'Referrer Plans'}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {isCompany
            ? 'Choose the perfect plan for your hiring needs. Upgrade anytime as you grow.'
            : 'Unlock higher earnings and exclusive features with our premium plans.'}
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <span className={`text-sm ${!isYearly ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            disabled={!!currentSubscription && processing}
          />
          <span className={`text-sm ${isYearly ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Save {ANNUAL_DISCOUNT}%
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Current Subscription Alert */}
      {currentSubscription && (
        <motion.div variants={itemVariants}>
          <Alert className="bg-primary/5 border-primary/20">
            <Crown className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium">Current Plan: {currentSubscription.planId.name}</span>
                <span className="text-gray-600 ml-2">
                  ({currentSubscription.billingCycle} billing)
                </span>
                {currentSubscription.cancelAtPeriodEnd && (
                  <span className="text-amber-600 ml-2">
                    - Cancels on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                disabled={currentSubscription.cancelAtPeriodEnd}
              >
                {currentSubscription.cancelAtPeriodEnd ? 'Cancelling' : 'Cancel'}
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Pricing Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {tiers.map((tier, index) => {
          const isCurrentPlan = currentSubscription?.planId._id === tier._id;
          const price = isYearly
            ? calculateYearlyPrice(tier.price)
            : tier.price;
          const monthlyEquivalent = isYearly
            ? Math.round(price / 12)
            : null;

          return (
            <Card
              key={tier._id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isCurrentPlan
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-lg'
              } ${tier.recommended ? 'md:scale-105 md:-my-4' : ''}`}
            >
              {tier.recommended && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                  Current
                </div>
              )}

              <CardHeader className={`space-y-2 ${tier.recommended ? 'pt-10' : ''}`}>
                <div className="flex items-center gap-2">
                  {tier.slug === 'basic' || tier.slug === 'free' ? (
                    <Briefcase className="w-5 h-5 text-gray-500" />
                  ) : tier.slug === 'growth' || tier.slug === 'pro' ? (
                    <TrendingUp className="w-5 h-5 text-primary" />
                  ) : (
                    <Crown className="w-5 h-5 text-amber-500" />
                  )}
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                </div>
                <p className="text-sm text-gray-600">{tier.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      MMK {formatPrice(price)}
                    </span>
                    <span className="text-gray-500">
                      /{isYearly ? 'year' : 'month'}
                    </span>
                  </div>
                  {monthlyEquivalent && (
                    <p className="text-sm text-gray-500">
                      MMK {formatPrice(monthlyEquivalent)}/month billed annually
                    </p>
                  )}
                  {isYearly && !monthlyEquivalent && (
                    <p className="text-sm text-green-600">
                      Save MMK {formatPrice(tier.price * 12 * (ANNUAL_DISCOUNT / 100))}/year
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : tier.recommended ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(tier)}
                  disabled={isCurrentPlan || processing}
                >
                  {isCurrentPlan ? (
                    'Current Plan'
                  ) : currentSubscription ? (
                    'Upgrade'
                  ) : (
                    'Get Started'
                  )}
                </Button>

                {/* Features */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Features included:</p>
                  <ul className="space-y-2">
                    {Object.entries(tier.features || {}).map(([key, value]) => {
                      const featureName = features.find(f => f.key === key)?.name || key;
                      return (
                        <li key={key} className="flex items-start gap-2 text-sm">
                          {value ? (
                            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                          )}
                          <span className={value ? 'text-gray-700' : 'text-gray-400'}>
                            {typeof value === 'number' && value > 0
                              ? `${value} ${featureName}`
                              : typeof value === 'number' && value === -1
                              ? `Unlimited ${featureName}`
                              : featureName}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Feature Comparison Table */}
      <motion.div variants={itemVariants} className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-medium text-gray-900">Feature</th>
                {tiers.map(tier => (
                  <th key={tier._id} className="text-center py-4 px-4 font-medium text-gray-900">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={feature.key} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="py-4 px-4 text-gray-700">{feature.name}</td>
                  {tiers.map(tier => {
                    const displayValue = feature.tiers[tier.slug];

                    return (
                      <td key={tier._id} className="text-center py-4 px-4">
                        {typeof displayValue === 'boolean' ? (
                          displayValue ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700">{String(displayValue)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div variants={itemVariants} className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Can I change my plan anytime?',
              a: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept credit/debit cards, KBZPay, WavePay, and bank transfers for Myanmar-based customers. International customers can use Stripe.',
            },
            {
              q: 'Is there a free trial?',
              a: 'Yes, we offer a 14-day free trial for all paid plans. No credit card required to start.',
            },
            {
              q: 'What happens if I cancel?',
              a: 'You can cancel anytime. Your subscription will remain active until the end of your current billing period.',
            },
          ].map((faq, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedTier?.name}</DialogTitle>
            <DialogDescription>
              You are about to upgrade from {currentSubscription?.planId.name} to {selectedTier?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">New Plan</p>
                <p className="text-sm text-gray-600">{selectedTier?.name}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  MMK {formatPrice(isYearly ? calculateYearlyPrice(selectedTier?.price || 0) : selectedTier?.price || 0)}
                </p>
                <p className="text-sm text-gray-600">/{isYearly ? 'year' : 'month'}</p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will be charged a prorated amount for the remainder of your current billing period.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Upgrade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will remain active until {new Date(currentSubscription?.currentPeriodEnd || '').toLocaleDateString()}, after which you will lose access to premium features.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default SubscriptionManager;
