import { Printer } from 'lucide-react';
import React from 'react';

const PrintButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className={`no-print flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
    >
      <Printer className="w-4 h-4" />
      <span>Print</span>
    </button>
  );
};

export default PrintButton;
