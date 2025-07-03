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
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import ChatInterface from './ChatInterface';

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
const PersonaSelector: React.FC<PersonaSelectorProps> = ({ onSelect, selectedPersonaIds, audienceId }) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingAudience, setSelectingAudience] = useState<boolean>(false);
  
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
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [rolePersonaMap, setRolePersonaMap] = useState<Record<string, number[]>>({});
  const [fetchedPersonasMap, setFetchedPersonasMap] = useState<Record<number, PersonaType>>({});
  const [loadingPersonaIds, setLoadingPersonaIds] = useState<boolean>(false);
  
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

  const industries = useMemo(() => [
    'Industrial', 'Healthcare And Life Sciences', 'Public Sector', 
    'Retail And Consumer Goods', 'Tmt And Consulting', 'Banking Financial Services And Insurance'
  ], []);

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
          const matchedIndustry = industries.find(ind => 
            segmentNameL1 === ind || segmentNameL1.includes(ind)
          );
          
          const selectedL2 = matchedIndustry && Object.prototype.hasOwnProperty.call(industryL2Map, matchedIndustry) 
            ? industryL2Map[matchedIndustry as keyof typeof industryL2Map] || [] 
            : [];
          
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
        setFilteredSegments(enhancedData);
        
        // Initialize filters from all segments
        initializeFilters(enhancedData);
        
        // Initialize persona filters with empty arrays for every segment
        const initialFilters: Record<number, SegmentPersonaFilters> = {};
        enhancedData.forEach((segment: Segment) => {
          initialFilters[segment.id] = {
            industryL1: [],
            industryL2: [],
            functions: [],
            roles: []
          };
          
          // Initialize segment persona counts with default len value
          setSegmentPersonaCounts(prev => ({
            ...prev,
            [segment.id]: segment.len
          }));
        });
        
        setPersonaFilters(initialFilters);
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
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
      // Count Industry L1
      segment.industryL1.forEach(ind => {
        l1Map[ind] = (l1Map[ind] || 0) + 1;
      });
      
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
    // Get selected filters
    const selectedL1 = industryL1Filters.filter(f => f.selected).map(f => f.label);
    const selectedL2 = industryL2Filters.filter(f => f.selected).map(f => f.label);
    const selectedFunctions = functionFilters.filter(f => f.selected).map(f => f.label);
    const selectedRoles = roleFilters.filter(f => f.selected).map(f => f.label);
    
    // Check if any filters are active
    const hasActiveFilters = 
      selectedL1.length > 0 || 
      selectedL2.length > 0 || 
      selectedFunctions.length > 0 || 
      selectedRoles.length > 0 ||
      searchTerm.length > 0;
    
    // If no filters active, show all segments
    if (!hasActiveFilters) {
      setFilteredSegments(segments);
      return;
    }
    
    // Filter segments based on selected criteria
    const filtered = segments.filter(segment => {
      // Industry L1 match (if any L1 filters are selected)
      const l1Match = selectedL1.length === 0 || 
        segment.industryL1.some(ind => selectedL1.includes(ind));
      
      // Industry L2 match (if any L2 filters are selected)
      const l2Match = selectedL2.length === 0 || 
        segment.industryL2.some(ind => selectedL2.includes(ind));
      
      // Function match (if any function filters are selected)
      const functionMatch = selectedFunctions.length === 0 || 
        segment.functions.some(func => selectedFunctions.includes(func));
      
      // Role match (if any role filters are selected)
      const roleMatch = selectedRoles.length === 0 || 
        segment.roles.some(role => selectedRoles.includes(role));
      
      // Title search match (if search text entered)
      const titleMatch = searchTerm === '' ||
        segment.titles.some(title => 
          title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return l1Match && l2Match && functionMatch && roleMatch && titleMatch;
    });
    
    setFilteredSegments(filtered);
  }, [industryL1Filters, industryL2Filters, functionFilters, roleFilters, searchTerm, segments]);
  
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
  
  // Toggle segment selection and expansion
  const toggleSegmentExpansion = (segmentId: number) => {
    setExpandedSegments(prev => ({
      ...prev,
      [segmentId]: !prev[segmentId]
    }));
    
    // If expanding segment, initialize if not selected yet
    if (!expandedSegments[segmentId]) {
      // Initialize if this segment hasn't been selected yet
      if (!selectedSegments.includes(segmentId)) {
        toggleSegment(segmentId);
      }
    }
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
    try {
      // Set loading state for this segment
      setLoadingCounts(prev => ({
        ...prev,
        [segmentId]: true
      }));
      
      const filterRequest = {
        segments: [segmentId],
        filters: {
          [segmentId]: filters
        }
      };
      
      // Create a function to process the mapping data
      const processRoleMapping = (roleToPersonaIdsMap: Record<string, number[]>) => {
        // Calculate total personas across all roles
        let totalPersonas = 0;
        const allPersonaIds: number[] = [];
          Object.values(roleToPersonaIdsMap).forEach(personaIds => {
          totalPersonas += personaIds.length;
          
          // Collect all unique persona IDs
          personaIds.forEach(id => {
            if (!allPersonaIds.includes(id)) {
              allPersonaIds.push(id);
            }
          });
        });
        
        // Update the count for this segment
        setSegmentPersonaCounts(prev => ({
          ...prev,
          [segmentId]: totalPersonas
        }));
        
        // Also update the role persona map if this is a selected segment
        if (selectedSegments.includes(segmentId)) {
          // Merge with existing data rather than replacing entirely
          setRolePersonaMap(prev => ({
            ...prev,
            ...roleToPersonaIdsMap
          }));
          
          // Pre-fetch all personas in bulk
          if (allPersonaIds.length > 0) {
            // If there are many personas, fetch in batches
            const batchSize = 25;
            if (allPersonaIds.length > batchSize) {
              // Fetch first batch immediately
              const firstBatch = allPersonaIds.slice(0, batchSize);
              fetchPersonasByIds(firstBatch);
              
              // Schedule remaining batches
              for (let i = batchSize; i < allPersonaIds.length; i += batchSize) {
                const batch = allPersonaIds.slice(i, i + batchSize);
                setTimeout(() => {
                  fetchPersonasByIds(batch);
                }, 500 * Math.floor(i / batchSize)); // Stagger requests every 500ms
              }
            } else {
              // Fetch all at once if it's a reasonable amount
              fetchPersonasByIds(allPersonaIds);
            }
          }
          
          // Expand the first role by default if we have roles
          const roles = Object.keys(roleToPersonaIdsMap);
          if (roles.length > 0) {
            setExpandedRoles(prev => ({ 
              ...prev,
              [`${segmentId}-${roles[0]}`]: true 
            }));
          }
        }
        
        return totalPersonas;
      };
      
      const response = await fetch(`${API_URL}/filter_personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(filterRequest)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered personas for count update');
      }
      
      const roleToPersonaIdsMap = await response.json();
      return processRoleMapping(roleToPersonaIdsMap);
      
    } catch (error) {
      console.error('Error updating persona count:', error);
      return 0;
    } finally {
      // Clear loading state for this segment
      setLoadingCounts(prev => ({
        ...prev,
        [segmentId]: false
      }));
    }
  };
  
  // Function to fetch personas by their IDs in bulk
  const fetchPersonasByIds = async (personaIds: number[]) => {
    if (!personaIds || personaIds.length === 0) return;
    
    const idsToFetch = personaIds.filter(id => !fetchedPersonasMap[id]);
    if (idsToFetch.length === 0) return;
    
    try {
      // Use a bulk API endpoint to fetch multiple personas at once
      const response = await fetch(`${API_URL}/bulk_personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ persona_ids: idsToFetch })
      });
      
      if (!response.ok) {
        // Fallback to individual fetches if bulk endpoint is not available
        return fetchPersonasIndividually(idsToFetch);
      }
      
      const personas = await response.json();
      
      // Update the fetchedPersonasMap with new personas
      const newPersonasMap = { ...fetchedPersonasMap };
      personas.forEach((persona: PersonaType) => {
        try {
          newPersonasMap[persona.id] = {
            ...persona,
            data: typeof persona.data === 'string' ? JSON.parse(persona.data) : persona.data
          };
        } catch (error) {
          console.error(`Error parsing persona data for ${persona.name}:`, error);
          newPersonasMap[persona.id] = persona;
        }
      });
      
      setFetchedPersonasMap(newPersonasMap);
    } catch (error) {
      console.error('Error fetching personas in bulk:', error);
      // Fallback to individual fetches
      return fetchPersonasIndividually(idsToFetch);
    }
  };
  
  // Fallback function to fetch personas individually if bulk fetch fails
  const fetchPersonasIndividually = async (personaIds: number[]) => {
    try {
      const fetchPromises = personaIds.map(id => 
        fetch(`${API_URL}/personas/${id}`, { credentials: 'include' })
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch persona ${id}`);
            return res.json();
          })
          .then(data => {
            // Process the persona data
            try {
              return {
                ...data,
                data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data
              };
            } catch (error) {
              console.error(`Error parsing persona data for ${data.name}:`, error);
              return data;
            }
          })
      );
      
      const personas = await Promise.all(fetchPromises);
      
      // Update the fetchedPersonasMap with new personas
      const newPersonasMap = { ...fetchedPersonasMap };
      personas.forEach(persona => {
        newPersonasMap[persona.id] = persona;
      });
      
      setFetchedPersonasMap(newPersonasMap);
    } catch (error) {
      console.error('Error fetching personas individually:', error);
    }
  };
  
  // Function to toggle role expansion
  const toggleRoleExpansion = (segmentId: number, role: string) => {
    const key = `${segmentId}-${role}`;
    
    // Toggle the clicked role
    setExpandedRoles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // If opening this role, load and fetch personas for this role
    if (!expandedRoles[key]) {
      // Check if we need to fetch persona data
      if (role === 'all') {
        // For 'all' roles, use current filters
        const currentFilters = personaFilters[segmentId] || {
          industryL1: [],
          industryL2: [],
          functions: [],
          roles: []
        };
        
        // Update all personas for this segment with current filters
        updateSegmentPersonaCount(segmentId, currentFilters);
      } else {
        // For specific role, check if we already have personaIds for this role
        const personaIdsForRole = rolePersonaMap[role];
        
        if (personaIdsForRole && personaIdsForRole.length > 0) {
          // We already have the IDs, just fetch the persona data if needed
          fetchPersonasByIds(personaIdsForRole);
        } else {
          // We don't have the IDs, so fetch them first
          // Check if we have filters for this segment
          const segmentFilters = personaFilters[segmentId] || {
            industryL1: [],
            industryL2: [],
            functions: [],
            roles: []
          };
          
          // Make sure this role is included in the filters
          if (!segmentFilters.roles.includes(role)) {
            const updatedFilters = {
              ...segmentFilters,
              roles: [...segmentFilters.roles, role]
            };
            
            setPersonaFilters(prev => ({
              ...prev,
              [segmentId]: updatedFilters
            }));
            
            // Fetch personas with updated filter
            updateSegmentPersonaCount(segmentId, updatedFilters);
          } else {
            // If role already in filters, just fetch personas
            fetchPersonasForSegmentAndRole(segmentId, role);
          }
        }
      }
    }
  };
    
  // Function to fetch personas for a specific segment and role
  const fetchPersonasForSegmentAndRole = async (segmentId: number, role: string) => {
    setLoadingPersonaIds(true);
    
    try {
      // Check if we already have this mapping in the rolePersonaMap
      if (rolePersonaMap[role] && rolePersonaMap[role].length > 0) {
        // We already have the mapping, just fetch the personas by IDs
        await fetchPersonasByIds(rolePersonaMap[role]);
      } else {
        // Create filter request focusing on specific role
        const filterRequest = {
          segments: [segmentId],
          filters: {
            [segmentId]: {
              ...personaFilters[segmentId],
              roles: [role]
            }
          }
        };
        
        const response = await fetch(`${API_URL}/filter_personas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(filterRequest)
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch filtered personas');
        }
        
        const roleToPersonaIdsMap = await response.json();
        
        // Update our mapping with the new data
        setRolePersonaMap(prev => ({
          ...prev,
          ...roleToPersonaIdsMap
        }));
        
        // Get persona IDs for this role
        const personaIds = roleToPersonaIdsMap[role] || [];
        
        // Fetch personas by their IDs
        if (personaIds.length > 0) {
          await fetchPersonasByIds(personaIds);
        }
      }
    } catch (error) {
      console.error('Error fetching personas for role:', error);
    } finally {
      setLoadingPersonaIds(false);
    }
  };
  
  // Function to get personas for a specific segment and role
  const getPersonasForRole = (segmentId: number, role: string): PersonaType[] => {
    // Get persona IDs for this role from the API response
    const personaIds = rolePersonaMap[role] || [];
    
    // If no persona IDs for this role, check if we need to fetch them
    if (personaIds.length === 0) {
      const key = `${segmentId}-${role}`;
      // Trigger a fetch if the role is expanded but we don't have data yet
      if (expandedRoles[key] && !loadingPersonaIds) {
        // Fetch in the next tick to avoid rendering issues
        setTimeout(() => {
          fetchPersonasForSegmentAndRole(segmentId, role);
        }, 0);
      }
      return [];
    }
    
    // Return only personas that we've already fetched
    return personaIds
      .map(id => fetchedPersonasMap[id])
      .filter(persona => persona !== undefined);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setIndustryL1Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setIndustryL2Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setFunctionFilters(prev => prev.map(f => ({ ...f, selected: false })));
    setRoleFilters(prev => prev.map(f => ({ ...f, selected: false })));
    setSearchTerm('');
    setSelectedSegments([]);
  };
  
  // Render function
  return (
    <div className="p-4">
      {!audienceId ? (
        <div className="text-center py-12 text-gray-500">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium">Please select an audience first</p>
          <p className="text-sm mt-2">You need to select an audience to view and chat with its personas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Top dropdown for Audience Segments */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-gray-800">Audience Segments</h3>
              <div className="text-sm text-gray-500">
                {selectedSegments.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {selectedSegments.length} selected
                  </span>
                )}
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-600">
                <p>{error}</p>
              </div>
            ) : segments.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No segments found</p>
              </div>
            ) : filteredSegments.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No segments match your filters</p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSegments.map(segment => (
                  <div 
                    key={segment.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      selectedSegments.includes(segment.id) 
                        ? 'border-blue-300 ring-1 ring-blue-300' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-3 flex justify-between items-start">
                      <div className="flex items-start">
                        {/* Checkbox */}
                        <div 
                          className={`w-5 h-5 flex-shrink-0 border rounded cursor-pointer mt-0.5 ${
                            selectedSegments.includes(segment.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}
                          onClick={() => toggleSegment(segment.id)}
                        >
                          {selectedSegments.includes(segment.id) && (
                            <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                        
                        {/* Segment info */}
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-800 truncate max-w-[180px] sm:max-w-xs">{segment.name}</h4>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <User className="w-3 h-3 mr-1" />
                            {loadingCounts[segment.id] ? (
                              <span>Loading...</span>
                            ) : (
                              <span>
                                {segmentPersonaCounts[segment.id] !== undefined 
                                  ? segmentPersonaCounts[segment.id] 
                                  : segment.len} profiles
                                {segmentPersonaCounts[segment.id] !== undefined && segmentPersonaCounts[segment.id] !== segment.len && 
                                  " (filtered)"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Main content area with Profiles on left and Chat on right */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left sidebar: Profiles (as a side pane) */}
            <div className="lg:w-1/4 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden flex flex-col">
              {/* Search header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-medium text-gray-800 mb-2">Profiles</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search profiles..."
                    className="bg-gray-50 border border-gray-300 text-sm rounded-lg w-full pl-10 p-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected count */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{Object.values(segmentPersonaCounts).reduce((sum, count) => sum + count, 0) || 0}</span> profiles
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{selectedPersonaIds.length}</span> selected
                </div>
              </div>

              {/* Hierarchical segments list with industries, functions, roles and personas */}
              <div className="overflow-auto flex-grow">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : selectedSegments.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Users className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-1">No profiles selected</p>
                    <p className="text-xs text-gray-500">Select segments above to view profiles</p>
                  </div>
                ) : loadingPersonaIds ? (
                  <div className="flex flex-col justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <p className="text-sm text-gray-600">Loading profiles...</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedSegments.map(segmentId => {
                      const segment = segments.find(s => s.id === segmentId);
                      if (!segment) return null;
                      
                      return (
                        <div key={segmentId} className="border-b">
                          {/* Segment header */}
                          <button
                            onClick={() => toggleSegmentExpansion(segmentId)}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-all duration-200 focus:outline-none",
                              expandedSegments[segmentId] && "bg-blue-50/50"
                            )}
                          >
                            <div className="flex items-center">
                              {expandedSegments[segmentId] ? (
                                <ChevronDown className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="text-left">
                                <span className="font-medium text-gray-800">{segment.name}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {segmentPersonaCounts[segmentId] || segment.len} profiles
                                </div>
                              </div>
                            </div>
                          </button>
                          
                          {/* Segment content - show when expanded - Simplified View */}
                          {expandedSegments[segmentId] && (
                            <div className="pl-6 pb-2">
                              {/* L2 Industries shown as comma-separated list */}
                              {segment.industryL2.length > 0 && (
                                <div className="mb-3 px-2 py-2 bg-indigo-50/60 rounded-md">
                                  <div className="flex items-center text-indigo-700 text-xs font-medium mb-1">
                                    <Building2 className="w-3 h-3 mr-1.5 text-indigo-500" />
                                    {segment.industryL1.join(', ')} - <span className="text-indigo-500 ml-1">Sub-industries</span>
                                  </div>
                                  <div className="text-xs text-indigo-700 ml-4">
                                    {personaFilters[segmentId]?.industryL2?.length > 0 
                                      ? personaFilters[segmentId].industryL2.join(', ')
                                      : segment.industryL2.join(', ')}
                                  </div>
                                </div>
                              )}
                              
                              {/* Functions shown as comma-separated list */}
                              {segment.functions.length > 0 && (
                                <div className="mb-3 px-2 py-2 bg-green-50/60 rounded-md">
                                  <div className="flex items-center text-green-700 text-xs font-medium mb-1">
                                    <Briefcase className="w-3 h-3 mr-1.5 text-green-500" />
                                    Functions
                                  </div>
                                  <div className="text-xs text-green-700 ml-4">
                                    {personaFilters[segmentId]?.functions?.length > 0 
                                      ? personaFilters[segmentId].functions.join(', ') 
                                      : segment.functions.join(', ')}
                                  </div>
                                </div>
                              )}
                              
                              {/* Roles shown as comma-separated list with dropdown for personas */}
                              <div>
                                <div className="mb-3 px-2 py-2 bg-amber-50/60 rounded-md">
                                  <div className="flex items-center text-amber-700 text-xs font-medium mb-1">
                                    <Users className="w-3 h-3 mr-1.5 text-amber-500" />
                                    Roles
                                  </div>
                                  <div className="relative">
                                    {/* Roles as a comma-separated list in a dropdown button */}
                                    <button
                                      onClick={() => toggleRoleExpansion(segmentId, 'all')}
                                      className={cn(
                                        "w-full text-left flex items-center justify-between text-xs py-2 px-3 rounded-md border",
                                        expandedRoles[`${segmentId}-all`]
                                          ? "bg-amber-100 text-amber-800 border-amber-200"
                                          : "bg-amber-50/80 hover:bg-amber-100/70 text-amber-700 border-amber-100"
                                      )}
                                    >
                                      <div className="text-xs text-amber-700 ml-1 truncate">
                                        {personaFilters[segmentId]?.roles?.length > 0 
                                          ? personaFilters[segmentId].roles.join(', ') 
                                          : segment.roles.join(', ')}
                                      </div>
                                      <div className="flex items-center">
                                        <span className="text-xs text-gray-500 mr-2">
                                          {segment.roles.reduce((total, role) => total + (rolePersonaMap[role]?.length || 0), 0)} profiles
                                        </span>
                                        {expandedRoles[`${segmentId}-all`] ? (
                                          <ChevronDown className="w-3 h-3 text-amber-600" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-amber-600" />
                                        )}
                                      </div>
                                    </button>
                                    
                                    {/* Expanded dropdown with all personas grouped by roles */}
                                    {expandedRoles[`${segmentId}-all`] && (
                                      <div className="mt-2 border border-amber-100 rounded-md overflow-hidden bg-white shadow-sm">
                                        {/* Get actual roles from the rolePersonaMap if available */}
                                        {(Object.keys(rolePersonaMap).length > 0 
                                          ? Object.keys(rolePersonaMap).filter(role => 
                                              rolePersonaMap[role] && rolePersonaMap[role].length > 0)
                                          : segment.roles
                                        ).map((role, roleIdx) => (
                                          <div key={`${segmentId}-role-${roleIdx}`} className="border-b border-amber-50 last:border-b-0">
                                            <div className="px-3 py-2 bg-amber-50/40 text-xs font-medium text-amber-700 flex justify-between">
                                              <span>{role}</span>
                                              <span className="text-xs text-gray-500">
                                                {rolePersonaMap[role]?.length || 0} profiles
                                              </span>
                                            </div>
                                            
                                            <div className="py-2 px-2">
                                              {(() => {
                                                // Get personas for this role
                                                const personas = getPersonasForRole(segmentId, role);
                                                return personas.length > 0 ? (
                                                  personas.map((persona) => (
                                                    <div
                                                      key={persona.id}
                                                      onClick={() => togglePersona(persona.id)}
                                                      className={cn(
                                                        "my-1.5 px-3 py-2 rounded-md cursor-pointer text-xs transition-all",
                                                        selectedPersonaIds.includes(persona.id)
                                                          ? "bg-white shadow-sm border border-blue-200 ring-1 ring-blue-100"
                                                          : "hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
                                                      )}
                                                    >
                                                      <div className="flex justify-between items-start">
                                                        <div className="pr-2">
                                                          <div className="font-medium text-gray-800">{persona.name}</div>
                                                          <div className="text-xs text-gray-500 truncate mt-1 flex items-center">
                                                            <Briefcase className="w-3 h-3 mr-1 text-gray-400" />
                                                            {persona.job_title || persona.data?.job_title || 'No title'}
                                                          </div>
                                                          <div className="mt-1 flex flex-wrap gap-1">
                                                            {/* Industry and Function Tags - inline */}
                                                            {((persona.sub_industry_l2 || persona.data?.sub_industry_l2) || 
                                                             (persona.function || persona.data?.function)) && (
                                                              <div className="text-[10px] text-gray-500">
                                                                {persona.sub_industry_l2 || persona.data?.sub_industry_l2}
                                                                {(persona.sub_industry_l2 || persona.data?.sub_industry_l2) && 
                                                                 (persona.function || persona.data?.function) && ' • '}
                                                                {persona.function || persona.data?.function}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        {selectedPersonaIds.includes(persona.id) && (
                                                          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-center py-2 text-xs text-gray-500 italic">
                                                    {rolePersonaMap[role] && rolePersonaMap[role].length > 0 ? 
                                                      'Loading profiles...' : 'No profiles found'}
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right content: Chat with Personas */}
            <div className="lg:w-3/4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full">
                <div className="flex flex-col h-[calc(100vh-240px)]">
                  {/* Chat header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-indigo-600 mr-2" />
                      <h3 className="text-base font-medium text-gray-800">
                        Chat with {selectedPersonaIds.length} {selectedPersonaIds.length === 1 ? 'Persona' : 'Personas'}
                      </h3>
                    </div>
                    {selectedPersonaIds.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {selectedPersonaIds.length} selected
                      </span>
                    )}
                  </div>
                  
                  {/* Chat content */}
                  {selectedPersonaIds.length > 0 ? (
                    <ChatInterface selectedPersonaIds={selectedPersonaIds} />
                  ) : (
                    <div className="flex-grow flex items-center justify-center bg-gray-50/50">
                      <div className="text-center p-6">
                        <MessageSquare className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 mb-1">No personas selected</p>
                        <p className="text-xs text-gray-500 max-w-xs">
                          Select personas from the profiles panel to start chatting
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
