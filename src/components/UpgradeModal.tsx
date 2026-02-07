import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Crown,
  Check,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
  Star,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';

interface Tier {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  features: Record<string, boolean | number | string>;
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: Tier;
  targetTier: Tier;
  context?: 'feature_limit' | 'tier_expired' | 'manual_upgrade';
  featureName?: string;
  onUpgradeSuccess?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  targetTier,
  context = 'manual_upgrade',
  featureName,
  onUpgradeSuccess,
}: UpgradeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    prorationAmount: number;
    newPrice: number;
    effectiveDate: Date;
    nextBillingDate: Date;
  } | null>(null);

  useEffect(() => {
    if (isOpen && currentTier && targetTier) {
      fetchUpgradePreview();
    }
  }, [isOpen, currentTier, targetTier]);

  const fetchUpgradePreview = async () => {
    try {
      const response = await api.post('/subscriptions/preview-upgrade', {
        newTierId: targetTier._id,
      });

      if (response.data.success) {
        setPreview(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching upgrade preview:', error);
    }
  };

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const response = await api.put('/subscriptions/upgrade', {
        newTierId: targetTier._id,
      });

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: `Upgraded to ${targetTier.name} successfully`,
        });
        onUpgradeSuccess?.();
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to upgrade',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getContextMessage = () => {
    switch (context) {
      case 'feature_limit':
        return (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You've reached the limit for {featureName}. Upgrade to continue using this feature.
            </AlertDescription>
          </Alert>
        );
      case 'tier_expired':
        return (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Your subscription has expired. Renew now to restore access to all features.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Upgrade to {targetTier.name}</h2>
                    <p className="text-white/80">Unlock more features and higher limits</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Recommended
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Context Message */}
                {getContextMessage()}

                {/* Tier Comparison */}
                {currentTier && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Current</p>
                        <p className="font-semibold text-gray-700">{currentTier.name}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">New</p>
                        <p className="font-semibold text-primary">{targetTier.name}</p>
                      </div>
                    </div>

                    {/* Price Comparison */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-500">Current Price</p>
                        <p className="text-lg font-semibold text-gray-700">
                          MMK {formatPrice(currentTier.price)}/mo
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">New Price</p>
                        <p className="text-lg font-semibold text-primary">
                          MMK {formatPrice(targetTier.price)}/mo
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrade Preview */}
                {preview && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Upgrade Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prorated amount due now</span>
                        <span className="font-semibold">MMK {formatPrice(preview.prorationAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New monthly rate</span>
                        <span className="font-semibold">MMK {formatPrice(preview.newPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Effective date</span>
                        <span className="font-semibold">Immediately</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next billing date</span>
                        <span className="font-semibold">
                          {new Date(preview.nextBillingDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Features */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">What you'll get</h3>
                  <ul className="space-y-2">
                    {Object.entries(targetTier.features || {})
                      .filter(([key, value]) => {
                        // Only show features that are new or improved
                        const currentValue = currentTier?.features?.[key];
                        if (typeof value === 'boolean') {
                          return value && !currentValue;
                        }
                        if (typeof value === 'number') {
                          return (currentValue as number) < value;
                        }
                        return false;
                      })
                      .slice(0, 5)
                      .map(([key, value]) => (
                        <li key={key} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-gray-700">
                            {typeof value === 'number' && value > 0
                              ? `${value} ${key.replace(/([A-Z])/g, ' $1').trim()}`
                              : typeof value === 'number' && value === -1
                              ? `Unlimited ${key.replace(/([A-Z])/g, ' $1').trim()}`
                              : key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="space-y-3 pt-4 border-t">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Maybe Later
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  You can cancel or change your plan at any time. No long-term contracts.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default UpgradeModal;
