import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface DropdownProps {
  trigger: ReactNode | ((props: { isOpen: boolean; onClick: () => void }) => ReactNode);
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative inline-block', className)}>
      <div ref={triggerRef}>
        {typeof trigger === 'function' ? trigger({ isOpen, onClick: () => setIsOpen(!isOpen) }) : (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            {trigger}
          </Button>
        )}
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'dropdown animate-in fade-in-0 zoom-in-95 duration-fast',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, className, disabled, icon, shortcut }: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => { onClick?.(); }}
      className={cn(
        'dropdown-item w-full text-left',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="h-4 w-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-body-xs text-content-tertiary font-mono">{shortcut}</span>}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="dropdown-divider" role="separator" />;
}

export function DropdownTrigger({ children, className, ...props }: { children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant="ghost" size="icon" className={className} {...props}>
      {children}
    </Button>
  );
}

interface SelectDropdownProps {
  value: string;
  options: { value: string; label: string; icon?: ReactNode; disabled?: boolean }[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectDropdown({ value, options, onChange, placeholder, className, disabled }: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'input w-full text-left justify-between',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn('truncate', !selectedOption && !value && 'text-content-tertiary')}>
          {selectedOption?.label || value || placeholder}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-content-tertiary" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-content-tertiary" />}
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="dropdown w-full max-h-60 overflow-y-auto z-dropdown"
          role="listbox"
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              disabled={disabled || option.disabled}
              onClick={() => { if (!disabled && !option.disabled) { onChange(option.value); setIsOpen(false); } }}
              className={cn(
                'dropdown-item w-full text-left',
                value === option.value && 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.icon && <span className="h-4 w-4 flex-shrink-0">{option.icon}</span>}
              <span className="flex-1">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
