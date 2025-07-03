import React from 'react';
import Card from './Card';
import Button from './Button';

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  selected?: boolean;
}

const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  buttonText,
  onClick,
  selected = false,
}) => {
  return (
    <Card 
      className="p-6 flex flex-col h-full"
      selected={selected}
      hoverable={true}
    >
      <div className="text-blue-600 mb-4 text-3xl">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 flex-grow">{description}</p>
      <div className="mt-auto">
        <Button 
          variant="primary" 
          onClick={onClick} 
          withArrow={true}
          fullWidth={true}
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
};

export default OptionCard;