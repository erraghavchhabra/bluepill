import React, { useState, useEffect, useMemo } from 'react';
import { User, Info, ArrowLeft, Briefcase, Building, Users, Building2, Filter, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../../components/Button';
import StepContainer from '../../components/StepContainer';
import { useAudience } from '../../context/AudienceContext';
import { Dialog, DialogHeader, DialogTitle } from '../../components/ui/dialog.jsx';
import { CustomDialogContent as DialogContent, CustomDialogClose } from '../../components/ui/dialog-custom.jsx';
import { formatPersonaFilterRequest } from '../../lib/utils';
import { cn } from '../../lib/utils';



interface SegmentsSelectorProps {
  audienceId: number;
  onBack: () => void;
  onNext: (selectedSegments: number[], personaFilters: Record<number, SegmentPersonaFilters>) => void;
  onEditStep?: () => void; // Add this prop to notify parent of edits
}

interface Segment {
  id: number;
  name: string;
  description: string;
  len: number; // Number of personas
  created_at: string;
  updated_at: string;
  // Persona filter attributes
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
  titles: string[];
}

// Filter options interface
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

const API_URL = import.meta.env.VITE_API_URL || '';

const SegmentsSelector: React.FC<SegmentsSelectorProps> = ({
  audienceId,
  onBack,
  onNext,
  onEditStep
}) => {
  const { audienceData, updateAudienceData } = useAudience();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track persona filters for each segment
  const [personaFilters, setPersonaFilters] = useState<Record<number, SegmentPersonaFilters>>({});
  const [initialSelectedSegments, setInitialSelectedSegments] = useState<number[]>([]);
  const [initialPersonaFilters, setInitialPersonaFilters] = useState<Record<number, SegmentPersonaFilters>>({});
  // Filter states
  const [industryL1Filters, setIndustryL1Filters] = useState<FilterOption[]>([]);
  const [industryL2Filters, setIndustryL2Filters] = useState<FilterOption[]>([]);
  const [functionFilters, setFunctionFilters] = useState<FilterOption[]>([]);
  const [roleFilters, setRoleFilters] = useState<FilterOption[]>([]);  const [titleSearchValue, setTitleSearchValue] = useState('');
  const [filteredSegments, setFilteredSegments] = useState<Segment[]>([]);
  
  // States for persona modal
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);  const [selectedSegmentForPersonas, setSelectedSegmentForPersonas] = useState<number | null>(null);
  const [segmentPersonas, setSegmentPersonas] = useState<PersonaType[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);  // Add state for expanded roles in the persona modal  
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  // Add state to track persona counts for each segment
  const [segmentPersonaCounts, setSegmentPersonaCounts] = useState<Record<number, number>>({});
  // Add state to track which segments are currently loading their count
  const [loadingCounts, setLoadingCounts] = useState<Record<number, boolean>>({});

  // Define a Persona type to avoid "any" type errors
  interface PersonaType {
    id: number;
    name: string;
    age?: number | string;
    gender?: string;
    job_title?: string;
    company_name?: string;
    industry_l1?: string;
    sub_industry_l2?: string;
    function?: string;
    role?: string;
    income?: string;
    education?: string;
    location?: string;
    interests?: string[];
    goals?: string[];
    pain_points?: string[];
    behaviors?: string[];
    values?: string[];
    preferred_channels?: string[];
    purchasing_habits?: string[];
    customer_profile_insights?: {
      triggers_and_motivations?: string[];
      concerns_and_obstacles?: string[];
      decision_criteria?: string[];
      expected_outcomes?: string[];
      path_to_purchase?: string[];
    };
    created_at: string;
    updated_at: string;
    segment_id?: number;
    [key: string]: any; // For any other fields
  }
  
  // Standard functions and roles that are common across all segments
  const standardFunctions = useMemo(() => ['Legal', 'Procurement', 'Finance', 'Sales'], []);
  const standardRoles = useMemo(() => ["CXO", "Decision Maker/Leaders", "Mid Level Managers", "Individual contributors"], []);
  // Define industry taxonomies - L1 industries and their corresponding L2 industries using useMemo
  // These are predefined industry categories that we'll try to match against segment names
  const industries = useMemo(() => [
    'Industrial', 'Healthcare And Life Sciences', 'Public Sector', 
    'Retail And Consumer Goods', 'Tmt And Consulting', 'Banking Financial Services And Insurance'
  ], []);
  
  // Mapping of industry L1 to their L2 subcategories
  const industryL2Map = useMemo(() => ({
    'Industrial': ['Manufacturing', 'Automotive', 'Transportation', 'Energy And Utilities', 'Construction'],
    'Public Sector': ['Government Contractors', 'Federal Government', 'Higher Education', 'State and Local Government'],
    'Healthcare And Life Sciences': ['Payers', 'Providers', 'Medical Technology', 'Pharma'],
    'Retail And Consumer Goods': ['Retail', 'Consumer Goods', 'Wholesale Distribution'],
    'Tmt And Consulting': ['Technology', 'Telecom', 'Media', 'Consulting And IT Services'],
    'Banking Financial Services And Insurance': ['Banking', 'Insurance', 'Financial Service Institutions', 'Lending and Credit Services']
  }), []);  // Initialize persona filters when segments change - but with empty arrays for filters
  useEffect(() => {
    // Only initialize filters for segments that don't already have them
    setPersonaFilters(prevFilters => {
      const updatedFilters = { ...prevFilters };
      
      // Go through all segments, not just selected ones
      segments.forEach(segment => {
        // If this segment doesn't have filters yet, initialize them with empty arrays
        if (!updatedFilters[segment.id]) {
          updatedFilters[segment.id] = {
            industryL1: [], // Empty array instead of all values
            industryL2: [], // Empty array instead of all values
            functions: [], // Empty array instead of all values
            roles: [] // Empty array instead of all values
          };
          
          // Initialize persona counts for each segment with their default len value
          setSegmentPersonaCounts(prev => ({
            ...prev,
            [segment.id]: segment.len
          }));
        }
      });
      
      return updatedFilters;
    });
    
    // Also initialize persona counts for selected segments
    segments.forEach(async (segment) => {
      if (selectedSegments.includes(segment.id)) {
        // Get the current filters for this segment
        const currentFilters = personaFilters[segment.id] || {
          industryL1: [],
          industryL2: [],
          functions: [],
          roles: []
        };
        
        // Update count if segment is selected and has filters
        await updateSegmentPersonaCount(segment.id, currentFilters);
      }
    });
  }, [segments]);
  useEffect(() => {
    const fetchSegments = async () => {
      if (!audienceId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/audience/${audienceId}/segments`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch segments');
        }
        
        const data = await response.json();
        // Enhance data with example hierarchical attributes for personas
        // In production, this should come from your API
        const enhancedData = data.map((segment: Omit<Segment, 'industryL1' | 'industryL2' | 'functions' | 'roles' | 'titles'>) => {
          // Use our standardized functions and roles
          const titles = ['CEO', 'CFO', 'CTO', 'CMO', 'COO', 'VP of Sales', 'Director of Marketing', 'Project Manager'];          
          // Use the segment name as the L1 industry directly
          const segmentNameL1 = segment.name;
          const selectedIndustries = [segmentNameL1];
          // Get L2 industries for the L1 industry if it exists in our mapping
          // Check if the segment name matches or contains any of our predefined industries
          const matchedIndustry = industries.find(ind => 
            segmentNameL1 === ind || segmentNameL1.includes(ind)
          );
          const selectedL2 = matchedIndustry && Object.prototype.hasOwnProperty.call(industryL2Map, matchedIndustry) 
            ? industryL2Map[matchedIndustry as keyof typeof industryL2Map] || [] 
            : [];
          
          // Use all our standardized functions (no random subset)
          const selectedFunctions = [...standardFunctions];
          
          // Use all our standardized roles (no random subset)
          const selectedRoles = [...standardRoles];
          
          // Select 1-3 titles
          const selectedTitles = [...new Set(Array(1 + Math.floor(Math.random() * 3))
            .fill(0)
            .map(() => titles[Math.floor(Math.random() * titles.length)]))]
          
          return {
            ...segment,
            industryL1: selectedIndustries,
            industryL2: selectedL2,
            functions: selectedFunctions,
            roles: selectedRoles,
            titles: selectedTitles
          };
        });
        
        setSegments(enhancedData);
        setFilteredSegments(enhancedData);
        
        // IMPORTANT: Always use audienceData to initialize selections
        // This ensures selections persist across navigation
        if (audienceData.selectedSegments && audienceData.selectedSegments.length > 0) {
          setSelectedSegments(audienceData.selectedSegments);
          setInitialSelectedSegments(audienceData.selectedSegments);
          
          // Also initialize filters from audienceData if available
          if (Object.keys(audienceData.personaFilters || {}).length > 0) {
            setPersonaFilters(audienceData.personaFilters || {});
            setInitialPersonaFilters(JSON.parse(JSON.stringify(audienceData.personaFilters || {})));
          }
        }
        
        // Initialize filters from all segments
        initializeFilters(enhancedData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching segments:', err);
        setError('Failed to load segments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchSegments();
  }, [audienceId, industries, industryL2Map, standardFunctions, standardRoles, audienceData.selectedSegments, audienceData.personaFilters]);
  
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
      titleSearchValue.length > 0;
    
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
      const titleMatch = titleSearchValue === '' ||
        segment.titles.some(title => 
          title.toLowerCase().includes(titleSearchValue.toLowerCase())
        );
      
      return l1Match && l2Match && functionMatch && roleMatch && titleMatch;
    });
    
    setFilteredSegments(filtered);
  }, [industryL1Filters, industryL2Filters, functionFilters, roleFilters, titleSearchValue, segments]);
  // Filter toggling functionality - can be implemented if needed
  // For now using direct filtering in the useEffect hook above    // Toggle segment selection
  const toggleSegment = (segmentId: number) => {
    if (selectedSegments.includes(segmentId)) {
      // Remove segment from selection
      const newSelectedSegments = selectedSegments.filter(id => id !== segmentId);
      setSelectedSegments(newSelectedSegments);
      
      // Check if this is a change from the initial state and notify parent if needed
      if (initialSelectedSegments.includes(segmentId) && onEditStep) {
        onEditStep();
      }
    } else {
      // Add segment to selection
      const newSelectedSegments = [...selectedSegments, segmentId];
      setSelectedSegments(newSelectedSegments);
      
      // Check if this is a change from the initial state and notify parent if needed
      if (!initialSelectedSegments.includes(segmentId) && onEditStep) {
        onEditStep();
      }
      
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
  
  // Clear all filters
  const clearAllFilters = () => {
    setIndustryL1Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setIndustryL2Filters(prev => prev.map(f => ({ ...f, selected: false })));
    setFunctionFilters(prev => prev.map(f => ({ ...f, selected: false })));
    setRoleFilters(prev => prev.map(f => ({ ...f, selected: false })));
    setTitleSearchValue('');
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
    value: string,
    checked: boolean
  ) => {
    setPersonaFilters(prev => {
      const segmentFilters = prev[segmentId] || {
        industryL1: [],
        industryL2: [],
        functions: [],
        roles: []
      };
      
      const updatedFilters = checked
        ? [...segmentFilters[filterType], value] 
        : segmentFilters[filterType].filter(item => item !== value);
      
      // Check if this is a change from the initial state
      const initialFilters = initialPersonaFilters[segmentId]?.[filterType] || [];
      const isAdding = checked && !initialFilters.includes(value);
      const isRemoving = !checked && initialFilters.includes(value);
      
      if ((isAdding || isRemoving) && onEditStep) {
        onEditStep();
      }
      
      const updatedPersonaFilters = {
        ...prev,
        [segmentId]: {
          ...segmentFilters,
          [filterType]: updatedFilters
        }
      };
      
      // After updating filters, fetch the filtered personas count
      updateSegmentPersonaCount(segmentId, updatedPersonaFilters[segmentId]);
      
      return updatedPersonaFilters;
    });
  };
  // Handle next step
  const handleNext = () => {
    console.log('SegmentsSelector: handleNext called');
    if (selectedSegments.length > 0) {
      console.log('SegmentsSelector: Valid selectedSegments:', selectedSegments);
      // Only pass filters for selected segments
      const selectedFilters: Record<number, SegmentPersonaFilters> = {};
      
      // Use the current filter state for each selected segment
      selectedSegments.forEach(segmentId => {
        // If this segment already has filters in our state, use those
        if (personaFilters[segmentId]) {
          // If no filters were selected at all for this segment, select all filters by default
          const currentFilters = personaFilters[segmentId];
          const hasAnyFilterSelected = 
            currentFilters.industryL1.length > 0 || 
            currentFilters.industryL2.length > 0 || 
            currentFilters.functions.length > 0 || 
            currentFilters.roles.length > 0;
          
          if (hasAnyFilterSelected) {
            // User selected some filters, use those
            selectedFilters[segmentId] = currentFilters;
          } else {
            // No filters selected, use all values from the segment
            const segment = segments.find(s => s.id === segmentId);
            if (segment) {
              selectedFilters[segmentId] = {
                industryL1: [...segment.industryL1],
                industryL2: [...segment.industryL2],
                functions: [...segment.functions],
                roles: [...segment.roles]
              };
            }
          }
        }
      });
      // Save selected segments and filters to the audience context
      console.log('SegmentsSelector: Saving to audience context:', {
        selectedSegments,
        personaFilters: selectedFilters
      });
      
      updateAudienceData({
        selectedSegments: selectedSegments,
        personaFilters: selectedFilters
      });
      
      console.log('SegmentsSelector: About to call onNext with:', selectedSegments.length, 'segments');
      onNext(selectedSegments, selectedFilters);
      console.log('SegmentsSelector: onNext call completed');
    } else {
      console.error('SegmentsSelector: No segments selected!');
    }
  };  // We can calculate the number of applied filters here if needed for the UI
  // Example: const appliedFiltersCount = industryL1Filters.filter(f => f.selected).length + ...;
  // Function to handle viewing personas for a segment
  const handleViewPersonas = async (segmentId: number) => {
    setSelectedSegmentForPersonas(segmentId);
    setLoadingPersonas(true);
    
    // Reset persona selection
    setSelectedPersona(null);
    
    // Ensure all dropdowns are closed when dialog opens
    setExpandedRoles({});
    
    // Reset selected role to ensure no section is pre-selected
    setSelectedRole(null);
    
    try {
      // Fetch filtered persona IDs first
      const rolePersonaMap = await fetchFilteredPersonaIds(segmentId);
      
      // Clear previous persona data
      setSegmentPersonas([]);
      
      // Open the modal after data is ready
      setIsPersonaModalOpen(true);
    } catch (error) {
      console.error('Error viewing personas:', error);
    } finally {
      setLoadingPersonas(false);
    }
  };
  
  // Function to get personas filtered by selected role
  const getPersonasByRole = (): PersonaType[] => {
    if (!selectedRole) return segmentPersonas;
    return segmentPersonas.filter(persona => 
      persona.data?.role === selectedRole
    );
  };
  
  // Extract unique roles from personas for dropdown
  const getUniqueRoles = (): string[] => {
    const roles: string[] = [];
    segmentPersonas.forEach(persona => {
      if (persona.data?.role && !roles.includes(persona.data.role)) {
        roles.push(persona.data.role);
      }
    });
    return roles;
  };
  
  // Helper function to render persona detail sections for array data
  const renderPersonaDataSection = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div key={title} className="mb-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-1 capitalize">{title}</h4>
        <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };
  
  // Add these new state variables for filtered personas
  const [rolePersonaMap, setRolePersonaMap] = useState<Record<string, number[]>>({});
  const [fetchedPersonasMap, setFetchedPersonasMap] = useState<Record<number, PersonaType>>({});
  const [loadingPersonaIds, setLoadingPersonaIds] = useState(false);
  // Function to update segment persona count based on filters
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
      
      // Calculate total personas across all roles
      let totalPersonas = 0;
      Object.values(roleToPersonaIdsMap).forEach(personaIds => {
        totalPersonas += personaIds.length;
      });
      
      // Update the count for this segment
      setSegmentPersonaCounts(prev => ({
        ...prev,
        [segmentId]: totalPersonas
      }));
      
      return totalPersonas;
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

  // New function to fetch filtered persona IDs
  const fetchFilteredPersonaIds = async (segmentId: number) => {
    setLoadingPersonaIds(true);
    
    try {
      // Create a filter request specific to this segment
      const segmentFilters = personaFilters[segmentId] || {
        industryL1: [],
        industryL2: [],
        functions: [],
        roles: []
      };
      
      const filterRequest = {
        segments: [segmentId],
        filters: {
          [segmentId]: segmentFilters
        }
      };
      
      console.log('Fetching filtered personas with request:', filterRequest);
      
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
      
      // Expected response format: { role1: [id1, id2, ...], role2: [...], ... }
      const roleToPersonaIdsMap = await response.json();
      console.log('Received rolePersonaMap:', roleToPersonaIdsMap);
      
      setRolePersonaMap(roleToPersonaIdsMap);
        // Pre-fetch all persona IDs but don't auto-select any role
      // This will allow all personas to be available when a role is clicked
      const roles = Object.keys(roleToPersonaIdsMap);
      if (roles.length > 0) {
        // Pre-fetch all personas for all roles to ensure they're available when needed
        for (const role of roles) {
          if (roleToPersonaIdsMap[role] && roleToPersonaIdsMap[role].length > 0) {
            // Fetch personas in the background
            fetchPersonasByIds(roleToPersonaIdsMap[role]);
          }
        }
      }
      
      return roleToPersonaIdsMap;
    } catch (error) {
      console.error('Error fetching filtered persona IDs:', error);
      return {};
    } finally {
      setLoadingPersonaIds(false);
    }
  };
  
  // Function to fetch personas by their IDs
  const fetchPersonasByIds = async (personaIds: number[]) => {
    if (!personaIds || personaIds.length === 0) return;
    
    const idsToFetch = personaIds.filter(id => !fetchedPersonasMap[id]);
    if (idsToFetch.length === 0) return;
    
    try {
      const fetchPromises = idsToFetch.map(id => 
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
      console.error('Error fetching personas by IDs:', error);
    }
  };
  
  // Modified function to handle role selection in the modal
  const handleRoleChange = async (role: string) => {
    setSelectedRole(role);
    
    // Fetch personas for this role if they haven't been fetched yet
    const personaIdsForRole = rolePersonaMap[role] || [];
    await fetchPersonasByIds(personaIdsForRole);
    
    // Reset selected persona
    setSelectedPersona(null);
  };
  
  // Function to toggle role expansion
  const toggleRoleExpansion = (role: string) => {
    // Close all other roles first to implement exclusive expansion
    const newExpandedRoles: Record<string, boolean> = {};
    
    // Toggle the clicked role
    newExpandedRoles[role] = !expandedRoles[role];
    
    // Update the expanded roles state
    setExpandedRoles(newExpandedRoles);
    
    // If opening this role and we haven't fetched personas yet, fetch them
    if (!expandedRoles[role]) {
      const personaIdsForRole = rolePersonaMap[role] || [];
      if (personaIdsForRole.length > 0) {
        fetchPersonasByIds(personaIdsForRole);
      }
    }
  };
  
  // Function to get personas for a specific role
  const getPersonasForRole = (role: string): PersonaType[] => {
    if (!rolePersonaMap[role]) return [];
    
    // Get the persona IDs for this role
    const personaIds = rolePersonaMap[role] || [];
    
    // Return only personas that we've already fetched
    return personaIds
      .map(id => fetchedPersonasMap[id])
      .filter(persona => persona !== undefined);
  };
  
  return (
    <StepContainer
      title="Select Audience Segments"
      subtitle={`Choose which segments of ${audienceData?.audienceName || 'your audience'} to include in this simulation`}
      className="animate-fadeIn"
    >
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4 mr-1" />}
        >
          Back to audiences
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-gray-900 mr-2">Audience Segments</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {filteredSegments.length} segments
              </span>
            </div>
    
          </div>
          
          
          {/* Segment Cards Grid */}
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 mb-3">
                {error}
              </div>
            ) : filteredSegments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No segments match your filters</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-2"
                >
                  Clear all filters
                </Button>
              </div>
            ) : (              <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredSegments.map((segment) => (                  <div 
                    key={segment.id} 
                    className="relative"
                  ><div 
                      className={`border rounded-xl p-5 transition hover:shadow-lg min-h-[200px] flex flex-col justify-between
                                ${selectedSegments.includes(segment.id) 
                                  ? 'bg-blue-50 border-blue-300' 
                                  : 'border-gray-200 hover:border-gray-300'}`}
                    >                      <div 
                        className="flex justify-between mb-4 cursor-pointer"
                        onClick={() => toggleSegment(segment.id)}
                      >
                        <div className="flex items-start">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 border rounded-md flex items-center justify-center mt-0.5 mr-3 flex-shrink-0 transition-all
                                        ${selectedSegments.includes(segment.id) 
                                          ? 'bg-blue-600 border-blue-600 shadow-sm' 
                                          : 'border-gray-300 hover:border-blue-400'}`}>
                            {selectedSegments.includes(segment.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          
                          <div>
                            {/* Title */}
                            <h3 className="font-semibold text-gray-900 text-lg">{segment.name}</h3>
                              {/* Personas count with View button */}                            <div className="flex items-center text-xs mt-1">                              <div className="flex items-center text-gray-500">                                <User className="w-3 h-3 mr-1" />                                {loadingCounts[segment.id] ? (
                                  <span className="font-medium text-blue-600 flex items-center">
                                    <div className="flex space-x-1 items-center">
                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                  </span>
                                ) : (
                                  <span className={segmentPersonaCounts[segment.id] !== undefined && segmentPersonaCounts[segment.id] !== segment.len ? "font-medium text-blue-600" : ""}>
                                    {segmentPersonaCounts[segment.id] !== undefined 
                                      ? segmentPersonaCounts[segment.id] 
                                      : segment.len} profiles
                                    {segmentPersonaCounts[segment.id] !== undefined && segmentPersonaCounts[segment.id] !== segment.len && 
                                      " (filtered)"}
                                  </span>
                                )}
                              </div>
                              <button 
                                className="ml-2 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full border border-blue-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPersonas(segment.id);
                                }}
                              >
                                View All
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <Info 
                          className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-pointer hover:text-gray-600 mt-1" 
                        />
                      </div>                      {/* Preview tags shown when not selected */}
                      {!selectedSegments.includes(segment.id) && (
                        <div className="space-y-3 cursor-pointer flex-grow" onClick={() => toggleSegment(segment.id)}>
                          <div className="flex items-center mb-2">
                            <Building2 className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-xs font-medium text-gray-700">Industries & Functions</span>
                          </div>
                          
                          {/* Industry L1 Tags */}
                          <div className="flex flex-wrap gap-2">
                            {segment.industryL1.slice(0, 2).map((ind, i) => (
                              <span key={i} className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 shadow-sm">
                                {ind}
                              </span>
                            ))}
                            {segment.industryL1.length > 2 && (
                              <span className="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-full shadow-sm">
                                +{segment.industryL1.length - 2}
                              </span>
                            )}
                          </div>
                          
                          {/* Sub-Industry Tags */}
                          <div className="flex flex-wrap gap-2">
                            {segment.industryL2.slice(0, 2).map((ind, i) => (
                              <span key={i} className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100 shadow-sm">
                                {ind}
                              </span>
                            ))}
                            {segment.industryL2.length > 2 && (
                              <span className="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-full shadow-sm">
                                +{segment.industryL2.length - 2}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center mt-4 mb-2">
                            <Users className="w-4 h-4 text-amber-600 mr-2" />
                            <span className="text-xs font-medium text-gray-700">Functions & Roles</span>
                          </div>
                          
                          {/* Functions Tags */}
                          <div className="flex flex-wrap gap-2">
                            {segment.functions.slice(0, 2).map((func, i) => (
                              <span key={i} className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100 shadow-sm">
                                {func}
                              </span>
                            ))}
                            {segment.functions.length > 2 && (
                              <span className="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-full shadow-sm">
                                +{segment.functions.length - 2}
                              </span>
                            )}
                          </div>
                          
                          {/* Roles Tags */}
                          <div className="flex flex-wrap gap-2">
                            {segment.roles.slice(0, 2).map((role, i) => (
                              <span key={i} className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100 shadow-sm">
                                {role}
                              </span>
                            ))}
                            {segment.roles.length > 2 && (
                              <span className="inline-block px-2 py-1 bg-gray-50 text-gray-500 text-xs font-medium rounded-full shadow-sm">
                                +{segment.roles.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}                      {/* Filter fields shown when selected */}
                      {selectedSegments.includes(segment.id) && (
                        <div className="space-y-5 mt-4 animate-fadeIn flex-grow">                          <div className="border-t border-gray-200 pt-3 mb-3 flex justify-between items-center">
                            <p className="text-xs text-gray-500 italic">Select filters to apply to this segment:</p>
                            <div className="flex gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Clear all filters for this segment
                                  const emptyFilters = {
                                    industryL1: [],
                                    industryL2: [],
                                    functions: [],
                                    roles: []
                                  };
                                  
                                  // Update the filters state
                                  setPersonaFilters(prev => ({
                                    ...prev,
                                    [segment.id]: emptyFilters
                                  }));
                                  
                                  // Update persona count with empty filters
                                  updateSegmentPersonaCount(segment.id, emptyFilters);
                                  
                                  // Notify parent of edit if needed
                                  if (onEditStep) {
                                    onEditStep();
                                  }
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                              >
                                Clear
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Select all filters for this segment
                                  const segmentData = segments.find(s => s.id === segment.id);
                                  if (segmentData) {
                                    // Create the updated filters object
                                    const updatedFilters = {
                                      industryL1: [...segmentData.industryL1],
                                      industryL2: [...segmentData.industryL2],
                                      functions: [...segmentData.functions],
                                      roles: [...segmentData.roles]
                                    };
                                    
                                    // Update the filters state
                                    setPersonaFilters(prev => ({
                                      ...prev,
                                      [segment.id]: updatedFilters
                                    }));
                                    
                                    // Update persona count for this segment with all filters selected
                                    // This should restore the count to the original total
                                    updateSegmentPersonaCount(segment.id, updatedFilters);
                                    
                                    // Notify parent of edit if needed
                                    if (onEditStep) {
                                      onEditStep();
                                    }
                                  }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Select All
                              </button>
                            </div>
                          </div>
                          
                          {/* Show all L2 industries for the selected L1 industries */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                              <Building className="w-4 h-4 mr-2 text-indigo-600" />
                              Filter by Sub-Industry
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {/* Display all L2 industries for this segment's L1 industry */}
                              {segment.industryL1.map(l1 => {
                                // Get all possible L2 industries for this L1 industry
                                const possibleL2Industries = industryL2Map[l1] || [];
                                
                                return possibleL2Industries.map((l2, i) => (
                                  <div key={`${l1}-${l2}-${i}`} className="relative inline-flex items-center">
                                    <input 
                                      type="checkbox"
                                      id={`subind-${segment.id}-${l1}-${i}`} 
                                      checked={isFilterSelected(segment.id, 'industryL2', l2)}
                                      className="peer absolute opacity-0 w-0 h-0 cursor-pointer"
                                      onChange={(e) => togglePersonaFilter(segment.id, 'industryL2', l2, e.target.checked)}
                                    />
                                    <label 
                                      htmlFor={`subind-${segment.id}-${l1}-${i}`}
                                      className="inline-block px-3 py-1 cursor-pointer select-none
                                              peer-checked:bg-indigo-100 peer-checked:text-indigo-800 peer-checked:border-indigo-300
                                              peer-not-checked:bg-gray-50 peer-not-checked:text-gray-600 peer-not-checked:border-gray-200
                                              text-xs font-medium rounded-full border transition-colors"
                                    >
                                      {l2}
                                    </label>
                                  </div>
                                ));
                              })}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                              <Briefcase className="w-4 h-4 mr-2 text-green-600" />
                              Filter by Function
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {/* Use standardized functions list that's common for all segments */}
                              {standardFunctions.map((func, i) => (
                                <div key={i} className="relative inline-flex items-center">
                                  <input 
                                    type="checkbox"
                                    id={`func-${segment.id}-${i}`} 
                                    checked={isFilterSelected(segment.id, 'functions', func)}
                                    className="peer absolute opacity-0 w-0 h-0 cursor-pointer"
                                    onChange={(e) => togglePersonaFilter(segment.id, 'functions', func, e.target.checked)}
                                  />
                                  <label 
                                    htmlFor={`func-${segment.id}-${i}`}
                                    className="inline-block px-3 py-1 cursor-pointer select-none
                                              peer-checked:bg-green-100 peer-checked:text-green-800 peer-checked:border-green-300
                                              peer-not-checked:bg-gray-50 peer-not-checked:text-gray-600 peer-not-checked:border-gray-200
                                              text-xs font-medium rounded-full border transition-colors"
                                  >
                                    {func}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                              <Users className="w-4 h-4 mr-2 text-amber-600" />
                              Filter by Role
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {/* Use standardized roles list that's common for all segments */}
                              {standardRoles.map((role, i) => (
                                <div key={i} className="relative inline-flex items-center">
                                  <input 
                                    type="checkbox"
                                    id={`role-${segment.id}-${i}`}
                                    checked={isFilterSelected(segment.id, 'roles', role)} 
                                    className="peer absolute opacity-0 w-0 h-0 cursor-pointer"
                                    onChange={(e) => togglePersonaFilter(segment.id, 'roles', role, e.target.checked)}
                                  />
                                  <label 
                                    htmlFor={`role-${segment.id}-${i}`}
                                    className="inline-block px-3 py-1 cursor-pointer select-none
                                              peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300
                                              peer-not-checked:bg-gray-50 peer-not-checked:text-gray-600 peer-not-checked:border-gray-200
                                              text-xs font-medium rounded-full border transition-colors"
                                  >
                                    {role}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">            <div>{selectedSegments.length} of {segments.length} segments selected</div>
            {selectedSegments.length > 0 && (
              <div className="text-xs mt-1">
                {(() => {
                  // Check if any segments are currently loading
                  const isAnySegmentLoading = selectedSegments.some(segmentId => loadingCounts[segmentId]);
                  
                  if (isAnySegmentLoading) {
                    return (
                      <div className="flex items-center">
                        <span>Total: </span>
                        <div className="flex space-x-1 items-center ml-1">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    );
                  } else {
                    const totalPersonas = selectedSegments.reduce((sum, segmentId) => 
                      sum + (segmentPersonaCounts[segmentId] !== undefined ? segmentPersonaCounts[segmentId] : 0), 0);
                    return `Total: ${totalPersonas} profiles`;
                  }
                })()}
              </div>
            )}
          </div>
            {/* Check if total personas is less than or equal to 50 */}
            {(() => {
              const totalPersonas = selectedSegments.reduce((sum, segmentId) => 
              sum + (segmentPersonaCounts[segmentId] !== undefined ? segmentPersonaCounts[segmentId] : 0), 0);
              
              const isAnySegmentLoading = selectedSegments.some(segmentId => loadingCounts[segmentId]);
              const tooManyPersonas = totalPersonas > 50 && !isAnySegmentLoading;
              
              return tooManyPersonas ? (
              <div className="flex flex-col items-end">
                <div className="text-red-600 text-sm mb-2">
                You've selected {totalPersonas} profiles. Please select fewer than 50 profiles.
                </div>
                <Button
                variant="primary"
                size="lg"
                disabled={true}
                className="px-8"
                >
                Continue to Use Cases
                </Button>
              </div>
              ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={selectedSegments.length === 0 || isAnySegmentLoading}
                className="px-8"
              >
                Continue to Use Cases
              </Button>
              );
            })()}
      </div>      {/* Improved Persona Viewing Modal */}  
      </div>
      <Dialog open={isPersonaModalOpen} onOpenChange={setIsPersonaModalOpen}>
        <DialogContent className="h-[80vh] w-[90vw] md:w-[85vw] max-w-[1400px] !p-0 rounded-xl overflow-hidden border border-gray-200 shadow-xl relative" style={{maxWidth: '1400px', margin: 'auto'}}>
          <CustomDialogClose onClick={() => setIsPersonaModalOpen(false)}>
            <X className="h-5 w-5" />
          </CustomDialogClose>
          <DialogHeader className="border-b pb-4 pt-5 px-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center">
                  <User className="w-5 h-5 mr-3 text-blue-600" />
                  {selectedSegmentForPersonas && segments.find(s => s.id === selectedSegmentForPersonas)?.name}
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1 ml-8">Explore detailed profiles for this segment</p>
              </div>
            </div>
          </DialogHeader>

          {loadingPersonas || loadingPersonaIds ? (
            <div className="flex flex-col justify-center items-center h-full py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading profiles...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row h-full">
              {/* Left side: Role accordion with personas */}
              <div className="md:w-[340px] border-r overflow-hidden flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
                <div className="p-5 border-b">
                  <h3 className="text-sm font-medium text-gray-800 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    Profiles by Role
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Select a role to explore detailed profiles
                  </p>
                </div>
                
                <div className="overflow-y-auto h-[58vh] custom-scrollbar">
                  {Object.keys(rolePersonaMap).length > 0 ? (
                    <div className="divide-y">
                      {Object.entries(rolePersonaMap).map(([role, personaIds]) => (
                        <div key={role} className="border-b">
                          <button
                            onClick={() => toggleRoleExpansion(role)}
                            className={cn(
                              "w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-all duration-200 focus:outline-none",
                              expandedRoles[role] && "bg-blue-50/70"
                            )}
                          >
                            <div className="flex items-center">
                              {expandedRoles[role] ? (
                                <ChevronDown className="w-4 h-4 mr-3 text-blue-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="text-left">
                                <span className="font-medium text-gray-800">{role}</span>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {personaIds?.length || 0} {personaIds?.length === 1 ? 'profile' : 'profiles'}
                                </div>
                              </div>
                            </div>
                          </button>
                            {/* Expanded personas list - no nested scrolling */}                          {expandedRoles[role] && (
                            <div className="bg-blue-50/40 py-2 px-4">
                              <div>
                                {getPersonasForRole(role).length > 0 ? (
                                  getPersonasForRole(role).map((persona) => (
                                    <button
                                      key={persona.id}
                                      onClick={() => setSelectedPersona(persona)}
                                      className={cn(
                                        "w-full text-left px-4 py-3 my-1.5 rounded-lg hover:bg-white transition-all duration-150 ml-4",
                                        selectedPersona?.id === persona.id 
                                          ? "bg-white shadow-sm border border-blue-200 ring-1 ring-blue-100" 
                                          : "border border-transparent"
                                      )}
                                    >
                                      <div className="font-medium text-gray-800">{persona.name}</div>
                                      <div className="text-xs text-gray-500 truncate mt-1 flex items-center">
                                        <Briefcase className="w-3 h-3 mr-1.5 text-gray-400" />
                                        {persona.job_title || persona.occupation || 'No title'}
                                        {persona.company_name && ` • ${persona.company_name}`}
                                      </div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-4 text-xs text-gray-500 italic text-center">
                                    Loading profiles...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm">No roles found for the selected filters</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side: Persona Details */}
              <div className="flex-1 overflow-hidden flex flex-col h-[69vh]">
                <div className="overflow-y-auto p-6 bg-gradient-to-br from-gray-50/70 to-white h-full custom-scrollbar">
                  {selectedPersona ? (
                    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn max-w-4xl mx-auto">
                      {/* Persona Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
                        <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                          <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 border border-blue-200">
                            {selectedPersona.name.charAt(0)}
                          </span>
                          {selectedPersona.name}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-3 ml-1">
                          <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                          <span className="font-medium">
                            {selectedPersona.job_title || 'No title available'}
                            {selectedPersona.company_name && ` at ${selectedPersona.company_name}`}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-6">
                        {/* Main Info Sections Grid */}
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          {/* Personal Info Section */}
                          <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                            <h4 className="font-medium text-blue-800 mb-4 flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              Personal Information
                            </h4>
                            <div className="space-y-3">
                              {selectedPersona.age && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Age:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.age}</span>
                                </div>
                              )}
                              {selectedPersona.gender && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Gender:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.gender}</span>
                                </div>
                              )}
                              {selectedPersona.location && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Location:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.location}</span>
                                </div>
                              )}
                              {selectedPersona.income && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Income:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.income}</span>
                                </div>
                              )}
                              {selectedPersona.education && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Education:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.education}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Professional Info Section */}
                          <div className="bg-indigo-50/50 p-5 rounded-lg border border-indigo-100">
                            <h4 className="font-medium text-indigo-800 mb-4 flex items-center">
                              <Building className="w-4 h-4 mr-2" />
                              Professional Details
                            </h4>
                            <div className="space-y-3">
                              {selectedPersona.industry_l1 && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Industry:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.industry_l1}</span>
                                </div>
                              )}
                              {selectedPersona.sub_industry_l2 && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Sub-Industry:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.sub_industry_l2}</span>
                                </div>
                              )}
                              {selectedPersona.function && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Function:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.function}</span>
                                </div>
                              )}
                              {selectedPersona.role && (
                                <div className="flex items-start">
                                  <span className="text-sm font-medium text-gray-600 w-28">Role:</span>
                                  <span className="text-sm text-gray-800">{selectedPersona.role}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details Sections */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Left column */}
                          <div className="space-y-5">
                            {selectedPersona.goals && selectedPersona.goals.length > 0 && (
                              <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-100">
                                <h4 className="font-medium text-emerald-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Goals
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.goals.map((goal: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedPersona.pain_points && selectedPersona.pain_points.length > 0 && (
                              <div className="bg-rose-50 p-5 rounded-lg border border-rose-100">
                                <h4 className="font-medium text-rose-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Pain Points
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.pain_points.map((point: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedPersona.interests && selectedPersona.interests.length > 0 && (
                              <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
                                <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                  Interests
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.interests.map((interest: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{interest}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          {/* Right column */}
                          <div className="space-y-5">
                            {selectedPersona.behaviors && selectedPersona.behaviors.length > 0 && (
                              <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                                <h4 className="font-medium text-amber-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Behaviors
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.behaviors.map((behavior: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{behavior}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedPersona.values && selectedPersona.values.length > 0 && (
                              <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                  Values
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.values.map((value: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{value}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {selectedPersona.preferred_channels && selectedPersona.preferred_channels.length > 0 && (
                              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Preferred Channels
                                </h4>
                                <ul className="list-disc ml-5 space-y-1.5">
                                  {selectedPersona.preferred_channels.map((channel: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700">{channel}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <div className="bg-blue-50 p-6 rounded-full mb-4 border border-blue-100">
                        <User className="w-12 h-12 text-blue-400" />
                      </div>
                      <p className="text-lg text-gray-600 mb-2">Select a profile</p>
                      <p className="text-sm text-gray-500">Choose from the list on the left to view detailed information</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </StepContainer>
  );
};

export default SegmentsSelector;
