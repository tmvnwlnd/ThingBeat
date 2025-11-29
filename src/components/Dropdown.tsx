'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  className?: string;
  disabled?: boolean;
};

export function Dropdown({ value, onChange, options, className = '', disabled = false }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update menu position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4, // 4px gap
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      <div className={className}>
        {/* Dropdown Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="group w-full h-12 bg-thingbeat-blue text-thingbeat-white border-2 border-thingbeat-white px-4 text-lg text-left flex items-center justify-between disabled:opacity-50 hover:bg-thingbeat-white hover:text-thingbeat-blue"
          disabled={disabled}
        >
          <span className="truncate">{selectedOption?.label || 'Select'}</span>
          {/* Down Arrow */}
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="ml-2 flex-shrink-0">
            <path d="M0 0H2V2H4V4H6V6H8V8H10V6H12V4H14V2H16V0H14V2H12V4H10V6H8V4H6V2H4V0H2V2H0V0Z" className="fill-thingbeat-white group-hover:fill-thingbeat-blue"/>
          </svg>
        </button>
      </div>

      {/* Popup Menu - Rendered via Portal */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] flex flex-col"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && handleSelect(option.value)}
              className={`h-12 bg-thingbeat-blue text-thingbeat-white border-2 border-thingbeat-white px-4 text-lg text-left hover:bg-thingbeat-white hover:text-thingbeat-blue ${
                option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${option.value === value ? 'bg-opacity-80' : ''}`}
              disabled={option.disabled}
            >
              <span className="truncate block">{option.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
