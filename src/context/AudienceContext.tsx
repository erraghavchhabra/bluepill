// filepath: c:\Users\Puneet Bajaj\Desktop\Ankit\ankitnewform\src\context\AudienceContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AudienceType } from '../features/buildAudience/AudienceTypeSelect';

// Interface to track persona filters within each segment
export interface SegmentPersonaFilters {
  industryL1: string[];
  industryL2: string[];
  functions: string[];
  roles: string[];
}

export interface AudienceData {
  type: AudienceType | null;
  websiteUrl: string;
  segmentType: 'all' | 'specific' | null;
  specificSegment: string;
  qualitativeInfo: string;
  uploadedFile: File | null;
  audienceId: number | null;
  audienceName: string;
  selectedUseCase: string | null;
  selectedSegments: number[];
  personaFilters: Record<number, SegmentPersonaFilters>;
}

interface AudienceContextType {
  audienceData: AudienceData;
  setAudienceData: React.Dispatch<React.SetStateAction<AudienceData>>;
  updateAudienceData: (data: Partial<AudienceData>) => void;
  resetAudienceData: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialAudienceData: AudienceData = {
  type: null,
  websiteUrl: '',
  segmentType: null,
  specificSegment: '',
  qualitativeInfo: '',
  uploadedFile: null,
  audienceId: null,
  audienceName: '',
  selectedUseCase: null,
  selectedSegments: [],
  personaFilters: {},
};

const AudienceContext = createContext<AudienceContextType | undefined>(undefined);

export const AudienceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [audienceData, setAudienceData] = useState<AudienceData>(initialAudienceData);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const updateAudienceData = (data: Partial<AudienceData>) => {
    setAudienceData(prev => ({ ...prev, ...data }));
  };

  const resetAudienceData = () => {
    setAudienceData(initialAudienceData);
  };

  return (
    <AudienceContext.Provider 
      value={{ 
        audienceData, 
        setAudienceData, 
        updateAudienceData,
        resetAudienceData,
        currentStep,
        setCurrentStep,
        isGenerating,
        setIsGenerating
      }}
    >
      {children}
    </AudienceContext.Provider>
  );
};

export const useAudience = () => {
  const context = useContext(AudienceContext);
  if (context === undefined) {
    throw new Error('useAudience must be used within an AudienceProvider');
  }
  return context;
};
