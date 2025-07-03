import React from 'react';
import { Check } from 'lucide-react';

interface StepProps {
  label: string;
  completed: boolean;
  current: boolean;
  onClick?: () => void;
  disabled?: boolean;
  description?: string;
}

interface ProgressStepsProps {
  steps: StepProps[];
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps }) => {
  // Find the index of the current step
  const currentStepIndex = steps.findIndex(step => step.current);
  
  // Calculate progress width based on current step position
  // For a 5-step process with specific positions at 5%, 25%, 50%, 75%, 95%
  const stepPositions = [5, 25, 50, 75, 95]; // vw percentages
  const progressWidth = steps.length <= 1 
    ? 0 
    : `${currentStepIndex > 0 ? stepPositions[currentStepIndex] : 0}%`;

  return (
    <div className="w-[90vw] mx-auto p-4 mb-6">
      <div className="relative">
        {/* Background track - thinner and lighter */}
        <div className="absolute top-1/2 left-0 h-0.5 transform -translate-y-1/2 bg-gray-200 w-full z-0" />
        
        {/* Completed track - fill up to current step */}
        <div 
          className={`absolute top-1/2 left-0 h-0.5 transform -translate-y-1/2 bg-blue-500 z-0 transition-all duration-300 ease-in-out`}
          style={{ width: progressWidth }}
        />
        
        {/* Steps - positioned explicitly */}
        <div className="relative z-1 w-full h-16">
          {steps.map((step, idx) => {
            // Check if step is clickable
            const isClickable = !!step.onClick && !step.disabled;
            // Position steps at specific points
            const leftPosition = `${stepPositions[idx] || 0}%`;
            
            return (
              <div 
                key={idx} 
                className={`
                  absolute flex flex-col items-center transform -translate-x-1/2
                  ${isClickable ? 'cursor-pointer group' : step.disabled ? 'cursor-not-allowed' : 'cursor-default'}
                `}
                style={{ left: leftPosition }}
                onClick={isClickable ? step.onClick : undefined}
                title={!isClickable && step.disabled ? 'Complete previous steps first' : ''}
              >
                {/* Circle - simplified, more consistent sizing */}
                <div 
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
                    ${step.completed 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : step.current 
                        ? 'bg-white ring-2 ring-blue-500 text-blue-600' 
                        : idx <= currentStepIndex
                          ? 'bg-white ring-2 ring-blue-300 text-gray-600'
                          : 'bg-white ring-1 ring-gray-300 text-gray-400'
                    }
                    ${isClickable && !step.completed && !step.current ? 'group-hover:ring-blue-400 group-hover:text-blue-500' : ''}
                  `}
                >
                  {step.completed ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>
                
                {/* Label - simplified style */}
                <div className="mt-2 text-center">
                  <span 
                    className={`
                      text-xs font-medium
                      ${step.completed 
                        ? 'text-blue-600' 
                        : step.current 
                          ? 'text-gray-800' 
                          : idx <= currentStepIndex
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      }
                      ${isClickable && !step.current && !step.completed ? 'group-hover:text-blue-600' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                  
                  {/* Description - only show for current step */}
                  {step.description && step.current && (
                    <p className="hidden sm:block text-xs text-gray-500 mt-1 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;