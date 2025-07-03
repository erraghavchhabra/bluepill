import React, { useState, useEffect } from 'react';
import { Filter, Users, Sparkles, Check, AlertCircle } from 'lucide-react';
import StepContainer from '../../components/StepContainer';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAudience } from '../../context/AudienceContext';

interface AudiencePreviewProps {
  onSave: () => void;
  onBack: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

// Loading states for audience generation
type LoadingState = 
  | 'analyzing' 
  | 'segmenting' 
  | 'generating' 
  | 'refining' 
  | 'complete'
  | 'error';

interface Persona {
  id: number;
  name: string;
  data: {
    age?: number;
    gender?: string;
    occupation?: string;
    location?: string;
    education?: string;
    income?: string;
    company_name?: string;
    job_title?: string;
    goals?: string[];
    pain_points?: string[];
    interests?: string[];
    behaviors?: string[];
    values?: string[];
    preferred_channels?: string[];
    purchasing_habits?: string[];
    [key: string]: any; // For any other fields in the data object
  };
  created_at: string;
  updated_at: string;
}

interface Segment {
  id: number;
  name: string;
  len: number; // Changed from count to len to match API response
  description: string; // Added description from API response
  created_at: string;
  updated_at: string;
}

const AudiencePreview: React.FC<AudiencePreviewProps> = ({ onSave, onBack }) => {
  const { audienceData, updateAudienceData, isGenerating, setIsGenerating } = useAudience();
  const [audienceName, setAudienceName] = useState(audienceData.audienceName);
  const [loadingState, setLoadingState] = useState<LoadingState>('analyzing');
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [nameError, setNameError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [segmentPersonas, setSegmentPersonas] = useState<Persona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);
  
  // Create a state to track expanded sections for each persona
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedSegments = localStorage.getItem(`audience_${audienceData.audienceId}_segments`);
    const savedSelectedSegment = localStorage.getItem(`audience_${audienceData.audienceId}_selectedSegment`);
    
    if (savedSegments) {
      try {
        const parsedSegments = JSON.parse(savedSegments);
        if (parsedSegments && parsedSegments.length > 0) {
          setSegments(parsedSegments);
          setLoadingState('complete');
          setIsGenerating(false);
          
          // Restore selected segment if available
          if (savedSelectedSegment) {
            const segmentId = parseInt(savedSelectedSegment, 10);
            if (!isNaN(segmentId)) {
              setSelectedSegmentId(segmentId);
            } else if (parsedSegments.length > 0) {
              setSelectedSegmentId(parsedSegments[0].id);
            }
          } else if (parsedSegments.length > 0) {
            setSelectedSegmentId(parsedSegments[0].id);
          }
        }
      } catch (e) {
        console.error("Error parsing saved segments:", e);
      }
    }
  }, [audienceData.audienceId]);

  // Save segments to localStorage whenever they change
  useEffect(() => {
    if (segments.length > 0 && audienceData.audienceId) {
      localStorage.setItem(`audience_${audienceData.audienceId}_segments`, JSON.stringify(segments));
    }
  }, [segments, audienceData.audienceId]);

  // Save selected segment to localStorage whenever it changes
  useEffect(() => {
    if (selectedSegmentId !== null && audienceData.audienceId) {
      localStorage.setItem(`audience_${audienceData.audienceId}_selectedSegment`, selectedSegmentId.toString());
    }
  }, [selectedSegmentId, audienceData.audienceId]);

  // Toggle expanded state for a section
  const toggleSectionExpanded = (personaId: number, sectionName: string) => {
    const key = `${personaId}-${sectionName}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if a section is expanded
  const isSectionExpanded = (personaId: number, sectionName: string) => {
    const key = `${personaId}-${sectionName}`;
    return !!expandedSections[key];
  };

  // Validate audience name when it changes or is touched
  useEffect(() => {
    if (nameTouched && !audienceName.trim()) {
      setNameError('Please provide a name for your audience');
    } else {
      setNameError('');
    }
  }, [audienceName, nameTouched]);
  
  // Initialize audience generation on component mount if needed
  useEffect(() => {
    if (!audienceData.audienceId && !isGenerating) {
      startAudienceGeneration();
    } else if (audienceData.audienceId) {
      // If we already have an audience ID, try to fetch it
      pollAudienceStatus(audienceData.audienceId);
    }
  }, []);

  // Effect to fetch personas when a segment is selected
  useEffect(() => {
    if (selectedSegmentId !== null) {
      fetchSegmentPersonas(selectedSegmentId);
    }
  }, [selectedSegmentId]);

  // Fetch personas for a specific segment
  const fetchSegmentPersonas = async (segmentId: number) => {
    setIsLoadingPersonas(true);
    
    // Check if we have cached personas for this segment
    const cachedPersonas = localStorage.getItem(`audience_${audienceData.audienceId}_personas_${segmentId}`);
    if (cachedPersonas) {
      try {
        const parsedPersonas = JSON.parse(cachedPersonas);
        setSegmentPersonas(parsedPersonas);
        setIsLoadingPersonas(false);
        return;
      } catch (e) {
        console.error("Error parsing cached personas:", e);
      }
    }
    
    try {
      const response = await fetch(`${API_URL}/segments/${segmentId}/personas`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch segment personas');
      }
      
      const data = await response.json();
      
      // Process the personas to parse the data JSON string
      const processedPersonas = data.map((persona: any) => {
        try {
          return {
            ...persona,
            data: typeof persona.data === 'string' ? JSON.parse(persona.data) : persona.data
          };
        } catch (error) {
          console.error(`Error parsing persona data for ${persona.name}:`, error);
          return {
            ...persona,
            data: {} // Fallback to empty object if JSON parsing fails
          };
        }
      });
      
      // Cache the processed personas
      if (audienceData.audienceId) {
        localStorage.setItem(`audience_${audienceData.audienceId}_personas_${segmentId}`, JSON.stringify(processedPersonas));
      }
      
      // Update personas with properly parsed data
      setSegmentPersonas(processedPersonas);
    } catch (error) {
      console.error('Error fetching segment personas:', error);
    } finally {
      setIsLoadingPersonas(false);
    }
  };

  // Start audience generation
  const startAudienceGeneration = async () => {
    setIsGenerating(true);
    setLoadingState('analyzing');
    addLoadingMessage('Analyzing your input data...');
    
    try {
      // Read file content if present
      let fileContent = null;
      if (audienceData.uploadedFile) {
        fileContent = await readFileAsText(audienceData.uploadedFile);
      }
      
      // Prepare the audience data to send to backend as JSON
      const requestData = {
        type: audienceData.type || '',
        website: audienceData.websiteUrl || '',
        segment_type: audienceData.segmentType || '',
        specific_segment: audienceData.segmentType === 'specific' ? audienceData.specificSegment || '' : '',
        additional_info: audienceData.qualitativeInfo || ''
      };
      
      // If file content exists, append it to the additional_info
      if (fileContent) {
        const fileName = audienceData.uploadedFile?.name || 'uploaded_file';
        requestData.additional_info += `\n\nUploaded file (${fileName}):\n${fileContent}`;
      }

      // Make API call to create audience
      const response = await fetch(`${API_URL}/audience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      if (response.status !== 201) {
        throw new Error('Failed to start audience generation');
      }

      const data = await response.json();
      const audienceId = data.audience_id;
      
      updateAudienceData({ audienceId });
      
      // Start polling for audience generation status
      pollAudienceStatus(audienceId);
      
    } catch (error) {
      console.error('Error starting audience generation:', error);
      setError('An error occurred while creating your audience. Please try again.');
      setLoadingState('error');
    }
  };

  // Function to read file content as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  };

  // Poll for audience generation status
  const pollAudienceStatus = async (audienceId: number) => {
    try {
      // Check for segments at the correct endpoint
      const response = await fetch(`${API_URL}/audience/${audienceId}/segments`, {
        credentials: 'include',
      });

      // If response is not ok, audience is not ready yet
      if (!response.ok) {
        updateLoadingState();
        setTimeout(() => pollAudienceStatus(audienceId), 20000); // Poll every 20 seconds
        return;
      }

      // Audience segments endpoint returned a response, get the segments
      const segmentsData = await response.json();
      
      // If segments array is empty, continue polling
      if (!segmentsData || segmentsData.length === 0) {
        updateLoadingState();
        setTimeout(() => pollAudienceStatus(audienceId), 40000); // Poll every 40 seconds
        return;
      }
      
      // We have segments, update the UI
      setSegments(segmentsData);
      
      // If there are segments, select the first one by default and fetch its personas
      if (segmentsData && segmentsData.length > 0) {
        setSelectedSegmentId(segmentsData[0].id);
        // We'll fetch the personas for this segment in the useEffect that watches selectedSegmentId
        
        // Save to localStorage for persistence
        localStorage.setItem(`audience_${audienceId}_segments`, JSON.stringify(segmentsData));
        localStorage.setItem(`audience_${audienceId}_selectedSegment`, segmentsData[0].id.toString());
      }
      
      // Set loading state to complete
      setLoadingState('complete');
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Error polling audience status:', error);
      // Continue polling despite errors
      updateLoadingState();
      setTimeout(() => pollAudienceStatus(audienceId), 40000);
    }
  };

  // Update loading state and messages
  const updateLoadingState = () => {
    switch (loadingState) {
      case 'analyzing':
        setLoadingState('segmenting');
        addLoadingMessage('Identifying key audience segments...');
        break;
      case 'segmenting':
        setLoadingState('generating');
        addLoadingMessage('Generating profiles based on your data...');
        break;
      case 'generating':
        setLoadingState('refining');
        addLoadingMessage('Refining profile details and characteristics...');
        break;
      case 'refining':
        // Keep in refining state until complete
        addLoadingMessage('Adding final touches to your audience...');
        break;
      default:
        break;
    }
  };

  const addLoadingMessage = (message: string) => {
    setLoadingMessages(prev => [...prev, message]);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudienceName(e.target.value);
  };

  const validateAudienceName = (): boolean => {
    setNameTouched(true);
    
    if (!audienceName.trim()) {
      setNameError('Please provide a name for your audience');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateAudienceName() || !audienceData.audienceId) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Save audience with name using PUT request
      const response = await fetch(`${API_URL}/audience/${audienceData.audienceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: audienceName,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to save audience');
      }
      
      // Update audience data with the name
      updateAudienceData({ audienceName });
      
      // Clear any stored data for this audience since it's now saved
      localStorage.removeItem(`audience_${audienceData.audienceId}_segments`);
      localStorage.removeItem(`audience_${audienceData.audienceId}_selectedSegment`);
      
      // Also clear any cached personas
      segments.forEach(segment => {
        localStorage.removeItem(`audience_${audienceData.audienceId}_personas_${segment.id}`);
      });
      
      // Continue to the next step
      onSave();
    } catch (error) {
      console.error('Error saving audience:', error);
      setError('Failed to save audience. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSegmentSelect = (segmentId: number) => {
    setSelectedSegmentId(segmentId);
  };

  // If still generating, show loading state
  if (loadingState !== 'complete' && loadingState !== 'error') {
    return (
      <StepContainer
        title="Building your audience"
        className="animate-fadeIn"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-center mb-8">
              <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-600"></div>
            </div>
            
            <div className="space-y-6">
              {loadingMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex items-start ${index === loadingMessages.length - 1 ? 'text-blue-700' : 'text-gray-600'}`}
                >
                  <div className="mr-3 mt-0.5">
                    {index === loadingMessages.length - 1 ? (
                      <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    ) : (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className={`${index === loadingMessages.length - 1 ? 'font-medium' : ''}`}>
                    {message}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>This process typically takes 2-3 minutes.</p>
              <p>We'll notify you once your audience is ready.</p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={true}
            >
              Back
            </Button>
          </div>
        </div>
      </StepContainer>
    );
  }

  // If error occurred
  if (loadingState === 'error') {
    return (
      <StepContainer
        title="Something went wrong"
        className="animate-fadeIn"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Creating Audience</h3>
              <p className="text-gray-600 mb-6">{error || 'An unexpected error occurred. Please try again.'}</p>
              
              <Button 
                variant="primary" 
                onClick={() => startAudienceGeneration()}
              >
                Try Again
              </Button>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
            <Button 
              variant="outline" 
              onClick={onBack}
            >
              Back
            </Button>
          </div>
        </div>
      </StepContainer>
    );
  }

  // Render persona card with detailed information
  const renderPersonaCard = (persona: Persona) => {
    return (
      <Card key={persona.id} className="p-4 hover:bg-gray-50 overflow-auto" hoverable={false}>
        <div className="flex flex-col">
          {/* Persona header */}
          <div className="flex items-start mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
              {persona.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-lg">{persona.name}</h4>
              <p className="text-sm text-gray-600">
                {persona.data.occupation}
                {persona.data.company_name && persona.data.company_name.trim() !== '' && 
                 ` at ${persona.data.company_name}`}
              </p>
              {persona.data.location && (
                <p className="text-xs text-gray-500">{persona.data.location}</p>
              )}
            </div>
          </div>

          {/* Key demographic info */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {persona.data.age && (
              <div className="text-xs">
                <span className="text-gray-500">Age:</span> {persona.data.age}
              </div>
            )}
            {persona.data.gender && (
              <div className="text-xs">
                <span className="text-gray-500">Gender:</span> {persona.data.gender}
              </div>
            )}
            {persona.data.education && (
              <div className="text-xs col-span-2">
                <span className="text-gray-500">Education:</span> {persona.data.education}
              </div>
            )}
            {persona.data.income && (
              <div className="text-xs">
                <span className="text-gray-500">Income:</span> {persona.data.income}
              </div>
            )}
          </div>

          {/* Display array data in collapsible sections */}
          {(persona.data.goals || persona.data.pain_points || persona.data.interests || 
            persona.data.behaviors || persona.data.values || persona.data.preferred_channels ||
            persona.data.purchasing_habits) && (
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-3">
              {persona.data.goals && renderPersonaDataSection(persona.id, 'Goals', persona.data.goals)}
              {persona.data.pain_points && renderPersonaDataSection(persona.id, 'Pain Points', persona.data.pain_points)}
              {persona.data.interests && renderPersonaDataSection(persona.id, 'Interests', persona.data.interests)}
              {persona.data.behaviors && renderPersonaDataSection(persona.id, 'Behaviors', persona.data.behaviors)}
              {persona.data.values && renderPersonaDataSection(persona.id, 'Values', persona.data.values)}
              {persona.data.preferred_channels && renderPersonaDataSection(persona.id, 'Preferred Channels', persona.data.preferred_channels)}
              {persona.data.purchasing_habits && renderPersonaDataSection(persona.id, 'Purchasing Habits', persona.data.purchasing_habits)}
            </div>
          )}
          
          {/* Display any other data fields that weren't handled above */}
          <div className="mt-2">
            {Object.entries(persona.data).map(([key, value]) => {
              // Skip keys we've already handled
              const handledKeys = [
                'age', 'gender', 'occupation', 'location', 'education', 'income',
                'company_name', 'job_title', 'name', 'goals', 'pain_points', 
                'interests', 'behaviors', 'values', 'preferred_channels', 'purchasing_habits'
              ];
              
              if (handledKeys.includes(key) || value === null || value === undefined || value === '') {
                return null;
              }
              
              // Render other fields depending on data type
              if (Array.isArray(value)) {
                return renderPersonaDataSection(persona.id, key.replace(/_/g, ' '), value);
              } else {
                return (
                  <div key={`${persona.id}-${key}`} className="text-xs mb-1">
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </Card>
    );
  };

  // Helper function to render sections for array data - moved outside the render function
  const renderPersonaDataSection = (personaId: number, title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    
    const isExpanded = isSectionExpanded(personaId, title);
    
    return (
      <div key={`${personaId}-${title}`} className="text-sm">
        <button 
          className="flex items-center justify-between w-full text-left font-medium text-gray-700 mb-1"
          onClick={() => toggleSectionExpanded(personaId, title)}
        >
          <span className="capitalize">{title}</span>
          <span className="text-blue-600">{isExpanded ? '−' : '+'}</span>
        </button>
        
        {isExpanded && (
          <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1 mb-2">
            {items.map((item, idx) => (
              <li key={`${personaId}-${title}-${idx}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Render segment list with descriptions
  const renderSegments = () => {
    if (segments.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          <p>No segments available yet</p>
        </div>
      );
    }

    return segments.map((segment) => (
      <div 
        key={segment.id} 
        className={`p-3 border rounded-lg cursor-pointer
          ${selectedSegmentId === segment.id 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:bg-gray-50'}`}
        onClick={() => handleSegmentSelect(segment.id)}
      >
        <div className="flex justify-between items-center mb-1">
          <p className={`font-medium ${selectedSegmentId === segment.id ? 'text-blue-700' : 'text-gray-900'}`}>
            {segment.name}
          </p>
          <span className="text-sm text-gray-600">{segment.len}</span>
        </div>
        {segment.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{segment.description}</p>
        )}
      </div>
    ));
  };

  // Show completed audience
  return (
    <StepContainer
      title="Here's your AI-generated audience"
      className="animate-fadeIn"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-3/4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Profiles</h3>
              <Button variant="outline" size="sm" icon={<Filter className="w-4 h-4" />}>
                Filter
              </Button>
            </div>
            
            {isLoadingPersonas ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : segmentPersonas.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
                {segmentPersonas.map(persona => renderPersonaCard(persona))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500">
                <p>Select a segment to view profiles</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Segments</h3>
            </div>
            
            <div className="space-y-3">
              {renderSegments()}
            </div>
          </div>
          
          {/* Show selected segment description */}
          {selectedSegmentId && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">About this segment</h4>
              {segments.find(s => s.id === selectedSegmentId)?.description && (
                <p className="text-sm text-gray-600">
                  {segments.find(s => s.id === selectedSegmentId)?.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <div className="max-w-md mx-auto">
          <label htmlFor="audience-name" className="block text-sm font-medium text-gray-700 mb-2">
            Give your audience a name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="audience-name"
            className={`w-full px-3 py-2 border ${nameTouched && !audienceName.trim() ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm focus:outline-none`}
            value={audienceName}
            onChange={handleNameChange}
            onBlur={() => setNameTouched(true)}
            placeholder="E.g., Enterprise Tech Decision Makers"
          />
          
          {nameError && nameTouched && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
          
          <div className="mt-6 flex justify-center">
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleSave}
              loading={isSaving ? true : undefined} // Fixed boolean attribute issue
              disabled={isSaving || segments.length === 0}
              withArrow
            >
              Save & Continue
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isSaving}
        >
          Back
        </Button>
      </div>
    </StepContainer>
  );
};

export default AudiencePreview;
