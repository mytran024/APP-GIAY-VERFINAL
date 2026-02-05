
import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter options based on input
    if (value) {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  useEffect(() => {
    // Click outside handler to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className={className || "w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
      />
      
      {showSuggestions && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <li
              key={index}
              onClick={() => handleSelect(option)}
              className="px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
