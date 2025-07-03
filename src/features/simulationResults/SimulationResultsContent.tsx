import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  MessageSquare,
  BarChart2,
  Brain,
  User,
  Loader2,
  Send,
  ChevronDown,
  HelpCircle,
  FileText,
  Target,
  Briefcase,
  Building,
  Users,
  Settings,
  Tag,
  Calendar,
  Clock,
  Filter,
  Layers,
  Bookmark,
  CheckCircle2,
  ChevronUp,
  Globe,
  Megaphone,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Card from "../../components/Card";
import "github-markdown-css/github-markdown.css";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Persona {
  id: number;
  name: string;
  data: any;
}

interface SimulationData {
  id: number;
  audience_id: number;
  simulation_response: string;
  optimization_response: string;
  status: string;
  personas: Persona[];
  created_at: string;
  updated_at: string;
  content?: string; // Optional content field that may contain JSON data
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface SimulationResultsContentProps {
  simulationId: string | number;
  onError?: (error: string) => void;
  setIsSidebarVisible: (visible: boolean) => void;
  isSidebarVisible: string;
}

const SimulationResultsContent: React.FC<SimulationResultsContentProps> = ({
  simulationId,
  onError,
  setIsSidebarVisible,
  isSidebarVisible,
}) => {
  const { state } = useLocation();
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"simulation" | "advanced">(
    "simulation"
  );
  const [chatTab, setChatTab] = useState<"simulation" | "persona">(
    "simulation"
  );
  const [selectedPersona, setSelectedPersona] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [simulationStatus, setSimulationStatus] = useState<
    "pending" | "running" | "completed" | "partial"
  >("pending");
  const [optimizationStatus, setOptimizationStatus] = useState<
    "pending" | "running" | "completed"
  >("pending");
  const [currentStep, setCurrentStep] = useState<string>(
    "Initializing simulation..."
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState("simulation");
  // State for collapsible cards in content summary
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    details: true,
    audience: false,
    additional: false,
    personas: false,
  });
  useEffect(() => {
    if (isSidebarVisible === "chat") {
      setActiveChatTab("simulation");
    }
  }, [isSidebarVisible]);
  const [sliderStyle, setSliderStyle] = useState({});
  const chatRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    const el =
      activeChatTab === "chat" ? chatRef.current : simulationRef.current;
    if (el) {
      setSliderStyle({
        width: `${el.offsetWidth}px`,
        transform: `translateX(${el.offsetLeft}px)`,
      });
    }
  }, [activeChatTab]);
  // State for dropdown
  const [isDetailsDropdownOpen, setIsDetailsDropdownOpen] = useState(false);

  // Function to toggle expanded/collapsed state of cards
  const toggleCard = (cardName: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  // Refs for scrolling and input focus
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Reset state when simulationId changes
    setSimulation(null);
    setLoading(true);
    setError(null);
    setChatHistory([]);
    setSelectedPersona(null);
    setActiveTab("simulation");
    setChatTab("simulation");

    if (!simulationId) {
      const errorMsg = "No simulation ID provided";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setLoading(false);
      return;
    }

    // Clear any existing interval first to avoid multiple intervals
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    // Initial fetch - let's determine if we need to start polling
    fetchSimulationStatus(true);

    // Clean up interval on component unmount
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [simulationId]); // Only depend on simulationId, not on simulation data

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const fetchSimulationStatus = async (initialFetch = false) => {
    if (!simulationId) return;

    try {
      const response = await fetch(`${API_URL}/simulations/${simulationId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch simulation status");
      }

      const data = await response.json();
      setSimulation(data);

      // If simulation_response is available, show partial results
      if (data.simulation_response) {
        // Check if optimization_response is empty or just spaces
        const hasOptimizationResponse =
          data.optimization_response &&
          data.optimization_response.trim() !== "";

        if (hasOptimizationResponse) {
          // Both responses are ready
          setSimulationStatus("completed");
          setOptimizationStatus("completed");
          setLoading(false);
          // Clear the polling interval when both responses are received
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        } else {
          // Only simulation_response is ready, optimization still in progress or not needed
          setSimulationStatus("partial");
          setOptimizationStatus("running");
          setLoading(false);

          // If num_tabs is 1, don't poll for optimization response
          if (data.num_tabs === 1) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          } else if (initialFetch) {
            // Only continue polling for optimization if num_tabs > 1
            // Clear any existing interval first
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }
            const interval = setInterval(() => fetchSimulationStatus(), 30000);
            setPollingInterval(interval);
            console.log("Polling started for optimization status...");
          }
        }
      } else {
        // Simulation is still running
        setSimulationStatus("running");
        setOptimizationStatus("pending");
        setCurrentStep(getSimulationStep(data.status));

        // Only start polling if this is the initial fetch and we need to poll
        if (initialFetch) {
          // Clear any existing interval first
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          // Start polling for simulation status
          const interval = setInterval(() => fetchSimulationStatus(), 30000);
          setPollingInterval(interval);
          console.log("Polling started for simulation status...");
        }
      }
    } catch (err) {
      console.error("Error fetching simulation status:", err);
      setError("Failed to load simulation status. Please try again.");
      setLoading(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const getSimulationStep = (status: string): string => {
    switch (status) {
      case "initializing":
        return "Initializing simulation...";
      case "segment_processing":
        return "Processing audience segments...";
      case "generating_personas":
        return "Generating audience profiles...";
      case "running_simulation":
        return "Running simulation with profiles...";
      case "analyzing_results":
        return "Analyzing simulation results...";
      case "optimizing":
        return "Optimizing recommendations...";
      case "complete":
        return "Simulation complete!";
      default:
        return "Processing...";
    }
  };

  const fetchChatHistory = async (personaId?: number) => {
    if (!simulationId) return;

    try {
      let url = "";
      if (chatTab === "simulation") {
        url = `${API_URL}/chat/simulation/${simulationId}`;
      } else if (chatTab === "persona" && personaId) {
        url = `${API_URL}/chat/simulation/marketing/${simulationId}/persona/${personaId}`;
      } else {
        return;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No chat history yet, set empty array
          setChatHistory([]);
          return;
        }
        throw new Error("Failed to fetch chat history");
      }

      const data = await response.json();
      setChatHistory(data.messages || []);
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setChatHistory([]);
    }
  };

  const sendChatMessage = async () => {
    if (!simulationId || !chatMessage.trim() || sendingMessage) return;

    setSendingMessage(true);

    try {
      let url = "";
      let body = { message: chatMessage };
      let newUserMessage: ChatMessage;

      // Set the correct URL and user message role based on the active chat tab
      if (chatTab === "simulation") {
        url = `${API_URL}/chat/simulation/${simulationId}`;
        // For simulation chat, use 'use' role
        newUserMessage = {
          role: "use",
          content: chatMessage,
          timestamp: new Date().toISOString(),
        };
      } else if (chatTab === "persona" && selectedPersona) {
        url = `${API_URL}/chat/simulation/${simulationId}/persona/${selectedPersona}`;
        // For persona chat, use 'user' role
        newUserMessage = {
          role: "use_persona",
          content: chatMessage,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error("Invalid chat target");
      }

      // Add user message immediately for better UX
      setChatHistory((prev) => [...prev, newUserMessage]);
      setChatMessage(""); // Clear input field immediately

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setChatHistory(data.chat_history || []);

      // Focus back to textarea
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const selectPersona = (personaId: number) => {
    setSelectedPersona(personaId);
    fetchChatHistory(personaId);
  };

  const handleChatTabChange = (tab: "simulation" | "persona") => {
    setChatTab(tab);
    if (tab === "simulation") {
      fetchChatHistory();
    } else if (tab === "persona" && simulation?.personas?.length) {
      // Select first persona by default if none selected
      const personaId = selectedPersona || simulation.personas[0].id;
      setSelectedPersona(personaId);
      fetchChatHistory(personaId);
    }
  };
  useEffect(() => {
    handleChatTabChange("simulation");
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Define an interface for persona info
  interface PersonaInfo {
    name: string;
    age: string;
    job_title: string;
    occupation: string;
    behavioral_archetype: string;
    organizational_influence: string;
  }

  const extractPersonaInfo = (
    personaData: string | Record<string, unknown>
  ): PersonaInfo => {
    try {
      const data =
        typeof personaData === "string" ? JSON.parse(personaData) : personaData;

      // Process each field, handling complex nested structures if present
      const extractField = (
        field: string,
        defaultValue: string = "N/A"
      ): string => {
        const value = data[field];

        // If the field is missing or null/undefined
        if (value === undefined || value === null) return defaultValue;

        // If the field is a simple value, return it as a string
        if (typeof value !== "object") return String(value);

        // For complex objects, JSON stringify them with formatting
        try {
          // Don't fully expand very deep objects to avoid UI clutter
          if (Object.keys(value as Record<string, unknown>).length > 5) {
            return `Complex data (${
              Object.keys(value as Record<string, unknown>).length
            } properties)`;
          }
          return JSON.stringify(value, null, 2);
        } catch (error) {
          console.error("Error processing complex data:", error);
          return "Complex data";
        }
      };

      return {
        name: extractField("name", "Unknown"),
        age: extractField("age"),
        job_title: extractField("job_title"),
        occupation: extractField("occupation"),
        behavioral_archetype: extractField("behavioral_archetype"),
        organizational_influence: extractField("organizational_influence"),
      };
    } catch (error) {
      console.error("Error parsing persona data:", error);
      return {
        name: "Unknown",
        age: "N/A",
        job_title: "N/A",
        occupation: "N/A",
        behavioral_archetype: "N/A",
        organizational_influence: "N/A",
      };
    }
  };

  // Parse the content field from simulation data
  const parseContentField = () => {
    if (!simulation?.content) return null;

    try {
      const contentData = JSON.parse(simulation.content);
      return contentData;
    } catch (e) {
      console.error("Error parsing content field:", e);
      return null;
    }
  };

  interface PersonaFilters {
    [segmentId: string]: {
      [filterType: string]: string[] | [];
    };
  }

  interface ContentData {
    [key: string]: unknown;
    audience_id?: number;
    audience_name?: string;
    name?: string;
    goal?: string;
    task?: string;
    context?: string;
    content_type?: string;
    content_subject?: string;
    company_context?: string;
    segment_ids?: number[];
    persona_filters?: PersonaFilters;
  }
  const simulation_responseparsedOutput = (() => {
    try {
      const parsed = JSON.parse(simulation?.simulation_response || "{}");

      return parsed || "No analysis available.";
    } catch (error) {
      return "Invalid simulation response format.";
    }
  })();
  const optimization_responseParsedOutput = (() => {
    try {
      const parsed = JSON.parse(simulation?.optimization_response || "{}");
      console.log(1154562, parsed);
      return parsed || "No analysis available.";
    } catch (error) {
      return "Invalid simulation response format.";
    }
  })();
  const renderSimulationSummaryDropdown = () => {
    const contentData = parseContentField() as ContentData | null;

    if (!contentData || !simulation) return null;

    // Function to render icon based on the key
    const getIconForKey = (key: string): JSX.Element => {
      switch (key) {
        case "audience_id":
        case "audience_name":
          return <Users className="h-4 w-4 text-blue-600" />;
        case "task":
          return <Brain className="h-4 w-4 text-indigo-600" />;
        case "name":
          return <FileText className="h-4 w-4 text-teal-600" />;
        case "goal":
          return <Target className="h-4 w-4 text-green-600" />;
        case "context":
          return <MessageSquare className="h-4 w-4 text-amber-600" />;
        case "content_type":
          return <FileText className="h-4 w-4 text-purple-600" />;
        case "content_subject":
          return <Bookmark className="h-4 w-4 text-pink-600" />;
        case "company_context":
          return <Briefcase className="h-4 w-4 text-gray-600" />;
        case "segment_ids":
          return <Layers className="h-4 w-4 text-blue-600" />;
        case "persona_filters":
          return <Filter className="h-4 w-4 text-orange-600" />;
        default:
          return <FileText className="h-4 w-4 text-blue-600" />;
      }
    };

    // Extract important fields for the summary section
    const importantFields = ["name", "audience_name", "goal", "content_type"];
    const importantData = Object.fromEntries(
      Object.entries(contentData).filter(([key]) =>
        importantFields.includes(key)
      )
    );

    // Additional fields that aren't segments, filters, or personas
    const additionalFields = Object.fromEntries(
      Object.entries(contentData).filter(
        ([key]) =>
          !importantFields.includes(key) &&
          key !== "segment_ids" &&
          key !== "persona_filters" &&
          // key !== 'task' &&
          key !== "audience_id"
      )
    );

    const formatValue = (key: string, value: unknown): React.ReactNode => {
      // Format segment_ids
      if (key === "segment_ids" && Array.isArray(value)) {
        if (simulation?.segments) {
          return (
            <div className="flex flex-wrap gap-2 mt-2">
              {value.map((segmentId, idx) => {
                const segment = simulation.segments?.find(
                  (s) => s.id === segmentId
                );
                return (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-50/80 text-blue-700 border border-blue-200 rounded-full text-xs font-medium flex items-center gap-1.5"
                  >
                    <Globe className="h-3 w-3" />
                    {segment ? segment.name : `Segment ${segmentId}`}
                  </span>
                );
              })}
            </div>
          );
        }
      }

      // Format persona_filters
      if (
        key === "persona_filters" &&
        typeof value === "object" &&
        value !== null
      ) {
        const personaFilters = value as Record<string, Record<string, unknown>>;

        return (
          <div className="mt-3 space-y-4">
            {Object.entries(personaFilters).length === 0 ? (
              <div className="text-sm text-gray-500 italic text-center p-3">
                No filters have been applied
              </div>
            ) : (
              Object.entries(personaFilters).map(
                ([segmentId, filters], idx) => {
                  // Find the segment name from the simulation segments
                  const segmentName =
                    simulation?.segments?.find(
                      (s) => s.id === parseInt(segmentId)
                    )?.name || `Segment ${segmentId}`;

                  // Check if the segment has any non-empty filter arrays
                  const hasFilters = Object.entries(filters).some(
                    ([, values]) => Array.isArray(values) && values.length > 0
                  );

                  // If no filters with values, don't render this segment's filter card
                  if (!hasFilters) return null;

                  return (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-lg shadow-sm border border-green-100"
                    >
                      <div className="text-sm font-medium text-green-800 mb-3 pb-2 border-b border-green-50 flex items-center">
                        <div className="bg-green-100 p-1.5 rounded-lg mr-2">
                          <Layers className="h-4 w-4 text-green-600" />
                        </div>
                        {segmentName}
                      </div>
                      <div className="space-y-3">
                        {Object.entries(filters)
                          .filter(
                            ([, filterValues]) =>
                              // Only include filter categories that have values
                              Array.isArray(filterValues) &&
                              filterValues.length > 0
                          )
                          .map(([filterKey, filterValues], fidx) => (
                            <div
                              key={fidx}
                              className="bg-green-50/50 rounded-lg p-3"
                            >
                              <div className="flex items-center mb-2">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-green-700" />
                                <span className="text-xs font-semibold text-green-800 uppercase">
                                  {filterKey}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(filterValues as string[]).map((val, vidx) => (
                                  <span
                                    key={vidx}
                                    className="px-2.5 py-1 bg-white text-gray-700 border border-green-200 rounded-full text-xs font-medium shadow-sm"
                                  >
                                    {val}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        );
      }

      // For simple values
      return (
        <span className="text-sm text-gray-800 font-medium">
          {typeof value === "string" ? value : JSON.stringify(value)}
        </span>
      );
    };

    return (
      <div className="absolute z-10 left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-[75vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 bg-blue-500 p-2 rounded-full text-white">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-blue-800">
                Simulation Inputs
              </h2>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              <span>{new Date(simulation.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-5">
          {/* Key information grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(importantData).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100"
              >
                <div className="mr-3 bg-blue-100 p-2 rounded-full">
                  {getIconForKey(key)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {value as string}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Segments section */}
          {contentData.segment_ids && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="mr-2 bg-green-100 p-1.5 rounded-md">
                  <Layers className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-base font-medium text-green-800">
                  Audience Segments
                </h3>
              </div>
              <div className="bg-green-50/30 p-3 rounded-lg border border-green-100">
                {formatValue("segment_ids", contentData.segment_ids)}
              </div>
            </div>
          )}

          {/* Filters section */}
          {contentData.persona_filters &&
            Object.keys(contentData.persona_filters).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <div className="mr-2 bg-amber-100 p-1.5 rounded-md">
                    <Filter className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-base font-medium text-amber-800">
                    Applied Filters
                  </h3>
                </div>
                <div className="bg-amber-50/30 rounded-lg border border-amber-100">
                  {formatValue("persona_filters", contentData.persona_filters)}
                </div>
              </div>
            )}

          {contentData.images && contentData.images.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                {/* <div className="mr-2 bg-purple-100 p-1.5 rounded-md">
											<Image className="h-4 w-4 text-purple-600" />
										</div> */}
                <h3 className="text-base font-medium text-purple-800">
                  Images
                </h3>
              </div>
              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100">
                {contentData.images.map((imageData, index) => (
                  <img
                    key={index}
                    src={imageData}
                    alt={`Image ${index + 1}`}
                    className="w-full h-auto rounded-lg mb-2"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Used Personas - COLLAPSIBLE */}
          {simulation.personas && simulation.personas.length > 0 && (
            <div className="mb-6 border border-purple-100 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-50/70 cursor-pointer"
                onClick={() => toggleCard("personas")}
              >
                <div className="flex items-center">
                  <div className="mr-2 bg-purple-100 p-1.5 rounded-md">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="text-base font-medium text-purple-800">
                    Used Profiles ({simulation.personas.length})
                  </h3>
                </div>
                <div className="text-purple-600">
                  {expandedCards.personas ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </div>

              {expandedCards.personas && (
                <div className="p-3 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {simulation.personas.map((persona, index) => {
                      const personaInfo = extractPersonaInfo(persona.data);
                      return (
                        <div
                          key={index}
                          className="bg-purple-50/40 p-3 rounded-lg border border-purple-100"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="bg-purple-100 p-1 rounded-full">
                                <User className="h-3.5 w-3.5 text-purple-600" />
                              </div>
                              <p className="font-medium text-gray-800">
                                {personaInfo.name}
                              </p>
                            </div>
                            <div className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {persona.name
                                ? persona.name.replace(/_/g, " ")
                                : "Profile"}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2 border-t border-purple-100/60 pt-2 text-xs">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="h-3 w-3 text-purple-600/70" />
                              <p>
                                <span className="text-gray-600">Age:</span>{" "}
                                <span className="text-gray-900 font-medium">
                                  {personaInfo.age}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <Briefcase className="h-3 w-3 text-purple-600/70" />
                              <p>
                                <span className="text-gray-600">Role:</span>{" "}
                                <span className="text-gray-900 font-medium">
                                  {personaInfo.job_title}
                                </span>
                              </p>
                            </div>
                            {personaInfo.behavioral_archetype !== "N/A" && (
                              <div className="col-span-2 flex items-center space-x-1.5">
                                <Brain className="h-3 w-3 text-purple-600/70" />
                                <p>
                                  <span className="text-gray-600">
                                    Archetype:
                                  </span>{" "}
                                  <span className="text-gray-900 font-medium">
                                    {personaInfo.behavioral_archetype}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Information */}
          {Object.keys(additionalFields).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="mr-2 bg-gray-100 p-1.5 rounded-md">
                  <HelpCircle className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-base font-medium text-gray-800">
                  Additional Information
                </h3>
              </div>

              <div className="space-y-3">
                {Object.entries(additionalFields).map(([key, value], idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50/70 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center mb-1.5 pb-1.5 border-b border-gray-100">
                      <div className="bg-gray-100 p-1.5 rounded mr-2">
                        {getIconForKey(key)}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-sm ml-1 mt-2">
                      {formatValue(key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setIsDetailsDropdownOpen(false)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const renderLoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin mb-6">
        <Loader2 className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {simulationStatus === "pending"
          ? "Starting simulation..."
          : currentStep}
      </h3>
      <p className="text-gray-500 text-center max-w-md">
        {simulationStatus === "pending"
          ? "We are initializing your simulation..."
          : "This process typically takes 2-5 minutes. Please wait while we run your simulation."}
      </p>
    </div>
  );

  const renderSimulationAnalysis = () => (
    <div
      className="h-full overflow-auto p-6"
      style={{ maxHeight: "calc(90vh - 120px)" }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Simulation Analysis
        </h3>

        <button
          onClick={() => setIsDetailsDropdownOpen(!isDetailsDropdownOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors text-sm"
        >
          <FileText className="h-4 w-4" />
          <span>Simulation Inputs</span>
          {isDetailsDropdownOpen ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </button>
      </div>

      {/* Dropdown for simulation summary */}
      <div className="relative">
        {isDetailsDropdownOpen && renderSimulationSummaryDropdown()}
      </div>

      <div className="prose prose-primary max-w-none pb-8 markdown-body mt-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {simulation_responseparsedOutput?.output ||
            "No analysis available yet."}
        </ReactMarkdown>
        {simulation_responseparsedOutput?.tables?.map(
          (item: any, index: number) => {
            return (
              <div key={index}>
                <h5>{item.title}</h5>
                <table>
                  <thead>
                    <tr>
                      {item?.headers?.map((heading: any, idx: number) => (
                        <th key={idx}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item?.data?.map((i: any, indx: number) => (
                      <tr key={indx}>
                        <td>{indx + 1}</td>
                        <td>{i.profile_name}</td>
                        <td>{i.visual_appeal}</td>
                        <td>{i.message_clarity}</td>
                        <td>{i.emotional_connection}</td>
                        <td>{i.trust_credibility}</td>
                        <td>{i.purchase_intent}</td>
                        <td>{i.value_perception}</td>
                        <td>{i.brand_fit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        )}

        <div className="h-5"> </div>
      </div>
    </div>
  );

  const renderAdvancedAnalysis = () => (
    <div className="h-full overflow-auto p-6">
      {optimizationStatus === "completed" ? (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Advanced Analysis
          </h3>
          <div className="prose prose-blue max-w-none mb-3 markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {optimization_responseParsedOutput?.output ||
                "No advanced analysis available yet."}
            </ReactMarkdown>
            {optimization_responseParsedOutput?.analysis && (
              <div className="h-5">
                <h5>Analysis</h5>
                <p>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {optimization_responseParsedOutput?.analysis ||
                      "No advanced analysis available yet."}
                  </ReactMarkdown>
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Generating advanced analysis...
          </h3>
          <p className="text-gray-500 text-center max-w-md">
            We're optimizing the recommendations for your simulation. This may
            take a few minutes.
          </p>
        </div>
      )}
    </div>
  );

  const renderChatInterface = () => (
    <div className="flex flex-col h-full">
      {/* <div className="border-b border-gray-200 bg-white">
        <nav className="flex gap-4 px-6" aria-label="Tabs">
          <button
            onClick={() => handleChatTabChange("simulation")}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              chatTab === "simulation"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Brain className="mr-2 h-4 w-4" />
            Chat with Simulation
          </button>
          <button
            onClick={() => handleChatTabChange('persona')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              chatTab === 'persona'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="mr-2 h-4 w-4" />
            Chat with Persona
          </button>
        </nav>
      </div> */}

      {chatTab === "persona" && (
        <div className="border-b border-gray-200 p-3 bg-white">
          <div className="relative">
            <div className="flex items-center mb-1">
              <label className="text-xs font-medium text-gray-700 flex items-center">
                Select a Profile to chat with
                <div
                  className="relative ml-1"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <HelpCircle className="h-3 w-3 text-gray-400" />
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                      Pick to change the profile you're chatting with
                    </div>
                  )}
                </div>
              </label>
            </div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-md border ${
                dropdownOpen
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-gray-300"
              } bg-white hover:bg-blue-50 transition-colors`}
            >
              {selectedPersona && simulation?.personas ? (
                (() => {
                  const selectedPersonaObj = simulation.personas.find(
                    (p) => p.id === selectedPersona
                  );
                  if (selectedPersonaObj) {
                    const info = extractPersonaInfo(selectedPersonaObj.data);
                    return (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-primary" />
                        <span>
                          {info.name} ({info.age}, {info.occupation})
                        </span>
                      </div>
                    );
                  }
                  return "Select a profile";
                })()
              ) : (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Select a profile</span>
                </div>
              )}
              <ChevronDown
                className={`h-4 w-4 ml-2 text-primary transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {!dropdownOpen && (
              <div className="text-xs text-primary mt-1 ml-1 animate-pulse">
                Click to change profile
              </div>
            )}

            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
                {simulation?.personas?.map((persona) => {
                  const info = extractPersonaInfo(persona.data);
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        selectPersona(persona.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center ${
                        selectedPersona === persona.id
                          ? "bg-blue-50 text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      <User className="h-3 w-3 mr-2" />
                      <div>
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-gray-500">
                          {info.age}, {info.occupation}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-auto p-4 bg-gray-50"
        ref={chatContainerRef}
      >
        <div className="space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            chatHistory.map((msg, idx) => {
              // For simulation tab, only show messages with role 'use' (user) or 'sim' (simulation)
              // For persona tab, only show messages with role 'user' or 'persona'
              const isUserMessage =
                chatTab === "simulation"
                  ? msg.role === "use"
                  : msg.role === "use_persona";

              const isValidMessage =
                chatTab === "simulation"
                  ? msg.role === "use" || msg.role === "sim"
                  : msg.role === "use_persona" || msg.role === "persona";

              // Skip rendering messages that don't belong in this tab
              if (!isValidMessage) return null;

              return (
                <div
                  key={idx}
                  className={`flex ${
                    isUserMessage ? "justify-end" : "justify-start"
                  } animate-fadeIn`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      isUserMessage
                        ? "bg-[#03e8d3] text-white rounded-br-none animate-slideInRight"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none animate-slideInLeft"
                    }`}
                  >
                    <div
                      className={
                        `${
                          isUserMessage
                            ? "prose prose-invert prose-sm max-w-none"
                            : "prose prose-sm max-w-none"
                        }` + "markdown-body"
                      }
                    >
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
                  <div
                    className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "200ms" }}
                  ></div>
                  <div
                    className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "400ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2 relative">
          <textarea
            ref={textareaRef}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type your message to ${
              chatTab === "persona" && selectedPersona
                ? (() => {
                    const persona = simulation?.personas?.find(
                      (p) => p.id === selectedPersona
                    );
                    return persona ? extractPersonaInfo(persona.data).name : "";
                  })()
                : "the simulation"
            }...`}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
          />
          <button
            onClick={sendChatMessage}
            disabled={!chatMessage.trim() || sendingMessage}
            className={`flex items-center justify-center p-3 rounded-full ${
              chatMessage.trim() && !sendingMessage
                ? "bg-primary text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
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

  // Render tabs based on simulation data and actual content
  const renderTabs = () => {
    // Show Advanced Analysis tab if num_tabs > 1, regardless of optimization_response status
    const showAdvancedTab = simulation?.num_tabs !== 1;

    return (
      <>
        <button
          onClick={() => setActiveTab("simulation")}
          className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
            activeTab === "simulation"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <BarChart2 className="mr-2 h-4 w-4" />
          Simulation Analysis
        </button>

        {showAdvancedTab && (
          <button
            onClick={() => setActiveTab("advanced")}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              activeTab === "advanced"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Brain className="mr-2 h-4 w-4" />
            Advanced Analysis
            {optimizationStatus === "running" && (
              <span className="ml-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              </span>
            )}
          </button>
        )}
      </>
    );
  };

  // When rendering the interface, if we're on the advanced tab but it shouldn't be shown,
  // automatically switch to simulation tab
  useEffect(() => {
    if (activeTab === "advanced" && simulation?.num_tabs === 1) {
      setActiveTab("simulation");
    }
  }, [simulation, activeTab]);

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      {/* ---------------------------------------------------------------------------- */}
      <div className="flex items-center justify-between w-full gap-2 mb-4">
        {/* Tab group with animated background */}
        <div className="relative flex w-fit p-1 bg-cyan-50 rounded-full transition-all duration-300">
          {/* Animated background slider */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-300"
            style={sliderStyle}
          />

          {/* Tabs */}
          <div className="relative z-10 flex">
            <div
              ref={chatRef}
              onClick={() => {
                setActiveChatTab("chat");
                setIsSidebarVisible(false);
              }}
              className={`px-4 py-2 cursor-pointer rounded-full font-medium text-sm transition-all duration-300 ${
                activeChatTab === "chat" ? "text-white" : "text-black"
              }`}
            >
              Chat
            </div>
            <div
              ref={simulationRef}
              onClick={() => setActiveChatTab("simulation")}
              className={`px-4 py-2 cursor-pointer rounded-full font-medium text-sm transition-all duration-300 ${
                activeChatTab === "simulation" ? "text-white" : "text-black"
              }`}
            >
              Simulation Analysis
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-semibold text-[28px] leading-[100%] tracking-[0em]">
          Analysis Dashboard
        </h2>
      </div>

      {loading ? (
        renderLoadingAnimation()
      ) : (
        <div
          className={`grid grid-cols-1 ${
            activeChatTab != "chat"
              ? "md:grid-cols-1"
              : "md:grid-cols-[1fr_2fr]"
          } gap-6 h-full`}
          style={{ height: "80vh" }}
        >
          {activeChatTab == "chat" && (
            <div className="md:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden h-full">
              {renderChatInterface()}
            </div>
          )}
          <div
            className={` bg-white rounded-xl shadow-sm overflow-hidden h-full flex flex-col`}
          >
            <div className="border-b border-gray-200 flex-shrink-0">
              <nav className="flex gap-4 px-6" aria-label="Tabs">
                {renderTabs()}
              </nav>
            </div>
            <div className="flex-grow overflow-hidden">
              {activeTab === "simulation"
                ? renderSimulationAnalysis()
                : renderAdvancedAnalysis()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimulationResultsContent;
