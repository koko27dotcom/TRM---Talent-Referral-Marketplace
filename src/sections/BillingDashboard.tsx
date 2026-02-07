import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  FileText,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Trash2,
  Star,
  Loader2,
  RefreshCw,
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Types
interface PaymentMethod {
  _id: string;
  type: 'card' | 'kbzpay' | 'wavepay' | '2c2p';
  provider: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'pending' | 'paid' | 'partial' | 'failed' | 'cancelled' | 'refunded';
  dueDate: string;
  paidAt?: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
  createdAt: string;
}

interface BillingSummary {
  totalRevenue: number;
  totalInvoices: number;
  averageInvoice: number;
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

export function BillingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcomingCharges, setUpcomingCharges] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [methodsRes, invoicesRes, upcomingRes, summaryRes] = await Promise.all([
        api.get('/billing/payment-methods'),
        api.get('/billing/history'),
        api.get('/billing/upcoming'),
        api.get('/billing/summary'),
      ]);

      if (methodsRes.data.success) {
        setPaymentMethods(methodsRes.data.data);
      }
      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.data);
      }
      if (upcomingRes.data.success) {
        setUpcomingCharges(upcomingRes.data.data);
      }
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load billing data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.put(`/billing/payment-methods/${methodId}/default`);
      toast({ title: 'Success', description: 'Default payment method updated' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update default payment method',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    try {
      await api.delete(`/billing/payment-methods/${methodId}`);
      toast({ title: 'Success', description: 'Payment method removed' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove payment method',
        variant: 'destructive',
      });
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      setProcessing(true);
      const response = await api.post(`/invoices/${invoiceId}/pay`, {});
      if (response.data.success) {
        toast({ title: 'Success', description: 'Payment processed successfully' });
        fetchData();
        setShowInvoiceModal(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`);
      if (response.data.success) {
        window.open(response.data.data.downloadUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download invoice',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; icon: React.ReactNode }> = {
      paid: { variant: 'success', icon: <CheckCircle className="w-3 h-3" /> },
      pending: { variant: 'warning', icon: <Clock className="w-3 h-3" /> },
      partial: { variant: 'warning', icon: <Clock className="w-3 h-3" /> },
      failed: { variant: 'destructive', icon: <AlertCircle className="w-3 h-3" /> },
      cancelled: { variant: 'secondary', icon: <X className="w-3 h-3" /> },
      refunded: { variant: 'secondary', icon: <RefreshCw className="w-3 h-3" /> },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
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
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">Manage your payment methods and view billing history</p>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(summary?.totalRevenue || 0, 'MMK')}
            </div>
            <p className="text-xs text-gray-500">Lifetime total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
            <FileText className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalInvoices || 0}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payment Methods</CardTitle>
            <CreditCard className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethods.length}</div>
            <p className="text-xs text-gray-500">Saved methods</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Upcoming Charges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingCharges.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No upcoming charges</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingCharges.map((charge) => (
                      <div
                        key={charge._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{charge.items[0]?.description}</p>
                          <p className="text-sm text-gray-500">
                            Due {new Date(charge.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatAmount(charge.total, charge.currency)}</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(charge);
                              setShowInvoiceModal(true);
                            }}
                          >
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Invoices
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('invoices')}>
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {invoices.slice(0, 5).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No invoices yet</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div
                        key={invoice._id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowInvoiceModal(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusBadge(invoice.status)}
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatAmount(invoice.total, invoice.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Payment Methods</CardTitle>
                <Button onClick={() => setShowAddCardModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Method
                </Button>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No payment methods saved</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowAddCardModal(true)}
                    >
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div
                        key={method._id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {method.type === 'card' ? (
                              <CreditCard className="w-6 h-6 text-gray-600" />
                            ) : (
                              <DollarSign className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {method.brand?.toUpperCase()} •••• {method.last4}
                            </p>
                            <p className="text-sm text-gray-500">
                              Expires {method.expiryMonth}/{method.expiryYear}
                            </p>
                          </div>
                          {method.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(method._id)}
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMethod(method._id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No invoices found</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowInvoiceModal(true);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          {getStatusBadge(invoice.status)}
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">
                              {invoice.items[0]?.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">
                              {formatAmount(invoice.total, invoice.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadInvoice(invoice._id);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Invoice Detail Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-2xl">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice {selectedInvoice.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  {getStatusBadge(selectedInvoice.status)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Invoice Date</p>
                    <p className="font-medium">
                      {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedInvoice.paidAt && (
                    <div>
                      <p className="text-gray-500">Paid Date</p>
                      <p className="font-medium">
                        {new Date(selectedInvoice.paidAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-sm font-medium">Description</th>
                        <th className="text-right py-2 px-4 text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-4 text-sm">{item.description}</td>
                          <td className="py-2 px-4 text-sm text-right">
                            {formatAmount(item.amount, selectedInvoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatAmount(selectedInvoice.total, selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatAmount(selectedInvoice.total, selectedInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadInvoice(selectedInvoice._id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button
                    onClick={() => handlePayInvoice(selectedInvoice._id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Pay Now'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Modal - Placeholder */}
      <Dialog open={showAddCardModal} onOpenChange={setShowAddCardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Securely add a new payment method to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment method addition would integrate with Stripe or 2C2P for secure tokenization.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCardModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddCardModal(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default BillingDashboard;
