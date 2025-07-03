import React, { useRef, useState, useEffect } from 'react';
import StepContainer from '../../components/StepContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Upload, X, AlertCircle } from 'lucide-react';
import { useAudience } from '../../context/AudienceContext';

interface AudienceSegmentSelectProps {
  onNext: () => void;
  onBack: () => void;
}

const AudienceSegmentSelect: React.FC<AudienceSegmentSelectProps> = ({ onNext, onBack }) => {
  const { audienceData, updateAudienceData } = useAudience();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState('');
  const [touched, setTouched] = useState({
    segmentType: false,
    specificSegment: false
  });
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessages = [
    'Uploading...',
    'Processing file...',
    'Analyzing data...',
    'Almost there...'
  ];

  // Validate form whenever relevant values change
  useEffect(() => {
    if (touched.segmentType && !audienceData.segmentType) {
      setValidationError('Please select a segment type');
    } else if (
      touched.specificSegment && 
      audienceData.segmentType === 'specific' && 
      !audienceData.specificSegment.trim()
    ) {
      setValidationError('Please describe the specific segment');
    } else {
      setValidationError('');
    }
  }, [
    audienceData.segmentType, 
    audienceData.specificSegment, 
    touched.segmentType, 
    touched.specificSegment
  ]);

  // Add effect for rotating loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isUploading) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 30000); // Rotate every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading]);

  const handleSegmentTypeChange = (type: 'all' | 'specific') => {
    updateAudienceData({ segmentType: type });
    setTouched(prev => ({ ...prev, segmentType: true }));
  };

  const handleSpecificSegmentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAudienceData({ specificSegment: e.target.value });
    setTouched(prev => ({ ...prev, specificSegment: true }));
  };

  const handleQualitativeInfoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateAudienceData({ qualitativeInfo: e.target.value });
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setValidationError('File size exceeds 10MB limit');
        return;
      }

      // Check file type
      const allowedTypes = ['.csv', '.json', '.doc', '.docx', '.txt'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        setValidationError('Only CSV, JSON, DOC, DOCX, and TXT files are allowed');
        return;
      }
      
      setIsUploading(true);
      setValidationError('');
      setLoadingMessageIndex(0); // Reset loading message index
      
      // Simulate upload delay
      setTimeout(() => {
        updateAudienceData({ uploadedFile: file });
        setIsUploading(false);
      }, 1000);
    }
  };

  const handleRemoveFile = () => {
    updateAudienceData({ uploadedFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    // Mark required fields as touched
    setTouched({
      segmentType: true,
      specificSegment: audienceData.segmentType === 'specific'
    });
    
    // Validate segment type selection
    if (!audienceData.segmentType) {
      setValidationError('Please select a segment type');
      return false;
    }
    
    // Validate specific segment description if that option is selected
    if (audienceData.segmentType === 'specific' && !audienceData.specificSegment.trim()) {
      setValidationError('Please describe the specific segment');
      return false;
    }
    
    return true;
  };

  const handleBuildAudience = async () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <StepContainer
      title="Details about your audience"
      subtitle="Should this audience represent your entire customer base or just a specific segment?"
      className="animate-fadeIn"
    >
      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      <div className="grid gap-4 mb-6">
        <Card
          onClick={() => handleSegmentTypeChange('all')}
          selected={audienceData.segmentType === 'all'}
          className={`p-4 ${touched.segmentType && !audienceData.segmentType ? 'border-red-300' : ''}`}
          fullWidth
        >
          <div className="flex items-start">
            <div className="mr-4 pt-0.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${audienceData.segmentType === 'all' ? 'border-blue-600' : 'border-gray-300'}`}>
                {audienceData.segmentType === 'all' && <div className="w-3 h-3 rounded-full bg-blue-600"></div>}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">All Customers</h3>
              <p className="text-sm text-gray-600">Profiles will reflect your entire customer base. You can segment them later if needed.</p>
            </div>
          </div>
        </Card>
        
        <Card
          onClick={() => handleSegmentTypeChange('specific')}
          selected={audienceData.segmentType === 'specific'}
          className={`p-4 ${touched.segmentType && !audienceData.segmentType ? 'border-red-300' : ''}`}
          fullWidth
        >
          <div className="flex items-start">
            <div className="mr-4 pt-0.5">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${audienceData.segmentType === 'specific' ? 'border-blue-600' : 'border-gray-300'}`}>
                {audienceData.segmentType === 'specific' && <div className="w-3 h-3 rounded-full bg-blue-600"></div>}
              </div>
            </div>
            <div className="w-full">
              <h3 className="text-lg font-medium text-gray-900">A Specific Segment</h3>
              <p className="text-sm text-gray-600 mb-3">e.g., 'Procurement leaders in healthcare and Technology,' 'Gen Z buyers', etc.</p>
              
              {audienceData.segmentType === 'specific' && (
                <div className="mt-2 w-full">
                  <label htmlFor="segment" className="block text-sm font-medium text-gray-700 mb-1">
                    Describe the segment you have in mind <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="segment"
                    rows={3}
                    className={`w-full px-3 py-2 border ${touched.specificSegment && !audienceData.specificSegment.trim() ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md shadow-sm focus:outline-none`}
                    value={audienceData.specificSegment}
                    onChange={handleSpecificSegmentChange}
                    onBlur={() => setTouched(prev => ({ ...prev, specificSegment: true }))}
                    placeholder="E.g., Senior IT decision makers in Fortune 500 companies"
                  />
                  {touched.specificSegment && !audienceData.specificSegment.trim() && (
                    <p className="mt-1 text-sm text-red-600">This field is required</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="border-t border-gray-200 pt-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Optional data input</h3>
        <p className="text-sm text-gray-600 mb-4">If you have any info about your customers, share it below to help us build a lifelike audience.</p>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept=".csv,.json,.doc,.docx,.txt"
            />
            
            {audienceData.uploadedFile ? (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-md mr-3">
                      <Upload className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{audienceData.uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(audienceData.uploadedFile.size / 1024)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleRemoveFile}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    aria-label="Remove file"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={handleFileUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className={`text-gray-500 ${isUploading ? 'opacity-50' : ''}`}>
                  <Upload className="mx-auto h-12 w-12" />
                  <p className="mt-1 text-sm">
                    {isUploading ? loadingMessages[loadingMessageIndex] : 'Upload file (CSV, JSON, Docs)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Max size: 10MB</p>
                </div>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-1 rounded-full w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <textarea
              className="w-full h-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any qualitative information about your customers..."
              value={audienceData.qualitativeInfo}
              onChange={handleQualitativeInfoChange}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Back
        </Button>
        <Button 
          variant="primary" 
          onClick={handleBuildAudience}
          withArrow
        >
          Build My Audience
        </Button>
      </div>
    </StepContainer>
  );
};

export default AudienceSegmentSelect;