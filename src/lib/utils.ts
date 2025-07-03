// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format filter request for persona filtering
export function formatPersonaFilterRequest(
  selectedSegments: number[],
  personaFilters: Record<number, {
    industryL1: string[],
    industryL2: string[],
    functions: string[],
    roles: string[]
  }>
) {
  // Create a properly formatted request object for the filter_personas endpoint
  const filterRequest = {
    segments: selectedSegments,
    filters: Object.entries(personaFilters).reduce((acc, [segmentId, filters]) => {
      // Only include filters for selected segments
      if (selectedSegments.includes(Number(segmentId))) {
        acc[segmentId] = filters;
      }
      return acc;
    }, {} as Record<string, any>)
  };

  return filterRequest;
}
