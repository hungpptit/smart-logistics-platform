import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

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
  align?: 'left' | 'right' | 'full';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Chọn --',
  disabled = false,
  loading = false,
  required = false,
  align = 'full'
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

  const showSearch = options.length > 5;

  const popoverAlignClass = 
    align === 'right'
      ? 'right-0 min-w-full w-max max-w-[320px]'
      : align === 'left'
      ? 'left-0 min-w-full w-max max-w-[320px]'
      : 'left-0 right-0 w-full';

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
        title={selectedOption ? selectedOption.label : placeholder}
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full pl-3 pr-8 py-2 border rounded-lg text-left outline-none flex items-center justify-between transition-all duration-200 shadow-sm ${
          disabled || loading
            ? 'bg-gray-100 border-[#e2e8f0] text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#bc0100] ring-2 ring-[#bc0100]/10 text-gray-900'
            : 'bg-white border-[#e2e8f0] hover:border-gray-300 text-gray-700'
        }`}
      >
        <span className="truncate font-medium" title={selectedOption ? selectedOption.label : placeholder}>
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

      {/* Dropdown Menu Popover */}
      {isOpen && !disabled && !loading && (
        <div className={`absolute z-[999] mt-1.5 bg-white border border-[#e2e8f0] rounded-xl shadow-2xl max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${popoverAlignClass}`}>
          {/* Search Box (only if >5 options) */}
          {showSearch && (
            <div className="p-2 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/80 sticky top-0 backdrop-blur-sm">
              <Search size={13} className="text-gray-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs outline-none border-none p-1 focus:ring-0 placeholder-gray-400 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1 max-h-56 p-1.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-150 flex items-center justify-between font-medium ${
                      isSelected
                        ? 'bg-red-50 text-[#bc0100] font-bold shadow-xs'
                        : 'hover:bg-gray-100/80 text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <span className="truncate pr-2" title={opt.label}>{opt.label}</span>
                    {isSelected && <Check size={14} className="text-[#bc0100] shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-gray-400 italic text-xs">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
