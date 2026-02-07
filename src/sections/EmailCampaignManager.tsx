import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Plus,
  Send,
  Users,
  BarChart3,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target,
  TrendingUp,
  ArrowRight,
  Filter,
  Search,
  MoreVertical,
  Copy,
  Pause,
  Play,
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
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Types
interface EmailCampaign {
  _id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  template: string;
  audience: string;
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  preview: string;
}

interface Audience {
  _id: string;
  name: string;
  count: number;
  criteria: string;
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

export function EmailCampaignManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template: '',
    audience: '',
    scheduledAt: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, templatesRes, audiencesRes] = await Promise.all([
        api.get('/email-campaigns'),
        api.get('/email-templates'),
        api.get('/audiences'),
      ]);

      if (campaignsRes.data.success) {
        setCampaigns(campaignsRes.data.data);
      }
      if (templatesRes.data.success) {
        setTemplates(templatesRes.data.data);
      }
      if (audiencesRes.data.success) {
        setAudiences(audiencesRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching email data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load email campaign data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setProcessing(true);
      const response = await api.post('/email-campaigns', formData);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Campaign created successfully',
        });
        setShowCreateModal(false);
        setFormData({
          name: '',
          subject: '',
          template: '',
          audience: '',
          scheduledAt: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      setProcessing(true);
      const response = await api.post(`/email-campaigns/${campaignId}/send`, {});
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Campaign sent successfully',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error sending campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to send campaign',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await api.delete(`/email-campaigns/${campaignId}`);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Campaign deleted successfully',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalCampaigns: campaigns.length,
    totalSent: campaigns.reduce((acc, c) => acc + c.sentCount, 0),
    avgOpenRate: campaigns.length
      ? campaigns.reduce((acc, c) => acc + c.openRate, 0) / campaigns.length
      : 0,
    avgClickRate: campaigns.length
      ? campaigns.reduce((acc, c) => acc + c.clickRate, 0) / campaigns.length
      : 0,
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
              <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
              <p className="mt-2 text-gray-600">
                Create and manage email campaigns to engage with candidates
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Emails Sent</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalSent.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Send className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Open Rate</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.avgOpenRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Click Rate</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.avgClickRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="audiences">Audiences</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Campaigns List */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {filteredCampaigns.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first email campaign to get started
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredCampaigns.map((campaign) => (
                    <motion.div key={campaign._id} variants={itemVariants}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {campaign.name}
                                </h3>
                                {getStatusBadge(campaign.status)}
                              </div>
                              <p className="text-gray-600 mb-4">{campaign.subject}</p>
                              <div className="flex items-center gap-6 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {campaign.recipientCount.toLocaleString()} recipients
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {campaign.openRate}% opened
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="w-4 h-4" />
                                  {campaign.clickRate}% clicked
                                </span>
                                {campaign.scheduledAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Scheduled for {new Date(campaign.scheduledAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {campaign.status === 'draft' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendCampaign(campaign._id)}
                                  disabled={processing}
                                >
                                  {processing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-2" />
                                      Send
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCampaign(campaign);
                                  setShowPreviewModal(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCampaign(campaign._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Email Templates
                </h3>
                <p className="text-gray-600">
                  Manage your email templates here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audiences">
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Audiences
                </h3>
                <p className="text-gray-600">
                  Manage your audience segments here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Set up a new email campaign to engage with your audience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., February Job Newsletter"
              />
            </div>
            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Exciting New Opportunities Await!"
              />
            </div>
            <div>
              <Label htmlFor="template">Template</Label>
              <select
                id="template"
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="audience">Audience</Label>
              <select
                id="audience"
                value={formData.audience}
                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an audience</option>
                {audiences.map((audience) => (
                  <option key={audience._id} value={audience._id}>
                    {audience.name} ({audience.count.toLocaleString()} users)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="scheduledAt">Schedule (optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={processing || !formData.name || !formData.subject}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4 py-4">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                <p className="text-gray-600">{selectedCampaign.subject}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm mb-2">Campaign Stats</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{selectedCampaign.recipientCount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Recipients</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selectedCampaign.openRate}%</p>
                    <p className="text-sm text-gray-600">Open Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{selectedCampaign.clickRate}%</p>
                    <p className="text-sm text-gray-600">Click Rate</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreviewModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailCampaignManager;
