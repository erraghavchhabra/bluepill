import React from 'react';
import Card from './Card';

interface SimulationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}

const SimulationCard: React.FC<SimulationCardProps> = ({
  icon,
  title,
  description,
  onClick,
  selected = false,
  disabled = false,
  comingSoon = false,
}) => {
  return (
    <Card 
      className={`p-5 transition-all duration-200 relative ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
      selected={selected}
    >
      <div className="flex items-start">
        <div className={`mr-4 p-2 rounded-lg ${disabled ? 'text-gray-400 bg-gray-100' : 'text-blue-600 bg-blue-50'}`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center">
            <h3 className={`text-lg font-medium mb-1 ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>{title}</h3>
            {comingSoon && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                Coming Soon
              </span>
            )}
          </div>
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default SimulationCard;