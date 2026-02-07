import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Users, 
  Filter, 
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Play,
  Target,
  User,
  Building2,
  Star,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SegmentCondition {
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

interface SegmentGroup {
  operator: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

interface SegmentBuilderProps {
  initialName?: string;
  initialDescription?: string;
  initialGroups?: SegmentGroup[];
  onSave?: (data: {
    name: string;
    description: string;
    groups: SegmentGroup[];
  }) => void;
  onCancel?: () => void;
  onPreview?: (groups: SegmentGroup[]) => Promise<{ count: number; users: any[] }>;
}

const FIELD_OPTIONS = [
  { value: 'role', label: 'Role', type: 'select', options: ['referrer', 'job_seeker', 'corporate_admin', 'corporate_recruiter'] },
  { value: 'tier', label: 'Tier', type: 'select', options: ['bronze', 'silver', 'gold', 'platinum'] },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'name', label: 'Name', type: 'text' },
  { value: 'createdAt', label: 'Registration Date', type: 'date' },
  { value: 'lastActiveAt', label: 'Last Active', type: 'date' },
  { value: 'referralCount', label: 'Referral Count', type: 'number' },
  { value: 'totalEarnings', label: 'Total Earnings', type: 'number' },
  { value: 'emailEngagementScore', label: 'Engagement Score', type: 'number' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'equals', types: ['text', 'select', 'number', 'date'] },
  { value: 'not_equals', label: 'does not equal', types: ['text', 'select', 'number', 'date'] },
  { value: 'contains', label: 'contains', types: ['text'] },
  { value: 'not_contains', label: 'does not contain', types: ['text'] },
  { value: 'starts_with', label: 'starts with', types: ['text'] },
  { value: 'ends_with', label: 'ends with', types: ['text'] },
  { value: 'greater_than', label: 'greater than', types: ['number', 'date'] },
  { value: 'less_than', label: 'less than', types: ['number', 'date'] },
  { value: 'greater_than_or_equal', label: 'greater than or equal', types: ['number', 'date'] },
  { value: 'less_than_or_equal', label: 'less than or equal', types: ['number', 'date'] },
  { value: 'between', label: 'between', types: ['number', 'date'] },
  { value: 'in', label: 'is in', types: ['select'] },
  { value: 'not_in', label: 'is not in', types: ['select'] },
  { value: 'exists', label: 'exists', types: ['text', 'number', 'date'] },
  { value: 'not_exists', label: 'does not exist', types: ['text', 'number', 'date'] },
];

const PREDEFINED_SEGMENTS = [
  { id: 'all_referrers', name: 'All Referrers', category: 'role_based', icon: User },
  { id: 'all_companies', name: 'All Companies', category: 'role_based', icon: Building2 },
  { id: 'bronze_referrers', name: 'Bronze Referrers', category: 'tier_based', icon: Star },
  { id: 'silver_referrers', name: 'Silver Referrers', category: 'tier_based', icon: Star },
  { id: 'gold_referrers', name: 'Gold Referrers', category: 'tier_based', icon: Star },
  { id: 'platinum_referrers', name: 'Platinum Referrers', category: 'tier_based', icon: Star },
  { id: 'active_referrers', name: 'Active Referrers', category: 'activity_based', icon: Activity },
  { id: 'dormant_referrers', name: 'Dormant Referrers', category: 'activity_based', icon: Activity },
  { id: 'new_referrers', name: 'New Referrers', category: 'activity_based', icon: User },
  { id: 'high_engagement', name: 'High Engagement Users', category: 'engagement', icon: Target },
];

const SegmentBuilder: React.FC<SegmentBuilderProps> = ({
  initialName = '',
  initialDescription = '',
  initialGroups = [{ operator: 'AND', conditions: [] }],
  onSave,
  onCancel,
  onPreview,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [groups, setGroups] = useState<SegmentGroup[]>(initialGroups);
  const [showPredefined, setShowPredefined] = useState(false);
  const [previewData, setPreviewData] = useState<{ count: number; users: any[] } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const addGroup = () => {
    setGroups([...groups, { operator: 'AND', conditions: [] }]);
  };

  const removeGroup = (groupIndex: number) => {
    setGroups(groups.filter((_, idx) => idx !== groupIndex));
  };

  const addCondition = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.push({
      field: '',
      operator: 'equals',
      value: '',
    });
    setGroups(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions = newGroups[groupIndex].conditions.filter((_, idx) => idx !== conditionIndex);
    setGroups(newGroups);
  };

  const updateCondition = (groupIndex: number, conditionIndex: number, updates: Partial<SegmentCondition>) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions[conditionIndex] = {
      ...newGroups[groupIndex].conditions[conditionIndex],
      ...updates,
    };
    setGroups(newGroups);
  };

  const updateGroupOperator = (groupIndex: number, operator: 'AND' | 'OR') => {
    const newGroups = [...groups];
    newGroups[groupIndex].operator = operator;
    setGroups(newGroups);
  };

  const loadPredefinedSegment = (segmentId: string) => {
    switch (segmentId) {
      case 'all_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [{ field: 'role', operator: 'equals', value: 'referrer' }],
        }]);
        break;
      case 'all_companies':
        setGroups([{
          operator: 'AND',
          conditions: [{ field: 'role', operator: 'in', value: 'corporate_admin,corporate_recruiter' }],
        }]);
        break;
      case 'bronze_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'tier', operator: 'equals', value: 'bronze' },
          ],
        }]);
        break;
      case 'silver_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'tier', operator: 'equals', value: 'silver' },
          ],
        }]);
        break;
      case 'gold_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'tier', operator: 'equals', value: 'gold' },
          ],
        }]);
        break;
      case 'platinum_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'tier', operator: 'equals', value: 'platinum' },
          ],
        }]);
        break;
      case 'active_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'lastActiveAt', operator: 'greater_than', value: '30' },
          ],
        }]);
        break;
      case 'dormant_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'lastActiveAt', operator: 'less_than', value: '30' },
          ],
        }]);
        break;
      case 'new_referrers':
        setGroups([{
          operator: 'AND',
          conditions: [
            { field: 'role', operator: 'equals', value: 'referrer' },
            { field: 'createdAt', operator: 'greater_than', value: '7' },
          ],
        }]);
        break;
      case 'high_engagement':
        setGroups([{
          operator: 'AND',
          conditions: [{ field: 'emailEngagementScore', operator: 'greater_than_or_equal', value: '70' }],
        }]);
        break;
    }
    setShowPredefined(false);
  };

  const handlePreview = async () => {
    if (!onPreview) return;
    setIsPreviewLoading(true);
    try {
      const data = await onPreview(groups);
      setPreviewData(data);
    } catch (error) {
      console.error('Preview error:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const getFieldType = (fieldValue: string) => {
    const field = FIELD_OPTIONS.find(f => f.value === fieldValue);
    return field?.type || 'text';
  };

  const getFieldOptions = (fieldValue: string) => {
    const field = FIELD_OPTIONS.find(f => f.value === fieldValue);
    return field?.options || [];
  };

  const getOperatorsForField = (fieldValue: string) => {
    const fieldType = getFieldType(fieldValue);
    return OPERATOR_OPTIONS.filter(op => op.types.includes(fieldType));
  };

  const handleSave = () => {
    onSave?.({ name, description, groups });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Segment Builder</h2>
            <p className="text-sm text-gray-500">Define user segments with filters</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPredefined(!showPredefined)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Load Preset
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Segment
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Builder Panel */}
        <div className="flex-1 overflow-auto p-6">
          {/* Segment Info */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Active Gold Referrers"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this segment..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Predefined Segments */}
          <AnimatePresence>
            {showPredefined && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Predefined Segments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PREDEFINED_SEGMENTS.map((segment) => (
                      <button
                        key={segment.id}
                        onClick={() => loadPredefinedSegment(segment.id)}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all text-left"
                      >
                        <segment.icon className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{segment.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{segment.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Groups */}
          <div className="space-y-4">
            {groups.map((group, groupIndex) => (
              <motion.div
                key={groupIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-xl p-4"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Match</span>
                    <select
                      value={group.operator}
                      onChange={(e) => updateGroupOperator(groupIndex, e.target.value as 'AND' | 'OR')}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">all</option>
                      <option value="OR">any</option>
                    </select>
                    <span className="text-sm text-gray-700">of the following conditions:</span>
                  </div>
                  {groups.length > 1 && (
                    <button
                      onClick={() => removeGroup(groupIndex)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Conditions */}
                <div className="space-y-3">
                  {group.conditions.map((condition, conditionIndex) => (
                    <div key={conditionIndex} className="flex items-center gap-3">
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(groupIndex, conditionIndex, { 
                          field: e.target.value,
                          operator: 'equals',
                          value: ''
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select field...</option>
                        {FIELD_OPTIONS.map(field => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(groupIndex, conditionIndex, { operator: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!condition.field}
                      >
                        {getOperatorsForField(condition.field).map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      {getFieldType(condition.field) === 'select' ? (
                        <select
                          value={condition.value}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, { value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!condition.field}
                        >
                          <option value="">Select value...</option>
                          {getFieldOptions(condition.field).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : condition.operator === 'between' ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type={getFieldType(condition.field) === 'date' ? 'date' : 'number'}
                            value={condition.value}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, { value: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!condition.field}
                          />
                          <span className="text-gray-500">and</span>
                          <input
                            type={getFieldType(condition.field) === 'date' ? 'date' : 'number'}
                            value={condition.value2 || ''}
                            onChange={(e) => updateCondition(groupIndex, conditionIndex, { value2: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!condition.field}
                          />
                        </div>
                      ) : (
                        <input
                          type={getFieldType(condition.field) === 'date' ? 'date' : getFieldType(condition.field) === 'number' ? 'number' : 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(groupIndex, conditionIndex, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!condition.field || ['exists', 'not_exists'].includes(condition.operator)}
                        />
                      )}

                      <button
                        onClick={() => removeCondition(groupIndex, conditionIndex)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Condition Button */}
                <button
                  onClick={() => addCondition(groupIndex)}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Condition
                </button>
              </motion.div>
            ))}

            {/* Add Group Button */}
            <button
              onClick={addGroup}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Filter Group
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Preview
            </h3>
            <button
              onClick={handlePreview}
              disabled={isPreviewLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPreviewLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Preview
            </button>
          </div>

          {previewData ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Matching Users</p>
                <p className="text-3xl font-bold text-gray-900">{previewData.count.toLocaleString()}</p>
              </div>

              {previewData.users.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Sample Users</p>
                  <div className="space-y-2">
                    {previewData.users.slice(0, 5).map((user, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 text-sm">
                        <p className="font-medium text-gray-900">{user.name || 'Unknown'}</p>
                        <p className="text-gray-500">{user.email}</p>
                        {user.role && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            {user.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Click Preview to see matching users</p>
            </div>
          )}

          {/* Tips */}
          <div className="mt-6 bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tips
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use AND for stricter matching</li>
              <li>• Use OR for broader matching</li>
              <li>• Preview before saving</li>
              <li>• Segments auto-update</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SegmentBuilder;
