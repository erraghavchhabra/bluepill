import React, { useState, useEffect } from 'react';
import { Building, Package, User, Globe } from 'lucide-react';
import Card from '../../components/Card';
import StepContainer from '../../components/StepContainer';
import Button from '../../components/Button';
import { useAudience } from '../../context/AudienceContext';

export type AudienceType = 'company' | 'product' | 'person';

interface AudienceTypeSelectProps {
  onNext: () => void;
  onBack: () => void;
}

const AudienceTypeSelect: React.FC<AudienceTypeSelectProps> = ({
  onNext,
  onBack,
}) => {
  const { audienceData, updateAudienceData } = useAudience();
  const [validationError, setValidationError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [touched, setTouched] = useState({
    type: false,
    websiteUrl: false
  });

  const audienceTypes = [
    {
      type: 'company' as AudienceType,
      icon: <Building className="w-6 h-6" />,
      title: 'A Company',
      description: 'Simulate how people respond to a brand or organization, you can always test on a segment of the audience later',
    },
    {
      type: 'product' as AudienceType,
      icon: <Package className="w-6 h-6" />,
      title: 'A Product',
      description: 'Simulate reactions to a specific product, feature, or service',
    },
    {
      type: 'person' as AudienceType,
      icon: <User className="w-6 h-6" />,
      title: 'A Person',
      description: 'Simulate how people might react to an influencer, executive, VC or candidate',
    },
  ];

  useEffect(() => {
    // Validate audience type whenever it changes
    if (touched.type && !audienceData.type) {
      setTypeError('Please select an audience type');
    } else {
      setTypeError('');
    }

    // Also validate website URL when it changes
    if (touched.websiteUrl) {
      if (!audienceData.websiteUrl || !audienceData.websiteUrl.trim()) {
        setValidationError('Website URL is required');
      } else if (!isValidUrl(audienceData.websiteUrl)) {
        setValidationError('Please enter a valid URL');
      } else {
        setValidationError('');
      }
    }
  }, [audienceData.type, audienceData.websiteUrl, touched.type, touched.websiteUrl]);

  const handleSelectType = (type: AudienceType) => {
    updateAudienceData({ type });
    setTouched(prev => ({ ...prev, type: true }));
  };

  const validateForm = (): boolean => {
    // Mark all fields as touched to show validation errors
    setTouched({ type: true, websiteUrl: true });
    
    let isValid = true;
    
    // Validate audience type
    if (!audienceData.type) {
      setTypeError('Please select an audience type');
      isValid = false;
    }
    
    // Validate website URL - now required
    if (!audienceData.websiteUrl || !audienceData.websiteUrl.trim()) {
      setValidationError('Website URL is required');
      isValid = false;
    } else if (!isValidUrl(audienceData.websiteUrl)) {
      setValidationError('Please enter a valid URL');
      isValid = false;
    }
    
    return isValid;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setValidationError('');
      setTypeError('');
      onNext();
    }
  };

  const isValidUrl = (string: string) => {
    try {
      if (!string.trim()) return false; // No longer allow empty URLs
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateAudienceData({ websiteUrl: value });
    setTouched(prev => ({ ...prev, websiteUrl: true }));
    
    if (!value || !value.trim()) {
      setValidationError('Website URL is required');
    } else if (!isValidUrl(value)) {
      setValidationError('Please enter a valid URL');
    } else {
      setValidationError('');
    }
  };

  return (
    <StepContainer
      title="Who is this audience for?"
      subtitle="We'll tailor your profiles based on the target of your simulation — is it a company, a product, or a person?"
      className="animate-fadeIn"
    >
      <div className="grid gap-4">
        {typeError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {typeError}
          </div>
        )}
        
        {audienceTypes.map((option) => (
          <Card
            key={option.type}
            onClick={() => handleSelectType(option.type)}
            selected={audienceData.type === option.type}
            className={`p-4 ${touched.type && !audienceData.type ? 'border-red-300' : ''}`}
            fullWidth
          >
            <div className="flex items-center">
              <div className={`mr-4 p-2 rounded-full ${audienceData.type === option.type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {option.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{option.title}</h3>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Globe className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Add website or social media URL</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          This helps us understand your brand or product better. We'll analyze the content to create more accurate profiles.
        </p>
        <div>
          <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1">
            Website URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="website-url"
            className={`w-full px-3 py-2 border ${validationError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'} rounded-md shadow-sm focus:outline-none`}
            placeholder="https://example.com"
            value={audienceData.websiteUrl}
            required
            onChange={handleWebsiteChange}
            onBlur={() => setTouched(prev => ({ ...prev, websiteUrl: true }))}
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
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
          onClick={handleContinue}
          withArrow
          disabled={!audienceData.type || !audienceData.websiteUrl || !isValidUrl(audienceData.websiteUrl)}
        >
          Continue
        </Button>
      </div>
    </StepContainer>
  );
};

export default AudienceTypeSelect;