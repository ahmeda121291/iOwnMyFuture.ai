import React from 'react';

interface AccessibilityHelperProps {
  children: React.ReactNode;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function AccessibilityHelper({
  children,
  role,
  ariaLabel,
  ariaDescribedBy,
  tabIndex,
  onKeyDown,
  ...props
}: AccessibilityHelperProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      {...props}
    >
      {children}
    </div>
  );
}

// Hook for keyboard navigation
export const useKeyboardNavigation = (onEnter?: () => void, onEscape?: () => void) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }
  };

  return { handleKeyDown };
};

// Hook for focus management
export const useFocusManagement = () => {
  const focusRef = React.useRef<HTMLElement>(null);

  const focusElement = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  const blurElement = () => {
    if (focusRef.current) {
      focusRef.current.blur();
    }
  };

  return { focusRef, focusElement, blurElement };
};