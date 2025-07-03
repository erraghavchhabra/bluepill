import React from 'react';

interface StepContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

const StepContainer: React.FC<StepContainerProps> = ({
  children,
  title,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        {subtitle && <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};

export default StepContainer;