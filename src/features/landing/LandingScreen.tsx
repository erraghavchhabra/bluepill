import React from 'react';
import { Building, Package, Users } from 'lucide-react';
import OptionCard from '../../components/OptionCard';
import StepContainer from '../../components/StepContainer';

interface LandingScreenProps {
  onBuildAudience: () => void;
  onSelectExisting: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ 
  onBuildAudience, 
  onSelectExisting 
}) => {
  return (
    <StepContainer
      title="What would you like to do today?"
      className="animate-fadeIn"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <OptionCard
          icon={<Building className="w-10 h-10" />}
          title="Build a New Audience"
          description="Create a new set of customer profiles tailored to your specific needs. Build detailed profiles for simulation."
          buttonText="Build Audience"
          onClick={onBuildAudience}
        />
        
        <OptionCard
          icon={<Users className="w-10 h-10" />}
          title="Simulation Playground"
          description="Use an existing audience to simulate customer behavior, test ideas, and gain valuable insights."
          buttonText="Select Existing Audience"
          onClick={onSelectExisting}
        />
      </div>
    </StepContainer>
  );
};

export default LandingScreen;