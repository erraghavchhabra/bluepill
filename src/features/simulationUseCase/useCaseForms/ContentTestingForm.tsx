import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { ArrowLeft } from 'lucide-react';
import { useAudience } from '../../../context/AudienceContext';

interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

interface ContentTestingFormProps {
  onSubmit: (simulationId: number) => void;
  selectedSegmentIds: number[];
  personaFilters: Record<number, SegmentPersonaFilters>;
  onBack: () => void;
  onEditStep?: () => void; // New prop to signal when fields are edited
  initialFormData?: Record<string, any>; // Add this prop for form state persistence
  onFormDataChange?: (data: Record<string, any>) => void; // Add this prop for notifying parent of changes
}

interface Segment {
  id: number;
  name: string;
  description: string;
  len: number; // Number of personas
  created_at: string;
  updated_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const ContentTestingForm: React.FC<ContentTestingFormProps> = ({ 
  onSubmit, 
  selectedSegmentIds, 
  personaFilters, 
  onBack, 
  onEditStep,
  initialFormData = {},
  onFormDataChange = () => {}
}) => {
  const navigate = useNavigate();
  const { audienceData } = useAudience();
  const [segments, setSegments] = useState<Segment[]>([]);
  
  // Initialize form state from initialFormData
  const [testType, setTestType] = useState<'ab' | 'multivariate' | ''>(
    initialFormData.testType || ''
  );
  const [simName, setSimName] = useState(initialFormData.simName || '');
  const [goal, setGoal] = useState(initialFormData.goal || '');
  const [contents, setContents] = useState<string[]>(
    initialFormData.contents || ['']
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update parent component with form data changes
  useEffect(() => {
    const formData = {
      testType,
      simName,
      goal,
      contents
    };
    
    onFormDataChange(formData);
  }, [testType, simName, goal, contents]);
  
  // Handler to notify parent about edits
  const handleEdit = () => {
    if (onEditStep) {
      onEditStep();
    }
  };
  
  useEffect(() => {
    const fetchSegments = async () => {
      if (!audienceData.audienceId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/audience/${audienceData.audienceId}/segments`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch segments');
        }
        
        const data = await response.json();
        // Filter segments to only include the selected ones
        const filteredSegments = data.filter((segment: Segment) => 
          selectedSegmentIds.includes(segment.id)
        );
        setSegments(filteredSegments);
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
        setError('Failed to load segments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSegments();
  }, [audienceData.audienceId, selectedSegmentIds]);
  
  const handleContentChange = (index: number, value: string) => {
    const newContents = [...contents];
    newContents[index] = value;
    setContents(newContents);
    handleEdit();
  };
  
  const addContent = () => {
    setContents([...contents, '']);
    handleEdit();
  };
  
  const removeContent = (index: number) => {
    if (contents.length > 1) {
      const newContents = contents.filter((_, i) => i !== index);
      setContents(newContents);
      handleEdit();
    }
  };
  
  const isFormValid = selectedSegmentIds.length > 0 && 
                      testType !== '' && 
                      goal.trim() !== '' && 
                      contents.every(content => content.trim() !== '');

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare the simulation data
      const simulationData = {
        audience_id: audienceData.audienceId,
        segment_ids: selectedSegmentIds,
        persona_filters: personaFilters, // Include persona filters
        name: simName,
        task: 'a/b-multivariate-tests',
        objective: goal,
        test_type: testType,
        input_messages: contents
      };
      
      // Send the request to start a simulation
      const response = await fetch(`${API_URL}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(simulationData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to start simulation');
      }
      
      const data = await response.json();
      
      // Call onSubmit with the simulation ID instead of navigating away
      onSubmit(data.simulation_id);
      
    } catch (err) {
      console.error('Error starting simulation:', err);
      setError('Failed to start simulation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon={<ArrowLeft className="w-4 h-4 mr-1" />}
          >
            Back to use case selection
          </Button>
          <span className="text-sm text-gray-500">{selectedSegmentIds.length} segments selected</span>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 mb-3">
            {error}
          </div>
        ) : (
          <div className="p-3 bg-blue-50 rounded-md mb-4">
            <p className="text-sm text-blue-800">Testing content with {segments.length} selected segments</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="simName" className="block text-sm font-medium text-gray-700 mb-2">
          Simulation Name
        </label>
        <input
          id="simName"
          type="text"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={simName}
          onChange={(e) => {
            setSimName(e.target.value);
            handleEdit();
          }}
          placeholder='e.g., "Q2 Email CTA Test for Legal Ops Leaders" or "Headline Copy Test for Procurement Profiles"'
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Card
            onClick={() => {
              setTestType('ab');
              handleEdit();
            }}
            selected={testType === 'ab'}
            className="p-3"
            hoverable={true}
            aria-label="Select A/B Test option"
          >
            <div className="flex items-center">
              <div 
                className={`w-4 h-4 rounded-full mr-2 ${testType === 'ab' ? 'bg-blue-600' : 'border border-gray-300'}`}
                role="presentation"
              >
                {testType === 'ab' && (
                  <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                )}
              </div>
              <span>A/B Test</span>
            </div>
          </Card>
          
          <Card
            onClick={() => {
              setTestType('multivariate');
              handleEdit();
            }}
            selected={testType === 'multivariate'}
            className="p-3"
            hoverable={true}
            aria-label="Select Multivariate Test option"
          >
            <div className="flex items-center">
              <div 
                className={`w-4 h-4 rounded-full mr-2 ${testType === 'multivariate' ? 'bg-blue-600' : 'border border-gray-300'}`}
                role="presentation"
              >
                {testType === 'multivariate' && (
                  <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                )}
              </div>
              <span>Multivariate Test</span>
            </div>
          </Card>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
          Goal
        </label>
        <input
          id="goal"
          type="text"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            handleEdit();
          }}
          placeholder='e.g., “Drive demo sign-ups by prompting clicks on CTA in email,” “Educate CPOs to increase feature adoption via blog,”'
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Input Messages
          </label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addContent}
          >
            <span className="mr-1">+</span> Add Message
          </Button>
        </div>
        
        {contents.map((content, index) => (
          <div key={index} className="mb-3 relative">
            <textarea
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={content}
              onChange={(e) => handleContentChange(index, e.target.value)}
              placeholder='Paste the message or copy you would like to test here'            
              />
            {contents.length > 1 && (
              <button
                type="button"
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => removeContent(index)}
                aria-label="Remove content"
                title="Remove content"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          withArrow
        >
          {isSubmitting ? 'Starting Test...' : 'Run Test'}
        </Button>
      </div>
    </div>
  );
};

export default ContentTestingForm;