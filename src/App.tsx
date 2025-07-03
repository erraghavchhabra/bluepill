import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProgressSteps from './components/ProgressSteps';
import LandingScreen from './features/landing/LandingScreen';
import AudienceTypeSelect from './features/buildAudience/AudienceTypeSelect';
import AudienceSegmentSelect from './features/buildAudience/AudienceSegmentSelect';
import AudiencePreview from './features/buildAudience/AudiencePreview';
import ExistingAudiences from './features/existingAudience/ExistingAudiences';
import UseCaseSelector from './features/simulationUseCase/UseCaseSelector';
import SimulationResults from './features/simulationResults/SimulationResults';
import ChatPage from './features/chat/ChatPage';
import AdminPanel from './features/admin/AdminPanel';
import AnalysisPage from './features/analysis/AnalysisPage';
import ChatWithPersona from './features/chatWithPersona/ChatWithPersona';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudienceProvider, useAudience } from './context/AudienceContext';
import Auth from './features/auth/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import Button from './components/Button';
import { ArrowLeft } from 'lucide-react';

type Step = 
  | 'landing'
  | 'audience-type'
  | 'audience-segment'
  | 'audience-preview'
  | 'existing-audiences'
  | 'simulation-use-case'
  | 'simulation-results';

type FlowStep = 'segment-selection' | 'use-case-selection' | 'form-filling' | 'results-view';

// Main application content component
const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { currentStep, setCurrentStep, audienceData, updateAudienceData } = useAudience();
  const [stepMapping, setStepMapping] = useState<Step>('landing');
  const [flowType, setFlowType] = useState<'build' | 'existing' | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(null);
  const [selectedAudienceName, setSelectedAudienceName] = useState<string>('');
  const [currentStepInUseCase, setCurrentStepInUseCase] = useState<FlowStep>('segment-selection');
  const [hasEditedStep, setHasEditedStep] = useState<boolean>(false); // Track if user has edited a step
  const [formState, setFormState] = useState<Record<string, any>>({}); // Track form data
  const [visitedSteps, setVisitedSteps] = useState<Set<Step>>(new Set(['landing']));
  const [visitedUseCaseSteps, setVisitedUseCaseSteps] = useState<Set<FlowStep>>(new Set());
  const [currentSimulationId, setCurrentSimulationId] = useState<number | null>(null); // Add state to store the simulation ID that was generated
  
  // Map numeric currentStep to string step type
  const updateStepMapping = useCallback((step: number) => {
    switch (step) {
      case 1: 
        setStepMapping('audience-type');
        break;
      case 2:
        setStepMapping('audience-segment');
        break;
      case 3:
        setStepMapping('audience-preview');
        break;
      default:
        setStepMapping('landing');
    }
  }, []);
  
  const handleBuildAudience = useCallback(() => {
    setFlowType('build');
    setCurrentStep(1); // Set to first step - Audience Type
    updateStepMapping(1);
  }, [setFlowType, setCurrentStep, updateStepMapping]);
  
  const handleSelectExisting = useCallback(() => {
    setFlowType('existing');
    setStepMapping('existing-audiences');
  }, [setFlowType, setStepMapping]);
  
  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    updateStepMapping(nextStep);
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateStepMapping(prevStep);
    } else {
      // Go back to landing
      setStepMapping('landing');
      setFlowType(null);
    }
  };
  
  const handleReset = () => {
    setStepMapping('landing');
    setCurrentStep(1);
    setFlowType(null);
    updateAudienceData({
      type: null,
      websiteUrl: '',
      segmentType: null,
      specificSegment: '',
      qualitativeInfo: '',
      uploadedFile: null,
      audienceId: null,
      audienceName: '',
      selectedUseCase: null,
      selectedSegments: [],
      personaFilters: {},
    });
  };
  
  // Check URL path and set appropriate step on component mount or route change
  useEffect(() => {
    if (location.pathname === '/build-audience') {
      handleBuildAudience();
    } else if (location.pathname === '/simulate') {
      handleSelectExisting();
    }
  }, [location.pathname, handleBuildAudience, handleSelectExisting]);

  const handleSelectAudience = (audienceId: number, audienceName: string) => {
    setSelectedAudienceId(audienceId);
    setSelectedAudienceName(audienceName);
    // Skip segment selection step and go directly to use case
    updateAudienceData({ 
      audienceId: audienceId,
      audienceName: audienceName,
      selectedSegments: [], // Initialize with empty segments
      personaFilters: {}    // Initialize with empty filters
    });
    setStepMapping('simulation-use-case');
    // Reset edit tracking when selecting a new audience
    setHasEditedStep(false);
    // Mark this step as visited
    setVisitedSteps(prev => new Set([...prev, 'existing-audiences', 'simulation-use-case']));
  };
  
  const handleFormDataChange = (useCaseType: string, data: Record<string, any>) => {
    setFormState(prev => ({
      ...prev,
      [useCaseType.toLowerCase()]: data
    }));
  };

  const hasVisitedStep = (step: Step): boolean => {
    return visitedSteps.has(step);
  };

  const hasVisitedUseCaseStep = (step: FlowStep): boolean => {
    return visitedUseCaseSteps.has(step);
  };

  const handleUseCaseStepChange = (newStep: FlowStep) => {
    console.log(`Changing step from ${currentStepInUseCase} to ${newStep}`);
    setCurrentStepInUseCase(newStep);
    
    // Mark this step as visited
    setVisitedUseCaseSteps(prev => new Set([...prev, newStep]));
    
    // If moving forward in the flow naturally, reset the edit flag
    if (
      (currentStepInUseCase === 'segment-selection' && newStep === 'use-case-selection') ||
      (currentStepInUseCase === 'use-case-selection' && newStep === 'form-filling') ||
      (currentStepInUseCase === 'form-filling' && newStep === 'results-view')
    ) {
      setHasEditedStep(false);
    }
  };

  const getProgressSteps = () => {
    if (flowType === 'build') {
      return [
        { 
          label: audienceData.type ? `Type: ${audienceData.type}` : 'Audience Type', 
          completed: currentStep > 1, 
          current: currentStep === 1,
          onClick: currentStep > 1 ? () => {
            setCurrentStep(1);
            updateStepMapping(1);
          } : undefined
        },
        { 
          label: audienceData.segmentType ? `Segments (${audienceData.segmentType})` : 'Define Segments', 
          completed: currentStep > 2, 
          current: currentStep === 2,
          onClick: currentStep > 2 ? () => {
            setCurrentStep(2);
            updateStepMapping(2);
          } : undefined
        },
        { 
          label: 'Preview & Save', 
          completed: false, 
          current: currentStep === 3,
          onClick: undefined
        }
      ];
    } else if (flowType === 'existing') {
      // Expanded 5-step flow for better granularity
      return [
        { 
          label: selectedAudienceName ? `1. Audience: ${selectedAudienceName}` : '1. Select Audience', 
          completed: hasVisitedStep('simulation-use-case') || stepMapping === 'simulation-results', 
          current: stepMapping === 'existing-audiences',
          // Always allow going back to audience selection
          onClick: () => {
            setStepMapping('existing-audiences');
            setHasEditedStep(false); // Reset edits when going back to first step
          }
        },
        { 
          label: '2. Select Segments',
          completed: hasVisitedUseCaseStep('use-case-selection') || 
                     hasVisitedUseCaseStep('form-filling') || 
                     hasVisitedUseCaseStep('results-view') ||
                     stepMapping === 'simulation-results',
          current: stepMapping === 'simulation-use-case' && currentStepInUseCase === 'segment-selection',
          // Make this clickable if we've been to segments before
          onClick: (hasVisitedUseCaseStep('segment-selection') || selectedAudienceId) ? 
            () => {
              setStepMapping('simulation-use-case');
              setCurrentStepInUseCase('segment-selection');
              setHasEditedStep(false);
            } : undefined
        },
        { 
          label: audienceData.selectedUseCase ? `3. Use Case: ${audienceData.selectedUseCase}` : '3. Select Use Case', 
          completed: hasVisitedUseCaseStep('form-filling') || 
                     hasVisitedUseCaseStep('results-view') || 
                     stepMapping === 'simulation-results',
          current: stepMapping === 'simulation-use-case' && currentStepInUseCase === 'use-case-selection',
          // Make this clickable if we've been to this step before or selected a use case
          onClick: (hasVisitedUseCaseStep('use-case-selection') || audienceData.selectedUseCase) ? 
            () => {
              setStepMapping('simulation-use-case');
              setCurrentStepInUseCase('use-case-selection');
              // If we're going back to this step from a later step, reset edit flag
              if (currentStepInUseCase === 'form-filling' || currentStepInUseCase === 'results-view') {
                setHasEditedStep(false);
              }
            } : undefined
        },
        { 
          label: '4. Complete Form', 
          completed: hasVisitedUseCaseStep('results-view') || stepMapping === 'simulation-results',
          current: stepMapping === 'simulation-use-case' && currentStepInUseCase === 'form-filling',
          // Make this clickable if we've been to this step before
          onClick: (hasVisitedUseCaseStep('form-filling') || formState[audienceData.selectedUseCase?.toLowerCase()]) ? 
            () => {
              setStepMapping('simulation-use-case');
              setCurrentStepInUseCase('form-filling');
              // If we're going back to this step from results view, reset edit flag
              if (currentStepInUseCase === 'results-view') {
                setHasEditedStep(false);
              }
            } : undefined
        },
        { 
          label: '5. View Results', 
          completed: false, // This is always false as it's the last step
          current: stepMapping === 'simulation-results' || 
                   (stepMapping === 'simulation-use-case' && currentStepInUseCase === 'results-view'),
          // Make this clickable if we've been to this step before
          onClick: (hasVisitedUseCaseStep('results-view') || stepMapping === 'simulation-results') ? 
            () => {
              setStepMapping('simulation-results');
            } : undefined
        },
      ];
    }
    return [];
  };

  const renderCurrentStep = () => {
    switch (stepMapping) {
      case 'landing':
        return (
          <LandingScreen 
            onBuildAudience={handleBuildAudience} 
            onSelectExisting={handleSelectExisting} 
          />
        );
      case 'audience-type':
        return (
          <AudienceTypeSelect 
            onNext={handleNext} 
            onBack={handleBack}
          />
        );
      case 'audience-segment':
        return (
          <AudienceSegmentSelect 
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'audience-preview':
        return (
          <AudiencePreview 
            onSave={handleReset}
            onBack={handleBack}
          />
        );
      case 'existing-audiences':
        return (
          <ExistingAudiences 
            onSelectAudience={handleSelectAudience}
            onBack={handleReset}
          />
        );
      case 'simulation-use-case':
        return (
          <UseCaseSelector 
            onComplete={(simulationId) => {
              setCurrentSimulationId(simulationId);
              setStepMapping('simulation-results');
              // Mark this step as visited
              setVisitedSteps(prev => new Set([...prev, 'simulation-results']));
            }}
            onBack={() => {
              setStepMapping('existing-audiences');
              setHasEditedStep(false); // Reset edit flag when going back to audiences
            }}
            audienceId={selectedAudienceId || 0}
            onStepChange={handleUseCaseStepChange}
            onEditStep={() => {
              setHasEditedStep(true);
              console.log("User edited step, restricting forward navigation");
            }}
            currentStep={currentStepInUseCase}
            hasEditedStep={hasEditedStep}
            onFormDataChange={handleFormDataChange}
          />
        );
      case 'simulation-results':
        return (
          <div className="w-full" style={{ height: "90vh", overflow: "hidden" }}>
            {currentSimulationId ? (
              <div className="h-full flex flex-col">
                <div className="mb-4 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStepMapping('simulation-use-case');
                      setCurrentStepInUseCase('form-filling');
                    }}
                    icon={<ArrowLeft className="w-4 h-4 mr-1" />}
                  >
                    Back to form
                  </Button>
                </div>
                <div className="flex-grow overflow-hidden">
                  <SimulationResults simulationId={currentSimulationId} embedded={true} />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No simulation results to display.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setStepMapping('simulation-use-case');
                    setCurrentStepInUseCase('segment-selection');
                  }}
                >
                  Start a new simulation
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // If not authenticated, show auth screen
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  // If authenticated, show main app content
  return (
    <Layout>
      {stepMapping !== 'landing' && (
        <div className="mb-8">
          <ProgressSteps steps={getProgressSteps()} />
        </div>
      )}
      {renderCurrentStep()}
    </Layout>
  );
};

// Authentication component with navigation
const AuthRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // If user is already authenticated, redirect to home or the previous location
  if (isAuthenticated) {
    const state = location.state as { from?: { pathname: string } };
    const from = state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }
  
  return <Auth onAuthSuccess={() => {}} />;
};

// Route wrapper component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      } />
      <Route path="/build-audience" element={
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      } />
      <Route path="/simulate" element={
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      } />
      <Route path="/simulation-results/:simulationId" element={
        <ProtectedRoute>
          <SimulationResults />
        </ProtectedRoute>
      } />
      <Route path="/analysis" element={
        <ProtectedRoute>
          <AnalysisPage />
        </ProtectedRoute>
      } />
      <Route path="/analysis/:simulationId" element={
        <ProtectedRoute>
          <AnalysisPage />
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPanel />
        </ProtectedRoute>
      } />
      <Route path="/chat-with-persona" element={
        <ProtectedRoute>
          <ChatWithPersona />
        </ProtectedRoute>
      } />
      <Route path="/auth" element={<AuthRoute />} />
    </Routes>
  );
};

// Main App component that provides contexts
function App() {
  return (
    <AuthProvider>
      <AudienceProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AudienceProvider>
    </AuthProvider>
  );
}

export default App;