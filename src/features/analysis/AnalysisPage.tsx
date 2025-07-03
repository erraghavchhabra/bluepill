import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  Search,
  List,
  BarChart2,
  Loader2,
  CalendarDays,
  AlarmClock,
} from "lucide-react";
import Layout from "../../components/Layout";
import SimulationResultsContent from "../simulationResults/SimulationResultsContent";
import { format } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL || "";

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

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { simulationId: urlSimId } = useParams<{ simulationId: string }>();

  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(
    null
  );

  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    fetchAudiences();
  }, []);

  useEffect(() => {
    if (!urlSimId) {
      setLoading(false);
    }
  }, [urlSimId]);

  useEffect(() => {
    fetchSimulations(selectedAudienceId);
  }, [selectedAudienceId]);

  const fetchAudiences = async () => {
    try {
      const response = await fetch(`${API_URL}/audience`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch audiences");
      }
      const data = await response.json();
      setAudiences(data.map((a: any) => ({ id: a.id, name: a.name })));
    } catch (err) {
      console.error("Error fetching audiences:", err);
    }
  };

  const fetchSimulations = async (audienceId?: number | null) => {
    try {
      let url = `${API_URL}/simulations`;
      if (audienceId) {
        url += `?audience_id=${audienceId}`;
      }
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch simulations");
      }
      const data = await response.json();
      setSimulations(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching simulations:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const filteredSimulations = simulations.filter(
    (simulation) =>
      simulation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      simulation.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSimulationsList = () => (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 ">
        <h3
          className={`text-xl font-semibold ${
            !isSidebarVisible ? "hidden" : ""
          }`}
        >
          History Overview
        </h3>
        <button
          onClick={() => setIsSidebarVisible((prev) => !prev)}
          className="p-1 rounded  transition-transform duration-300"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform duration-300 ${
              !isSidebarVisible ? "rotate-180" : ""
            }`}
          >
            <path
              d="M21.875 22.75L13.125 14L21.875 5.25"
              stroke="black"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.125 22.75L4.375 14L13.125 5.25"
              stroke="black"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isSidebarVisible && (
        <>
          <div className="p-4">
            <div className="relative mb-4">
              <button
                type="button"
                onClick={() =>
                  setIsAudienceDropdownOpen(!isAudienceDropdownOpen)
                }
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              >
                <span>
                  {selectedAudienceId
                    ? audiences.find((a) => a.id === selectedAudienceId)?.name
                    : "All Audiences"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {isAudienceDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-56 overflow-auto py-1 border border-gray-200">
                  <button
                    type="button"
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
                      type="button"
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

          <div className="flex-1 overflow-y-auto p-4">
            {filteredSimulations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <List className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>No simulations found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSimulations.map((simulation) => (
                  <button
                    type="button"
                    key={simulation.id}
                    onClick={() => navigate(`/analysis/${simulation.id}`)}
                    className={`w-full text-left rounded-lg sim-btn transition-colors  ${
                      urlSimId === simulation.id.toString()
                        ? ""
                        : "border-gray-200"
                    }`}
                  >
                    <div className="bg-gray-200  sim-btn-top rounded">
                      <span>{simulation.audience_name}</span>
                    </div>
                    <div className="bg-white border sim-btn-bottom border-gray-200">
                      <div className="font-medium text-black-600">
                        {simulation.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {simulation.description?.substring(0, 60) ||
                          "No description"}
                        {(simulation.description?.length || 0) > 60
                          ? "..."
                          : ""}
                      </div>
                      <div className="flex justify-between items-center border-t mt-2 text-xs text-gray-500">
                        <div className="flex items-center justify-between pt-4 pb-1 bg-white w-full max-w-md">
                          {/* Date */}
                          <div className="flex items-center gap-2">
                            <CalendarDays className="text-cyan-400 w-5 h-5" />
                            <span className="text-black font-medium">
                              {format(
                                new Date(simulation?.created_at),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2">
                            <AlarmClock className="text-cyan-400 w-5 h-5" />
                            <span className="text-black font-medium">
                              {format(
                                new Date(simulation?.created_at),
                                "hh:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                        {/* <span>{formatDate(simulation.created_at)}</span> */}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderNoSimulationSelectedState = () => (
    <div className="flex flex-col items-center m-main-content justify-center h-full text-gray-500">
      <BarChart2 className="h-16 w-16 mb-4 opacity-30" />
      <p className="text-xl font-medium mb-2">Select a simulation</p>
      <p>Choose a simulation from the list to view its analysis</p>
    </div>
  );

  const renderLoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin mb-6">
        <Loader2 className="h-12 w-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Loading...</h3>
    </div>
  );

  const handleSimulationError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <Layout>
      {error && !urlSimId && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="flex h-[calc(100vh-4rem)] bg-white">
        {" "}
        {/* adjust height if needed */}
        <div
          className={` p-3
            transition-all duration-300 ease-in-out
            bg-white  overflow-hidden
            ${isSidebarVisible ? "min-w-96 w-full max-w-96" : "w-[70px]"}
          `}
        >
          {loading && !urlSimId
            ? renderLoadingAnimation()
            : renderSimulationsList()}
        </div>
        <div className="bg-[#FAFAFA] rounded-tl-[30px] overflow-hidden p-[30px] w-full">
          {urlSimId ? (
            <SimulationResultsContent
              simulationId={urlSimId}
              onError={handleSimulationError}
              setIsSidebarVisible={setIsSidebarVisible}
              isSidebarVisible={isSidebarVisible ? "chat" : "simulation"}
            />
          ) : (
            renderNoSimulationSelectedState()
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AnalysisPage;
