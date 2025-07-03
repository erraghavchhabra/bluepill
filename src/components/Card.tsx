import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
  fullWidth?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  selected = false,
  hoverable = true,
  fullWidth = false,
}) => {
  const baseStyles = 'bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200';
  const hoverStyles = hoverable ? 'hover:shadow-md hover:translate-y-[-2px]' : '';
  const selectedStyles = selected ? 'ring-2 ring-blue-500' : '';
  const cursorStyles = onClick ? 'cursor-pointer' : '';
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const styles = `${baseStyles} ${hoverStyles} ${selectedStyles} ${cursorStyles} ${widthStyles} ${className}`;
  
  return (
    <div className={styles} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;