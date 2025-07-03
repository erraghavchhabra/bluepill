import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Clock, List } from 'lucide-react';

interface Audience {
  id: number;
  name: string;
}

interface Simulation {
  id: number;
  name: string;
  description: string;
  audience_id: number;
  audience_name: string;
  created_at: string;
  segment_count: number;
  persona_count: number;
}

interface SimulationHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSimulation: (simulationId: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const SimulationHistoryPanel: React.FC<SimulationHistoryPanelProps> = ({
  isOpen,
  onClose,
  onSelectSimulation
}) => {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(null);
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch audiences when component mounts
    fetchAudiences();
  }, []);

  useEffect(() => {
    // Fetch simulations when selected audience changes
    if (selectedAudienceId) {
      fetchSimulations(selectedAudienceId);
    } else if (selectedAudienceId === null && audiences.length > 0) {
      // Fetch all simulations if no audience is selected but audiences exist
      fetchSimulations();
    }
  }, [selectedAudienceId]);

  const fetchAudiences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/audience`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audiences');
      }
      
      const data = await response.json();
      setAudiences(data.map((a: any) => ({ id: a.id, name: a.name })));
      
      // If audiences loaded and none selected yet, select all simulations
      if (data.length > 0 && selectedAudienceId === null) {
        fetchSimulations();
      }
    } catch (err) {
      console.error('Error fetching audiences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSimulations = async (audienceId?: number) => {
    try {
      setIsLoading(true);
      let url = `${API_URL}/simulations`;
      if (audienceId) {
        url += `?audience_id=${audienceId}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch simulations');
      }
      
      const data = await response.json();
      setSimulations(data);
    } catch (err) {
      console.error('Error fetching simulations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSimulations = simulations.filter(simulation => 
    simulation.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    simulation.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className={`fixed inset-y-0 left-0 bg-white shadow-xl w-70 transform transition-transform duration-300 ease-in-out z-30 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        <div className="p-2 border-b border-gray-200">
          <h2 className="text-lg font-medium flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Simulation History
          </h2>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-4">
            <button
              onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              <span>{selectedAudienceId ? 
                audiences.find(a => a.id === selectedAudienceId)?.name : 
                'All Audiences'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {isAudienceDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
                <button
                  onClick={() => {
                    setSelectedAudienceId(null);
                    setIsAudienceDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  All Audiences
                </button>
                {audiences.map((audience) => (
                  <button
                    key={audience.id}
                    onClick={() => {
                      setSelectedAudienceId(audience.id);
                      setIsAudienceDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    {audience.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search simulations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredSimulations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <List className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>No simulations found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSimulations.map((simulation) => (
                <button
                  key={simulation.id}
                  onClick={() => onSelectSimulation(simulation.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200"
                >
                  <div className="font-medium text-blue-600">{simulation.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {simulation.description?.substring(0, 60) || 'No description'}
                    {(simulation.description?.length || 0) > 60 ? '...' : ''}
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>{simulation.audience_name}</span>
                    <span>{formatDate(simulation.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationHistoryPanel;