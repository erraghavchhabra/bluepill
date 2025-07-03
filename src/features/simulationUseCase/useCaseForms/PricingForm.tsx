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

interface PricingFormProps {
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

const PricingForm: React.FC<PricingFormProps> = ({ 
  onSubmit, 
  selectedSegmentIds, 
  personaFilters, 
  onBack, 
  onEditStep,
  initialFormData = {},
  onFormDataChange = () => {} 
}) => {
  const { audienceData } = useAudience();
  const [segments, setSegments] = useState<Segment[]>([]);
  
  // Initialize state from initialFormData
  const [objective, setObjective] = useState(initialFormData.objective || '');
  const [priceTiers, setPriceTiers] = useState(
    initialFormData.priceTiers || [{ name: '', price: '' }]
  );
  const [simName, setSimName] = useState(initialFormData.simName || '');
  const [productDescription, setProductDescription] = useState(initialFormData.productDescription || '');
  const [productValue, setProductValue] = useState(initialFormData.productValue || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Notify parent component of form data changes
  useEffect(() => {
    const formData = {
      objective,
      priceTiers,
      simName,
      productDescription,
      productValue
    };
    
    onFormDataChange(formData);
  }, [objective, priceTiers, simName, productDescription, productValue]); // Remove onFormDataChange from dependencies
  
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
  
  // Add a new price tier
  const addPriceTier = () => {
    setPriceTiers([...priceTiers, { name: '', price: '' }]);
    if (onEditStep) onEditStep();
  };
  
  // Remove a price tier
  const removePriceTier = (indexToRemove: number) => {
    setPriceTiers(priceTiers.filter((_, index) => index !== indexToRemove));
    if (onEditStep) onEditStep();
  };
  
  // Update a price tier
  const updatePriceTier = (index: number, field: 'name' | 'price', value: string) => {
    const updatedTiers = [...priceTiers];
    updatedTiers[index][field] = value;
    setPriceTiers(updatedTiers);
    
    // Signal that the form has been edited
    if (onEditStep) {
      onEditStep();
    }
  };
  
  const isFormValid = 
    selectedSegmentIds.length > 0 && 
    objective !== '' && 
    priceTiers.every(tier => tier.name.trim() !== '' && tier.price.trim() !== '');

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
        task: 'pricing-analysis',
        name: simName,
        objective: objective,
        price_tiers: priceTiers,
        product_description: productDescription,
        value_proposition: productValue
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
            <p className="text-sm text-blue-800">Testing pricing with {segments.length} selected segments</p>
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
            if (onEditStep) onEditStep();
          }}
          placeholder="Enter a name for your simulation"
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-2">
          Objective
        </label>
        <select
          id="objective"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={objective}
          onChange={(e) => {
            setObjective(e.target.value);
            if (onEditStep) onEditStep();
          }}
        >
          <option value="">Select an objective</option>
          <option value="maximize_revenue">Maximize Revenue</option>
          <option value="maximize_margin">Maximize Margin</option>
          <option value="maximize_market_share">Maximize Market Share</option>
          <option value="price_sensitivity">Test Price Sensitivity</option>
        </select>
      </div>
      
      <div className="mb-6">
        <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-2">
          Product Description
        </label>
        <textarea
          id="productDescription"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          value={productDescription}
          onChange={(e) => {
            setProductDescription(e.target.value);
            if (onEditStep) onEditStep();
          }}
          placeholder="Describe your product or service"
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="productValue" className="block text-sm font-medium text-gray-700 mb-2">
          Value Proposition
        </label>
        <textarea
          id="productValue"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          value={productValue}
          onChange={(e) => {
            setProductValue(e.target.value);
            if (onEditStep) onEditStep();
          }}
          placeholder="What value does your product provide to customers?"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Price Tiers
          </label>
          <Button 
            variant="outline"
            size="sm"
            onClick={addPriceTier}
          >
            Add Price Tier
          </Button>
        </div>
        
        <div className="space-y-3">
          {priceTiers.map((tier, index) => (
            <div key={index} className="flex space-x-2 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={tier.name}
                  onChange={(e) => updatePriceTier(index, 'name', e.target.value)}
                  placeholder="Tier name (e.g., Basic, Premium)"
                />
              </div>
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={tier.price}
                    onChange={(e) => updatePriceTier(index, 'price', e.target.value)}
                    placeholder="Price"
                    aria-label={`Price for ${tier.name || `tier ${index + 1}`}`}
                  />
                </div>
              </div>
              {priceTiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePriceTier(index)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${tier.name || `tier ${index + 1}`}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Starting...' : 'Start Simulation'}
        </Button>
      </div>
    </div>
  );
};

export default PricingForm;