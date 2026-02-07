import React, { useState, useCallback } from 'react';
import { 
  Code, 
  Eye, 
  Save, 
  X, 
  Variable, 
  Image, 
  Link, 
  Type,
  Monitor,
  Tablet,
  Smartphone,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
}

interface TemplateEditorProps {
  initialHtml?: string;
  initialText?: string;
  initialSubject?: string;
  initialVariables?: TemplateVariable[];
  onSave?: (data: {
    html: string;
    text: string;
    subject: string;
    variables: TemplateVariable[];
  }) => void;
  onCancel?: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialHtml = '',
  initialText = '',
  initialSubject = '',
  initialVariables = [],
  onSave,
  onCancel,
}) => {
  const [html, setHtml] = useState(initialHtml);
  const [text, setText] = useState(initialText);
  const [subject, setSubject] = useState(initialSubject);
  const [variables, setVariables] = useState<TemplateVariable[]>(initialVariables);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'text'>('edit');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showVariablePanel, setShowVariablePanel] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [newVariable, setNewVariable] = useState<Partial<TemplateVariable>>({});
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'TRM Jobs',
    currentYear: new Date().getFullYear().toString(),
  });
  const [language, setLanguage] = useState<'en' | 'my'>('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const commonVariables: TemplateVariable[] = [
    { name: 'name', description: 'Recipient name', defaultValue: 'John Doe' },
    { name: 'email', description: 'Recipient email', defaultValue: 'john@example.com' },
    { name: 'company', description: 'Company name', defaultValue: 'TRM Jobs' },
    { name: 'currentYear', description: 'Current year', defaultValue: new Date().getFullYear().toString() },
    { name: 'unsubscribeUrl', description: 'Unsubscribe URL', defaultValue: 'https://trmjobs.com/unsubscribe' },
    { name: 'dashboardUrl', description: 'Dashboard URL', defaultValue: 'https://trmjobs.com/dashboard' },
    { name: 'referralCode', description: 'Referral code', defaultValue: 'REF123' },
  ];

  const insertVariable = useCallback((variableName: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newHtml = html.substring(0, start) + `{{${variableName}}}` + html.substring(end);
      setHtml(newHtml);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variableName.length + 4;
        textarea.focus();
      }, 0);
    }
  }, [html]);

  const renderPreview = useCallback(() => {
    let previewHtml = html;
    
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      previewHtml = previewHtml.replace(regex, value);
    });
    
    previewHtml = previewHtml.replace(/{{\s*\w+\s*}}/g, '[variable]');
    
    return previewHtml;
  }, [html, previewVariables]);

  const handleAddVariable = () => {
    if (newVariable.name && newVariable.description) {
      setVariables([...variables, newVariable as TemplateVariable]);
      setNewVariable({});
      setShowAddVariable(false);
    }
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave?.({
      html,
      text,
      subject,
      variables,
    });
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  const generateTextVersion = () => {
    let textVersion = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    setText(textVersion);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Template Editor</h2>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Languages className="w-4 h-4" />
              {language === 'en' ? 'English' : 'Burmese'}
            </button>
            <AnimatePresence>
              {showLanguageSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-10 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]"
                >
                  <button
                    onClick={() => { setLanguage('en'); setShowLanguageSelector(false); }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg"
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setLanguage('my'); setShowLanguageSelector(false); }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 last:rounded-b-lg"
                  >
                    Burmese (Unicode)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>

      {/* Subject Line */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Subject:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject line..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">{subject.length} chars</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'edit' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Code className="w-4 h-4" />
            HTML
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'preview' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'text' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Type className="w-4 h-4" />
            Text
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm' : ''}`}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('tablet')}
                className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow-sm' : ''}`}
                title="Tablet"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm' : ''}`}
                title="Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowVariablePanel(!showVariablePanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showVariablePanel ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Variable className="w-4 h-4" />
            Variables
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor/Preview Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'edit' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => insertVariable('name')}
                  className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  {'{{name}}'}
                </button>
                <button
                  onClick={() => insertVariable('email')}
                  className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  {'{{email}}'}
                </button>
                <button
                  onClick={() => insertVariable('unsubscribeUrl')}
                  className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Unsubscribe Link
                </button>
              </div>
              
              <textarea
                id="html-editor"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="Enter your HTML email template here..."
                className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="h-full bg-gray-100 p-8 overflow-auto">
              <div 
                className="mx-auto bg-white shadow-lg transition-all duration-300"
                style={{ width: getPreviewWidth(), minHeight: '600px' }}
              >
                <iframe
                  srcDoc={renderPreview()}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Preview"
                />
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">Plain text version</span>
                <button
                  onClick={generateTextVersion}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Generate from HTML
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Plain text version of your email..."
                className="flex-1 p-4 text-sm resize-none focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Variables Panel */}
        <AnimatePresence>
          {showVariablePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-200 bg-gray-50 overflow-hidden"
            >
              <div className="p-4 h-full overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Variables</h3>
                  <button
                    onClick={() => setShowAddVariable(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Preview Values</h4>
                  <div className="space-y-2">
                    {Object.entries(previewVariables).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20 truncate">{key}:</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setPreviewVariables({ ...previewVariables, [key]: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Common Variables</h4>
                  <div className="space-y-1">
                    {commonVariables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <code className="text-purple-600">{'{{' + variable.name + '}}'}</code>
                        <p className="text-xs text-gray-500">{variable.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Template Variables</h4>
                  {variables.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No custom variables</p>
                  ) : (
                    <div className="space-y-2">
                      {variables.map((variable, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                          <div>
                            <code className="text-sm text-purple-600">{'{{' + variable.name + '}}'}</code>
                            <p className="text-xs text-gray-500">{variable.description}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveVariable(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Variable Modal */}
      <AnimatePresence>
        {showAddVariable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddVariable(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Variable</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={newVariable.name || ''}
                    onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                    placeholder="e.g., referralCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newVariable.description || ''}
                    onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                    placeholder="e.g., User referral code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Value (optional)</label>
                  <input
                    type="text"
                    value={newVariable.defaultValue || ''}
                    onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                    placeholder="Default value for previews"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={newVariable.required || false}
                    onChange={(e) => setNewVariable({ ...newVariable, required: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="required" className="text-sm text-gray-700">Required</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddVariable(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVariable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Variable
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateEditor;
