import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  Users,
  Search, 
  ChevronDown, 
  ChevronRight,
  X
} from 'lucide-react';

// Define API_URL - temporarily fixing the env issue
const API_URL = import.meta.env?.VITE_API_URL || '';

interface PersonaSelectorProps {
  onSelect: (personaIds: number[]) => void;
  selectedPersonaIds: number[];
  audienceId: number | null;
}

// Define types
interface Segment {
  id: number;
  name: string;
  description?: string;
  len: number;
  created_at: string;
  updated_at: string;
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
  titles: string[];
}

interface PersonaType {
  id: number;
  name: string;
  role?: string;
  job_title?: string;
  function?: string;
  industry_l1?: string;
  sub_industry_l2?: string;
  segment_id?: number;
  company_name?: string;
  data?: {
    job_title?: string;
    sub_industry_l2?: string;
    function?: string;
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Define type for persona hierarchy
interface PersonaHierarchyType {
  segments: Record<number, {
    name: string;
    l2s: Record<string, {
      name: string;
      functions: Record<string, {
        name: string;
        roles: Record<string, {
          name: string;
          personas: PersonaType[];
        }>;
      }>;
    }>;
  }>;
}

// Main component
const PersonaSelector: React.FC<PersonaSelectorProps> = ({ onSelect, selectedPersonaIds, audienceId }) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track expanded segments and their hierarchies
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});
  const [expandedL2s, setExpandedL2s] = useState<Record<string, boolean>>({});
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Personas
  const [personasBySegment, setPersonasBySegment] = useState<Record<number, PersonaType[]>>({});
  const [personaHierarchy, setPersonaHierarchy] = useState<PersonaHierarchyType>({
    segments: {}
  });
  
  // Standard functions and roles - using useMemo to avoid dependency changes on every render
  const standardFunctions = useMemo(() => ['Legal', 'Procurement', 'Finance', 'Sales'], []);
  const standardRoles = useMemo(() => ["CXO", "Decision Maker/Leaders", "Mid Level Managers", "Individual contributors"], []);
  
  // Industry taxonomy - using useMemo to avoid dependency changes on every render
  const industryL2Map = useMemo(() => ({
    'Industrial': ['Manufacturing', 'Automotive', 'Transportation', 'Energy And Utilities', 'Construction'],
    'Public Sector': ['Government Contractors', 'Federal Government', 'Higher Education', 'State and Local Government'],
    'Healthcare And Life Sciences': ['Payers', 'Providers', 'Medical Technology', 'Pharma'],
    'Retail And Consumer Goods': ['Retail', 'Consumer Goods', 'Wholesale Distribution'],
    'Tmt And Consulting': ['Technology', 'Telecom', 'Media', 'Consulting And IT Services'],
    'Banking Financial Services And Insurance': ['Banking', 'Insurance', 'Financial Service Institutions']
  }), []);

  // Update hierarchical structure with fetched personas
  const updateHierarchyWithPersonas = (segmentId: number, personas: PersonaType[]) => {
    setPersonaHierarchy(prevHierarchy => {
      const updatedHierarchy = { ...prevHierarchy };
      
      personas.forEach(persona => {
        const personaL2 = persona.sub_industry_l2 || persona.data?.sub_industry_l2 || '';
        const personaFunc = persona.function || persona.data?.function || '';
        const personaRole = persona.role || persona.data?.role || '';
        
        // Find the right place in the hierarchy
        if (
          updatedHierarchy.segments[segmentId] && 
          updatedHierarchy.segments[segmentId].l2s[personaL2] && 
          updatedHierarchy.segments[segmentId].l2s[personaL2].functions[personaFunc] && 
          updatedHierarchy.segments[segmentId].l2s[personaL2].functions[personaFunc].roles[personaRole]
        ) {
          // Add persona to the right hierarchy level
          updatedHierarchy.segments[segmentId].l2s[personaL2].functions[personaFunc].roles[personaRole].personas.push(persona);
        }
      });
      
      return updatedHierarchy;
    });
  };

  // Fetch personas for a specific segment
  const fetchPersonasForSegment = async (segmentId: number) => {
    try {
      const response = await fetch(`${API_URL}/segments/${segmentId}/personas`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch personas for segment ${segmentId}`);
      }
      
      const data = await response.json();
      
      // Process personas and assign to hierarchy
      const processedPersonas: PersonaType[] = data.map((persona: {
        id: number;
        name: string;
        data: string | Record<string, unknown>;
        [key: string]: unknown;
      }) => ({
        ...persona,
        data: typeof persona.data === 'string' ? JSON.parse(persona.data) : persona.data
      }));
      
      // Store personas by segment
      setPersonasBySegment(prev => ({
        ...prev,
        [segmentId]: processedPersonas
      }));
      
      // Update the hierarchy with these personas
      updateHierarchyWithPersonas(segmentId, processedPersonas);
      
    } catch (err) {
      console.error(`Error fetching personas for segment ${segmentId}:`, err);
    }
  };

  // Build hierarchical structure for persona organization
  const buildPersonaHierarchy = (segments: Segment[]) => {
    const hierarchy: PersonaHierarchyType = {
      segments: {}
    };
    
    segments.forEach(segment => {
      hierarchy.segments[segment.id] = {
        name: segment.name,
        l2s: {}
      };
      
      // Add L2 industries
      segment.industryL2.forEach(l2 => {
        hierarchy.segments[segment.id].l2s[l2] = {
          name: l2,
          functions: {}
        };
        
        // Add functions
        segment.functions.forEach(func => {
          hierarchy.segments[segment.id].l2s[l2].functions[func] = {
            name: func,
            roles: {}
          };
          
          // Add roles
          segment.roles.forEach(role => {
            hierarchy.segments[segment.id].l2s[l2].functions[func].roles[role] = {
              name: role,
              personas: []
            };
          });
        });
      });
    });
    
    setPersonaHierarchy(hierarchy);
    
    // After setting up the structure, fetch personas for each segment
    segments.forEach(segment => {
      fetchPersonasForSegment(segment.id);
    });
  };
    
  // Fetch segments for the selected audience
  useEffect(() => {
    const fetchSegments = async () => {
      if (!audienceId) {
        setError('Please select an audience first');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/audience/${audienceId}/segments`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch segments');
        }
        
        const data = await response.json();
        
        // Enhance data with hierarchical attributes for personas
        const enhancedData = data.map((segment: Omit<Segment, 'industryL1' | 'industryL2' | 'functions' | 'roles' | 'titles'>) => {
          // Use our standardized functions and roles
          const titles = ['CEO', 'CFO', 'CTO', 'CMO', 'COO', 'VP of Sales', 'Director of Marketing', 'Project Manager'];
          
          // Use the segment name as the L1 industry
          const segmentNameL1 = segment.name;
          const selectedIndustries = [segmentNameL1];
          
          // Find matching L2 industries
          const matchedIndustry = Object.keys(industryL2Map).find(ind => 
            segmentNameL1 === ind || segmentNameL1.includes(ind)
          );
          
          const selectedL2 = matchedIndustry ? industryL2Map[matchedIndustry as keyof typeof industryL2Map] || [] : [];
          
          // Use standard functions and roles
          const selectedFunctions = [...standardFunctions];
          const selectedRoles = [...standardRoles];
          
          return {
            ...segment,
            industryL1: selectedIndustries,
            industryL2: selectedL2,
            functions: selectedFunctions,
            roles: selectedRoles,
            titles: titles
          };
        });        
        
        // Initialize persona hierarchy structure with enhanced segments
        buildPersonaHierarchy(enhancedData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
        setError('Failed to load segments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSegments();
  }, [audienceId, industryL2Map, standardFunctions, standardRoles]);
  
  // Toggle segment expansion
  const toggleSegment = (segmentId: number) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));
  };
  
  // Toggle L2 industry expansion
  const toggleL2 = (segmentId: number, l2: string) => {
    const key = `${segmentId}-${l2}`;
    setExpandedL2s(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Toggle function expansion
  const toggleFunction = (segmentId: number, l2: string, func: string) => {
    const key = `${segmentId}-${l2}-${func}`;
    setExpandedFunctions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Toggle role expansion
  const toggleRole = (segmentId: number, l2: string, func: string, role: string) => {
    const key = `${segmentId}-${l2}-${func}-${role}`;
    setExpandedRoles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Toggle persona selection
  const togglePersona = (personaId: number) => {
    if (selectedPersonaIds.includes(personaId)) {
      // Remove persona
      onSelect(selectedPersonaIds.filter(id => id !== personaId));
    } else {
      // Add persona
      onSelect([...selectedPersonaIds, personaId]);
    }
  };
  
  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Filter personas based on search term
  const getFilteredHierarchy = (): PersonaHierarchyType => {
    if (!searchTerm) {
      return personaHierarchy;
    }
    
    const searchLowerCase = searchTerm.toLowerCase();
    const filteredHierarchy: PersonaHierarchyType = { segments: {} };
    
    // Filter the hierarchy based on search term
    Object.entries(personaHierarchy.segments).forEach(([segmentId, segment]) => {
      const segmentIdNum = Number(segmentId);
      
      // Check if segment name matches
      const segmentMatches = segment.name.toLowerCase().includes(searchLowerCase);
      
      let hasMatchingPersonas = false;
      const filteredSegment = {
        name: segment.name,
        l2s: {} as typeof segment.l2s
      };
      
      Object.entries(segment.l2s).forEach(([l2Id, l2]) => {
        const l2Matches = l2.name.toLowerCase().includes(searchLowerCase);
        const filteredL2 = {
          name: l2.name,
          functions: {} as typeof l2.functions
        };
        
        Object.entries(l2.functions).forEach(([funcId, func]) => {
          const funcMatches = func.name.toLowerCase().includes(searchLowerCase);
          const filteredFunc = {
            name: func.name,
            roles: {} as typeof func.roles
          };
          
          Object.entries(func.roles).forEach(([roleId, role]) => {
            const roleMatches = role.name.toLowerCase().includes(searchLowerCase);
            const filteredRole = {
              name: role.name,
              personas: [] as PersonaType[]
            };
            
            // Filter personas
            const matchingPersonas = role.personas.filter(persona => 
              persona.name.toLowerCase().includes(searchLowerCase) || 
              (persona.job_title && persona.job_title.toLowerCase().includes(searchLowerCase))
            );
            
            if (matchingPersonas.length > 0 || segmentMatches || l2Matches || funcMatches || roleMatches) {
              filteredRole.personas = matchingPersonas;
              filteredFunc.roles[roleId] = filteredRole;
              hasMatchingPersonas = true;
            }
          });
          
          if (Object.keys(filteredFunc.roles).length > 0) {
            filteredL2.functions[funcId] = filteredFunc;
          }
        });
        
        if (Object.keys(filteredL2.functions).length > 0) {
          filteredSegment.l2s[l2Id] = filteredL2;
        }
      });
      
      if (hasMatchingPersonas || segmentMatches) {
        filteredHierarchy.segments[segmentIdNum] = filteredSegment;
      }
    });
    
    return filteredHierarchy;
  };
  
  // Render function
  return (
    <div className="p-6">
      {!audienceId ? (
        <div className="text-center py-12 text-gray-500">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium">Please select an audience first</p>
          <p className="text-sm mt-2">You need to select an audience to view and chat with its personas</p>
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search personas, industries, functions or roles..."
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                value={searchTerm}
                onChange={handleSearch}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          {/* Selected personas pills */}
          {selectedPersonaIds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Personas</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPersonaIds.map(id => {
                  // Find the persona in our data
                  let selectedPersona: PersonaType | undefined;
                  
                  Object.values(personasBySegment).forEach(segmentPersonas => {
                    const found = segmentPersonas.find(p => p.id === id);
                    if (found) {
                      selectedPersona = found;
                    }
                  });
                  
                  return selectedPersona ? (
                    <div 
                      key={id} 
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      <span className="mr-1">{selectedPersona.name}</span>
                      <button 
                        onClick={() => togglePersona(id)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        aria-label={`Remove ${selectedPersona.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Loading and error states */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
            </div>
          ) : (
            /* Hierarchical persona structure */
            <div className="space-y-4">
              {Object.entries(getFilteredHierarchy().segments).length > 0 ? (
                Object.entries(getFilteredHierarchy().segments).map(([segmentId, segment]) => (
                  <div key={segmentId} className="border rounded-lg overflow-hidden bg-white">
                    {/* Segment header */}
                    <button
                      onClick={() => toggleSegment(Number(segmentId))}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                      aria-label={`Toggle ${segment.name}`}
                    >
                      <div className="flex items-center">
                        {expandedSegments[Number(segmentId)] ? (
                          <ChevronDown className="h-5 w-5 text-blue-600 mr-3" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 mr-3" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900">{segment.name}</h3>
                        </div>
                      </div>
                    </button>
                    
                    {/* Segment content (L2 industries) */}
                    {expandedSegments[Number(segmentId)] && (
                      <div className="bg-white">
                        {Object.entries(segment.l2s).map(([l2Id, l2]) => (
                          <div key={l2Id} className="border-t border-gray-100">
                            {/* L2 industry header */}
                            <button
                              onClick={() => toggleL2(Number(segmentId), l2Id)}
                              className="w-full flex items-center justify-between p-3 pl-8 hover:bg-gray-50 transition"
                              aria-label={`Toggle ${l2.name}`}
                            >
                              <div className="flex items-center">
                                {expandedL2s[`${segmentId}-${l2Id}`] ? (
                                  <ChevronDown className="h-4 w-4 text-blue-600 mr-3" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400 mr-3" />
                                )}
                                <div className="text-left flex items-center">
                                  <Building2 className="h-4 w-4 text-indigo-600 mr-2" />
                                  <h4 className="font-medium text-gray-800">{l2.name}</h4>
                                </div>
                              </div>
                            </button>
                            
                            {/* L2 content (Functions) */}
                            {expandedL2s[`${segmentId}-${l2Id}`] && (
                              <div>
                                {Object.entries(l2.functions).map(([funcId, func]) => (
                                  <div key={funcId} className="border-t border-gray-100">
                                    {/* Function header */}
                                    <button
                                      onClick={() => toggleFunction(Number(segmentId), l2Id, funcId)}
                                      className="w-full flex items-center justify-between p-3 pl-12 hover:bg-gray-50 transition"
                                      aria-label={`Toggle ${func.name}`}
                                    >
                                      <div className="flex items-center">
                                        {expandedFunctions[`${segmentId}-${l2Id}-${funcId}`] ? (
                                          <ChevronDown className="h-4 w-4 text-blue-600 mr-3" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-400 mr-3" />
                                        )}
                                        <div className="text-left flex items-center">
                                          <Briefcase className="h-4 w-4 text-emerald-600 mr-2" />
                                          <h5 className="font-medium text-gray-700">{func.name}</h5>
                                        </div>
                                      </div>
                                    </button>
                                    
                                    {/* Function content (Roles) */}
                                    {expandedFunctions[`${segmentId}-${l2Id}-${funcId}`] && (
                                      <div>
                                        {Object.entries(func.roles).map(([roleId, role]) => (
                                          <div key={roleId} className="border-t border-gray-100">
                                            {/* Role header */}
                                            <button
                                              onClick={() => toggleRole(Number(segmentId), l2Id, funcId, roleId)}
                                              className="w-full flex items-center justify-between p-3 pl-16 hover:bg-gray-50 transition"
                                              aria-label={`Toggle ${role.name}`}
                                            >
                                              <div className="flex items-center">
                                                {expandedRoles[`${segmentId}-${l2Id}-${funcId}-${roleId}`] ? (
                                                  <ChevronDown className="h-4 w-4 text-blue-600 mr-3" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 text-gray-400 mr-3" />
                                                )}
                                                <div className="text-left flex items-center">
                                                  <Users className="h-4 w-4 text-amber-600 mr-2" />
                                                  <h6 className="font-medium text-gray-700">{role.name}</h6>
                                                  {role.personas.length > 0 && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                      {role.personas.length} {role.personas.length === 1 ? 'profile' : 'profiles'}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </button>
                                            
                                            {/* Role content (Personas) */}
                                            {expandedRoles[`${segmentId}-${l2Id}-${funcId}-${roleId}`] && (
                                              <div className="pt-2 pb-3 pl-24">
                                                {role.personas.length > 0 ? (
                                                  <div className="space-y-2">
                                                    {role.personas.map((persona) => (
                                                      <div 
                                                        key={persona.id} 
                                                        className="flex items-start"
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          id={`persona-${persona.id}`}
                                                          checked={selectedPersonaIds.includes(persona.id)}
                                                          onChange={() => togglePersona(persona.id)}
                                                          className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <label
                                                          htmlFor={`persona-${persona.id}`}
                                                          className="flex-1 cursor-pointer"
                                                        >
                                                          <div className="font-medium text-gray-800">
                                                            {persona.name}
                                                          </div>
                                                          <div className="text-xs text-gray-600 mt-1">
                                                            {persona.job_title || persona.data?.job_title}
                                                            {persona.company_name && ` at ${persona.company_name}`}
                                                          </div>
                                                        </label>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="text-sm text-gray-500 italic">
                                                    No personas in this category
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Users className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="font-medium">No personas found</p>
                  <p className="text-sm mt-1">Try adjusting your search or select a different audience</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PersonaSelector;
