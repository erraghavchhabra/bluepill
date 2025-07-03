import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Filter, 
  Search, 
  X, 
  Check, 
  ChevronDown, 
  Loader2 
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

// Define API_URL
const API_URL = import.meta.env.VITE_API_URL || '';

interface PersonaSelectorProps {
  onSelect: (personaIds: number[]) => void;
  selectedPersonaIds: number[];
  audienceId: number | null;
  onFilteredPersonasUpdate: (personas: Array<{id: number; [key: string]: unknown}>) => void;
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

// Interface to track persona filters within each segment
interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

// Filter options interface
interface FilterOption {
  id: string;
  label: string;
  selected: boolean;
  count: number;
}

// Main component
const PersonaSelector: React.FC<PersonaSelectorProps> = ({ 
  onSelect, 
  selectedPersonaIds, 
  audienceId,
  onFilteredPersonasUpdate 
}) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Segments and personas state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [filteredSegments, setFilteredSegments] = useState<Segment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  
  // Filter states for segments
  const [personaFilters, setPersonaFilters] = useState<Record<number, SegmentPersonaFilters>>({});
  const [segmentPersonaCounts, setSegmentPersonaCounts] = useState<Record<number, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<Record<number, boolean>>({});
  
  // Filter option states
  const [industryL1Filters, setIndustryL1Filters] = useState<FilterOption[]>([]);
  const [industryL2Filters, setIndustryL2Filters] = useState<FilterOption[]>([]);
  const [functionFilters, setFunctionFilters] = useState<FilterOption[]>([]);
  const [roleFilters, setRoleFilters] = useState<FilterOption[]>([]);
  
  // Hierarchical view states
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});
  const [rolePersonaMap, setRolePersonaMap] = useState<Record<string, number[]>>({});
  const [fetchedPersonasMap, setFetchedPersonasMap] = useState<Record<number, PersonaType>>({});
  const [loadingPersonaIds, setLoadingPersonaIds] = useState<boolean>(false);
  const [filteredPersonas, setFilteredPersonas] = useState<Array<{id: number; [key: string]: unknown}>>([]);
  
  // Standard functions and roles
  const standardFunctions = useMemo(() => ['Legal', 'Procurement', 'Finance', 'Sales'], []);
  const standardRoles = useMemo(() => ["CXO", "Decision Maker/Leaders", "Mid Level Managers", "Individual contributors"], []);
  
  // Industry taxonomy
  const industryL2Map = useMemo(() => ({
    'Industrial': ['Manufacturing', 'Automotive', 'Transportation', 'Energy And Utilities', 'Construction'],
    'Public Sector': ['Government Contractors', 'Federal Government', 'Higher Education', 'State and Local Government'],
    'Healthcare And Life Sciences': ['Payers', 'Providers', 'Medical Technology', 'Pharma'],
    'Retail And Consumer Goods': ['Retail', 'Consumer Goods', 'Wholesale Distribution'],
    'Tmt And Consulting': ['Technology', 'Telecom', 'Media', 'Consulting And IT Services'],
    'Banking Financial Services And Insurance': ['Banking', 'Insurance', 'Financial Service Institutions']
  }), []);

  const industries = useMemo(() => [
    'Industrial', 'Healthcare And Life Sciences', 'Public Sector', 
    'Retail And Consumer Goods', 'Tmt And Consulting', 'Banking Financial Services And Insurance'
  ], []);

  // Fetch segments for the selected audience
  useEffect(() => {
    const fetchSegments = async () => {
      if (!audienceId) {
        setSegments([]);
        setFilteredSegments([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/audiences/${audienceId}/segments`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch segments');
        }
        
        const data = await response.json();
        
        // Process segments
        const processedSegments = data.map((segment: any) => {
          // Extract relevant filters from segment data
          const industryL1 = segment.data?.industry_l1 ? 
            [segment.data.industry_l1] : 
            industries.filter(ind => segment.data?.industries?.includes(ind));
          
          const industryL2 = segment.data?.sub_industry_l2 ? 
            [segment.data.sub_industry_l2] : 
            industryL1.flatMap(ind => 
              industryL2Map[ind as keyof typeof industryL2Map] || []
            ).filter(ind => segment.data?.industries?.includes(ind));
          
          const functions = segment.data?.function ? 
            [segment.data.function] : 
            standardFunctions.filter(func => segment.data?.functions?.includes(func));
          
          const roles = segment.data?.role ? 
            [segment.data.role] : 
            standardRoles.filter(role => segment.data?.roles?.includes(role));

          const titles = segment.data?.job_title ? 
            [segment.data.job_title] : 
            (segment.data?.titles || []);
          
          return {
            ...segment,
            industryL1,
            industryL2,
            functions,
            roles,
            titles
          };
        });
        
        setSegments(processedSegments);
        setFilteredSegments(processedSegments);
        
        // Initialize filters object for each segment
        const initialFilters: Record<number, SegmentPersonaFilters> = {};
        processedSegments.forEach(segment => {
          initialFilters[segment.id] = {
            industryL1: [],
            industryL2: [],
            functions: [],
            roles: []
          };
        });
        
        setPersonaFilters(initialFilters);
        
        // Initialize expanded state for each segment
        const initialExpandedState: Record<number, boolean> = {};
        processedSegments.forEach(segment => {
          initialExpandedState[segment.id] = false;
        });
        
        setExpandedSegments(initialExpandedState);
        
        // Initialize filter options
        initializeFilters(processedSegments);
        
      } catch (error) {
        console.error('Error fetching segments:', error);
        setError('Failed to load segments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSegments();
  }, [audienceId, industryL2Map, standardFunctions, standardRoles, industries]);
  
  // Extract and initialize filter options
  const initializeFilters = (segments: Segment[]) => {
    // Get all unique values and their counts across all segments
    const l1Map: Record<string, number> = {};
    const l2Map: Record<string, number> = {};
    const functionMap: Record<string, number> = {};
    const roleMap: Record<string, number> = {};
    
    segments.forEach(segment => {
      segment.industryL1.forEach(value => {
        l1Map[value] = (l1Map[value] || 0) + 1;
      });
      
      segment.industryL2.forEach(value => {
        l2Map[value] = (l2Map[value] || 0) + 1;
      });
      
      segment.functions.forEach(value => {
        functionMap[value] = (functionMap[value] || 0) + 1;
      });
      
      segment.roles.forEach(value => {
        roleMap[value] = (roleMap[value] || 0) + 1;
      });
    });
    
    // Convert to filter options
    setIndustryL1Filters(
      Object.entries(l1Map).map(([label, count]) => ({
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
  
  // Apply filters whenever filter state changes
  useEffect(() => {
    // Apply search filter
    let filtered = segments;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = segments.filter(segment => 
        segment.name.toLowerCase().includes(lowerSearch) ||
        (segment.description?.toLowerCase().includes(lowerSearch))
      );
    }
    
    // Apply global filters (industry, function, etc.)
    const selectedIndustryL1 = industryL1Filters.filter(f => f.selected).map(f => f.id);
    const selectedIndustryL2 = industryL2Filters.filter(f => f.selected).map(f => f.id);
    const selectedFunctions = functionFilters.filter(f => f.selected).map(f => f.id);
    const selectedRoles = roleFilters.filter(f => f.selected).map(f => f.id);
    
    if (selectedIndustryL1.length > 0) {
      filtered = filtered.filter(segment => 
        segment.industryL1.some(value => selectedIndustryL1.includes(value))
      );
    }
    
    if (selectedIndustryL2.length > 0) {
      filtered = filtered.filter(segment => 
        segment.industryL2.some(value => selectedIndustryL2.includes(value))
      );
    }
    
    if (selectedFunctions.length > 0) {
      filtered = filtered.filter(segment => 
        segment.functions.some(value => selectedFunctions.includes(value))
      );
    }
    
    if (selectedRoles.length > 0) {
      filtered = filtered.filter(segment => 
        segment.roles.some(value => selectedRoles.includes(value))
      );
    }
    
    setFilteredSegments(filtered);
  }, [industryL1Filters, industryL2Filters, functionFilters, roleFilters, searchTerm, segments]);
  
  // Toggle persona selection
  const togglePersona = (personaId: number) => {
    const newSelectedPersonaIds = selectedPersonaIds.includes(personaId)
      ? selectedPersonaIds.filter(id => id !== personaId)
      : [...selectedPersonaIds, personaId];
    
    onSelect(newSelectedPersonaIds);
  };
  
  // Toggle segment selection and expansion
  const toggleSegmentExpansion = (segmentId: number) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));

    // If we're expanding a segment, get filtered personas for it
    if (!expandedSegments[segmentId]) {
      updateSegmentPersonaCount(segmentId, personaFilters[segmentId]);
    }
  };
  
  // Toggle segment selection
  const toggleSegment = (segmentId: number) => {
    const newSelectedSegments = selectedSegments.includes(segmentId)
      ? selectedSegments.filter(id => id !== segmentId)
      : [...selectedSegments, segmentId];
    
    setSelectedSegments(newSelectedSegments);
    
    // If segment is being added, expand it automatically
    if (!selectedSegments.includes(segmentId)) {
      setExpandedSegments(prev => ({
        ...prev,
        [segmentId]: true
      }));
      
      // Update persona count
      updateSegmentPersonaCount(segmentId, personaFilters[segmentId]);
    }
  };
  
  // Helper function to check if a filter value is selected
  const isFilterSelected = (segmentId: number, filterType: keyof SegmentPersonaFilters, value: string): boolean => {
    const filters = personaFilters[segmentId];
    if (!filters) return false;
    return filters[filterType].includes(value);
  };

  // Toggle a persona filter value
  const togglePersonaFilter = (
    segmentId: number, 
    filterType: keyof SegmentPersonaFilters, 
    value: string
  ) => {
    const currentFilters = personaFilters[segmentId] || {
      industryL1: [],
      industryL2: [],
      functions: [],
      roles: []
    };
    
    const isSelected = currentFilters[filterType].includes(value);
    
    const newFilters = {
      ...currentFilters,
      [filterType]: isSelected
        ? currentFilters[filterType].filter(v => v !== value)
        : [...currentFilters[filterType], value]
    };
    
    setPersonaFilters(prev => ({
      ...prev,
      [segmentId]: newFilters
    }));
    
    // Update personas count based on filter changes
    updateSegmentPersonaCount(segmentId, newFilters);
  };
  
  const updateSegmentPersonaCount = async (segmentId: number, filters: SegmentPersonaFilters) => {
    setLoadingCounts(prev => ({
      ...prev,
      [segmentId]: true
    }));
    
    try {
      // Construct query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.industryL1.length > 0) {
        queryParams.append('industry_l1', filters.industryL1.join(','));
      }
      
      if (filters.industryL2.length > 0) {
        queryParams.append('sub_industry_l2', filters.industryL2.join(','));
      }
      
      if (filters.functions.length > 0) {
        queryParams.append('function', filters.functions.join(','));
      }
      
      if (filters.roles.length > 0) {
        queryParams.append('role', filters.roles.join(','));
      }
      
      // Add segment ID
      queryParams.append('segment_id', segmentId.toString());
      
      // Make the API call
      const response = await fetch(`${API_URL}/filtered-personas?${queryParams.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch personas count');
      }
      
      const data = await response.json();
      
      // Update the count
      setSegmentPersonaCounts(prev => ({
        ...prev,
        [segmentId]: data.length
      }));
      
      // Store and map personas
      const personaIds = data.map((p: any) => p.id);
      
      // Update the filtered personas
      setFilteredPersonas(prevPersonas => {
        // Remove existing personas from this segment
        const otherSegmentPersonas = prevPersonas.filter(p => p.segment_id !== segmentId);
        
        // Add new personas from this segment
        const newSegmentPersonas = data.map((p: any) => ({
          ...p,
          segment_id: segmentId
        }));
        
        const updatedPersonas = [...otherSegmentPersonas, ...newSegmentPersonas];
        
        // Pass filtered personas to parent component
        onFilteredPersonasUpdate(updatedPersonas);
        
        return updatedPersonas;
      });
      
    } catch (error) {
      console.error('Error updating persona count:', error);
    } finally {
      setLoadingCounts(prev => ({
        ...prev,
        [segmentId]: false
      }));
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    // Reset global filters
    setIndustryL1Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setIndustryL2Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setFunctionFilters(prev => prev.map(f => ({ ...f, selected: false })));
    setRoleFilters(prev => prev.map(f => ({ ...f, selected: false })));
    
    // Reset segment-specific filters
    const resetFilters: Record<number, SegmentPersonaFilters> = {};
    segments.forEach(segment => {
      resetFilters[segment.id] = {
        industryL1: [],
        industryL2: [],
        functions: [],
        roles: []
      };
    });
    
    setPersonaFilters(resetFilters);
    
    // Reset search
    setSearchTerm('');
    
    // Update persona counts
    selectedSegments.forEach(segmentId => {
      updateSegmentPersonaCount(segmentId, resetFilters[segmentId]);
    });
  };
  
  // Render function
  return (
    <div className="p-4">
      {!audienceId ? (
        <div className="text-center py-12 text-gray-500">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">No Audience Selected</p>
          <p className="text-sm">Please select an audience to view segments and personas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Search and filter header */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search segments..."
                className="py-2 pl-10 pr-4 block w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center py-1.5 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Segment cards with filters */}
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 flex justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-40 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <div className="text-red-500 mb-2">
                <X className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-gray-800 font-medium mb-2">Error Loading Segments</p>
              <p className="text-gray-500 text-sm mb-3">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-500 underline text-sm hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          ) : segments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-700 mb-1">No segments found</p>
              <p className="text-gray-500 text-sm">This audience doesn't have any segments yet.</p>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-700 mb-1">No matching segments</p>
              <p className="text-gray-500 text-sm mb-3">Try adjusting your search or filters.</p>
              <button 
                onClick={clearAllFilters}
                className="text-blue-500 underline text-sm hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSegments.map(segment => (
                <div 
                  key={segment.id} 
                  className={`bg-white rounded-lg border ${
                    selectedSegments.includes(segment.id) ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'
                  } shadow-sm overflow-hidden hover:border-blue-300 transition-colors`}
                >
                  {/* Segment header */}
                  <div className="border-b border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedSegments.includes(segment.id)}
                            onChange={() => toggleSegment(segment.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-800">{segment.name}</h3>
                          {segment.description && (
                            <p className="text-xs text-gray-500 mt-1">{segment.description}</p>
                          )}
                          <div className="mt-2 text-xs text-gray-500 flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            <span>{segment.len || 0} personas</span>
                            
                            {segmentPersonaCounts[segment.id] !== undefined && (
                              <span className="ml-2">
                                ({loadingCounts[segment.id] ? (
                                  <Loader2 className="inline h-3 w-3 animate-spin" />
                                ) : (
                                  `${segmentPersonaCounts[segment.id]} filtered`
                                )})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => toggleSegmentExpansion(segment.id)}
                        className={`p-1 rounded-full hover:bg-gray-200 ${expandedSegments[segment.id] ? 'bg-gray-200' : ''}`}
                      >
                        <ChevronDown 
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            expandedSegments[segment.id] ? 'transform rotate-180' : ''
                          }`} 
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Segment filters */}
                  {expandedSegments[segment.id] && (
                    <div className="p-4 animate-fadeIn">
                      {/* Industry L1 Filters */}
                      {segment.industryL1.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1.5">Industry</p>
                          <div className="flex flex-wrap gap-1.5">
                            {segment.industryL1.map(value => (
                              <button
                                key={`industry-${segment.id}-${value}`}
                                onClick={() => togglePersonaFilter(segment.id, 'industryL1', value)}
                                className={`inline-flex items-center py-1 px-2 rounded-full text-xs border ${
                                  isFilterSelected(segment.id, 'industryL1', value)
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isFilterSelected(segment.id, 'industryL1', value) && (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Industry L2 Filters */}
                      {segment.industryL2.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1.5">Sub-Industry</p>
                          <div className="flex flex-wrap gap-1.5">
                            {segment.industryL2.map(value => (
                              <button
                                key={`industry-l2-${segment.id}-${value}`}
                                onClick={() => togglePersonaFilter(segment.id, 'industryL2', value)}
                                className={`inline-flex items-center py-1 px-2 rounded-full text-xs border ${
                                  isFilterSelected(segment.id, 'industryL2', value)
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isFilterSelected(segment.id, 'industryL2', value) && (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Function Filters */}
                      {segment.functions.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1.5">Function</p>
                          <div className="flex flex-wrap gap-1.5">
                            {segment.functions.map(value => (
                              <button
                                key={`function-${segment.id}-${value}`}
                                onClick={() => togglePersonaFilter(segment.id, 'functions', value)}
                                className={`inline-flex items-center py-1 px-2 rounded-full text-xs border ${
                                  isFilterSelected(segment.id, 'functions', value)
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isFilterSelected(segment.id, 'functions', value) && (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Role Filters */}
                      {segment.roles.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1.5">Role</p>
                          <div className="flex flex-wrap gap-1.5">
                            {segment.roles.map(value => (
                              <button
                                key={`role-${segment.id}-${value}`}
                                onClick={() => togglePersonaFilter(segment.id, 'roles', value)}
                                className={`inline-flex items-center py-1 px-2 rounded-full text-xs border ${
                                  isFilterSelected(segment.id, 'roles', value)
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isFilterSelected(segment.id, 'roles', value) && (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                {value}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Apply filters button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => updateSegmentPersonaCount(segment.id, personaFilters[segment.id])}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded-md transition-colors inline-flex items-center"
                          disabled={loadingCounts[segment.id]}
                        >
                          {loadingCounts[segment.id] ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Filter className="h-3 w-3 mr-1.5" />
                              Apply Filters
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
