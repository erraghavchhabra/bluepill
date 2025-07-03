import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Brain, User, Loader2, Send, ChevronDown, History } from 'lucide-react';
import Button from '../../components/Button';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import SimulationHistoryPanel from '../../components/SimulationHistoryPanel';
import Layout from '../../components/Layout';
import 'github-markdown-css/github-markdown.css';


const API_URL = import.meta.env.VITE_API_URL || '';

// Interfaces for data types
interface Audience {
  id: number;
  name: string;
  created_at: string;
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
  status: string;
}

interface Persona {
  id: number;
  name: string;
  data: any;
}

interface Segment {
  id: number;
  name: string;
  description: string;
  len: number; // Number of personas
  created_at: string;
  updated_at: string;
}

interface SimulationDetail {
  id: number;
  audience_id: number;
  simulation_response: string;
  optimization_response: string;
  status: string;
  personas: Persona[];
  segments: Segment[];
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Main state for chat interface
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(null);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationDetail | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSimulations, setLoadingSimulations] = useState<boolean>(false);
  const [loadingSimulationDetails, setLoadingSimulationDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceDropdownOpen, setAudienceDropdownOpen] = useState<boolean>(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState<boolean>(false);
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState<boolean>(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState<boolean>(false);
  
  // Chat interface state
  const [chatTab, setChatTab] = useState<'simulation' | 'persona' | 'segment'>('simulation');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  
  // Refs for scrolling and input focus
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load audiences when component mounts
  useEffect(() => {
    fetchAudiences();
  }, []);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Load simulations when audience changes
  useEffect(() => {
    if (selectedAudienceId) {
      fetchSimulations(selectedAudienceId);
    }
  }, [selectedAudienceId]);

  const fetchAudiences = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/audience`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audiences');
      }
      
      const data = await response.json();
      setAudiences(data);
      
      // Select first audience by default
      if (data.length > 0) {
        setSelectedAudienceId(data[0].id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching audiences:', err);
      setError('Failed to load audiences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulations = async (audienceId: number) => {
    try {
      setLoadingSimulations(true);
      const response = await fetch(`${API_URL}/simulations?audience_id=${audienceId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch simulations');
      }
      
      const data = await response.json();
      setSimulations(data);
      
      // Reset selected simulation when audience changes
      setSelectedSimulation(null);
      setChatHistory([]);
      setSelectedPersona(null);
      setSelectedSegment(null);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching simulations:', err);
      setError('Failed to load simulations. Please try again.');
    } finally {
      setLoadingSimulations(false);
    }
  };

  const fetchSimulationDetails = async (simulationId: number) => {
    try {
      setLoadingSimulationDetails(true);
      const response = await fetch(`${API_URL}/simulations/${simulationId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch simulation details');
      }
      
      const data = await response.json();
      setSelectedSimulation(data);
      
      // Reset chat state when simulation changes
      setChatHistory([]);
      setSelectedPersona(data.personas && data.personas.length > 0 ? data.personas[0].id : null);
      setSelectedSegment(data.segments && data.segments.length > 0 ? data.segments[0].id : null);
      setChatTab('simulation'); // Default to simulation chat
      
      // Fetch chat history for the simulation
      fetchChatHistory(simulationId);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching simulation details:', err);
      setError('Failed to load simulation details. Please try again.');
    } finally {
      setLoadingSimulationDetails(false);
    }
  };

  const fetchChatHistory = async (simulationId: number, personaId?: number, segmentId?: number) => {
    if (!simulationId) return;

    try {
      let url = '';
      if (chatTab === 'simulation') {
        url = `${API_URL}/chat/simulation/${simulationId}`;
      } else if (chatTab === 'persona' && personaId) {
        url = `${API_URL}/chat/simulation/${simulationId}/persona/${personaId}`;
      } else if (chatTab === 'segment' && segmentId) {
        url = `${API_URL}/chat/simulation/${simulationId}/segment/${segmentId}`;
      } else {
        return;
      }

      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // No chat history yet, set empty array
          setChatHistory([]);
          return;
        }
        throw new Error('Failed to fetch chat history');
      }
      
      const data = await response.json();
      setChatHistory(data.messages || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setChatHistory([]);
    }
  };

  const handleChatTabChange = (tab: 'simulation' | 'persona' | 'segment') => {
    setChatTab(tab);
    if (!selectedSimulation) return;
    
    if (tab === 'simulation') {
      fetchChatHistory(selectedSimulation.id);
    } else if (tab === 'persona' && selectedPersona) {
      fetchChatHistory(selectedSimulation.id, selectedPersona);
    } else if (tab === 'segment' && selectedSegment) {
      fetchChatHistory(selectedSimulation.id, undefined, selectedSegment);
    }
  };

  const selectPersona = (personaId: number) => {
    setSelectedPersona(personaId);
    if (selectedSimulation && chatTab === 'persona') {
      fetchChatHistory(selectedSimulation.id, personaId);
    }
    setPersonaDropdownOpen(false);
  };

  const selectSegment = (segmentId: number) => {
    setSelectedSegment(segmentId);
    if (selectedSimulation && chatTab === 'segment') {
      fetchChatHistory(selectedSimulation.id, undefined, segmentId);
    }
    setSegmentDropdownOpen(false);
  };

  const sendChatMessage = async () => {
    if (!selectedSimulation || !chatMessage.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    
    try {
      let url = '';
      let body = { message: chatMessage };
      let newUserMessage: ChatMessage;
      
      // Set the correct URL and user message role based on the active chat tab
      if (chatTab === 'simulation') {
        url = `${API_URL}/chat/simulation/${selectedSimulation.id}`;
        newUserMessage = {
          role: 'use',
          content: chatMessage,
          timestamp: new Date().toISOString()
        };
      } else if (chatTab === 'persona' && selectedPersona) {
        url = `${API_URL}/chat/simulation/${selectedSimulation.id}/persona/${selectedPersona}`;
        newUserMessage = {
          role: 'use_persona',
          content: chatMessage,
          timestamp: new Date().toISOString()
        };
      } else if (chatTab === 'segment' && selectedSegment) {
        url = `${API_URL}/chat/simulation/${selectedSimulation.id}/segment/${selectedSegment}`;
        newUserMessage = {
          role: 'use_segment',
          content: chatMessage,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Invalid chat target');
      }
      
      // Add user message immediately for better UX
      setChatHistory(prev => [...prev, newUserMessage]);
      setChatMessage(''); // Clear input field immediately

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      setChatHistory(data.chat_history || []);
      
      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const extractPersonaInfo = (personaData: any) => {
    try {
      const data = typeof personaData === 'string' ? JSON.parse(personaData) : personaData;
      return {
        name: data.name || 'Unknown',
        age: data.age || 'N/A',
        occupation: data.occupation || 'N/A',
        behavioral_archetype: data.behavioral_archetype || 'N/A',
        organizational_influence: data.organizational_influence || 'N/A',
      };
    } catch (e) {
      console.error('Error parsing persona data:', e);
      return { name: 'Unknown', age: 'N/A', occupation: 'N/A', behavioral_archetype: 'N/A', organizational_influence: 'N/A' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSelectHistorySimulation = (simulationId: number) => {
    // Fetch this simulation regardless of which audience it belongs to
    fetchSimulationDetails(simulationId);
    // Close the history panel
    setIsHistoryPanelOpen(false);
  };

  const renderChatInterface = () => (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex gap-4 px-6" aria-label="Tabs">
          <button
            onClick={() => handleChatTabChange('simulation')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              chatTab === 'simulation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Brain className="mr-2 h-4 w-4" />
            Chat with Simulation
          </button>
          <button
            onClick={() => handleChatTabChange('persona')}
            disabled={!selectedSimulation?.personas?.length}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              !selectedSimulation?.personas?.length ? 'text-gray-300 cursor-not-allowed' :
              chatTab === 'persona'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="mr-2 h-4 w-4" />
            Chat with Profiles
          </button>
     
        </nav>
      </div>

      {chatTab === 'persona' && selectedSimulation?.personas?.length > 0 && (
        <div className="border-b border-gray-200 p-3 bg-white">
          <div className="relative">
            <button
              onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              {selectedPersona && selectedSimulation?.personas ? (
                (() => {
                  const selectedPersonaObj = selectedSimulation.personas.find(p => p.id === selectedPersona);
                  if (selectedPersonaObj) {
                    const info = extractPersonaInfo(selectedPersonaObj.data);
                    return (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{info.name} ({info.age}, {info.occupation})</span>
                      </div>
                    );
                  }
                  return 'Select a profile';
                })()
              ) : (
                'Select a profile'
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {personaDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
                {selectedSimulation?.personas?.map((persona) => {
                  const info = extractPersonaInfo(persona.data);
                  return (
                    <button
                      key={persona.id}
                      onClick={() => selectPersona(persona.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                        selectedPersona === persona.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <User className="h-3 w-3 mr-2" />
                      <div>
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-gray-500">{info.age}, {info.occupation}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {chatTab === 'segment' && selectedSimulation?.segments?.length > 0 && (
        <div className="border-b border-gray-200 p-3 bg-white">
          <div className="relative">
            <button
              onClick={() => setSegmentDropdownOpen(!segmentDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              {selectedSegment && selectedSimulation?.segments ? (
                (() => {
                  const selectedSegmentObj = selectedSimulation.segments.find(s => s.id === selectedSegment);
                  if (selectedSegmentObj) {
                    return (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{selectedSegmentObj.name} ({selectedSegmentObj.len} profiles)</span>
                      </div>
                    );
                  }
                  return 'Select a segment';
                })()
              ) : (
                'Select a segment'
              )}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {segmentDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
                {selectedSimulation?.segments?.map((segment) => (
                  <button
                    key={segment.id}
                    onClick={() => selectSegment(segment.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                      selectedSegment === segment.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <User className="h-3 w-3 mr-2" />
                    <div>
                      <div className="font-medium">{segment.name}</div>
                      <div className="text-xs text-gray-500">{segment.len} profiles</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 bg-gray-50" ref={chatContainerRef}>
        {!selectedSimulation ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="h-12 w-12 opacity-30 mb-3" />
            <p className="text-lg">Select a simulation to start chatting</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <MessageSquare className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => {
                // Determine which messages to show based on active tab
                const isUserMessage = chatTab === 'simulation' 
                  ? msg.role === 'use' 
                  : chatTab === 'persona'
                    ? msg.role === 'use_persona'
                    : msg.role === 'use_segment';
                
                const isValidMessage = chatTab === 'simulation'
                  ? (msg.role === 'use' || msg.role === 'sim')
                  : chatTab === 'persona'
                    ? (msg.role === 'use_persona' || msg.role === 'persona')
                    : (msg.role === 'use_segment' || msg.role === 'segment');
                
                // Skip rendering messages that don't belong in this tab
                if (!isValidMessage) return null;
                
                return (
                  <div
                    key={idx}
                    className={`flex ${
                      isUserMessage ? 'justify-end' : 'justify-start'
                    } animate-fadeIn`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        isUserMessage
                          ? 'bg-blue-500 text-white rounded-br-none animate-slideInRight'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none animate-slideInLeft'
                      }`}
                    >
                      <div className={`${isUserMessage ? 'prose prose-invert prose-sm max-w-none mb-3' : 'prose prose-sm max-w-none mb-3'}` + 'markdown-body'}>
                        <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {sendingMessage && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-lg rounded-bl-none max-w-[80%]">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2 relative">
          <textarea
            ref={textareaRef}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type your message${
              !selectedSimulation ? ' (select a simulation first)' : 
              chatTab === 'persona' && selectedPersona 
                ? ` to ${extractPersonaInfo(selectedSimulation.personas.find(p => p.id === selectedPersona)?.data)?.name}`
                : chatTab === 'segment' && selectedSegment
                  ? ` to ${selectedSimulation.segments.find(s => s.id === selectedSegment)?.name} segment`
                  : ''
            }...`}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectedSimulation}
            rows={2}
          />
          <button
            onClick={sendChatMessage}
            disabled={!selectedSimulation || !chatMessage.trim() || sendingMessage}
            className={`flex items-center justify-center p-3 rounded-full ${
              selectedSimulation && chatMessage.trim() && !sendingMessage
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );

  const renderSimulationsList = () => (
    <div className="h-full flex flex-col border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-4">
          <button
            onClick={() => setAudienceDropdownOpen(!audienceDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            <span>{selectedAudienceId ? 
              audiences.find(a => a.id === selectedAudienceId)?.name || 'Select Audience' : 
              'Select Audience'}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {audienceDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
              {audiences.map((audience) => (
                <button
                  key={audience.id}
                  onClick={() => {
                    setSelectedAudienceId(audience.id);
                    setAudienceDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  {audience.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm font-medium text-blue-600 flex justify-between items-center">
          <span>Simulations</span>
          <button
            onClick={() => setIsHistoryPanelOpen(true)}
            className="text-xs hover:underline flex items-center"
          >
            <History className="h-3 w-3 mr-1" />
            View All
          </button>
        </div>
      </div>
      
      {loadingSimulations ? (
        <div className="flex-1 flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : simulations.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4 text-gray-500">
          <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
          <p>No simulations found</p>
          <p className="text-xs text-center mt-2">Select or create an audience to see simulations</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {simulations.map((simulation) => (
            <button
              key={simulation.id}
              onClick={() => fetchSimulationDetails(simulation.id)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                selectedSimulation?.id === simulation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="font-medium">{simulation.name || `Simulation #${simulation.id}`}</div>
              <div className="text-sm text-gray-600 my-1 line-clamp-2">
                {simulation.description || 'No description available'}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatDate(simulation.created_at)}</span>
                <span>{simulation.status === 'complete' ? 'Complete' : 'In progress'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="flex justify-between mb-6 items-center">
        <h1 className="text-xl font-semibold text-gray-800">Chat Interface</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsHistoryPanelOpen(true)}
          icon={<History className="w-4 h-4 mr-1" />}
        >
          History
        </Button>
      </div>
      
      {/* Simulation History Panel */}
      <SimulationHistoryPanel 
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        onSelectSimulation={handleSelectHistorySimulation}
      />

      {/* Overlay to close panel when clicking outside */}
      {isHistoryPanelOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          onClick={() => setIsHistoryPanelOpen(false)} 
        />
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin mb-6">
            <Loader2 className="h-12 w-12 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Loading...</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-240px)]">
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden h-full">
            {renderSimulationsList()}
          </div>
          <div className="md:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden h-full">
            {loadingSimulationDetails ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <p>Loading simulation details...</p>
              </div>
            ) : (
              renderChatInterface()
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ChatPage;