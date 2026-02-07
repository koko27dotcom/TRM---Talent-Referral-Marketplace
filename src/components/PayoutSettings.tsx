import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Wallet, Building2, Smartphone, CreditCard,
  Save, AlertCircle, Check, ChevronRight, Plus, Trash2,
  Edit2, ToggleLeft, ToggleRight, Shield, Clock,
  DollarSign, Percent, Bell, Calendar
} from 'lucide-react'

interface PayoutMethod {
  id: string
  type: 'kbzpay' | 'wavepay' | 'cbpay' | 'bank_transfer'
  name: string
  accountNumber: string
  accountName: string
  isDefault: boolean
  bankName?: string
  bankBranch?: string
}

interface PayoutSettingsData {
  minPayoutAmount: number
  autoPayout: boolean
  preferredProvider: string
  notificationPreferences: {
    email: boolean
    sms: boolean
    push: boolean
  }
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual'
}

interface Provider {
  code: string
  name: string
  displayName: string
  type: string
  feeStructure: {
    type: string
    percentage?: number
    fixedAmount?: number
  }
}

export default function PayoutSettings() {
  const [methods, setMethods] = useState<PayoutMethod[]>([
    {
      id: '1',
      type: 'kbzpay',
      name: 'KBZPay',
      accountNumber: '09•••••7852',
      accountName: 'Aung Kyaw',
      isDefault: true,
    },
    {
      id: '2',
      type: 'wavepay',
      name: 'WavePay',
      accountNumber: '09•••••1234',
      accountName: 'Aung Kyaw',
      isDefault: false,
    },
  ])

  const [settings, setSettings] = useState<PayoutSettingsData>({
    minPayoutAmount: 50000,
    autoPayout: false,
    preferredProvider: 'kbzpay',
    notificationPreferences: {
      email: true,
      sms: true,
      push: false,
    },
    schedule: 'manual',
  })

  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PayoutMethod | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/payouts/providers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setProviders(data.data.providers)
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const setDefaultMethod = (id: string) => {
    setMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === id
    })))
  }

  const removeMethod = (id: string) => {
    setMethods(prev => prev.filter(m => m.id !== id))
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'kbzpay':
        return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">K</div>
      case 'wavepay':
        return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">W</div>
      case 'cbpay':
        return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">C</div>
      case 'bank_transfer':
        return <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white"><Building2 className="w-5 h-5" /></div>
      default:
        return <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center"><CreditCard className="w-5 h-5 text-slate-500" /></div>
    }
  }

  const getProviderFeeDisplay = (provider: Provider) => {
    if (provider.feeStructure.type === 'percentage') {
      return `${provider.feeStructure.percentage}%`
    } else if (provider.feeStructure.type === 'fixed') {
      return `${provider.feeStructure.fixedAmount?.toLocaleString()} MMK`
    }
    return 'Variable'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payout Settings</h2>
          <p className="text-slate-600 mt-1">Configure your payout preferences and payment methods</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Payment Methods</h3>
                  <p className="text-sm text-slate-500">Manage your withdrawal options</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMethod(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Method
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  method.isDefault
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{method.name}</span>
                        {method.isDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{method.accountNumber}</p>
                      <p className="text-sm text-slate-400">{method.accountName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!method.isDefault && (
                      <button
                        onClick={() => setDefaultMethod(method.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Set as default"
                      >
                        <ToggleLeft className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingMethod(method)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeMethod(method.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {methods.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No payment methods added</p>
                <p className="text-sm text-slate-500 mt-1">Add a payment method to receive payouts</p>
                <button
                  onClick={() => setShowAddMethod(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment Method
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Payout Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Payout Preferences</h3>
                <p className="text-sm text-slate-500">Configure your payout settings</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Minimum Payout Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Payout Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.minPayoutAmount}
                  onChange={(e) => setSettings(prev => ({ ...prev, minPayoutAmount: Number(e.target.value) }))}
                  min={1000}
                  step={1000}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MMK</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimum amount required to request a payout
              </p>
            </div>

            {/* Preferred Provider */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Preferred Payment Provider
              </label>
              <select
                value={settings.preferredProvider}
                onChange={(e) => setSettings(prev => ({ ...prev, preferredProvider: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {providers.map(provider => (
                  <option key={provider.code} value={provider.code}>
                    {provider.displayName} (Fee: {getProviderFeeDisplay(provider)})
                  </option>
                ))}
                {!providers.length && (
                  <>
                    <option value="kbzpay">KBZPay (Fee: 1.5%)</option>
                    <option value="wavepay">WavePay (Fee: 1.5%)</option>
                    <option value="cbpay">CB Pay (Fee: 1.5%)</option>
                    <option value="bank_transfer">Bank Transfer (Fee: 2,500 MMK)</option>
                  </>
                )}
              </select>
            </div>

            {/* Payout Schedule */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payout Schedule
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'manual', label: 'Manual', icon: Wallet },
                  { value: 'daily', label: 'Daily', icon: Clock },
                  { value: 'weekly', label: 'Weekly', icon: Calendar },
                  { value: 'monthly', label: 'Monthly', icon: Calendar },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSettings(prev => ({ ...prev, schedule: option.value as any }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      settings.schedule === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 ${settings.schedule === option.value ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`font-medium ${settings.schedule === option.value ? 'text-blue-900' : 'text-slate-700'}`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Payout Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Automatic Payouts</p>
                  <p className="text-sm text-slate-500">Automatically process payouts when threshold is reached</p>
                </div>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoPayout: !prev.autoPayout }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoPayout ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoPayout ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2"
        >
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
                <p className="text-sm text-slate-500">Choose how you want to be notified about payouts</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Get notified via email', icon: Bell },
                { key: 'sms', label: 'SMS Notifications', description: 'Get notified via SMS', icon: Smartphone },
                { key: 'push', label: 'Push Notifications', description: 'Get push notifications', icon: Bell },
              ].map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <pref.icon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{pref.label}</p>
                      <p className="text-sm text-slate-500">{pref.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      notificationPreferences: {
                        ...prev.notificationPreferences,
                        [pref.key]: !prev.notificationPreferences[pref.key as keyof typeof prev.notificationPreferences]
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notificationPreferences[pref.key as keyof typeof settings.notificationPreferences] ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notificationPreferences[pref.key as keyof typeof settings.notificationPreferences] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add/Edit Method Modal */}
      <AnimatePresence>
        {(showAddMethod || editingMethod) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAddMethod(false)
              setEditingMethod(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
                  <select className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                    <option value="kbzpay">KBZPay</option>
                    <option value="wavepay">WavePay</option>
                    <option value="cbpay">CB Pay</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number / Account Number</label>
                  <input
                    type="text"
                    placeholder="09xxxxxxxxx"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Account Name</label>
                  <input
                    type="text"
                    placeholder="Enter account holder name"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowAddMethod(false)
                    setEditingMethod(null)
                  }}
                  className="flex-1 py-3 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAddMethod(false)
                    setEditingMethod(null)
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                  {editingMethod ? 'Save Changes' : 'Add Method'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
