import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Chọn --',
  disabled = false,
  loading = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Use setTimeout to ensure the input is mounted and visible
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  // Simple, instantaneous client-side filtering
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full text-xs" ref={containerRef}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {/* Select Box / Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full pl-3 pr-8 py-2 border rounded-md text-left outline-none flex items-center justify-between transition-all duration-200 ${
          disabled || loading
            ? 'bg-gray-100 border-[#e2e8f0] text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#bc0100] shadow-sm text-gray-900'
            : 'bg-white border-[#e2e8f0] hover:border-gray-300 text-gray-700'
        }`}
      >
        <span className="truncate">
          {loading
            ? 'Đang tải...'
            : selectedOption
            ? selectedOption.label
            : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-1 ${
            isOpen ? 'transform rotate-180 text-[#bc0100]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-md shadow-lg max-h-60 flex flex-col overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/50 sticky top-0">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Nhập từ khóa tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-[11px] outline-none border-none p-0 focus:ring-0 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 max-h-48 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full text-left px-3 py-1.5 transition-colors duration-150 truncate ${
                    opt.value === value
                      ? 'bg-red-50 text-[#bc0100] font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-400 italic">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
