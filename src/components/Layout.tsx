import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className={`flex-1  ${className}`}>
        <div className="container mx-auto max-w-8xl">
          {children}
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Bluepill Simulation Experience
        </div>
      </footer>
    </div>
  );
};

export default Layout;