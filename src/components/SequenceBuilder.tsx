import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Clock, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Copy,
  Settings,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  Calendar,
  Users,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

interface SequenceStep {
  id: string;
  stepNumber: number;
  name: string;
  description?: string;
  templateId?: string;
  delay: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
  };
  sendConditions: Condition[];
  skipConditions: Condition[];
  isActive: boolean;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface SequenceBuilderProps {
  initialSteps?: SequenceStep[];
  availableTemplates?: { id: string; name: string }[];
  onSave?: (steps: SequenceStep[]) => void;
  onCancel?: () => void;
}

const SequenceBuilder: React.FC<SequenceBuilderProps> = ({
  initialSteps = [],
  availableTemplates = [],
  onSave,
  onCancel,
}) => {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps.length > 0 ? initialSteps : [
    {
      id: '1',
      stepNumber: 1,
      name: 'Welcome Email',
      description: 'Initial welcome message',
      delay: { value: 0, unit: 'hours' },
      sendConditions: [],
      skipConditions: [],
      isActive: true,
    },
  ]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  const addStep = () => {
    const newStep: SequenceStep = {
      id: Date.now().toString(),
      stepNumber: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      description: '',
      delay: { value: 1, unit: 'days' },
      sendConditions: [],
      skipConditions: [],
      isActive: true,
    };
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
    setShowAddStep(false);
  };

  const removeStep = (id: string) => {
    const newSteps = steps.filter(s => s.id !== id).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));
    setSteps(newSteps);
  };

  const duplicateStep = (step: SequenceStep) => {
    const newStep: SequenceStep = {
      ...step,
      id: Date.now().toString(),
      stepNumber: steps.length + 1,
      name: `${step.name} (Copy)`,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const reorderSteps = (newOrder: SequenceStep[]) => {
    setSteps(newOrder.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const getDelayLabel = (delay: SequenceStep['delay']) => {
    const { value, unit } = delay;
    if (value === 0) return 'Immediately';
    return `After ${value} ${unit}${value > 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sequence Builder</h2>
          <p className="text-sm text-gray-500">Build your drip email sequence</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave?.(steps)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Save Sequence
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Sequence Timeline */}
          <div className="space-y-4">
            <AnimatePresence>
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                >
                  {/* Delay Indicator (except for first step) */}
                  {index > 0 && (
                    <div className="flex items-center justify-center py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{getDelayLabel(step.delay)}</span>
                        <button
                          onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step Card */}
                  <div 
                    className={`bg-white rounded-xl border-2 transition-all ${
                      step.isActive ? 'border-blue-200' : 'border-gray-200 opacity-60'
                    } ${expandedStep === step.id ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                  >
                    {/* Step Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          step.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {step.stepNumber}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{step.name}</h3>
                          {step.description && (
                            <p className="text-sm text-gray-500">{step.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          step.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {step.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {expandedStep === step.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedStep === step.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-4 space-y-4">
                            {/* Basic Settings */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Step Name
                                </label>
                                <input
                                  type="text"
                                  value={step.name}
                                  onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Email Template
                                </label>
                                <select
                                  value={step.templateId || ''}
                                  onChange={(e) => updateStep(step.id, { templateId: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select a template...</option>
                                  {availableTemplates.map(template => (
                                    <option key={template.id} value={template.id}>
                                      {template.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={step.description || ''}
                                onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                placeholder="Brief description of this step..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Delay Settings */}
                            {index > 0 && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Delay Settings
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-600">Send after</span>
                                  <input
                                    type="number"
                                    value={step.delay.value}
                                    onChange={(e) => updateStep(step.id, { 
                                      delay: { ...step.delay, value: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <select
                                    value={step.delay.unit}
                                    onChange={(e) => updateStep(step.id, { 
                                      delay: { ...step.delay, unit: e.target.value as any }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="minutes">Minutes</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                  </select>
                                  <span className="text-sm text-gray-600">from previous step</span>
                                </div>
                              </div>
                            )}

                            {/* Conditions */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Conditions
                              </h4>
                              
                              {/* Send Conditions */}
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-blue-900">Send only if:</span>
                                  <button
                                    onClick={() => {
                                      const newCondition: Condition = { field: '', operator: 'equals', value: '' };
                                      updateStep(step.id, { 
                                        sendConditions: [...step.sendConditions, newCondition] 
                                      });
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    + Add Condition
                                  </button>
                                </div>
                                {step.sendConditions.length === 0 ? (
                                  <p className="text-sm text-blue-600/70 italic">No conditions - email will always send</p>
                                ) : (
                                  <div className="space-y-2">
                                    {step.sendConditions.map((condition, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <select
                                          value={condition.field}
                                          onChange={(e) => {
                                            const newConditions = [...step.sendConditions];
                                            newConditions[idx] = { ...condition, field: e.target.value };
                                            updateStep(step.id, { sendConditions: newConditions });
                                          }}
                                          className="flex-1 px-2 py-1 text-sm border border-blue-200 rounded"
                                        >
                                          <option value="">Select field...</option>
                                          <option value="email">Email</option>
                                          <option value="role">Role</option>
                                          <option value="tier">Tier</option>
                                          <option value="referralCount">Referral Count</option>
                                          <option value="lastActiveAt">Last Active</option>
                                        </select>
                                        <select
                                          value={condition.operator}
                                          onChange={(e) => {
                                            const newConditions = [...step.sendConditions];
                                            newConditions[idx] = { ...condition, operator: e.target.value };
                                            updateStep(step.id, { sendConditions: newConditions });
                                          }}
                                          className="px-2 py-1 text-sm border border-blue-200 rounded"
                                        >
                                          <option value="equals">equals</option>
                                          <option value="not_equals">not equals</option>
                                          <option value="greater_than">greater than</option>
                                          <option value="less_than">less than</option>
                                          <option value="contains">contains</option>
                                        </select>
                                        <input
                                          type="text"
                                          value={condition.value}
                                          onChange={(e) => {
                                            const newConditions = [...step.sendConditions];
                                            newConditions[idx] = { ...condition, value: e.target.value };
                                            updateStep(step.id, { sendConditions: newConditions });
                                          }}
                                          placeholder="Value"
                                          className="flex-1 px-2 py-1 text-sm border border-blue-200 rounded"
                                        />
                                        <button
                                          onClick={() => {
                                            const newConditions = step.sendConditions.filter((_, i) => i !== idx);
                                            updateStep(step.id, { sendConditions: newConditions });
                                          }}
                                          className="p-1 text-red-500 hover:text-red-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Skip Conditions */}
                              <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-orange-900">Skip if:</span>
                                  <button
                                    onClick={() => {
                                      const newCondition: Condition = { field: '', operator: 'equals', value: '' };
                                      updateStep(step.id, { 
                                        skipConditions: [...step.skipConditions, newCondition] 
                                      });
                                    }}
                                    className="text-sm text-orange-600 hover:text-orange-700"
                                  >
                                    + Add Condition
                                  </button>
                                </div>
                                {step.skipConditions.length === 0 ? (
                                  <p className="text-sm text-orange-600/70 italic">No skip conditions</p>
                                ) : (
                                  <div className="space-y-2">
                                    {step.skipConditions.map((condition, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <select
                                          value={condition.field}
                                          onChange={(e) => {
                                            const newConditions = [...step.skipConditions];
                                            newConditions[idx] = { ...condition, field: e.target.value };
                                            updateStep(step.id, { skipConditions: newConditions });
                                          }}
                                          className="flex-1 px-2 py-1 text-sm border border-orange-200 rounded"
                                        >
                                          <option value="">Select field...</option>
                                          <option value="email">Email</option>
                                          <option value="role">Role</option>
                                          <option value="tier">Tier</option>
                                          <option value="referralCount">Referral Count</option>
                                        </select>
                                        <select
                                          value={condition.operator}
                                          onChange={(e) => {
                                            const newConditions = [...step.skipConditions];
                                            newConditions[idx] = { ...condition, operator: e.target.value };
                                            updateStep(step.id, { skipConditions: newConditions });
                                          }}
                                          className="px-2 py-1 text-sm border border-orange-200 rounded"
                                        >
                                          <option value="equals">equals</option>
                                          <option value="not_equals">not equals</option>
                                          <option value="greater_than">greater than</option>
                                          <option value="less_than">less than</option>
                                        </select>
                                        <input
                                          type="text"
                                          value={condition.value}
                                          onChange={(e) => {
                                            const newConditions = [...step.skipConditions];
                                            newConditions[idx] = { ...condition, value: e.target.value };
                                            updateStep(step.id, { skipConditions: newConditions });
                                          }}
                                          placeholder="Value"
                                          className="flex-1 px-2 py-1 text-sm border border-orange-200 rounded"
                                        />
                                        <button
                                          onClick={() => {
                                            const newConditions = step.skipConditions.filter((_, i) => i !== idx);
                                            updateStep(step.id, { skipConditions: newConditions });
                                          }}
                                          className="p-1 text-red-500 hover:text-red-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateStep(step.id, { isActive: !step.isActive })}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    step.isActive 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {step.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                  {step.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => duplicateStep(step)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => removeStep(step.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Step Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={addStep}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Step
            </motion.button>
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {steps.length} steps
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {steps.reduce((total, step, idx) => {
                if (idx === 0) return total;
                const multipliers = { minutes: 1/60, hours: 1, days: 24, weeks: 168 };
                return total + (step.delay.value * multipliers[step.delay.unit]);
              }, 0).toFixed(1)} hours total
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {steps.filter(s => s.isActive).length} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceBuilder;
