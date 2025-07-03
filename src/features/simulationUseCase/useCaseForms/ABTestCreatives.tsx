import React, { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useAudience } from '../../../context/AudienceContext';

interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

interface ABTestCreativesProps {
  onSubmit: (simulationId: number) => void;
  selectedSegmentIds: number[];
  personaFilters: Record<number, SegmentPersonaFilters>;
  onBack: () => void;
  onEditStep?: () => void; // Add this prop for edit tracking
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

type ImageFile = {
  file: File;
  preview: string;
};

const API_URL = import.meta.env.VITE_API_URL || '';

const ABTestCreativesForm: React.FC<ABTestCreativesProps> = ({ 
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
  
  // Initialize form state from initialFormData
  const [simName, setSimName] = useState(initialFormData.simName || '');
  const [goal, setGoal] = useState(initialFormData.goal || '');
  const [images, setImages] = useState<ImageFile[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Note: We can't persist image files directly, but we'll persist other form data
  useEffect(() => {
    const formData = {
      simName,
      goal
      // Images can't be serialized, so we won't include them
    };
    
    onFormDataChange(formData);
  }, [simName, goal, onFormDataChange]);
  
  // Handler to notify parent about edits
  const handleEdit = () => {
    if (onEditStep) {
      onEditStep();
    }
  };
  
  // Clean up image previews on unmount
  useEffect(() => {
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, [images]);

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
  
  // Image handling functions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImages([...images, ...newImages]);
    handleEdit();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeImage = (index: number) => {
    const imageToRemove = images[index];
    URL.revokeObjectURL(imageToRemove.preview);
    
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    handleEdit();
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const isFormValid = selectedSegmentIds.length > 0 && goal.trim() !== '' && images.length > 0;

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Step 1: Get image descriptions from the API
      const imageDescriptionsFormData = new FormData();
      images.forEach(image => {
        imageDescriptionsFormData.append('images', image.file);
      });
      
      const descriptionsResponse = await fetch(`${API_URL}/images/describe`, {
        method: 'POST',
        credentials: 'include',
        body: imageDescriptionsFormData
      });
      
      if (!descriptionsResponse.ok) {
        throw new Error('Failed to get image descriptions');
      }
      
      const descriptionsData = await descriptionsResponse.json();
      const imageDescriptions = descriptionsData.descriptions;
      
      // Step 2: Submit the simulation with images and descriptions
      const body = {
        audience_id: audienceData.audienceId,
        task: 'channel-event-strategy',
        name: simName,
        goal: goal,
        image_descriptions: imageDescriptions,
        segment_ids: selectedSegmentIds,
        persona_filters: personaFilters, // Include persona filters
      };

      // Send the request to start a simulation with image uploads and descriptions
      const response = await fetch(`${API_URL}/simulations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to start simulation');
      }

      const data = await response.json();
      
      // Call onSubmit with the simulation ID
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
            <p className="text-sm text-blue-800">A/B Testing creatives with {segments.length} selected segments</p>
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
          placeholder="Enter a name for your simulation"
        />
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
          placeholder="What are you trying to achieve with this test?"
        />
      </div>


      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Creative Images
          </label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerFileInput}
            aria-label="Add creative images"
            title="Add creative images"
          >
            <Upload className="w-4 h-4 mr-1" /> Add Images
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
            aria-label="Upload creative images"
            title="Upload creative images"
          />
        </div>
        
        {images.length === 0 ? (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={triggerFileInput}
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img 
                  src={image.preview} 
                  alt={`Creative ${index + 1}`}
                  className="h-32 w-full object-cover rounded-md border border-gray-300"
                />
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  title={`Remove image ${index + 1}`}
                  className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <div 
              className="h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={triggerFileInput}
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="mt-1 text-xs text-gray-500">Add more</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          withArrow
        >
          {isSubmitting ? 'Running Test...' : 'Run Test'}
        </Button>
      </div>
    </div>
  );
};

export default ABTestCreativesForm;