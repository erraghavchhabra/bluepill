import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  Users,
  Search, 
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';

// Define CSS animation for fade in effect
const fadeInAnimation = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
`;

// Add the animation to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = fadeInAnimation;
  document.head.appendChild(styleElement);
}

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
  interests?: string[];
  goals?: string[];
  pain_points?: string[];
  data?: {
    job_title?: string;
    sub_industry_l2?: string;
    function?: string;
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Define filter options type
interface FilterOption {
  id: string;
  label: string;
  selected: boolean;
  count: number;
}

// Interface to track persona filters within each segment
interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

// Main component
const PersonaSelector: React.FC<PersonaSelectorProps> = ({ onSelect, selectedPersonaIds, audienceId }) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Personas and segments
  const [segments, setSegments] = useState<Segment[]>([]);
  const [personasBySegment, setPersonasBySegment] = useState<Record<number, PersonaType[]>>({});
  const [allPersonas, setAllPersonas] = useState<PersonaType[]>([]);
  const [filteredPersonasBySegment, setFilteredPersonasBySegment] = useState<Record<number, PersonaType[]>>({});
  
  // Selection states
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [segmentFilters, setSegmentFilters] = useState<FilterOption[]>([]);
  const [industryL2Filters, setIndustryL2Filters] = useState<FilterOption[]>([]);
  const [functionFilters, setFunctionFilters] = useState<FilterOption[]>([]);
  const [roleFilters, setRoleFilters] = useState<FilterOption[]>([]);
  
  // State for persona filtering by segment
  const [personaFilters, setPersonaFilters] = useState<Record<number, SegmentPersonaFilters>>({});
  const [segmentPersonaCounts, setSegmentPersonaCounts] = useState<Record<number, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<Record<number, boolean>>({});
  
  // State for expanded segments
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});

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
      
      // Process personas
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
      
      // Add to all personas list
      setAllPersonas(prev => [...prev, ...processedPersonas]);
      
      return processedPersonas;
    } catch (err) {
      console.error(`Error fetching personas for segment ${segmentId}:`, err);
      return [];
    }
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
        
        setSegments(enhancedData);
        
        // Initialize filter options
        initializeFilters(enhancedData);
        
        // Fetch personas for all segments
        setAllPersonas([]); // Reset personas
        
        for (const segment of enhancedData) {
          await fetchPersonasForSegment(segment.id);
        }
        
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
  
  // Initialize filter options from segments
  const initializeFilters = (segments: Segment[]) => {
    // Get all unique values and their counts
    const segmentMap: Record<string, number> = {};
    const l2Map: Record<string, number> = {};
    const functionMap: Record<string, number> = {};
    const roleMap: Record<string, number> = {};
    
    segments.forEach(segment => {
      // Count Segments
      segmentMap[segment.name] = 1;
      
      // Count Industry L2
      segment.industryL2.forEach(ind => {
        l2Map[ind] = (l2Map[ind] || 0) + 1;
      });
      
      // Count Functions
      segment.functions.forEach(func => {
        functionMap[func] = (functionMap[func] || 0) + 1;
      });
      
      // Count Roles
      segment.roles.forEach(role => {
        roleMap[role] = (roleMap[role] || 0) + 1;
      });
    });
    
    // Convert to filter options
    setSegmentFilters(
      Object.entries(segmentMap).map(([label, count]) => ({
        id: label,
        label,
        selected: false,
        count
      }))
    );
    
    setIndustryL2Filters(
      Object.entries(l2Map).map(([label, count]) => ({
        id: label,
        label,
        selected: false,
        count
      }))
    );
    
    setFunctionFilters(
      Object.entries(functionMap).map(([label, count]) => ({
        id: label,
        label,
        selected: false,
        count
      }))
    );
    
    setRoleFilters(
      Object.entries(roleMap).map(([label, count]) => ({
        id: label,
        label,
        selected: false,
        count
      }))
    );
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

  // Toggle filter selection
  const toggleFilter = (type: 'segment' | 'industryL2' | 'function' | 'role', id: string) => {
    let filters: FilterOption[];
    let setFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>;
    
    switch (type) {
      case 'segment':
        filters = segmentFilters;
        setFilters = setSegmentFilters;
        break;
      case 'industryL2':
        filters = industryL2Filters;
        setFilters = setIndustryL2Filters;
        break;
      case 'function':
        filters = functionFilters;
        setFilters = setFunctionFilters;
        break;
      case 'role':
        filters = roleFilters;
        setFilters = setRoleFilters;
        break;
    }
    
    const updatedFilters = filters.map(filter => 
      filter.id === id ? { ...filter, selected: !filter.selected } : filter
    );
    
    setFilters(updatedFilters);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSegmentFilters(segmentFilters.map(filter => ({ ...filter, selected: false })));
    setIndustryL2Filters(industryL2Filters.map(filter => ({ ...filter, selected: false })));
    setFunctionFilters(functionFilters.map(filter => ({ ...filter, selected: false })));
    setRoleFilters(roleFilters.map(filter => ({ ...filter, selected: false })));
    setSearchTerm('');
  };
  
  // Get filtered personas based on search and filters
  const getFilteredPersonas = () => {
    // Get selected filter values
    const selectedSegments = segmentFilters.filter(f => f.selected).map(f => f.id);
    const selectedL2s = industryL2Filters.filter(f => f.selected).map(f => f.id);
    const selectedFunctions = functionFilters.filter(f => f.selected).map(f => f.id);
    const selectedRoles = roleFilters.filter(f => f.selected).map(f => f.id);
    
    // Check if we have any filters
    const hasFilters = selectedSegments.length > 0 || 
                      selectedL2s.length > 0 || 
                      selectedFunctions.length > 0 || 
                      selectedRoles.length > 0 || 
                      searchTerm.length > 0;
    
    if (!hasFilters) {
      return allPersonas;
    }
    
    // Filter personas
    return allPersonas.filter(persona => {
      // Search term filtering
      const searchMatch = !searchTerm || 
        persona.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (persona.job_title && persona.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (persona.data?.job_title && String(persona.data.job_title).toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Get persona attributes
      const personaSegment = segments.find(s => s.id === persona.segment_id)?.name;
      const personaL2 = persona.sub_industry_l2 || persona.data?.sub_industry_l2;
      const personaFunction = persona.function || persona.data?.function;
      const personaRole = persona.role || persona.data?.role;
      
      // Filter matching
      const segmentMatch = selectedSegments.length === 0 || (personaSegment && selectedSegments.includes(personaSegment));
      const l2Match = selectedL2s.length === 0 || (personaL2 && selectedL2s.includes(String(personaL2)));
      const functionMatch = selectedFunctions.length === 0 || (personaFunction && selectedFunctions.includes(String(personaFunction)));
      const roleMatch = selectedRoles.length === 0 || (personaRole && selectedRoles.includes(String(personaRole)));
      
      return searchMatch && segmentMatch && l2Match && functionMatch && roleMatch;
    });
  };

  // Filter button with count
  const getActiveFilterCount = () => {
    return segmentFilters.filter(f => f.selected).length + 
           industryL2Filters.filter(f => f.selected).length + 
           functionFilters.filter(f => f.selected).length + 
           roleFilters.filter(f => f.selected).length;
  };
  
  // Toggle segment selection
  const toggleSegment = (segmentId: number) => {
    if (selectedSegments.includes(segmentId)) {
      // Remove segment from selection
      setSelectedSegments(selectedSegments.filter(id => id !== segmentId));
    } else {
      // Add segment to selection
      setSelectedSegments([...selectedSegments, segmentId]);
      
      // Make sure filters are initialized with empty arrays if they don't exist yet
      if (!personaFilters[segmentId]) {
        const emptyFilters = {
          industryL1: [],
          industryL2: [],
          functions: [],
          roles: []
        };
        
        setPersonaFilters(prev => ({
          ...prev,
          [segmentId]: emptyFilters
        }));
        
        // Update persona count for the newly selected segment
        updateSegmentPersonaCount(segmentId, emptyFilters);
      } else {
        // Update persona count with existing filters
        updateSegmentPersonaCount(segmentId, personaFilters[segmentId]);
      }
    }
  };
  
  // Toggle expanded state for a segment
  const toggleSegmentExpansion = (segmentId: number) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));
  };
  
  // Helper function to check if a filter value is selected
  const isFilterSelected = (segmentId: number, filterType: keyof SegmentPersonaFilters, value: string): boolean => {
    if (!personaFilters[segmentId]) return false;
    return personaFilters[segmentId][filterType].includes(value);
  };
  
  // Toggle a persona filter value
  const togglePersonaFilter = (
    segmentId: number, 
    filterType: keyof SegmentPersonaFilters, 
    value: string
  ) => {
    setPersonaFilters(prev => {
      const currentFilters = prev[segmentId] || {
        industryL1: [],
        industryL2: [],
        functions: [],
        roles: []
      };
      
      const isSelected = currentFilters[filterType].includes(value);
      let updatedFilters;
      
      if (isSelected) {
        // Remove value from filters
        updatedFilters = {
          ...currentFilters,
          [filterType]: currentFilters[filterType].filter(v => v !== value)
        };
      } else {
        // Add value to filters
        updatedFilters = {
          ...currentFilters,
          [filterType]: [...currentFilters[filterType], value]
        };
      }
      
      // Start updating the count for this segment
      updateSegmentPersonaCount(segmentId, updatedFilters);
      
      return {
        ...prev,
        [segmentId]: updatedFilters
      };
    });
  };
  
  // Update the persona count for a segment based on filters
  const updateSegmentPersonaCount = async (segmentId: number, filters: SegmentPersonaFilters) => {
    // Set loading state for this segment
    setLoadingCounts(prev => ({
      ...prev,
      [segmentId]: true
    }));
    
    // Get personas for this segment
    const segmentPersonas = personasBySegment[segmentId] || [];
    if (segmentPersonas.length === 0) {
      // No personas to filter
      setSegmentPersonaCounts(prev => ({
        ...prev,
        [segmentId]: 0
      }));
      setLoadingCounts(prev => ({
        ...prev,
        [segmentId]: false
      }));
      return;
    }
    
    // Check if we have any filters
    const hasFilters = 
      filters.industryL1.length > 0 || 
      filters.industryL2.length > 0 || 
      filters.functions.length > 0 || 
      filters.roles.length > 0;
    
    if (!hasFilters) {
      // No filters, use all personas for this segment
      setSegmentPersonaCounts(prev => ({
        ...prev,
        [segmentId]: segmentPersonas.length
      }));
      
      // Update filtered personas
      setFilteredPersonasBySegment(prev => ({
        ...prev,
        [segmentId]: segmentPersonas
      }));
      
      setLoadingCounts(prev => ({
        ...prev,
        [segmentId]: false
      }));
      return;
    }
    
    // Filter personas based on selected criteria
    const filtered = segmentPersonas.filter(persona => {
      // Get persona attributes
      const personaL1 = persona.industry_l1 || null;
      const personaL2 = persona.sub_industry_l2 || persona.data?.sub_industry_l2;
      const personaFunction = persona.function || persona.data?.function;
      const personaRole = persona.role || persona.data?.role;
      
      // Filter matching
      const l1Match = filters.industryL1.length === 0 || 
        (personaL1 && filters.industryL1.includes(String(personaL1)));
      
      const l2Match = filters.industryL2.length === 0 || 
        (personaL2 && filters.industryL2.includes(String(personaL2)));
      
      const functionMatch = filters.functions.length === 0 || 
        (personaFunction && filters.functions.includes(String(personaFunction)));
      
      const roleMatch = filters.roles.length === 0 || 
        (personaRole && filters.roles.includes(String(personaRole)));
      
      return l1Match && l2Match && functionMatch && roleMatch;
    });
    
    // Update filtered personas and count
    setFilteredPersonasBySegment(prev => ({
      ...prev,
      [segmentId]: filtered
    }));
    
    setSegmentPersonaCounts(prev => ({
      ...prev,
      [segmentId]: filtered.length
    }));
    
    // Clear loading state
    setLoadingCounts(prev => ({
      ...prev,
      [segmentId]: false
    }));
  };
  
  // Render filter options
  const renderFilterOptions = (
    title: string,
    options: FilterOption[],
    type: 'segment' | 'industryL2' | 'function' | 'role'
  ) => {
    return (
      <div className="mb-5">
        <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
        <div className="space-y-2">
          {options.map(option => (
            <div key={option.id} className="flex items-center">
              <input
                id={`filter-${type}-${option.id}`}
                type="checkbox"
                checked={option.selected}
                onChange={() => toggleFilter(type, option.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`filter-${type}-${option.id}`}
                className="ml-2 text-sm text-gray-700 cursor-pointer flex-grow"
              >
                {option.label}
              </label>
              <span className="text-xs text-gray-500">({option.count})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Group personas by segment for display
  const personasBySegmentForDisplay = useMemo(() => {
    const result: Record<number, PersonaType[]> = {};
    const filteredPersonas = getFilteredPersonas();
    
    segments.forEach(segment => {
      const segmentPersonas = filteredPersonas.filter(p => p.segment_id === segment.id);
      if (segmentPersonas.length > 0) {
        result[segment.id] = segmentPersonas;
      }
    });
    
    return result;
  }, [segments, getFilteredPersonas]);
  
  // Compute combined filtered personas from all selected segments
  const filteredPersonas = useMemo(() => {
    // If we have any segment-specific filtering applied
    if (selectedSegments.length > 0) {
      return selectedSegments.flatMap(segmentId => 
        filteredPersonasBySegment[segmentId] || []
      );
    }
    // Otherwise use the regular filtering
    return getFilteredPersonas();
  }, [selectedSegments, filteredPersonasBySegment, getFilteredPersonas]);
  
  const activeFilterCount = getActiveFilterCount();
  
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
          {/* Search and filter bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search personas by name, title, or company..."
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
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-700'} hover:bg-blue-50 hover:border-blue-300 transition-colors`}
              aria-label="Toggle filters"
            >
              <Filter className="h-5 w-5 mr-2" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Selected personas pills */}
          {selectedPersonaIds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Personas</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPersonaIds.map(id => {
                  // Find the persona in our data
                  const selectedPersona = allPersonas.find(p => p.id === id);
                  
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

          {/* Filters panel */}
          {showFilters && (
            <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-900">Filter Personas</h3>
                <button 
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {renderFilterOptions("Segments", segmentFilters, 'segment')}
                {renderFilterOptions("Industries", industryL2Filters, 'industryL2')}
                {renderFilterOptions("Functions", functionFilters, 'function')}
                {renderFilterOptions("Roles", roleFilters, 'role')}
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
            <div className="grid grid-cols-12 gap-6">
              {/* Left side: Filtered Personas for selection */}
              <div className="col-span-12 md:col-span-5 lg:col-span-4">
                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Personas</h3>
                  
                  {filteredPersonas.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">No personas match your filters</p>
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {filteredPersonas.map(persona => (
                        <div 
                          key={persona.id} 
                          className={`p-3 border rounded-lg transition-all cursor-pointer ${
                            selectedPersonaIds.includes(persona.id)
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => togglePersona(persona.id)}
                        >
                          <div className="flex items-start">
                            {/* Checkbox */}
                            <div 
                              className={`w-5 h-5 border rounded-md flex items-center justify-center mt-1 mr-3 flex-shrink-0 ${