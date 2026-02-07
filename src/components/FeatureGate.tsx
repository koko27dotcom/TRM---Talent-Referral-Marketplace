import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  AlertCircle,
  Crown,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { UpgradeModal } from './UpgradeModal';
import { api } from '../lib/api';

interface FeatureAccess {
  hasAccess: boolean;
  feature: string;
  featureName: string;
  limit?: number;
  usage?: number;
  remaining?: number | string;
  planName: string;
  reason?: string;
  message?: string;
}

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  requiredTier?: string;
}

interface FeatureGateWrapperProps {
  feature: string;
  children: React.ReactNode;
  showPreview?: boolean;
  previewComponent?: React.ReactNode;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/subscriptions/features/${feature}`);
      if (response.data.success) {
        setAccess(response.data.data);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      setAccess({
        hasAccess: false,
        feature,
        featureName: feature,
        planName: 'Unknown',
        reason: 'ERROR',
        message: 'Unable to verify feature access',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!access) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to check feature access</AlertDescription>
      </Alert>
    );
  }

  if (access.hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  if (showUpgradePrompt) {
    return (
      <LockedFeature
        access={access}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
    );
  }

  return null;
}

interface LockedFeatureProps {
  access: FeatureAccess;
  onUpgrade: () => void;
}

function LockedFeature({ access, onUpgrade }: LockedFeatureProps) {
  const percentageUsed = access.limit && access.usage
    ? Math.min(100, (access.usage / access.limit) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Blurred Preview Overlay */}
      <div className="relative">
        <div className="filter blur-sm opacity-50 pointer-events-none select-none">
          <div className="h-48 bg-gray-100 rounded-lg" />
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {access.featureName} is Locked
            </h3>

            <p className="text-gray-600 mb-4">
              {access.message || `Upgrade to ${access.planName} to unlock this feature`}
            </p>

            {/* Usage Indicator (if applicable) */}
            {access.limit !== undefined && access.usage !== undefined && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Usage</span>
                  <span className="font-medium">
                    {access.usage} / {access.limit}
                  </span>
                </div>
                <Progress value={percentageUsed} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  You've used {Math.round(percentageUsed)}% of your limit
                </p>
              </div>
            )}

            <Button onClick={onUpgrade} className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Unlock
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Feature Limit Warning Component
interface FeatureLimitWarningProps {
  feature: string;
  threshold?: number;
}

export function FeatureLimitWarning({ feature, threshold = 80 }: FeatureLimitWarningProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const response = await api.get(`/subscriptions/features/${feature}`);
      if (response.data.success) {
        setAccess(response.data.data);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
    }
  };

  if (!access || !access.limit || !access.usage) {
    return null;
  }

  const percentageUsed = (access.usage / access.limit) * 100;

  if (percentageUsed < threshold) {
    return null;
  }

  const isNearLimit = percentageUsed >= threshold && percentageUsed < 100;
  const isAtLimit = percentageUsed >= 100;

  return (
    <>
      <Alert
        variant={isAtLimit ? 'destructive' : 'default'}
        className={isNearLimit ? 'bg-amber-50 border-amber-200' : ''}
      >
        <AlertCircle className={`h-4 w-4 ${isNearLimit ? 'text-amber-600' : ''}`} />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className={isNearLimit ? 'text-amber-800' : ''}>
              {isAtLimit
                ? `You've reached your ${access.featureName} limit.`
                : `You're approaching your ${access.featureName} limit (${Math.round(percentageUsed)}% used)`}
            </span>
          </div>
          <Button
            variant={isNearLimit ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setShowUpgradeModal(true)}
            className={isNearLimit ? 'border-amber-300 text-amber-800 hover:bg-amber-100' : ''}
          >
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        context="feature_limit"
        featureName={access.featureName}
        targetTier={{ _id: '', name: 'Premium', slug: 'premium', description: '', price: 0, features: {} }}
      />
    </>
  );
}

// Feature Badge Component
interface FeatureBadgeProps {
  feature: string;
  className?: string;
}

export function FeatureBadge({ feature, className }: FeatureBadgeProps) {
  const [access, setAccess] = useState<FeatureAccess | null>(null);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const response = await api.get(`/subscriptions/features/${feature}`);
      if (response.data.success) {
        setAccess(response.data.data);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
    }
  };

  if (!access) {
    return (
      <Badge variant="secondary" className={className}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (access.hasAccess) {
    return (
      <Badge variant="default" className={className}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Available
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <Crown className="w-3 h-3 mr-1" />
      {access.planName}
    </Badge>
  );
}

// Feature List Component
interface FeatureListProps {
  features: string[];
  showStatus?: boolean;
}

export function FeatureList({ features, showStatus = true }: FeatureListProps) {
  const [accessList, setAccessList] = useState<Record<string, FeatureAccess>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAllFeatures();
  }, [features]);

  const checkAllFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions/features');
      if (response.data.success) {
        setAccessList(response.data.data.features);
      }
    } catch (error) {
      console.error('Error checking features:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {features.map((feature) => {
        const access = accessList[feature];

        return (
          <li key={feature} className="flex items-center justify-between py-2">
            <span className="text-gray-700">
              {access?.featureName || feature}
            </span>
            {showStatus && access && (
              <>
                {access.hasAccess ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Tier Comparison Component
interface TierComparisonProps {
  tiers: Array<{
    name: string;
    slug: string;
    price: number;
    features: Record<string, boolean | number | string>;
  }>;
  featureLabels: Record<string, string>;
}

export function TierComparison({ tiers, featureLabels }: TierComparisonProps) {
  const features = Object.keys(featureLabels);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium">Feature</th>
            {tiers.map((tier) => (
              <th key={tier.slug} className="text-center py-3 px-4 font-medium">
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr key={feature} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
              <td className="py-3 px-4 text-gray-700">{featureLabels[feature]}</td>
              {tiers.map((tier) => {
                const value = tier.features[feature];

                return (
                  <td key={tier.slug} className="text-center py-3 px-4">
                    {typeof value === 'boolean' ? (
                      value ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-gray-700">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FeatureGate;
