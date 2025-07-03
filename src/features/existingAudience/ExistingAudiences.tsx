import React, { useState, useEffect } from 'react';
import { Calendar, Users, ArrowLeft } from 'lucide-react';
import StepContainer from '../../components/StepContainer';
import Card from '../../components/Card';
import Button from '../../components/Button';

interface Segment {
  id: number;
  name: string;
  persona_count: number;
  sub_industry?: string;
}

interface Audience {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  len: number; // Number of segments
  total_personas?: number;
  segments?: Segment[];
  website?: string;
  business_description?: string;
  industry?: string;
  core_need?: string;
  additional_info?: string;
  audience_purpose?: string;
  customers?: string;
  location?: string;
  age_range?: string;
  income_level?: string;
}

interface ExistingAudiencesProps {
  onSelectAudience: (audienceId: number, audienceName: string) => void;
  onBack: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const ExistingAudiences: React.FC<ExistingAudiencesProps> = ({ onSelectAudience, onBack }) => {
  const [selectedAudience, setSelectedAudience] = useState<number | null>(null);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAudiences = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/audience`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch audiences');
        }
        
        const data = await response.json();
        setAudiences(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching audiences:', err);
        setError('Failed to load audiences. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAudiences();
  }, []);

  const handleSelectAudience = (audience: Audience) => {
    setSelectedAudience(audience.id);
    // Allow a small delay to show the selection before navigating
    setTimeout(() => {
      onSelectAudience(audience.id, audience.name);
    }, 300);
  };
  
  // This space intentionally left empty after removing unused functions

  return (
    <StepContainer
      title="Select an Existing Audience"
      subtitle="Choose from your saved audiences to run a simulation"
      className="animate-fadeIn"
    >
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4 mr-1" />}
        >
          Back
        </Button>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!loading && audiences.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">You don't have any saved audiences yet.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={onBack}
          >
            Create Your First Audience
          </Button>
        </div>
      )}

      <div className="grid gap-6">
        {audiences.map((audience) => (
          <Card
            key={audience.id}
            onClick={() => handleSelectAudience(audience)}
            selected={selectedAudience === audience.id}
            className={`p-0 hover:shadow-xl transition-all duration-200 cursor-pointer border ${selectedAudience === audience.id ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-100'} overflow-hidden`}
            fullWidth
          >
            <div className="flex flex-col md:flex-row">
              {/* Left Column - Header & Primary Info */}
              <div className="p-5 md:w-1/3 bg-gradient-to-br from-blue-50 to-white border-r border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{audience.name}</h3>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <span>Created {new Date(audience.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}</span>
                </div>
                
                {/* Core Stats */}
                <div className="space-y-3">
                  {/* Personas */}
                  <div className="bg-white rounded-md p-3 flex items-center shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Profiles</p>
                      <p className="text-lg font-medium">{audience.total_personas || audience.len * 5 || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Segments */}
                  <div className="bg-white rounded-md p-3 flex items-center shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Segments</p>
                      <p className="text-lg font-medium">{audience.len}</p>
                    </div>
                  </div>
                  
                  {/* Industry */}
                  {audience.industry && (
                    <div className="bg-white rounded-md p-3 flex items-center shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                          <path d="M13 5v16"></path>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Industry</p>
                        <p className="text-lg font-medium">{audience.industry}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Select Button for small screens */}
                <Button 
                  variant="primary"
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 md:hidden"
                  onClick={() => handleSelectAudience(audience)}
                >
                  Select Audience
                </Button>
              </div>
              
              {/* Right Column - Detailed Info */}
              <div className="p-5 md:w-2/3 flex flex-col">
                <div className="flex-1">
                  {/* Industry Segments Breakdown */}
                  {audience.industry && (
                    <div className="mb-5">
                      <h4 className="text-md font-medium text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                          <path d="M13 5v16"></path>
                        </svg>
                        Industry Segments
                      </h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        {audience.segments ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {audience.segments.map(segment => (
                              <div key={segment.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                                <span className="text-gray-700 font-medium">{segment.name || 'General'}</span>
                                <span className="bg-blue-100 text-blue-700 text-xs py-1 px-2 rounded-full">{segment.persona_count} profiles</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 py-2 px-3 bg-white rounded border border-gray-100">
                            {audience.industry} - {audience.len} industry segments
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Additional Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Business Context */}
                    {audience.business_description && (
                      <div className="col-span-2">
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Business Description</h5>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100">
                          {audience.business_description}
                        </p>
                      </div>
                    )}
                    
                  </div>
                </div>
                
                {/* Select Button for larger screens */}
                <div className="mt-5 hidden md:block">
                  <Button 
                    variant="primary"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    onClick={() => handleSelectAudience(audience)}
                  >
                    Select This Audience
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </StepContainer>
  );
};

export default ExistingAudiences;