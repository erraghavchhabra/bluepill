import React, { useState, useEffect } from 'react';
import { Shield, Settings, Users, Save, RefreshCw, Check, X } from 'lucide-react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';

const API_URL = import.meta.env.VITE_API_URL || '';

// Constants for build audience prompts
export const CREATE_PERSONA_PROMPT = 'create-persona';
export const EXPERT_REFLECTION_PROMPT = 'expert-reflection';
export const PERPLEXITY_PROMPT = 'perplexity';

// Group of build audience prompts for UI organization
const BUILD_AUDIENCE_PROMPTS = [CREATE_PERSONA_PROMPT, EXPERT_REFLECTION_PROMPT, PERPLEXITY_PROMPT];

// Map of constant names to actual keys
const PROMPT_CONSTANTS_MAP = {
  'CREATE_PERSONA_PROMPT': CREATE_PERSONA_PROMPT,
  'EXPERT_REFLECTION_PROMPT': EXPERT_REFLECTION_PROMPT,
  'PERPLEXITY_PROMPT': PERPLEXITY_PROMPT
};

interface User {
  id: number;
  email: string;
  is_admin: boolean;
}

interface SelectedModels {
  claude: string;
  openai: string;
  gemini: string;
  deepseek: string;
  groq: string;
}

interface PromptConfig {
  DEEP_RESEARCH: boolean;
  attribution: string[];
  'create-content': string[];
  'create-content-long': string[];
  'a/b-multivariate-tests': string[];
  'get-insights': string[];
  'survey_and_focus_groups': string[];
  'pricing-analysis': string[];
  'channel-event-strategy': string[];
  'sales-enablement': string[];
  'buyer-insights-report': string[];
  'create-persona': string; // Single string prompt
  'expert-reflection': string; // Single string prompt
  'perplexity': string; // Single string prompt
}

// Define available variables for each prompt type
const PROMPT_VARIABLES = {
  'channel-event-strategy': [
    { name: 'goal', description: 'The objective of the A/B test' },
    { name: 'image_descriptions', description: 'Descriptions of the images being tested' }
  ],
  'attribution': [
    { name: 'objective', description: 'The goal of the attribution model' },
    { name: 'attribution_mode', description: 'The type of attribution model to use' },
    { name: 'funnel_stages', description: 'The stages in the conversion funnel' }
  ],
  'buyer-insights-report': [
    { name: 'objective', description: 'The goal of the buyer insights report' },
    { name: 'context', description: 'Background information for the report' },
    { name: 'additional_data', description: 'JSON containing product_name and website_url' }
  ],
  'create-content': [
    { name: 'goal', description: 'The purpose of the content' },
    { name: 'context', description: 'Background information for the content' },
    { name: 'content_type', description: 'The type of content to create' },
    { name: 'content_subject', description: 'The subject matter of the content' },
    { name: 'company_context', description: 'Information about the company' }
  ],
  'a/b-multivariate-tests': [
    { name: 'objective', description: 'The goal of the test' },
    { name: 'test_type', description: 'The type of test (A/B, multivariate)' },
    { name: 'input_messages', description: 'Messages to be tested' }
  ],
  'get-insights': [
    { name: 'questions', description: 'Specific questions to answer' },
    { name: 'context', description: 'Background information for the insights' }
  ],
  'pricing-analysis': [
    { name: 'objective', description: 'The goal of the pricing analysis' },
    { name: 'price_tiers', description: 'Different pricing tiers to analyze' },
    { name: 'product_description', description: 'Description of the product' },
    { name: 'value_proposition', description: 'The value proposition of the product' }
  ],
  'create-content-long': [
    { name: 'goal', description: 'The purpose of the long content' },
    { name: 'context', description: 'Background information for the content' },
    { name: 'content_type', description: 'The type of content to create' },
    { name: 'content_subject', description: 'The subject matter of the content' },
    { name: 'company_context', description: 'Information about the company' },
    { name: 'content_talk_about', description: 'Topics to include in the content' }
  ],
  'survey_and_focus_groups': [
    { name: 'goal', description: 'The primary objective or research aim of the survey or focus group' },
    { name: 'questions', description: 'Survey questions (with up to 4 answer choices) or open-ended focus group questions' },
    { name: 'context', description: 'Additional background information (product/service details, market environment, specific instructions)' },
    { name: 'personas', description: 'Detailed list of AI persona profiles including name, role, demographics, background, values, motivations, goals, pain points and thinking style' }
  ],
  // Add empty arrays for prompt types that don't have specific variables
  'sales-enablement': [],
  'create-persona': [],
  'expert-reflection': [],
  'perplexity': []
};

interface ServiceConfig {
  service: string;
  'selected-models': SelectedModels;
}

interface Config {
  prompts: PromptConfig;
  service_config: ServiceConfig;
}

// Available models by provider
const availableModels = {
  claude: ["claude-3-opus-20240229", "claude-3-7-sonnet-20250219", "claude-3-haiku-20240307"],
  openai: ["o3-mini-2025-01-31", "gpt-4o", "gpt-4", "gpt-4-turbo"],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-vision', 'gemini-2.0-chat'],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  groq: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'llama-3.2-90b-vision-preview', "llama-3.1-8b-instant", 'llama-3.3-70b-specdec', 'llama-3.3-70b-versatile']
};

const AdminPanel: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<'config' | 'users'>('config');
  const [selectedPromptType, setSelectedPromptType] = useState<string>('attribution');
  const [variablesVisible, setVariablesVisible] = useState<{[key: string]: boolean}>({});
  
  // Data State
  const [config, setConfig] = useState<Config | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Loading/Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  // Initialize variables visibility state for each prompt type
  useEffect(() => {
    // Set initial visibility to true for all prompt types
    const initialVisibility: {[key: string]: boolean} = {};
    Object.keys(PROMPT_VARIABLES).forEach(promptType => {
      initialVisibility[promptType] = true;
    });
    setVariablesVisible(initialVisibility);
  }, []);

  // Fetch config and users when component mounts
  useEffect(() => {
    fetchConfig();
    fetchUsers();
  }, []);

  // Clear action message after 3 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => {
        setActionMessage(null);
        setSaveSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/config`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      
      const data = await response.json();
      
      // Process the response to handle constant names in the API response
      if (data.prompts) {
        // Check for constant name keys and map them to actual keys
        Object.keys(data.prompts).forEach(key => {
          if (PROMPT_CONSTANTS_MAP[key]) {
            // Map from constant name to actual key
            const actualKey = PROMPT_CONSTANTS_MAP[key];
            data.prompts[actualKey] = data.prompts[key];
          }
        });
      }
      
      setConfig(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching configuration:', err);
      setError('Failed to load configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    try {
      setSaving(true);

      // Create a copy of the config for API submission
      const apiConfig = JSON.parse(JSON.stringify(config));
      
      // Map string keys to constant names for the API
      if (apiConfig.prompts) {
        // Save single string prompts with constant name keys
        if (apiConfig.prompts[CREATE_PERSONA_PROMPT]) {
          apiConfig.prompts['CREATE_PERSONA_PROMPT'] = apiConfig.prompts[CREATE_PERSONA_PROMPT];
          delete apiConfig.prompts[CREATE_PERSONA_PROMPT];
        }
        
        if (apiConfig.prompts[EXPERT_REFLECTION_PROMPT]) {
          apiConfig.prompts['EXPERT_REFLECTION_PROMPT'] = apiConfig.prompts[EXPERT_REFLECTION_PROMPT];
          delete apiConfig.prompts[EXPERT_REFLECTION_PROMPT];
        }
        
        if (apiConfig.prompts[PERPLEXITY_PROMPT]) {
          apiConfig.prompts['PERPLEXITY_PROMPT'] = apiConfig.prompts[PERPLEXITY_PROMPT];
          delete apiConfig.prompts[PERPLEXITY_PROMPT];
        }
      }
      
      const response = await fetch(`${API_URL}/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(apiConfig)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      setSaveSuccess(true);
      setActionMessage('Configuration saved successfully!');
    } catch (err) {
      console.error('Error saving configuration:', err);
      setSaveSuccess(false);
      setActionMessage('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAdminStatus = async (userId: number, makeAdmin: boolean) => {
    try {
      const endpoint = makeAdmin ? 'make-admin' : 'revoke-admin';
      const response = await fetch(`${API_URL}/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user status');
      }
      
      // Update local users state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: makeAdmin } : user
      ));
      
      setSaveSuccess(true);
      setActionMessage(`User ${makeAdmin ? 'promoted to admin' : 'demoted from admin'} successfully!`);
    } catch (err) {
      console.error('Error updating user status:', err);
      setSaveSuccess(false);
      setActionMessage(`Failed to ${makeAdmin ? 'promote' : 'demote'} user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePromptChange = (
    promptType: string, 
    index: number, 
    newValue: string,
    promptField: 'prompts' | 'service_config' = 'prompts'
  ) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [promptField]: {
        ...config[promptField],
        [promptType]: config[promptField][promptType].map((prompt: string, i: number) => 
          i === index ? newValue : prompt
        )
      }
    });
  };

  const handleDeepResearchToggle = (value: boolean) => {
    if (!config) return;
    
    setConfig({
      ...config,
      prompts: {
        ...config.prompts,
        DEEP_RESEARCH: value
      }
    });
  };

  const handleModelChange = (provider: string, model: string) => {
    if (!config) return;
    
    setConfig({
      ...config,
      service_config: {
        ...config.service_config,
        'selected-models': {
          ...config.service_config['selected-models'],
          [provider]: model
        }
      }
    });
  };

  const handleAIServiceChange = (service: string) => {
    if (!config) return;
    
    // When changing the AI service, also set the default model for that service
    const defaultModel = availableModels[service as keyof typeof availableModels]?.[0] || "";
    
    setConfig({
      ...config,
      service_config: {
        ...config.service_config,
        service
      }
    });
  };

  const handleAddEmptyPrompt = (promptType: string) => {
    if (!config) return;
    
    setConfig({
      ...config,
      prompts: {
        ...config.prompts,
        [promptType]: [...(config.prompts[promptType as keyof typeof config.prompts] || []), ""]
      }
    });
  };

// Function to determine if a prompt type should be handled as a string (single value) or array (multiple prompts)
  const isSingleStringPromptType = (promptType: string): boolean => {
    return ['create-persona', 'expert-reflection', 'perplexity'].includes(promptType);
  };

  const renderVariablesReference = (promptType: string) => {
    const variables = PROMPT_VARIABLES[promptType as keyof typeof PROMPT_VARIABLES] || [];
    
    if (variables.length === 0) {
      return null;
    }
    
    // Use the component-level state for visibility
    const isVisible = variablesVisible[promptType] !== undefined ? variablesVisible[promptType] : true;
    
    const toggleVisibility = () => {
      setVariablesVisible(prev => ({
        ...prev,
        [promptType]: !isVisible
      }));
    };
    
    return (
      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
        <div 
          className="px-4 py-2 bg-gray-100 flex justify-between items-center cursor-pointer"
          onClick={toggleVisibility}
        >
          <h4 className="text-sm font-medium text-gray-700">Available Variables</h4>
          <button className="text-gray-500 hover:text-gray-700">
            {isVisible ? '▼' : '►'}
          </button>
        </div>
        
        {isVisible && (
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-2">
              You can use these variables in your prompt by enclosing them in {'${ }'}.
              For example: <code className="bg-gray-100 px-1 rounded">{`\${example_variable}`}</code>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {variables.map((variable) => (
                <div key={variable.name} className="border border-gray-200 rounded p-2 bg-white">
                  <div className="font-mono text-sm text-blue-600">
                    {`\${${variable.name}}`}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {variable.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPromptEditor = () => {
    if (!config) return null;
    
    // Group prompt types into categories
    const simulationPromptTypes = [
      { id: 'attribution', label: 'Attribution' },
      { id: 'create-content', label: 'Create Content' },
      { id: 'create-content-long', label: 'Create Long Form Content' },
      { id: 'a/b-multivariate-tests', label: 'A/B & Multivariate Tests' },
      { id: 'get-insights', label: 'Get Insights' },
      { id: 'pricing-analysis', label: 'Pricing Analysis' },
      { id: 'buyer-insights-report', label: 'Buyer Insights Report' },
      { id: 'channel-event-strategy', label: 'A/B Test Creatives' },
      { id: 'survey_and_focus_groups', label: 'Survey & Focus Groups' }
    ];
    
    // Build audience prompt types (single string prompts)
    const audiencePromptTypes = [
      { id: CREATE_PERSONA_PROMPT, label: 'Create Persona' },
      { id: EXPERT_REFLECTION_PROMPT, label: 'Expert Reflection' },
      { id: PERPLEXITY_PROMPT, label: 'Perplexity' }
    ];
    
    // Get the currently selected AI provider
    const selectedProvider = config.service_config.service;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-x-2">
            <label className="text-sm font-medium text-gray-700">Deep Research:</label>
            <div className="inline-flex relative">
              <button
                onClick={() => handleDeepResearchToggle(true)}
                className={`px-3 py-1 text-sm rounded-l-md ${
                  config.prompts.DEEP_RESEARCH 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                On
              </button>
              <button
                onClick={() => handleDeepResearchToggle(false)}
                className={`px-3 py-1 text-sm rounded-r-md ${
                  !config.prompts.DEEP_RESEARCH 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Off
              </button>
            </div>
          </div>
          
          <div className="relative inline-block">
            <label className="text-sm font-medium text-gray-700 mr-2">AI Provider:</label>
            <select
              value={config.service_config.service}
              onChange={(e) => handleAIServiceChange(e.target.value)}
              className="py-1 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="claude">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="groq">Groq</option>
			  <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-1/4 pr-4 border-r">
            <h3 className="font-medium text-gray-700 mb-4">Prompt Categories</h3>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Simulation Prompts</h4>
              {simulationPromptTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPromptType(type.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    selectedPromptType === type.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
              <h4 className="text-sm font-medium text-gray-500 mt-4">Build Audience Prompts</h4>
              {audiencePromptTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPromptType(type.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    selectedPromptType === type.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="w-3/4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {simulationPromptTypes.concat(audiencePromptTypes).find(t => t.id === selectedPromptType)?.label} Prompts
              </h3>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={saveConfig}
                disabled={saving}
                icon={saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              >
                Save Changes
              </Button>
            </div>
            
            {/* Add Variables Reference here */}
            {renderVariablesReference(selectedPromptType)}
            
            <div className="space-y-4">
              {isSingleStringPromptType(selectedPromptType) ? (
                // Render single textarea for string prompts (create-persona, expert-reflection, perplexity)
                <div className="border border-gray-300 rounded-md">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                    <h4 className="text-sm font-medium">Prompt</h4>
                  </div>
                  <textarea 
                    value={config.prompts[selectedPromptType] || ''}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        prompts: {
                          ...config.prompts,
                          [selectedPromptType]: e.target.value
                        }
                      });
                    }}
                    className="w-full p-3 min-h-[200px] text-sm font-mono resize-y"
                    placeholder="Enter prompt here..."
                  />
                </div>
              ) : (
                // Array-based prompts (regular two prompts)
                [0, 1].map((index) => {
                  // Get current prompts array for the selected type
                  const promptsArray = config.prompts[selectedPromptType as keyof typeof config.prompts] || [];
                  // Get the prompt value, or empty string if it doesn't exist
                  const promptValue = promptsArray[index] !== undefined ? promptsArray[index] : '';
                  
                  return (
                    <div key={index} className="border border-gray-300 rounded-md">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                        <h4 className="text-sm font-medium">
                          {index === 0 ? 'Run Simulation Prompt' : 'Advanced Simulation Prompt'}
                        </h4>
                      </div>
                      <textarea 
                        value={promptValue}
                        onChange={(e) => {
                          // If the array doesn't have this index yet, we need to initialize it
                          if (index >= promptsArray.length) {
                            // Create a new array with empty strings up to this index
                            const newPromptsArray = [...promptsArray];
                            while (newPromptsArray.length <= index) {
                              newPromptsArray.push('');
                            }
                            // Set the value at the current index
                            newPromptsArray[index] = e.target.value;
                            
                            // Update the entire config
                            setConfig({
                              ...config,
                              prompts: {
                                ...config.prompts,
                                [selectedPromptType]: newPromptsArray
                              }
                            });
                          } else {
                            // Just use the normal handler if the index exists
                            handlePromptChange(selectedPromptType, index, e.target.value);
                          }
                        }}
                        className="w-full p-3 min-h-[200px] text-sm font-mono resize-y"
                        placeholder="Enter prompt here..."
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 border-t pt-6">
          <h3 className="font-medium text-gray-700 mb-4">Selected Models</h3>
          <div className="grid grid-cols-1 gap-4">
            {/* Active provider's model selection (dropdown) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {selectedProvider === 'claude' ? 'Anthropic (Claude)' :
                selectedProvider === 'openai' ? 'OpenAI (GPT)' :
                selectedProvider === 'deepseek' ? 'DeepSeek' :
                selectedProvider === 'groq' ? 'Groq' : 
				selectedProvider === 'gemini' ? 'Gemini' :'Selected Model'}
              </label>
              <select
                value={config.service_config['selected-models'][selectedProvider]}
                onChange={(e) => handleModelChange(selectedProvider, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {availableModels[selectedProvider as keyof typeof availableModels]?.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* All providers model configuration (read-only when not active) */}
            <div className="mt-4 grid grid-cols-1 gap-6">
              <h4 className="text-sm font-medium text-gray-500">All Configured Models</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${selectedProvider === 'claude' ? 'text-blue-700' : 'text-gray-500'}`}>
                    Anthropic (Claude)
                  </label>
                  <select
                    value={config.service_config['selected-models'].claude}
                    onChange={(e) => handleModelChange('claude', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm 
                    ${selectedProvider === 'claude' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'}`}
                    disabled={selectedProvider !== 'claude'}
                  >
                    {availableModels.claude.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${selectedProvider === 'openai' ? 'text-blue-700' : 'text-gray-500'}`}>
                    OpenAI (GPT)
                  </label>
                  <select
                    value={config.service_config['selected-models'].openai}
                    onChange={(e) => handleModelChange('openai', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm
                    ${selectedProvider === 'openai' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'}`}
                    disabled={selectedProvider !== 'openai'}
                  >
                    {availableModels.openai.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
				<div className="space-y-2">
                  <label className={`block text-sm font-medium ${selectedProvider === 'gemini' ? 'text-blue-700' : 'text-gray-500'}`}>
                    Gemini
                  </label>
                  <select
                    value={config.service_config['selected-models'].gemini}
                    onChange={(e) => handleModelChange('gemini', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm
                    ${selectedProvider === 'gemini' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'}`}
                    disabled={selectedProvider !== 'gemini'}
                  >
                    {availableModels.gemini.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${selectedProvider === 'deepseek' ? 'text-blue-700' : 'text-gray-500'}`}>
                    DeepSeek
                  </label>
                  <select
                    value={config.service_config['selected-models'].deepseek}
                    onChange={(e) => handleModelChange('deepseek', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm
                    ${selectedProvider === 'deepseek' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'}`}
                    disabled={selectedProvider !== 'deepseek'}
                  >
                    {availableModels.deepseek.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${selectedProvider === 'groq' ? 'text-blue-700' : 'text-gray-500'}`}>
                    Groq
                  </label>
                  <select
                    value={config.service_config['selected-models'].groq}
                    onChange={(e) => handleModelChange('groq', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm
                    ${selectedProvider === 'groq' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'}`}
                    disabled={selectedProvider !== 'groq'}
                  >
                    {availableModels.groq.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserManagement = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-700">User Management</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUsers}
            icon={<RefreshCw className="w-4 h-4 mr-1" />}
          >
            Refresh
          </Button>
        </div>
        
        <div className="bg-white shadow-md rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.is_admin ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.is_admin ? (
                      <button
                        onClick={() => toggleAdminStatus(user.id, false)}
                        className="text-red-600 hover:text-red-900 mr-4"
                      >
                        Revoke Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleAdminStatus(user.id, true)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Make Admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="h-6 w-6 mr-2 text-blue-600" />
          Admin Panel
        </h1>
        <p className="text-gray-500 mt-1">
          Configure system settings and manage users
        </p>
      </div>
      
      {/* Action message (success/error) */}
      {actionMessage && (
        <div className={`mb-4 p-3 rounded-md ${
          saveSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        } flex items-center justify-between`}>
          <div className="flex items-center">
            {saveSuccess ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <X className="h-5 w-5 mr-2" />
            )}
            <p>{actionMessage}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-6 inline-flex items-center text-sm font-medium border-b-2 ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="mr-2 h-5 w-5" />
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-6 inline-flex items-center text-sm font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="mr-2 h-5 w-5" />
              User Management
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => activeTab === 'config' ? fetchConfig() : fetchUsers()}
                icon={<RefreshCw className="w-4 h-4 mr-1" />}
              >
                Try Again
              </Button>
            </div>
          ) : (
            activeTab === 'config' ? renderPromptEditor() : renderUserManagement()
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminPanel;