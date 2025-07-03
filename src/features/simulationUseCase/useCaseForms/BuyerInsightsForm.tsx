import React, { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { ArrowLeft, Globe } from 'lucide-react';
import { useAudience } from '../../../context/AudienceContext';

interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

interface BuyerInsightsFormProps {
  onSubmit: (simulationId: number) => void;
  selectedSegmentIds: number[];
  personaFilters: Record<number, SegmentPersonaFilters>;
  onBack: () => void;
  onEditStep?: () => void; // Add this prop
  initialFormData?: Record<string, any>; // Add this prop to receive saved form data
  onFormDataChange?: (data: Record<string, any>) => void; // Add this prop to save form data
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

const BuyerInsightsForm: React.FC<BuyerInsightsFormProps> = ({ 
  onSubmit, 
  selectedSegmentIds, 
  personaFilters, 
  onBack,
  onEditStep,
  initialFormData = {}, // Default to empty object if not provided
  onFormDataChange = () => {} // Default to no-op if not provided
}) => {
  const { audienceData } = useAudience();
  const [segments, setSegments] = useState<Segment[]>([]);
  
  // Initialize form values from initialFormData if available
  const [simName, setSimName] = useState(initialFormData.simName || '');
  const [productName, setProductName] = useState(initialFormData.productName || '');
  const [websiteUrl, setWebsiteUrl] = useState(initialFormData.websiteUrl || '');
  const [context, setContext] = useState(initialFormData.context || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // When any form field changes, update the parent component
  useEffect(() => {
    const formData = {
      simName,
      productName,
      websiteUrl,
      context
    };
    
    onFormDataChange(formData);
  }, [simName, productName, websiteUrl, context]); // Remove onFormDataChange from dependencies
  
  // Handle form field changes
  const handleFormChange = () => {
    if (onEditStep) {
      onEditStep();
    }
  };
  
  // Fetch segments
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
  
  const isFormValid = selectedSegmentIds.length > 0 && 
                      productName.trim() !== '';

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
        task: 'buyer-insights-report',
        objective: 'in-depth-buyer-insights-report',
        context: context,
        additional_data: {
          product_name: productName,
          website_url: websiteUrl
        }
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
            <p className="text-sm text-blue-800">Buyer insights report with {segments.length} selected segments</p>
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
            handleFormChange();
          }}
          placeholder="Enter a name for your simulation"
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What product, service, or company do you want insights on?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                handleFormChange();
              }}
              placeholder="Name"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                handleFormChange();
              }}
              placeholder="Website link (optional)"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
          Context (Optional)
        </label>
        <textarea
          id="context"
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={context}
          onChange={(e) => {
            setContext(e.target.value);
            handleFormChange();
          }}
          placeholder="Add any additional details or specific areas you want insights on..."
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          withArrow
        >
          {isSubmitting ? 'Generating Report...' : 'Generate Buyer Insights Report'}
        </Button>
      </div>
    </div>
  );
};

export default BuyerInsightsForm;
