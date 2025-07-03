import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
	ArrowLeft,
	MessageSquare,
	BarChart2,
	Brain,
	User,
	Loader2,
	Send,
	ChevronDown,
	Clock,
	History,
	HelpCircle,
	FileText,
	Calendar,
	Target,
	Briefcase,
	Users,
	Filter,
	Layers,
	ChevronUp,
	Globe,
	Bookmark,
	Building,
	Megaphone,
	CheckCircle2,
	Tag,
	Settings,
} from "lucide-react";
import Button from "../../components/Button";
import { useAudience } from "../../context/AudienceContext";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import SimulationHistoryPanel from "../../components/SimulationHistoryPanel";
import Layout from "../../components/Layout";
import Card from "../../components/Card";
import "github-markdown-css/github-markdown.css";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Persona {
	id: number;
	name: string;
	data: Record<string, unknown>;
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
	num_tabs?: number; // Add this field to track number of tabs to show
	segments?: {
		id: number;
		name: string;
	}[];
}

// Type definition for persona info return value
type PersonaInfoType = {
	name: string;
	age: string;
	job_title: string;
	occupation: string;
	behavioral_archetype: string;
	organizational_influence: string;
};

// Interface for persona filters data structure
interface PersonaFilters {
	[segmentId: string]: {
		[filterType: string]: string[] | [];
	};
}

// Interface for content data structure
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

interface ChatMessage {
	role: string;
	content: string;
	timestamp: string;
}

// ChatHistory interface has been removed as it's not used

interface SimulationResultsProps {
	simulationId?: number; // Optional simulation ID for embedded mode
	embedded?: boolean; // Whether the component is embedded in another page
}

const SimulationResults: React.FC<SimulationResultsProps> = ({
	simulationId: propSimulationId,
	embedded = false,
}) => {
	const { state } = useLocation();
	const navigate = useNavigate();
	useAudience(); // Using context but not destructuring any values
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
	const [pollingInterval, setPollingInterval] = useState<number | null>(null);
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
	const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [numTabs, setNumTabs] = useState<number>(2); // Default to 2 tabs unless server specifies otherwise
	const [isDetailsDropdownOpen, setIsDetailsDropdownOpen] = useState(false);

	// State for collapsible cards in content summary
	const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
		{
			details: true,
			audience: true,
			additional: false,
			personas: false,
		}
	);

	// Function to toggle expanded/collapsed state of cards
	const toggleCard = (cardName: string): void => {
		setExpandedCards((prev) => ({
			...prev,
			[cardName]: !prev[cardName],
		}));
	};

	// Refs for scrolling and input focus
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Simulation ID from props, URL params, or state
	const { simulationId: urlSimId } = useParams<{ simulationId: string }>();
	const simulationId =
		propSimulationId ||
		urlSimId ||
		(state?.simulationId ? state.simulationId : null);

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
			setError("No simulation ID provided");
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
			const response = await fetch(
				`${API_URL}/simulations/${simulationId}`,
				{
					credentials: "include",
				}
			);

			if (!response.ok) {
				throw new Error("Failed to fetch simulation status");
			}

			const data = await response.json();
			setSimulation(data);

			// Set number of tabs from response if available
			if (data.num_tabs !== undefined) {
				setNumTabs(data.num_tabs);
			}

			// If simulation_response is available, show partial results
			if (data.simulation_response) {
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
						const interval = setInterval(
							() => fetchSimulationStatus(),
							30000
						);
						setPollingInterval(interval);
						console.log(
							"Polling started for optimization status..."
						);
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
					const interval = setInterval(
						() => fetchSimulationStatus(),
						30000
					);
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
			const body = { message: chatMessage };
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

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendChatMessage();
		}
	};

	const extractPersonaInfo = (
		personaData: Record<string, unknown> | string
	): PersonaInfoType => {
		try {
			const data =
				typeof personaData === "string"
					? JSON.parse(personaData)
					: personaData;

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
					if (
						Object.keys(value as Record<string, unknown>).length > 5
					) {
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
				organizational_influence: extractField(
					"organizational_influence"
				),
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

	const renderLoadingAnimation = () => (
		<div className="flex flex-col items-center justify-center py-16">
			<div className="animate-spin mb-6">
				<Loader2 className="h-12 w-12 text-blue-500" />
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
		<div className="h-full overflow-auto p-6 max-h-[calc(90vh-120px)]">
			{renderContentSummary()}
			<div className="mb-6 mt-8">
				<Card className="border border-indigo-200/50 shadow-md overflow-hidden transition-all duration-200">
					<div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-indigo-50/70 border-b border-indigo-100">
						<div className="flex items-center space-x-2.5">
							<div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-600">
								<BarChart2 className="h-5 w-5" />
							</div>
							<h3 className="text-base font-medium text-indigo-800">
								Simulation Analysis
							</h3>
						</div>
					</div>
					<div className="p-6 bg-white">
						<div className="prose prose-blue max-w-none mb-3 markdown-body rounded-lg">
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								rehypePlugins={[rehypeRaw]}>
								{simulation?.simulation_response ||
									"No analysis available yet."}
							</ReactMarkdown>
							<div className="h-5"></div>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);

	const renderAdvancedAnalysis = () => (
		<div className="h-full overflow-auto p-6">
			{optimizationStatus === "completed" ? (
				<div className="mb-6">
					<Card className="border border-purple-200/50 shadow-md overflow-hidden transition-all duration-200">
						<div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-purple-50/70 border-b border-purple-100">
							<div className="flex items-center space-x-2.5">
								<div className="p-2 rounded-lg bg-purple-100/80 text-purple-600">
									<Brain className="h-5 w-5" />
								</div>
								<h3 className="text-base font-medium text-purple-800">
									Advanced Recommendations
								</h3>
							</div>
						</div>
						<div className="p-6 bg-white">
							<div className="prose prose-blue max-w-none markdown-body rounded-lg">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									rehypePlugins={[rehypeRaw]}>
									{simulation?.optimization_response ||
										"No advanced analysis available yet."}
								</ReactMarkdown>
								<div className="h-5"></div>
							</div>
						</div>
					</Card>
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
					<h3 className="text-xl font-semibold mb-2 text-purple-800">
						Generating advanced analysis...
					</h3>
					<p className="text-gray-500 text-center max-w-md">
						We're optimizing the recommendations for your
						simulation. This may take a few minutes.
					</p>
				</div>
			)}
		</div>
	);

	const renderChatInterface = () => (
		<div className="flex flex-col h-full">
			<div className="border-b border-gray-200 bg-white">
				<nav className="flex gap-4 px-6" aria-label="Tabs">
					<button
						onClick={() => handleChatTabChange("simulation")}
						className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
							chatTab === "simulation"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}>
						<Brain className="mr-2 h-4 w-4" />
						Chat with Simulation
					</button>
					{/* <button
            onClick={() => handleChatTabChange('persona')}
            className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
              chatTab === 'persona'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="mr-2 h-4 w-4" />
            Chat with Persona
          </button> */}
				</nav>
			</div>

			{chatTab === "persona" && (
				<div className="border-b border-gray-200 p-3 bg-white">
					<div className="relative">
						<div className="flex items-center mb-1">
							<label className="text-xs font-medium text-gray-700 flex items-center">
								Select a Profile to chat with
								<div
									className="relative ml-1"
									onMouseEnter={() => setShowTooltip(true)}
									onMouseLeave={() => setShowTooltip(false)}>
									<HelpCircle className="h-3 w-3 text-gray-400" />
									{showTooltip && (
										<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
											Pick to change the profile you're
											chatting with
										</div>
									)}
								</div>
							</label>
						</div>
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-md border ${
								dropdownOpen
									? "border-blue-500 ring-2 ring-blue-500/20"
									: "border-gray-300"
							} bg-white hover:bg-blue-50 transition-colors`}>
							{selectedPersona && simulation?.personas ? (
								(() => {
									const selectedPersonaObj =
										simulation.personas.find(
											(p) => p.id === selectedPersona
										);
									if (selectedPersonaObj) {
										const info = extractPersonaInfo(
											selectedPersonaObj.data
										);
										return (
											<div className="flex items-center">
												<User className="h-4 w-4 mr-2 text-blue-500" />
												<span>
													{info.name} ({info.age},{" "}
													{info.occupation})
												</span>
											</div>
										);
									}
									return "Select a Profile";
								})()
							) : (
								<div className="flex items-center">
									<User className="h-4 w-4 mr-2 text-gray-400" />
									<span>Select a Profile</span>
								</div>
							)}
							<ChevronDown
								className={`h-4 w-4 ml-2 text-blue-500 transition-transform ${
									dropdownOpen ? "rotate-180" : ""
								}`}
							/>
						</button>

						{!dropdownOpen && (
							<div className="text-xs text-blue-500 mt-1 ml-1 animate-pulse">
								Click to change profile
							</div>
						)}

						{dropdownOpen && (
							<div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
								{simulation?.personas?.map((persona) => {
									const info = extractPersonaInfo(
										persona.data
									);
									return (
										<button
											key={persona.id}
											onClick={() => {
												selectPersona(persona.id);
												setDropdownOpen(false);
											}}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center ${
												selectedPersona === persona.id
													? "bg-blue-50 text-blue-500"
													: "text-gray-700"
											}`}>
											<User className="h-3 w-3 mr-2" />
											<div>
												<div className="font-medium">
													{info.name}
												</div>
												<div className="text-xs text-gray-500">
													{info.age},{" "}
													{info.occupation}
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
				ref={chatContainerRef}>
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
									: msg.role === "use_persona" ||
									  msg.role === "persona";

							// Skip rendering messages that don't belong in this tab
							if (!isValidMessage) return null;

							return (
								<div
									key={idx}
									className={`flex ${
										isUserMessage
											? "justify-end"
											: "justify-start"
									} animate-fadeIn`}
									data-idx={
										idx
									} /* Use data attribute instead of inline style */
								>
									<div
										className={`max-w-[80%] px-4 py-2 rounded-lg ${
											isUserMessage
												? "bg-blue-500 text-white rounded-br-none animate-slideInRight"
												: "bg-white border border-gray-200 text-gray-800 rounded-bl-none animate-slideInLeft"
										}`}>
										<div
											className={
												`${
													isUserMessage
														? "prose prose-invert prose-sm max-w-none"
														: "prose prose-sm max-w-none"
												}` + "markdown-body"
											}>
											<ReactMarkdown
												remarkPlugins={[remarkGfm]}
												rehypePlugins={[rehypeRaw]}>
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
									<div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-0"></div>
									<div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
									<div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-500"></div>
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
										const persona =
											simulation?.personas.find(
												(p) => p.id === selectedPersona
											);
										return persona
											? extractPersonaInfo(persona.data)
													.name
											: "";
								  })()
								: "the simulation"
						}...`}
						className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows={2}
					/>
					<button
						onClick={sendChatMessage}
						disabled={!chatMessage.trim() || sendingMessage}
						aria-label="Send message"
						title="Send message"
						className={`flex items-center justify-center p-3 rounded-full ${
							chatMessage.trim() && !sendingMessage
								? "bg-blue-500 text-white hover:bg-blue-600"
								: "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}>
						<Send className="h-4 w-4" />
					</button>
				</div>
				<div className="text-xs text-gray-400 mt-1 text-right">
					Press Enter to send, Shift+Enter for new line
				</div>
			</div>
		</div>
	);

	// Function to handle selection of a simulation from history panel
	const handleSelectHistorySimulation = (simulationId: number) => {
		// Navigate to the selected simulation results page
		navigate(`/simulation-results/${simulationId}`);
		// Close the history panel
		setIsHistoryPanelOpen(false);
		// Reset loading state to fetch the new simulation
		setLoading(true);
		setError(null);
	};

	// Parse the content field from simulation data
	const parseContentField = (): ContentData | null => {
		if (!simulation?.content) return null;

		try {
			const contentData = JSON.parse(simulation.content) as ContentData;
			return contentData;
		} catch (e) {
			console.error("Error parsing content field:", e);
			return null;
		}
	};

	const renderContentSummary = () => {
		const contentData = parseContentField() as ContentData;

		if (!contentData) return null;

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
										className="px-3 py-1.5 bg-blue-50/80 text-blue-700 border border-blue-200 rounded-full text-xs font-medium flex items-center gap-1.5">
										<Globe className="h-3 w-3" />
										{segment
											? segment.name
											: `Segment ${segmentId}`}
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
				const personaFilters = value as Record<
					string,
					Record<string, unknown>
				>;

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
									const hasFilters = Object.entries(
										filters
									).some(
										([, values]) =>
											Array.isArray(values) &&
											values.length > 0
									);

									// If no filters with values, don't render this segment's filter card
									if (!hasFilters) return null;

									return (
										<div
											key={idx}
											className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
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
															Array.isArray(
																filterValues
															) &&
															filterValues.length >
																0
													)
													.map(
														(
															[
																filterKey,
																filterValues,
															],
															fidx
														) => (
															<div
																key={fidx}
																className="bg-green-50/50 rounded-lg p-3">
																<div className="flex items-center mb-2">
																	<Filter className="h-3.5 w-3.5 mr-1.5 text-green-700" />
																	<span className="text-xs font-semibold text-green-800 uppercase">
																		{
																			filterKey
																		}
																	</span>
																</div>
																<div className="flex flex-wrap gap-2">
																	{(
																		filterValues as string[]
																	).map(
																		(
																			val,
																			vidx
																		) => (
																			<span
																				key={
																					vidx
																				}
																				className="px-2.5 py-1 bg-white text-gray-700 border border-green-200 rounded-full text-xs font-medium shadow-sm">
																				{
																					val
																				}
																			</span>
																		)
																	)}
																</div>
															</div>
														)
													)}
											</div>
										</div>
									);
								}
							)
						)}
					</div>
				);
			}

			// Special handling for attribution_mode - make it more visually appealing
			if (key === "attribution_mode" && typeof value === "string") {
				return (
					<div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-sm font-medium">
						<span className="mr-1.5">⚙️</span> {value}
					</div>
				);
			}

			// Special handling for objective - make it more visually appealing
			if (key === "objective" && typeof value === "string") {
				return (
					<div className="inline-flex items-center px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">
						<span className="mr-1.5">🎯</span> {value}
					</div>
				);
			}

			// Format complex objects (objects and arrays) into readable format
			if (
				typeof value === "object" &&
				value !== null &&
				key !== "audience_id" &&
				key !== "task"
			) {
				// Handle empty objects/arrays with a nice message
				if (Object.keys(value).length === 0) {
					return (
						<span className="text-sm text-gray-500 italic py-1 px-2 bg-gray-50 rounded">
							{Array.isArray(value)
								? "Empty list"
								: "Empty object"}
						</span>
					);
				}

				// Handle arrays with visual improvements
				if (Array.isArray(value)) {
					return (
						<div className="mt-2 bg-gray-50/80 rounded-lg p-3 border border-gray-100">
							{value.length === 0 ? (
								<span className="text-sm text-gray-500 italic">
									Empty list
								</span>
							) : (
								<ul className="list-disc pl-5 space-y-2 my-1">
									{value.map((item, idx) => (
										<li
											key={idx}
											className="text-sm text-gray-700">
											{typeof item === "object" &&
											item !== null ? (
												renderNestedObject(item)
											) : (
												<span className="text-gray-800 font-medium">
													{String(item)}
												</span>
											)}
										</li>
									))}
								</ul>
							)}
						</div>
					);
				}

				// Handle objects with improved styling
				return renderNestedObject(filterValues);
			}

			// For audience_id - don't show
			if (key === "audience_id") {
				return null;
			}

			// For other simple values
			return (
				<span className="text-sm text-gray-800 font-medium">
					{typeof value === "string" ? value : JSON.stringify(value)}
				</span>
			);
		};

		// Helper function to render nested objects
		const renderNestedObject = (
			obj: Record<string, unknown>,
			depth = 0
		): React.ReactNode => {
			// Skip rendering audience_id anywhere
			if (
				obj.audience_id !== undefined &&
				Object.keys(obj).length === 1
			) {
				return null;
			}

			if (depth > 3) {
				// Limit nesting depth for visual clarity
				return (
					<span className="text-sm text-gray-600 italic">
						Deep nested object
					</span>
				);
			}

			// Check for empty objects/arrays
			if (Object.keys(obj).length === 0) {
				return (
					<span className="text-sm text-gray-500 italic">
						Empty object
					</span>
				);
			}

			// Background color alternates with depth for better visual distinction
			const bgColorClass = depth % 2 === 0 ? "bg-gray-50" : "bg-white";
			const borderColorClass =
				depth % 2 === 0 ? "border-gray-200" : "border-gray-100";

			return (
				<div
					className={`${
						depth > 0
							? `ml-3 mt-2 ${bgColorClass} p-2 rounded ${borderColorClass} ${
									depth > 0 ? "border" : ""
							  }`
							: "mt-1"
					}`}>
					{Object.entries(obj)
						// Skip audience_id field
						.filter(([key]) => key !== "audience_id" && key !== "task")
						.map(([key, value], idx) => (
							<div
								key={idx}
								className={`mb-3 ${
									idx < Object.entries(obj).length - 1
										? "pb-2 border-b border-gray-100/60"
										: ""
								}`}>
								<div className="flex items-start">
									<span className="text-sm font-bold text-gray-700 mr-2">
										{key.replace(/_/g, " ")}:
									</span>
									<div className="flex-1">
										{typeof value === "object" &&
										value !== null ? (
											Array.isArray(value) ? (
												value.length === 0 ? (
													<span className="text-sm text-gray-500 italic">
														Empty list
													</span>
												) : (
													<ul className="list-disc pl-5 mt-1 space-y-2">
														{value.map(
															(
																item: unknown,
																idx: number
															) => (
																<li
																	key={idx}
																	className="text-sm text-gray-700">
																	{typeof item ===
																		"object" &&
																	item !==
																		null ? (
																		Array.isArray(
																			item
																		) ? (
																			<div className="mt-1">
																				<ul className="list-circle pl-5 space-y-1">
																					{item.map(
																						(
																							subItem: unknown,
																							subIdx: number
																						) => (
																							<li
																								key={
																									subIdx
																								}
																								className="text-xs text-gray-700">
																								{typeof subItem ===
																									"object" &&
																								subItem !==
																									null
																									? renderNestedObject(
																											subItem as Record<
																												string,
																												unknown
																											>,
																											depth +
																												2
																									  )
																									: String(
																											subItem
																									  )}
																							</li>
																						)
																					)}
																				</ul>
																			</div>
																		) : (
																			<div className="mt-1 ml-2">
																				{Object.entries(
																					item as Record<
																						string,
																						unknown
																					>
																				).map(
																					(
																						[
																							subKey,
																							subValue,
																						],
																						subIdx
																					) => (
																						<div
																							key={
																								subIdx
																							}
																							className="mb-1">
																							<span className="text-xs font-semibold text-gray-800">
																								{subKey.replace(
																									/_/g,
																									" "
																								)}
																								:{" "}
																							</span>
																							<span className="text-xs text-gray-700">
																								{typeof subValue ===
																									"object" &&
																								subValue !==
																									null
																									? renderNestedObject(
																											subValue as Record<
																												string,
																												unknown
																											>,
																											depth +
																												2
																									  )
																									: String(
																											subValue
																									  )}
																							</span>
																						</div>
																					)
																				)}
																			</div>
																		)
																	) : (
																		<span className="text-gray-700">
																			{String(
																				item
																			)}
																		</span>
																	)}
																</li>
															)
														)}
													</ul>
												)
											) : (
												<div className="p-2 rounded bg-gray-50/80">
													{Object.entries(
														value as Record<
															string,
															unknown
														>
													).map(
														(
															[subKey, subValue],
															subIdx
														) => (
															<div
																key={subIdx}
																className={`${
																	subIdx > 0
																		? "mt-2"
																		: ""
																}`}>
																<span className="text-sm font-semibold text-indigo-700">
																	{subKey.replace(
																		/_/g,
																		" "
																	)}
																	:{" "}
																</span>
																{typeof subValue ===
																	"object" &&
																subValue !==
																	null ? (
																	Array.isArray(
																		subValue
																	) ? (
																		<div className="ml-4 mt-1">
																			{subValue.length ===
																			0 ? (
																				<span className="text-xs text-gray-500 italic">
																					Empty
																					list
																				</span>
																			) : (
																				<ul className="list-disc pl-4 space-y-1">
																					{subValue.map(
																						(
																							item: unknown,
																							itemIdx: number
																						) => (
																							<li
																								key={
																									itemIdx
																								}
																								className="text-sm text-gray-700">
																								{typeof item ===
																									"object" &&
																								item !==
																									null
																									? renderNestedObject(
																											item as Record<
																												string,
																												unknown
																											>,
																											depth +
																												2
																									  )
																									: String(
																											item
																									  )}
																							</li>
																						)
																					)}
																				</ul>
																			)}
																		</div>
																	) : (
																		renderNestedObject(
																			subValue as Record<
																				string,
																				unknown
																			>,
																			depth +
																				1
																		)
																	)
																) : (
																	<span className="text-sm text-gray-700">
																		{String(
																			subValue
																		)}
																	</span>
																)}
															</div>
														)
													)}
												</div>
											)
										) : (
											<span className="text-sm text-gray-700">
												{String(value)}
											</span>
										)}
									</div>
								</div>
							</div>
						))}
				</div>
			);
		};

		// Extract only the most important fields for the top section
		const topSectionFields = [
			"name",
			"audience_name",
			"goal",
			"task",
			"content_type",
		];
		const topSectionData = Object.fromEntries(
			Object.entries(contentData).filter(([key]) =>
				topSectionFields.includes(key)
			)
		);

		// All other fields for detailed section
		const detailSectionData = Object.fromEntries(
			Object.entries(contentData).filter(
				([key]) =>
					!topSectionFields.includes(key) &&
					key !== "segment_ids" &&
					key !== "audience_id" &&
					key !== "task" &&
					key !== "persona_filters"
			)
		);

		// CardHeader component to keep consistent styling
		const CardHeader: React.FC<{
			icon: JSX.Element;
			title: string;
			cardName: string;
			color: "blue" | "green" | "purple" | "gray";
		}> = ({ icon, title, cardName, color }) => (
			<div
				className={`flex items-center justify-between px-5 py-4 cursor-pointer bg-gradient-to-r ${
					color === "blue"
						? "from-blue-50 to-blue-50/70 border-b border-blue-100"
						: color === "green"
						? "from-green-50 to-green-50/70 border-b border-green-100"
						: color === "purple"
						? "from-purple-50 to-purple-50/70 border-b border-purple-100"
						: "from-gray-50 to-gray-50/70 border-b border-gray-100"
				}`}
				onClick={() => toggleCard(cardName)}>
				<div className="flex items-center space-x-2.5">
					<div
						className={`p-2 rounded-lg ${
							color === "blue"
								? "bg-blue-100/80 text-blue-600"
								: color === "green"
								? "bg-green-100/80 text-green-600"
								: color === "purple"
								? "bg-purple-100/80 text-purple-600"
								: "bg-gray-100/80 text-gray-600"
						}`}>
						{React.cloneElement(icon, { className: "h-5 w-5" })}
					</div>
					<h3
						className={`text-base font-medium ${
							color === "blue"
								? "text-blue-800"
								: color === "green"
								? "text-green-800"
								: color === "purple"
								? "text-purple-800"
								: "text-gray-800"
						}`}>
						{title}
					</h3>
				</div>
				<div
					className={`p-1.5 rounded-full transition-colors ${
						color === "blue"
							? "text-blue-600 hover:bg-blue-100/50"
							: color === "green"
							? "text-green-600 hover:bg-green-100/50"
							: color === "purple"
							? "text-purple-600 hover:bg-purple-100/50"
							: "text-gray-600 hover:bg-gray-100/50"
					}`}>
					{expandedCards[cardName] ? (
						<ChevronUp className="h-5 w-5" />
					) : (
						<ChevronDown className="h-5 w-5" />
					)}
				</div>
			</div>
		);

		return (
			<div className="space-y-5">
				{/* Top summary section */}
				<Card className="border border-blue-200/50 shadow-md overflow-hidden transition-all duration-200">
					<CardHeader
						icon={<FileText />}
						title="Simulation Details"
						cardName="details"
						color="blue"
					/>

					{expandedCards.details && (
						<div className="p-6 bg-white">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
								{Object.entries(topSectionData).map(
									([key, value], index) => (
										<div
											key={index}
											className="flex items-start bg-blue-50/50 p-4 rounded-lg border border-blue-100 hover:shadow-sm transition-shadow">
											<div className="mr-3.5 bg-blue-100/80 p-2 rounded-lg self-start">
												{getIconForKey(key)}
											</div>
											<div className="flex-1">
												<p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">
													{key.replace(/_/g, " ")}
												</p>
												<div className="text-sm text-gray-800 font-medium">
													{formatValue(key, value)}
												</div>
											</div>
										</div>
									)
								)}
							</div>

							{/* Date info inside details card */}
							<div className="flex justify-between text-xs font-medium text-gray-500 mt-4 border-t border-blue-100/50 pt-3 px-1">
								<div className="flex items-center">
									<Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
									Created:{" "}
									{new Date(
										simulation?.created_at || ""
									).toLocaleString()}
								</div>
								<div className="flex items-center">
									<Clock className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
									Updated:{" "}
									{new Date(
										simulation?.updated_at || ""
									).toLocaleString()}
								</div>
							</div>
						</div>
					)}
				</Card>

				{/* Audience segments and filters section */}
				<Card className="border border-green-200/50 shadow-md overflow-hidden transition-all duration-200">
					<CardHeader
						icon={<Users />}
						title="Target Audience"
						cardName="audience"
						color="green"
					/>

					{expandedCards.audience && (
						<div className="p-6 bg-white">
							{contentData.segment_ids && (
								<div className="mb-5">
									<div className="flex items-center mb-3">
										<div className="bg-green-100 p-1.5 rounded-lg mr-2">
											<Layers className="h-4 w-4 text-green-600" />
										</div>
										<h4 className="text-sm font-semibold text-green-800">
											Selected Segments
										</h4>
									</div>
									<div className="bg-green-50/50 p-4 rounded-lg border border-green-100">
										{formatValue(
											"segment_ids",
											contentData.segment_ids
										)}
									</div>
								</div>
							)}

							{contentData.persona_filters && (
								<div>
									<div className="flex items-center mb-3">
										<div className="bg-green-100 p-1.5 rounded-lg mr-2">
											<Filter className="h-4 w-4 text-green-600" />
										</div>
										<h4 className="text-sm font-semibold text-green-800">
											Filters Applied
										</h4>
									</div>
									<div className="bg-white">
										{formatValue(
											"persona_filters",
											contentData.persona_filters
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</Card>

				{/* Additional details section */}
				{Object.keys(detailSectionData).length > 0 && (
					<Card className="border border-gray-200/70 shadow-md overflow-hidden transition-all duration-200">
						<CardHeader
							icon={<HelpCircle />}
							title="Additional Information"
							cardName="additional"
							color="gray"
						/>

						{expandedCards.additional && (
							<div className="p-6 bg-white">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{Object.entries(detailSectionData).map(
										([key, value], index) => (
											<div
												key={index}
												className="bg-gray-50/70 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-colors duration-200">
												<div className="flex items-center mb-2.5 pb-1.5 border-b border-gray-100">
													<div className="bg-gray-100 p-1.5 rounded-lg">
														{getIconForKey(key)}
													</div>
													<p className="text-xs text-blue-700 font-semibold uppercase ml-2.5 tracking-wider">
														{key.replace(/_/g, " ")}
													</p>
												</div>
												<div className="text-sm font-medium text-gray-800">
													{formatValue(key, value)}
												</div>
											</div>
										)
									)}
								</div>
							</div>
						)}
					</Card>
				)}

				{/* Personas section - if available */}
				{simulation?.personas && simulation.personas.length > 0 && (
					<Card className="border border-purple-200/50 shadow-md overflow-hidden transition-all duration-200">
						<CardHeader
							icon={<User />}
							title="Used Profiles"
							cardName="personas"
							color="purple"
						/>

						{expandedCards.personas && (
							<div className="p-6 bg-white">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{simulation.personas.map(
										(persona, index) => {
											const personaInfo =
												extractPersonaInfo(
													persona.data
												);
											return (
												<div
													key={index}
													className="bg-purple-50/40 p-4 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200">
													<div className="flex justify-between items-start mb-3">
														<div className="flex items-center space-x-2">
															<div className="bg-purple-100 p-1.5 rounded-full">
																<User className="h-4 w-4 text-purple-600" />
															</div>
															<p className="font-medium text-gray-800 text-base">
																{
																	personaInfo.name
																}
															</p>
														</div>
														<div className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
															{persona.name
																? persona.name.replace(
																		/_/g,
																		" "
																  )
																: "Profile"}
														</div>
													</div>
													<div className="grid grid-cols-2 gap-3 mt-3 border-t border-purple-100 pt-3">
														<div className="flex items-center space-x-1.5">
															<Calendar className="h-3.5 w-3.5 text-purple-600/70" />
															<p className="text-sm">
																<span className="text-gray-600">
																	Age:
																</span>{" "}
																<span className="text-gray-900 font-medium">
																	{
																		personaInfo.age
																	}
																</span>
															</p>
														</div>
														<div className="flex items-center space-x-1.5">
															<Briefcase className="h-3.5 w-3.5 text-purple-600/70" />
															<p className="text-sm">
																<span className="text-gray-600">
																	Role:
																</span>{" "}
																<span className="text-gray-900 font-medium">
																	{
																		personaInfo.job_title
																	}
																</span>
															</p>
														</div>
														{personaInfo.behavioral_archetype !==
															"N/A" && (
															<div className="col-span-2 flex items-center space-x-1.5 mt-1">
																<Brain className="h-3.5 w-3.5 text-purple-600/70" />
																<p className="text-sm">
																	<span className="text-gray-600">
																		Archetype:
																	</span>{" "}
																	<span className="text-gray-900 font-medium">
																		{
																			personaInfo.behavioral_archetype
																		}
																	</span>
																</p>
															</div>
														)}
													</div>
												</div>
											);
										}
									)}
								</div>
							</div>
						)}
					</Card>
				)}
			</div>
		);
	};

	// Render content that can be used in both embedded and standalone modes
	const renderContent = () => {
		return (
			<>
				{loading ? (
					<div className="flex flex-col items-center justify-center h-64">
						<Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
						<p className="text-gray-600">{currentStep}</p>
					</div>
				) : error ? (
					<div className="flex flex-col items-center justify-center h-64">
						<p className="text-red-500 mb-2">Error: {error}</p>
						<Button onClick={() => window.location.reload()}>
							Try Again
						</Button>
					</div>
				) : simulation ? (
					<div
						className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${
							embedded ? "h-full" : "h-[calc(100vh-240px)]"
						}`}>
						{/* Swapped positions - Chat on the left, Results on the right */}
						<div className="md:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden h-full">
							{renderChatInterface()}
						</div>
						<div className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden h-full">
							{/* <div className="border-b border-gray-200">
                <nav className="flex gap-4 px-6" aria-label="Tabs">
                  {renderTabs()}
                </nav>
              </div> */}
							{renderRightPanel()}
							{/* {activeTab === 'simulation' ? renderSimulationAnalysis() : renderAdvancedAnalysis()} */}
						</div>
					</div>
				) : null}
			</>
		);
	};

	// Render tabs for analysis sections
	const renderTabs = () => {
		return (
			<>
				<button
					onClick={() => setActiveTab("simulation")}
					className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
						activeTab === "simulation"
							? "border-blue-500 text-blue-600"
							: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
					}`}>
					<BarChart2 className="mr-2 h-4 w-4" />
					Simulation Analysis
				</button>

				{/* Only show the Advanced Analysis tab if num_tabs > 1 */}
				{numTabs > 1 && (
					<button
						onClick={() => setActiveTab("advanced")}
						className={`py-4 px-1 inline-flex items-center border-b-2 text-sm font-medium ${
							activeTab === "advanced"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}>
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

	// New component for the simulation details dropdown with simplified structure
	const SimulationDetailsDropdown = () => {
		const contentData = parseContentField();
		if (!contentData || !simulation) return null;

		// Function to render icon based on key
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

		// Define the formatValue function inside the component to fix the reference error
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
										className="px-3 py-1.5 bg-blue-50/80 text-blue-700 border border-blue-200 rounded-full text-xs font-medium flex items-center gap-1.5">
										<Globe className="h-3 w-3" />
										{segment
											? segment.name
											: `Segment ${segmentId}`}
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
				const personaFilters = value as Record<
					string,
					Record<string, unknown>
				>;

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
									const hasFilters = Object.entries(
										filters
									).some(
										([, values]) =>
											Array.isArray(values) &&
											values.length > 0
									);

									// If no filters with values, don't render this segment's filter card
									if (!hasFilters) return null;

									return (
										<div
											key={idx}
											className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
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
															Array.isArray(
																filterValues
															) &&
															filterValues.length >
																0
													)
													.map(
														(
															[
																filterKey,
																filterValues,
															],
															fidx
														) => (
															<div
																key={fidx}
																className="bg-green-50/50 rounded-lg p-3">
																<div className="flex items-center mb-2">
																	<Filter className="h-3.5 w-3.5 mr-1.5 text-green-700" />
																	<span className="text-xs font-semibold text-green-800 uppercase">
																		{
																			filterKey
																		}
																	</span>
																</div>
																<div className="flex flex-wrap gap-2">
																	{(
																		filterValues as string[]
																	).map(
																		(
																			val,
																			vidx
																		) => (
																			<span
																				key={
																					vidx
																				}
																				className="px-2.5 py-1 bg-white text-gray-700 border border-green-200 rounded-full text-xs font-medium shadow-sm">
																				{
																					val
																				}
																			</span>
																		)
																	)}
																</div>
															</div>
														)
													)}
											</div>
										</div>
									);
								}
							)
						)}
					</div>
				);
			}

			// Handle special values
			if (key === "audience_id") return null;

			// For other simple values
			return (
				<span className="text-sm text-gray-800 font-medium">
					{typeof value === "string" ? value : JSON.stringify(value)}
				</span>
			);
		};

		// Important fields to show in summary section (top)
		const importantFields = [
			"name",
			"audience_name",
			"goal",
			"content_type",
		];
		const importantData = Object.fromEntries(
			Object.entries(contentData).filter(([key]) =>
				importantFields.includes(key)
			)
		);

		return (
			<div className="absolute z-10 left-0 right-0 mt-2 mx-6 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
				<div className="max-h-[75vh] overflow-y-auto">
					{/* Summary section - Header */}
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
							<div className="flex items-center">
								<span className="text-xs text-gray-600 mr-3">
									{new Date(
										simulation.created_at
									).toLocaleString()}
								</span>
								<button
									onClick={() =>
										setIsDetailsDropdownOpen(false)
									}
									className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"
									aria-label="Close summary">
									<ChevronUp className="h-5 w-5" />
								</button>
							</div>
						</div>
					</div>

					{/* Main content area */}
					<div className="p-5">
						{/* Key information grid */}
						<div className="grid grid-cols-2 gap-4 mb-6">
							{Object.entries(importantData).map(
								([key, value]) => (
									<div
										key={key}
										className="flex items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
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
								)
							)}
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
									{formatValue(
										"segment_ids",
										contentData.segment_ids
									)}
								</div>
							</div>
						)}

						{/* Filters section */}
						{contentData.persona_filters &&
							Object.keys(contentData.persona_filters).length >
								0 && (
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
										{formatValue(
											"persona_filters",
											contentData.persona_filters
										)}
									</div>
								</div>
							)}

						{contentData.images &&
							contentData.images.length > 0 && (
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
										{contentData.images.map(
											(imageData, index) => (
												<img
													key={index}
													src={imageData}
													alt={`Image ${index + 1}`}
													className="w-full h-auto rounded-lg mb-2"
												/>
											)
										)}
									</div>
								</div>
							)}

						{/* Used Personas - COLLAPSIBLE */}
						{simulation.personas &&
							simulation.personas.length > 0 && (
								<div className="mb-6 border border-purple-100 rounded-lg overflow-hidden">
									<div
										className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-50/70 cursor-pointer"
										onClick={() =>
											setExpandedCards((prev) => ({
												...prev,
												personas: !prev.personas,
											}))
										}>
										<div className="flex items-center">
											<div className="mr-2 bg-purple-100 p-1.5 rounded-md">
												<Users className="h-4 w-4 text-purple-600" />
											</div>
											<h3 className="text-base font-medium text-purple-800">
												Used Profiles (
												{simulation.personas.length})
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
												{simulation.personas.map(
													(persona, index) => {
														const personaInfo =
															extractPersonaInfo(
																persona.data
															);
														return (
															<div
																key={index}
																className="bg-purple-50/40 p-3 rounded-lg border border-purple-100">
																<div className="flex justify-between items-start mb-2">
																	<div className="flex items-center space-x-2">
																		<div className="bg-purple-100 p-1 rounded-full">
																			<User className="h-3.5 w-3.5 text-purple-600" />
																		</div>
																		<p className="font-medium text-gray-800">
																			{
																				personaInfo.name
																			}
																		</p>
																	</div>
																	<div className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
																		{persona.name
																			? persona.name.replace(
																					/_/g,
																					" "
																			  )
																			: "Profile"}
																	</div>
																</div>
																<div className="grid grid-cols-2 gap-2 mt-2 border-t border-purple-100/60 pt-2 text-xs">
																	<div className="flex items-center space-x-1.5">
																		<Calendar className="h-3 w-3 text-purple-600/70" />
																		<p>
																			<span className="text-gray-600">
																				Age:
																			</span>{" "}
																			<span className="text-gray-900 font-medium">
																				{
																					personaInfo.age
																				}
																			</span>
																		</p>
																	</div>
																	<div className="flex items-center space-x-1.5">
																		<Briefcase className="h-3 w-3 text-purple-600/70" />
																		<p>
																			<span className="text-gray-600">
																				Role:
																			</span>{" "}
																			<span className="text-gray-900 font-medium">
																				{
																					personaInfo.job_title
																				}
																			</span>
																		</p>
																	</div>
																	{personaInfo.behavioral_archetype !==
																		"N/A" && (
																		<div className="col-span-2 flex items-center space-x-1.5">
																			<Brain className="h-3 w-3 text-purple-600/70" />
																			<p>
																				<span className="text-gray-600">
																					Archetype:
																				</span>{" "}
																				<span className="text-gray-900 font-medium">
																					{
																						personaInfo.behavioral_archetype
																					}
																				</span>
																			</p>
																		</div>
																	)}
																</div>
															</div>
														);
													}
												)}
											</div>
										</div>
									)}
								</div>
							)}

						{/* Additional details */}
						{Object.entries(contentData).filter(
							([key]) =>
								!importantFields.includes(key) &&
								key !== "segment_ids" &&
								key !== "persona_filters" &&
								key !== "images" &&
								key !== "audience_id"
								// key !== "task"
						).length > 0 && (
							<div className="mb-3">
								<div className="flex items-center mb-2">
									<div className="mr-2 bg-gray-100 p-1.5 rounded-md">
										<HelpCircle className="h-4 w-4 text-gray-600" />
									</div>
									<h3 className="text-base font-medium text-gray-700">
										Additional Information
									</h3>
								</div>
								<div className="bg-gray-50/70 p-3 rounded-lg border border-gray-200">
									<div className="space-y-3">
										{Object.entries(contentData)
											.filter(
												([key]) =>
													!importantFields.includes(
														key
													) &&
													key !== "segment_ids" &&
													key !== "persona_filters" &&
													key !== "images" &&
													// key !== "task" &&
													key !== "audience_id"
											)
											.map(([key, value], idx) => (
												<div
													key={idx}
													className="flex flex-col bg-white p-3 rounded border border-gray-100">
													<div className="flex items-center mb-1.5">
														<div className="mr-2 bg-gray-100 p-1 rounded">
															{getIconForKey(key)}
														</div>
														<p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
															{key.replace(
																/_/g,
																" "
															)}
														</p>
													</div>
													<div className="text-sm ml-7">
														{formatValue(
															key,
															value
														)}
													</div>
												</div>
											))}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
						<button
							onClick={() => setIsDetailsDropdownOpen(false)}
							className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-600 hover:bg-gray-50">
							Close
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Update the right panel to include the dropdown button and content
	const renderRightPanel = () => {
		return (
			<div className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden h-full relative">
				{/* Simulation details button */}
				<div className="border-b border-gray-200 bg-white">
					<div className="px-6 py-2 flex justify-between items-center">
						<nav className="flex gap-4" aria-label="Tabs">
							{renderTabs()}
						</nav>
						<button
							onClick={() =>
								setIsDetailsDropdownOpen(!isDetailsDropdownOpen)
							}
							className="flex items-center space-x-2 px-4 py-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors">
							<FileText className="h-4 w-4" />
							<span>Simulation Inputs</span>
							{isDetailsDropdownOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</button>
					</div>
				</div>

				{/* Dropdown for simulation details */}
				{isDetailsDropdownOpen && <SimulationDetailsDropdown />}

				{activeTab === "simulation" ? (
					<div className="h-full overflow-auto p-6 max-h-[calc(90vh-120px)]">
						{/* No need to show content summary cards now that we have the dropdown */}
						<div className="mb-6 mt-2">
							<Card className="border border-indigo-200/50 shadow-md overflow-hidden transition-all duration-200">
								<div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-indigo-50/70 border-b border-indigo-100">
									<div className="flex items-center space-x-2.5">
										<div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-600">
											<BarChart2 className="h-5 w-5" />
										</div>
										<h3 className="text-base font-medium text-indigo-800">
											Simulation Analysis
										</h3>
									</div>
								</div>
								<div className="p-6 bg-white">
									<div className="prose prose-blue max-w-none mb-3 markdown-body rounded-lg">
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
											rehypePlugins={[rehypeRaw]}>
											{simulation?.simulation_response ||
												"No analysis available yet."}
										</ReactMarkdown>
										<div className="h-5"></div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				) : (
					renderAdvancedAnalysis()
				)}
			</div>
		);
	};

	// Return different layouts based on embedded status
	return embedded ? (
		<div className="h-full">{renderContent()}</div>
	) : (
		<Layout>
			<div className="flex justify-between mb-6 items-center">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate("/")}
					icon={<ArrowLeft className="w-4 h-4 mr-1" />}>
					Back to Home
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
					icon={<History className="w-4 h-4 mr-1" />}>
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
				renderLoadingAnimation()
			) : (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
					{/* Swapped positions - Chat on the left, Results on the right */}
					<div className="md:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden h-full">
						{renderChatInterface()}
					</div>
					{renderRightPanel()}
				</div>
			)}
		</Layout>
	);
};

export default SimulationResults;
