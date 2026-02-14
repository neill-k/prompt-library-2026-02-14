'use client';

import { useState, useEffect } from 'react';

interface Prompt {
  id: string;
  name: string;
  content: string;
  variables: string[];
  versions: { content: string; timestamp: number }[];
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_PROMPT = `You are a {{role}} helping with {{task}}.

Instructions:
- Be concise and helpful
- {{additional_instructions}}

Context:
{{context}}`;

const PRESETS = [
  {
    name: 'Support Triage',
    content: `You are a support ticket triage agent.

Analyze the incoming ticket and categorize it:
- priority: critical | high | medium | low
- category: billing | technical | account | feature_request | other
- sentiment: frustrated | neutral | satisfied

Provide a brief summary and recommended action.

Ticket:
{{ticket_content}}`,
  },
  {
    name: 'Code Review',
    content: `You are a code reviewer providing constructive feedback.

Review the following code changes and identify:
1. Potential bugs or issues
2. Performance concerns
3. Code quality suggestions
4. Security considerations

Code diff:
{{diff}}

Provide your review in a structured format.`,
  },
];

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

function substituteVariables(content: string, values: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
  }
  return result;
}

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  const selectedPrompt = prompts.find((p) => p.id === selectedId);

  useEffect(() => {
    const saved = localStorage.getItem('prompt-library');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPrompts(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (prompts.length > 0) {
      localStorage.setItem('prompt-library', JSON.stringify(prompts));
    }
  }, [prompts]);

  useEffect(() => {
    if (selectedPrompt) {
      setEditName(selectedPrompt.name);
      setEditContent(selectedPrompt.content);
      const vars = extractVariables(selectedPrompt.content);
      setTestValues(
        vars.reduce((acc, v) => ({ ...acc, [v]: '' }), {})
      );
    }
  }, [selectedPrompt]);

  const createPrompt = (name: string, content: string = DEFAULT_PROMPT) => {
    const variables = extractVariables(content);
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name,
      content,
      variables,
      versions: [{ content, timestamp: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPrompts([...prompts, newPrompt]);
    setSelectedId(newPrompt.id);
    setShowNewPrompt(false);
    setNewPromptName('');
  };

  const savePrompt = () => {
    if (!selectedPrompt) return;
    const variables = extractVariables(editContent);
    const updated: Prompt = {
      ...selectedPrompt,
      name: editName,
      content: editContent,
      variables,
      versions: [...selectedPrompt.versions, { content: editContent, timestamp: Date.now() }],
      updatedAt: Date.now(),
    };
    setPrompts(prompts.map((p) => (p.id === selectedId ? updated : p)));
  };

  const deletePrompt = (id: string) => {
    const filtered = prompts.filter((p) => p.id !== id);
    setPrompts(filtered);
    if (selectedId === id && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    } else if (filtered.length === 0) {
      setSelectedId(null);
    }
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    createPrompt(preset.name, preset.content);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const previewContent = selectedPrompt ? substituteVariables(editContent, testValues) : '';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-lg font-semibold text-white">📚 Prompt Library</h1>
            <p className="text-xs text-gray-500 mt-1">Organize, version, test</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedId(prompt.id)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm truncate transition-colors ${
                  selectedId === prompt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                {prompt.name}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-800 space-y-2">
            <button
              onClick={() => setShowNewPrompt(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              + New Prompt
            </button>
            <div className="text-xs text-gray-500 text-center">or load preset:</div>
            <div className="flex gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => loadPreset(preset)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPrompt ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-none outline-none text-white w-64"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {showPreview ? '📝 Edit' : '👁 Preview'}
                  </button>
                  <button
                    onClick={savePrompt}
                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={() => deletePrompt(selectedPrompt.id)}
                    className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-900 text-red-300 rounded-lg transition-colors"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Editor / Preview */}
                <div className="flex-1 p-4 overflow-auto">
                  {showPreview ? (
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Rendered Output</h3>
                        <pre className="whitespace-pre-wrap text-sm text-gray-200 font-mono">
                          {previewContent}
                        </pre>
                      </div>
                      <button
                        onClick={() => copyToClipboard(previewContent)}
                        className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        📋 Copy Rendered
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-200 resize-none outline-none border border-gray-800"
                      placeholder="Write your prompt here... Use {{variable}} for variables."
                    />
                  )}
                </div>

                {/* Variables Panel */}
                <div className="w-72 border-l border-gray-800 p-4 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">🔧 Variables</h3>
                  {selectedPrompt.variables.length === 0 ? (
                    <p className="text-xs text-gray-500">No variables found. Use {'{{variable}}'} syntax.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPrompt.variables.map((v) => (
                        <div key={v}>
                          <label className="text-xs text-gray-500 block mb-1">{v}</label>
                          <input
                            type="text"
                            value={testValues[v] || ''}
                            onChange={(e) => setTestValues({ ...testValues, [v]: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm outline-none focus:border-blue-600"
                            placeholder={`Enter ${v}...`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">📜 Version History</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedPrompt.versions
                        .slice()
                        .reverse()
                        .map((v, i) => (
                          <button
                            key={v.timestamp}
                            onClick={() => {
                              setEditContent(v.content);
                              setTestValues(
                                extractVariables(v.content).reduce(
                                  (acc, varName) => ({ ...acc, [varName]: '' }),
                                  {}
                                )
                              );
                            }}
                            className="w-full text-xs bg-gray-900 hover:bg-gray-800 p-2 rounded flex justify-between items-center transition-colors"
                          >
                            <span className="text-gray-500">v{selectedPrompt.versions.length - i}</span>
                            <span className="text-gray-600">
                              {new Date(v.timestamp).toLocaleTimeString()}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => copyToClipboard(editContent)}
                      className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                    >
                      📋 Copy Source
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No prompt selected</p>
                <p className="text-sm">Create a new prompt or load a preset to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Prompt Modal */}
      {showNewPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-96 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">New Prompt</h2>
            <input
              type="text"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              placeholder="Prompt name..."
              className="w-full px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg mb-4 outline-none focus:border-blue-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewPrompt(false);
                  setNewPromptName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => newPromptName && createPrompt(newPromptName)}
                disabled={!newPromptName}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
