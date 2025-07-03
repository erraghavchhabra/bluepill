import React, { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { ArrowLeft } from 'lucide-react';
import { useAudience } from '../../../context/AudienceContext';

interface SegmentPersonaFilters {          
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

interface ContentCreationFormProps {
  onSubmit: (simulationId: number) => void;
  selectedSegmentIds: number[];
  personaFilters: Record<number, SegmentPersonaFilters>;
  onBack: () => void;
  onEditStep?: () => void; // Add this prop to signal when fields are edited
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

const LongContentCreationForm: React.FC<ContentCreationFormProps> = ({ 
  onSubmit, 
  selectedSegmentIds, 
  personaFilters, 
  onBack,
  onEditStep,
  initialFormData = {}, // Default to empty object if not provided
  onFormDataChange = () => {} // Default no-op function if not provided
}) => {
  const { audienceData } = useAudience();
  
  // Initialize form state from initialFormData if available
  const [goal, setGoal] = useState(initialFormData.goal || '');
  const [context, setContext] = useState(initialFormData.context || '');
  const [simName, setSimName] = useState(initialFormData.simName || '');
  const [contentType, setContentType] = useState(initialFormData.contentType || '');
  const [contentTalkAbout, setContentTalkAbout] = useState(initialFormData.contentTalkAbout || '');
  const [contentSubject, setContentSubject] = useState(initialFormData.contentSubject || '');
  const [companyContext, setCompanyContext] = useState(initialFormData.companyContext || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update parent component with form data changes - FIX THE INFINITE LOOP
  useEffect(() => {
    const formData = {
      goal,
      context,
      simName,
      contentType,
      contentTalkAbout,
      contentSubject,
      companyContext
    };
    
    onFormDataChange(formData);
  }, [goal, context, simName, contentType, contentTalkAbout, contentSubject, companyContext]); // Remove onFormDataChange from dependencies

  // Handle changes and notify parent of edits
  const handleFieldChange = (
    setter: React.Dispatch<React.SetStateAction<string>>, 
    value: string
  ) => {
    setter(value);
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
        
        // We don't need to set segments as they're passed as props
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
        setError('Failed to load segments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSegments();
  }, [audienceData.audienceId]);
  // We no longer need the toggleSegment function since segments are selected in the previous step
  
  const isFormValid = selectedSegmentIds.length > 0 && goal.trim() !== '' && 
                     contentType.trim() !== '' && contentSubject.trim() !== '';
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare the simulation data
      const simulationData = {
        audience_id: audienceData.audienceId,
        segment_ids: selectedSegmentIds,
        persona_filters: personaFilters, // Include the persona filters
        task: 'create-content-long',
        name: simName,
        goal: goal,
        context: context,
        content_talk_about: contentTalkAbout,
        content_type: contentType,
        content_subject: contentSubject,
        company_context: companyContext
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
            Back to segment selection
          </Button>
          <span className="text-sm text-gray-500">{selectedSegmentIds.length} segments selected</span>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600 mb-3">
            {error}
          </div>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="simName" className="block text-sm font-medium text-gray-700 mb-2">
          Name your simulation
        </label>
        <input          id="simName"
          type="text"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={simName}
          onChange={(e) => handleFieldChange(setSimName, e.target.value)}
          placeholder='This is just for your reference. Example: "Q2 Email CTA Test" or "Procurement Persona Headline Test"'
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
          What are you trying to achieve with this content?
        </label>
        <input          type="text"
          id="goal"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={goal}
          onChange={(e) => handleFieldChange(setGoal, e.target.value)}
          placeholder='Describe the purpose. Example: "Drive demo signups," "Increase webinar attendance," or "Explain product benefits"'
        />
      </div>

       <div className="mb-6">
        <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
          What type of content are you creating?
        </label>
        <input          type="text"
          id="contentType"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={contentType}
          onChange={(e) => handleFieldChange(setContentType, e.target.value)}
          placeholder="Choose a format like: Email, Blog Post, Linkedin Ad, Webinar Script, Landing Page Headline"
        />
      </div>

    
      <div className="mb-6">
        <label htmlFor="contentSubject" className="block text-sm font-medium text-gray-700 mb-2">
          What’s the main topic or subject?
        </label>
        <input          type="text"
          id="contentSubject"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={contentSubject}
          onChange={(e) => handleFieldChange(setContentSubject, e.target.value)}
          placeholder='Headline or angle to explore. Example: "Al tools cut contract times in half" or "1-click insights for faster decisions"'
        />
      </div>
      
     


      <div className="mb-6">
        <label htmlFor="contentTalkAbout" className="block text-sm font-medium text-gray-700 mb-2">
          What do you want the content to focus on? Provide a detailed brief. 
        </label>
        <textarea         
          id="contentTalkAbout"
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={contentTalkAbout}
          onChange={(e) => handleFieldChange(setContentTalkAbout, e.target.value)}
          placeholder='Write a detailed brief describing what the content should be about. Include key points, structure, or tone. Example: "Highlight speed, cost savings, and real use cases. Use a confident tone and start with a common pain point."'
        />
      </div>
 

      <div className="mb-6">
        <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
          Is there anything else we should know? (Optional)
        </label>
        <textarea          id="context"
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={context}
          onChange={(e) => handleFieldChange(setContext, e.target.value)}
          placeholder='Include campaign timing, business objectives, or other helpful notes. Example: "Launching this week; part of a broader content refresh."'
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="companyContext" className="block text-sm font-medium text-gray-700 mb-2">
          Tell us about your brand voice or positioning (Optional)
        </label>
        <textarea
          id="companyContext"
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={companyContext}
          onChange={(e) => handleFieldChange(setCompanyContext, e.target.value)}
          placeholder='Describe how your brand should sound. Example: "Tone: confident, clear, consultative" or "Voice: playful but professional, like Slack or Notion"'
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          withArrow
        >
          {isSubmitting ? 'Starting Simulation...' : 'Generate Content'}
        </Button>
      </div>
    </div>
  );
};


export default LongContentCreationForm;
