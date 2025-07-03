import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Loader2 } from 'lucide-react';

// Define API_URL - temporarily fixing the env issue
const API_URL = import.meta.env?.VITE_API_URL || '';

interface ChatInterfaceProps {
  selectedPersonaIds: number[];
}

interface Message {
  id: string;
  sender: 'user' | 'persona';
  personaId?: number;
  personaName?: string;
  text: string;
  timestamp: Date;
}

interface Persona {
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

const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedPersonaIds }) => {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [personas, setPersonas] = useState<Record<number, Persona>>({});
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch persona details
  useEffect(() => {
    const fetchPersonas = async () => {
      if (selectedPersonaIds.length === 0) {
        // Reset messages when no personas are selected
        setMessages([]);
        return;
      }
      
      const personasToFetch = selectedPersonaIds.filter(id => !personas[id]);
      if (personasToFetch.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fetchPromises = personasToFetch.map(id => 
          fetch(`${API_URL}/personas/${id}`, { credentials: 'include' })
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch persona ${id}`);
              return res.json();
            })
        );
        
        const fetchedPersonas = await Promise.all(fetchPromises);
        
        const newPersonas = { ...personas };
        fetchedPersonas.forEach(persona => {
          newPersonas[persona.id] = {
            ...persona,
            data: typeof persona.data === 'string' ? JSON.parse(persona.data) : persona.data
          };
        });
        
        setPersonas(newPersonas);
      } catch (error) {
        console.error('Error fetching personas:', error);
        setError('Failed to fetch some persona details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonas();
  }, [selectedPersonaIds, personas]);
  
  // Scroll to bottom when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() === '' || selectedPersonaIds.length === 0) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date()
    };
    
    setMessages([...messages, userMessage]);
    setMessage('');
    setLoading(true);
    
    // Simulate response from each persona
    // In a real implementation, this would be an API call
    setTimeout(() => {
      // Generate response from each persona
      selectedPersonaIds.forEach((id, index) => {
        setTimeout(() => {
          const persona = personas[id];
          if (persona) {
            const personaResponse: Message = {
              id: `persona-${id}-${Date.now()}`,
              sender: 'persona',
              personaId: id,
              personaName: persona.name,
              text: generatePersonaResponse(message, persona),
              timestamp: new Date()
            };
            
            setMessages(prevMessages => [...prevMessages, personaResponse]);
          }
          
          // After the last persona responds, set loading to false
          if (index === selectedPersonaIds.length - 1) {
            setLoading(false);
          }
        }, (index + 1) * 1000); // Stagger responses
      });
    }, 1000);
  };
    // Generate simulated responses based on persona details
  const generatePersonaResponse = (_userMessage: string, persona: Persona): string => {
    const responses = [
      `As ${persona.job_title || persona.data?.job_title || 'a professional'}, I'd say that's an interesting perspective.`,
      `From my experience at ${persona.company_name || 'my company'}, I've found that these challenges require careful consideration.`,
      `I think we should focus on addressing the key points you mentioned, especially regarding market opportunities.`,
      `Let me share my thoughts on this from ${persona.data?.function || 'my functional'} perspective.`,
      `That's a great question! In my role as ${persona.job_title || persona.data?.job_title || 'a professional'}, I often encounter similar situations.`,
      `I agree with your assessment, though I'd like to add some nuance from my industry experience.`,
      `Based on my background in ${persona.data?.industry_l1 || 'this industry'}, I think we should consider alternative approaches as well.`,
      `As someone in a ${persona.data?.role || 'leadership'} position, I'm particularly concerned about the long-term implications.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };
  
  // No selected personas state
  if (selectedPersonaIds.length === 0) {
    return (
      <div className="flex flex-col h-[60vh] min-h-[400px] bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
          <div className="bg-gray-100 rounded-full p-5 mb-4">
            <User className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">No personas selected</h3>
          <p className="text-gray-500 max-w-md">
            Please select personas from the panel above to start a conversation.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[60vh] min-h-[400px] bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Chat header with selected personas */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 rounded-t-lg">
        <h2 className="text-sm font-medium text-gray-800">
          Chat with {selectedPersonaIds.length} {selectedPersonaIds.length === 1 ? 'Persona' : 'Personas'}
        </h2>
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedPersonaIds.map(id => {
            const persona = personas[id];
            return persona ? (
              <div 
                key={id} 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200"
              >
                <User className="h-3 w-3 mr-1" />
                <span>{persona.name}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm">
              <p className="text-blue-700">
                Start chatting with the selected personas! Your messages will be responded to by each persona based on their profile.
              </p>
            </div>
          )}
          
          {/* Error message if any */}
          {error && (
            <div className="text-center bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {/* Chat messages */}
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {message.sender === 'persona' && (
                <div className="flex items-center mb-1 text-xs text-gray-600">
                  <User className="h-3 w-3 mr-1" />
                  <span className="font-medium">{message.personaName}</span>
                </div>
              )}
              
              <div 
                className={`px-4 py-3 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                } max-w-[80%]`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
              
              <span className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">Personas are responding...</p>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading || selectedPersonaIds.length === 0}
          />
          <button
            type="submit"
            className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors flex items-center justify-center ${
              loading || message.trim() === '' || selectedPersonaIds.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
            disabled={loading || message.trim() === '' || selectedPersonaIds.length === 0}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
