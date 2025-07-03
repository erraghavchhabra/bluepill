import React, { useState, useEffect } from 'react';
import { User, X, Loader2 } from 'lucide-react';

// Define API_URL
const API_URL = import.meta.env.VITE_API_URL || '';

interface PersonaPanelProps {
  personas: {
    id: number;
    name?: string;
    job_title?: string;
    company_name?: string;
    data?: {
      job_title?: string;
      function?: string;
      industry_l1?: string;
      role?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }[];
  onRemovePersona: (id: number) => void;
  loading: boolean;
  onSelectPersona: (id: number) => void;
  selectedPersonaIds: number[];
}

interface PersonaType {
  id: number;
  name: string;
  job_title?: string;
  company_name?: string;
  data?: {
    job_title?: string;
    function?: string;
    industry_l1?: string;
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const PersonaPanel: React.FC<PersonaPanelProps> = ({ 
  personas, 
  onRemovePersona, 
  loading, 
  onSelectPersona,
  selectedPersonaIds 
}) => {
  const [fetchedPersonas, setFetchedPersonas] = useState<Record<number, PersonaType>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch persona details for any persona that doesn't have a name
  useEffect(() => {
    const fetchMissingPersonaDetails = async () => {
      if (personas.length === 0) return;
      
      const personasToFetch = personas.filter(p => !p.name && !fetchedPersonas[p.id]);
      if (personasToFetch.length === 0) return;
      
      setLoadingPersonas(true);
      setError(null);
      
      try {
        const fetchPromises = personasToFetch.map(p => 
          fetch(`${API_URL}/personas/${p.id}`, { credentials: 'include' })
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch persona ${p.id}`);
              return res.json();
            })
        );
        
        const fetchedResults = await Promise.all(fetchPromises);
        
        const newPersonas = { ...fetchedPersonas };
        fetchedResults.forEach(persona => {
          newPersonas[persona.id] = {
            ...persona,
            data: typeof persona.data === 'string' ? JSON.parse(persona.data) : persona.data
          };
        });
        
        setFetchedPersonas(newPersonas);
      } catch (error) {
        console.error('Error fetching personas:', error);
        setError('Failed to load some persona details');
      } finally {
        setLoadingPersonas(false);
      }
    };
    
    fetchMissingPersonaDetails();
  }, [personas, fetchedPersonas]);
  // Merge personas with fetched persona details
  const getPersonaDetails = (persona: { id: number; [key: string]: unknown }): PersonaType => {
    if (persona.name) return persona as PersonaType;
    return fetchedPersonas[persona.id] || { 
      id: persona.id,
      name: `Persona #${persona.id}`,
      data: {}
    };
  };

  if (loading || loadingPersonas) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (personas.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 rounded-full p-3 mb-3">
            <User className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            No personas selected yet.
            <br />
            Use the segment filters above to find personas.
          </p>
        </div>
      </div>
    );
  }

  // Display error if any
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-700 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="space-y-2">
        {personas.map((persona) => {
          const fullPersona = getPersonaDetails(persona);
          const isSelected = selectedPersonaIds.includes(persona.id);
          
          return (
            <div 
              key={persona.id} 
              className={`bg-white rounded-lg border ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} shadow-sm p-3 flex items-start justify-between hover:border-blue-200 transition-colors`}
              onClick={() => !isSelected && onSelectPersona(persona.id)}
            >
              <div className="flex items-start">
                <div className={`${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} rounded-full p-2 mr-3 flex-shrink-0`}>
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-800 leading-tight">
                    {fullPersona.name || `Persona #${fullPersona.id}`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {fullPersona.job_title || fullPersona.data?.job_title || 'Professional'} 
                    {fullPersona.company_name ? ` at ${fullPersona.company_name}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {fullPersona.data?.function && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {fullPersona.data.function}
                      </span>
                    )}
                    {fullPersona.data?.industry_l1 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {fullPersona.data.industry_l1}
                      </span>
                    )}
                    {fullPersona.data?.role && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {fullPersona.data.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePersona(persona.id);
                }} 
                className="text-gray-400 hover:text-red-500 rounded-full p-1 transition-colors"
                title="Remove persona"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaPanel;
