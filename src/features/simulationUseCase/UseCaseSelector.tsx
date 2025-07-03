// filepath: c:\Users\Puneet Bajaj\Desktop\Ankit\ankitnewform\src\features\simulationUseCase\UseCaseSelector.tsx
import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  TestTube, 
  BarChart, 
  DollarSign, 
  Share2, 
  Target,
  ArrowLeft,
  SearchCheck
} from 'lucide-react';
import StepContainer from '../../components/StepContainer';
import SimulationCard from '../../components/SimulationCard';
import Button from '../../components/Button';
import ContentCreationForm from './useCaseForms/ContentCreationForm';
import ContentTestingForm from './useCaseForms/ContentTestingForm';
import InsightsForm from './useCaseForms/InsightsForm';
import PricingForm from './useCaseForms/PricingForm';
import ChannelStrategyForm from './useCaseForms/ABTestCreatives';
import AttributionForm from './useCaseForms/AttributionForm';
import BuyerInsightsForm from './useCaseForms/BuyerInsightsForm';
import SurveyAndFocusGroups from './useCaseForms/SurveyAndFocusGroups';
import LongContentCreationForm from './useCaseForms/LongContentCreationForm';
import SimulationResults from '../simulationResults/SimulationResults';
import SegmentsSelector from './SegmentsSelector';
import { useAudience } from '../../context/AudienceContext';
import SimulationHistoryPanel from '../../components/SimulationHistoryPanel';
import { useNavigate } from 'react-router-dom';

// Interface to track persona filters within each segment
export interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

export type UseCaseType = 
  | 'create-content' 
  | 'create-content-long'
  | 'content-testing' 
  | 'get-insights' 
  | 'pricing-analysis' 
  | 'channel-strategy' 
  | 'attribution' 
  | 'buyer-insights-report'
  | 'survey-and-focus-groups'
  | null;

// Define the possible steps in the flow
type FlowStep = 'segment-selection' | 'use-case-selection' | 'form-filling' | 'results-view';

interface UseCaseSelectorProps {
  onComplete: (simulationId: number) => void; // Modified to pass the simulationId
  onBack: () => void;
  audienceId: number;
  onStepChange?: (step: FlowStep) => void;
  onEditStep?: () => void; // New prop to signal edits
  currentStep?: FlowStep;
  hasEditedStep?: boolean; // New prop to track edit state from parent
  onFormDataChange?: (useCaseType: string, data: Record<string, any>) => void;
}

const UseCaseSelector: React.FC<UseCaseSelectorProps> = ({ 
  onComplete, 
  onBack, 
  audienceId,
  onStepChange,
  onEditStep,
  currentStep: providedStep,
  hasEditedStep = false,
  onFormDataChange,
}) => {
  const { audienceData, updateAudienceData } = useAudience();
  const navigate = useNavigate();
    // Define which use cases are "coming soon"
  const COMING_SOON_USE_CASES: UseCaseType[] = [
    // 'get-insights',
    // 'pricing-analysis', 
    // 'attribution'
  ];
    // Define available use cases FIRST before any functions that use it
  const useCases = [
    // Available use cases
    {
      type: 'create-content' as UseCaseType,
      icon: <PenTool className="w-5 h-5" />,
      title: 'Create Content',
      description: 'Generate content, messages, ads, emails and more tailored to your audience',
    },
    {
      type: 'create-content-long' as UseCaseType,
      icon: <PenTool className="w-5 h-5" />,
      title: 'Create Long Form Content',
      description: 'Generate long form content, messages, ads, emails and more tailored to your audience',
    },
    {
      type: 'content-testing' as UseCaseType,
      icon: <TestTube className="w-5 h-5" />,
      title: 'Test Content',
      description: 'Run A/B or multivariate tests on any content, creatives and more',
    },
    {
      type: 'channel-strategy' as UseCaseType,
      icon: <Share2 className="w-5 h-5" />,
      title: 'A/B Test Creatives',
      description: 'Discover the best way to reach this audience with detailed execution plan',
    },
    {
      type: 'buyer-insights-report' as UseCaseType,
      icon: <SearchCheck className="w-5 h-5" />,
      title: 'Buyer Insights Report',
      description: 'Generate a detailed report on buyer insights',
    },
    
    // Coming soon use cases - placed at the end
    {
      type: 'get-insights' as UseCaseType,
      icon: <BarChart className="w-5 h-5" />,
      title: 'Get Insights',
      description: 'Simulate a survey or focus group to get insights',
    },
    {
      type: 'pricing-analysis' as UseCaseType,
      icon: <DollarSign className="w-5 h-5" />,
      title: 'Pricing Analysis',
      description: 'Test how price points perform across different segments',
    },
    {
      type: 'attribution' as UseCaseType,
      icon: <Target className="w-5 h-5" />,
      title: 'Attribution',
      description: 'Learn what drives or blocks conversions',
    },
    {
      type: 'survey-and-focus-groups' as UseCaseType,
      icon: <SearchCheck className="w-5 h-5" />,
      title: 'Survey and Focus Groups',
      description: 'Simulate a survey or focus group to get insights',
    },
  ];
  
  // Initialize with provided step or default to segment selection
  const [localCurrentStep, setLocalCurrentStep] = useState<FlowStep>(
    providedStep || 'segment-selection'
  );
  
  // Use either the provided step from props or our local state
  const currentStep = providedStep || localCurrentStep;

  // Determine initial use case from audience data
  const getInitialUseCase = (): UseCaseType => {
    if (!audienceData.selectedUseCase) return null;
    
    const matchingUseCase = useCases.find(uc => 
      uc.title.toLowerCase() === audienceData.selectedUseCase?.toLowerCase()
    );
    
    return matchingUseCase?.type || null;
  };

  // Initialize from context if available, or use previously saved values
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseType>(getInitialUseCase());
  const [selectedSegments, setSelectedSegments] = useState<number[]>(
    audienceData.selectedSegments || []
  );
  const [personaFilters, setPersonaFilters] = useState<Record<number, SegmentPersonaFilters>>(
    audienceData.personaFilters || {}
  );
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [localHasEditedStep, setLocalHasEditedStep] = useState<boolean>(hasEditedStep);
  
  // Store form data between steps
  const [formState, setFormState] = useState<Record<string, any>>({});

  // Update selectedUseCase when audienceData changes
  useEffect(() => {
    const initialUseCase = getInitialUseCase();
    if (initialUseCase && !selectedUseCase) {
      setSelectedUseCase(initialUseCase);
    }
  }, [audienceData.selectedUseCase]);

  // Track edit state from parent
  useEffect(() => {
    setLocalHasEditedStep(hasEditedStep);
  }, [hasEditedStep]);

  // Update local step and notify parent component
  const setCurrentStep = (step: FlowStep) => {
    console.log('UseCaseSelector: Setting current step from', currentStep, 'to', step);
    
    // Check if we're trying to move forward while having edited
    if (localHasEditedStep) {
      const stepOrder: FlowStep[] = ['segment-selection', 'use-case-selection', 'form-filling', 'results-view'];
      const currentStepIndex = stepOrder.indexOf(currentStep);
      const targetStepIndex = stepOrder.indexOf(step);
      
      // If trying to move forward (skip steps) after editing, prevent it
      if (targetStepIndex > currentStepIndex + 1) {
        console.log('UseCaseSelector: Cannot jump forward after editing. Must complete steps sequentially.');
        return; // Prevent navigation
      }
    }
    
    // Check if we're moving backward - if so, allow it regardless of edit state
    const stepOrder: FlowStep[] = ['segment-selection', 'use-case-selection', 'form-filling', 'results-view'];
    const isMovingBackward = stepOrder.indexOf(step) < stepOrder.indexOf(currentStep);
    
    if (isMovingBackward) {
      // If moving backward, reset local edit state for that step
      setLocalHasEditedStep(false);
    }
    
    // When changing steps, update the selected use case if appropriate
    if (step === 'form-filling' && !selectedUseCase && audienceData.selectedUseCase) {
      // Find the use case type from its title
      const matchingUseCase = useCases.find(uc => uc.title === audienceData.selectedUseCase);
      if (matchingUseCase) {
        setSelectedUseCase(matchingUseCase.type);
      }
    }
    
    setLocalCurrentStep(step);
    if (onStepChange) {
      console.log('UseCaseSelector: Notifying parent of step change');
      onStepChange(step);
    }
  };

  // Store form data to persist across navigation
  const updateFormState = (formType: UseCaseType, data: Record<string, any>) => {
    setFormState(prev => ({
      ...prev,
      [formType as string]: data
    }));
    
    // Also notify the parent component
    if (onFormDataChange && formType) {
      onFormDataChange(formType as string, data);
    }
  };

  // Keep in sync with prop changes
  useEffect(() => {
    if (providedStep && providedStep !== localCurrentStep) {
      setLocalCurrentStep(providedStep);
    }
  }, [providedStep, localCurrentStep]);
  
  // Handle simulation history selection
  const handleSelectHistorySimulation = (simulationId: number) => {
    navigate(`/simulation-results/${simulationId}`);
    setIsHistoryPanelOpen(false);
    onComplete(simulationId); // Call onComplete when navigating to results
  };
  
  // Handle segment selection
  const handleSegmentSelect = (segments: number[], filters: Record<number, SegmentPersonaFilters>) => {
    console.log('UseCaseSelector: Segment selection callback received segments:', segments);
    console.log('UseCaseSelector: Current step before change:', currentStep);
    
    setSelectedSegments(segments);
    setPersonaFilters(filters);
    
    // Update audience context
    console.log('UseCaseSelector: Updating audience context with segments and filters');
    updateAudienceData({
      selectedSegments: segments,
      personaFilters: filters
    });
    
    // Move to use case selection step using both local state and parent notification
    console.log('UseCaseSelector: Setting current step to use-case-selection');
    
    // Update local state
    setLocalCurrentStep('use-case-selection');
    
    // Also directly notify parent about step change
    if (onStepChange) {
      console.log('UseCaseSelector: Directly notifying parent of step change to use-case-selection');
      onStepChange('use-case-selection');
    }
  };
  
  // Handle form submission with simulation ID
  const handleFormSubmit = (simId: number) => {
    console.log('Form submitted with simulation ID:', simId);
    setSimulationId(simId);
    setCurrentStep('results-view');
    // When navigating to results view, tell the parent we're moving forward normally 
    if (onStepChange) {
      onStepChange('results-view');
    }
    // Pass the simulation ID to the parent
    onComplete(simId);
  };

  // Handle form edit
  const handleFormEdit = () => {
    // Notify parent about edit
    if (onEditStep) {
      onEditStep();
      setLocalHasEditedStep(true);
    }
  };  // Handle use case selection
  const handleUseCaseSelect = (useCase: UseCaseType) => {
    // Check if this is one of the "coming soon" use cases
    const isComingSoon = COMING_SOON_USE_CASES.includes(useCase);
    
    // Don't proceed if it's a coming soon use case
    if (isComingSoon) {
      return;
    }
    
    setSelectedUseCase(useCase);
    
    // Update context with selected use case
    if (useCase) {
      const useCaseTitle = useCases.find(uc => uc.type === useCase)?.title || '';
      updateAudienceData({ selectedUseCase: useCaseTitle });
    }
    
    // Move to form filling step
    setCurrentStep('form-filling');
  };
  
  // Handle navigation back from use case to segments
  const handleBackFromUseCase = () => {
    setCurrentStep('segment-selection');
    // Reset edit flag when going back
    setLocalHasEditedStep(false);
  };
  
  // Handle navigation back from form to use case selection
  const handleBackFromForm = () => {
    setCurrentStep('use-case-selection');
    // Reset edit flag when going back
    setLocalHasEditedStep(false);
  };
  
  // Display a message when navigation is restricted
  const renderEditWarningMessage = () => {
    // if (localHasEditedStep && currentStep !== 'results-view') {
    //   return (
    //     <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md mb-4 text-sm flex items-center">
    //       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    //         <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    //       </svg>
    //       {/* You've made changes to this step. Please complete this step to continue. */}
    //     </div>
    //   );
    // }
    return null;
  };
    // Render the appropriate form component based on selected use case
  const renderUseCaseForm = () => {
    // Check if the selected use case is a "coming soon" use case
    if (selectedUseCase && COMING_SOON_USE_CASES.includes(selectedUseCase)) {
      // Go back to use case selection if somehow a coming soon use case was selected
      setCurrentStep('use-case-selection');
      return null;
    }
    
    // Get saved form data for this use case type
    const savedFormData = formState[selectedUseCase as string] || {};
    
    switch (selectedUseCase) {
      case 'create-content':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <ContentCreationForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('create-content', data)}
            />
          </div>
        );
      case 'create-content-long':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <LongContentCreationForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('create-content-long', data)}
            />
          </div>
        );
      case 'content-testing':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <ContentTestingForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('content-testing', data)}
            />
          </div>
        );
      case 'get-insights':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <InsightsForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('get-insights', data)}
            />
          </div>
        );
      case 'pricing-analysis':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <PricingForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('pricing-analysis', data)}
            />
          </div>
        );
      case 'channel-strategy':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <ChannelStrategyForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('channel-strategy', data)}
            />
          </div>
        );
      case 'attribution':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <AttributionForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('attribution', data)}
            />
          </div>
        );
      case 'buyer-insights-report':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <BuyerInsightsForm 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('buyer-insights-report', data)}
            />
          </div>
        );
      case 'survey-and-focus-groups':
        return (
          <div className="mx-auto w-[80vw] max-w-4xl">
            {renderEditWarningMessage()}
            <SurveyAndFocusGroups 
              onSubmit={handleFormSubmit}
              selectedSegmentIds={selectedSegments}
              personaFilters={personaFilters}
              onBack={handleBackFromForm}
              onEditStep={handleFormEdit}
              initialFormData={savedFormData}
              onFormDataChange={(data) => updateFormState('survey-and-focus-groups', data)}
            />
          </div>
        );
      default:
        return null;
    }
  };
  
  // Render the appropriate step component
  const renderStep = () => {
    console.log('Rendering step:', currentStep);
    
    switch (currentStep) {
      case 'segment-selection':
        return (
          <SegmentsSelector
            audienceId={audienceId}
            onBack={onBack}
            onNext={handleSegmentSelect}
            onEditStep={handleFormEdit}
          />
        );
      case 'results-view':
        return (
          <div className="w-full">
            {simulationId && (
              <div>
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep('form-filling')}
                    icon={<ArrowLeft className="w-4 h-4 mr-1" />}
                  >
                    Back to form
                  </Button>
                </div>
                <SimulationResults simulationId={simulationId} embedded={true} />
              </div>
            )}
          </div>
        );
      case 'use-case-selection':
        return (
          <StepContainer
            title="What would you like to do today?"
            subtitle={`Pick a use case to get started with ${audienceData.audienceName || 'your selected audience'}.`}
            className="animate-fadeIn"
          >
            {renderEditWarningMessage()}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackFromUseCase}
                icon={<ArrowLeft className="w-4 h-4 mr-1" />}
              >
                Back to segment selection
              </Button>
            </div>            <div className="grid md:grid-cols-2 gap-4">
              {useCases
                .sort((a, b) => {
                  // Sort "coming soon" use cases to the end
                  const aIsComingSoon = COMING_SOON_USE_CASES.includes(a.type);
                  const bIsComingSoon = COMING_SOON_USE_CASES.includes(b.type);
                  
                  if (aIsComingSoon && !bIsComingSoon) return 1;  // a comes after b
                  if (!aIsComingSoon && bIsComingSoon) return -1; // a comes before b
                  return 0; // maintain original order
                })
                .map((useCase) => {
                  // Check if this is one of the "coming soon" use cases
                  const isComingSoon = COMING_SOON_USE_CASES.includes(useCase.type);
                  
                  return (
                    <SimulationCard
                      key={useCase.type}
                      icon={useCase.icon}
                      title={useCase.title}
                      description={useCase.description}
                      disabled={isComingSoon}
                      comingSoon={isComingSoon}
                      onClick={() => !isComingSoon && handleUseCaseSelect(useCase.type)}
                    />
                  );
                })}
            </div>
          </StepContainer>
        );
      case 'form-filling':
        return renderUseCaseForm();
      default:
        return null;
    }
  };
  
  return (
    <>
      {renderStep()}
      
      <SimulationHistoryPanel 
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        onSelectSimulation={handleSelectHistorySimulation}
      />
      {isHistoryPanelOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          onClick={() => setIsHistoryPanelOpen(false)} 
        />
      )}
    </>
  );
};

export default UseCaseSelector;
