import React, { useState } from 'react';
import { Users, MessageSquare, ArrowLeft, Filter } from 'lucide-react';
import Layout from '../../components/Layout';
import PersonaSelector from './PersonaSelector.card';
import ChatInterface from './ChatInterface';
import PersonaPanel from './PersonaPanel';
import ExistingAudiences from '../existingAudience/ExistingAudiences';
import { useAudience } from '../../context/AudienceContext';
import Button from '../../components/Button';

// Define CSS animation for fade in effect
const fadeInAnimation = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
`;

// Add the animation to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = fadeInAnimation;
  document.head.appendChild(styleElement);
}

// States for the chat with persona workflow
type ChatWithPersonaStep = 'audience-selection' | 'persona-selection';

// Main component for the Chat with Persona feature
const ChatWithPersona: React.FC = () => {
  // Use audience context
  const { updateAudienceData } = useAudience();
    // Main state
  const [currentStep, setCurrentStep] = useState<ChatWithPersonaStep>('audience-selection');
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(null);
  const [selectedAudienceName, setSelectedAudienceName] = useState<string>('');
  const [selectedPersonas, setSelectedPersonas] = useState<number[]>([]);
  const [isSegmentSelectorOpen, setIsSegmentSelectorOpen] = useState<boolean>(true);
  const [filteredPersonas, setFilteredPersonas] = useState<Array<{id: number; [key: string]: unknown}>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Handle audience selection
  const handleSelectAudience = (audienceId: number, audienceName: string) => {
    setSelectedAudienceId(audienceId);
    setSelectedAudienceName(audienceName);
    setCurrentStep('persona-selection');
    
    // Update audience context
    updateAudienceData({
      audienceId,
      audienceName
    });
  };

  // Handle going back to audience selection
  const handleBackToAudiences = () => {
    setCurrentStep('audience-selection');
    setSelectedPersonas([]);
    setFilteredPersonas([]);
  };

  // Handle persona selection
  const handlePersonaSelection = (personaIds: number[]) => {
    setSelectedPersonas(personaIds);
  };
  // Handle filtered personas update from segment selector
  const handleFilteredPersonasUpdate = (personas: Array<{id: number; [key: string]: unknown}>) => {
    setFilteredPersonas(personas);
  };

  // Toggle segment selector accordion
  const toggleSegmentSelector = () => {
    setIsSegmentSelectorOpen(!isSegmentSelectorOpen);
  };

  // Render based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'audience-selection':
        return (
          <ExistingAudiences 
            onSelectAudience={handleSelectAudience}
            onBack={() => {}} // No back action at first step
          />
        );
      
      case 'persona-selection':
        return (
          <div className="bg-white shadow rounded-lg overflow-hidden animate-fadeIn">
            {/* Header with audience name and back button */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToAudiences}
                  icon={<ArrowLeft className="w-4 h-4 mr-1" />}
                >
                  Back to Audiences
                </Button>
                <span className="ml-4 text-sm text-gray-500">
                  Selected Audience: <span className="font-medium text-gray-800">{selectedAudienceName}</span>
                </span>
              </div>
            </div>

            {/* Segment Selector Section (Dropdown) */}
            <div className="border-b border-gray-200">
              <button 
                onClick={toggleSegmentSelector}
                className="w-full flex justify-between items-center py-4 px-6 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Filter className="mr-2 h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-800">Segment Selection & Filters</span>
                  {selectedPersonas.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {selectedPersonas.length} personas selected
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-5 h-5 transition-transform ${isSegmentSelectorOpen ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 9l-7 7-7-7" 
                  />
                </svg>
              </button>
              
              {/* Collapsible segment selector with filter cards */}
              {isSegmentSelectorOpen && (
                <div className="animate-fadeIn border-t border-gray-200">
                  <PersonaSelector 
                    onSelect={handlePersonaSelection}
                    selectedPersonaIds={selectedPersonas}
                    audienceId={selectedAudienceId}
                    onFilteredPersonasUpdate={handleFilteredPersonasUpdate}
                  />
                </div>
              )}
            </div>

            {/* Two-pane layout with Filtered Personas on left and Chat Interface on right */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Left pane - Filtered Personas */}
                <div className="md:w-1/3 lg:w-1/4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-100 border-b border-gray-200 p-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-blue-600" />
                      Filtered Personas
                      {filteredPersonas.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {filteredPersonas.length}
                        </span>
                      )}
                    </h3>
                  </div>                  <PersonaPanel 
                    personas={filteredPersonas} 
                    onRemovePersona={(id) => {
                      setFilteredPersonas(filteredPersonas.filter(p => p.id !== id));
                      setSelectedPersonas(selectedPersonas.filter(pId => pId !== id));
                    }}
                    loading={loading}
                    onSelectPersona={(id) => {
                      if (!selectedPersonas.includes(id)) {
                        setSelectedPersonas([...selectedPersonas, id]);
                      }
                    }}
                    selectedPersonaIds={selectedPersonas}
                  />
                </div>
                
                {/* Right pane - Chat Interface */}
                <div className="md:w-2/3 lg:w-3/4">
                  <ChatInterface 
                    selectedPersonaIds={selectedPersonas}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Something went wrong. Please refresh the page.</div>;
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
          Chat with Persona
        </h1>
        <p className="text-gray-500 mt-1">
          Select personas from your audiences and start a conversation with them
        </p>
      </div>

      {/* Main content container - renders based on current step */}
      {renderContent()}
    </Layout>
  );
};

export default ChatWithPersona;
