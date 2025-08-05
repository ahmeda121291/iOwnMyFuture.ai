import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Trash2, Download, Share, Sparkles } from 'lucide-react';
import { type MoodboardElement } from '../../core/types';
import { MoodboardElementSchema, validateData } from '../../shared/validation/schemas';
import { useCSRFToken, createSecureFormData } from '../../shared/security/csrf';

// Typed Props interface
interface MoodboardCanvasProps {
  elements: MoodboardElement[];
  onElementsChange: (elements: MoodboardElement[]) => void;
  onSave: () => void;
  isEditable?: boolean;
}

// Types for internal state
interface DragOffset {
  x: number;
  y: number;
}

// Constants
const GRID_SIZE = 20;
const MIN_CANVAS_HEIGHT = 600;

export default function MoodboardCanvas({ 
  elements, 
  onElementsChange, 
  onSave, 
  isEditable = true 
}: MoodboardCanvasProps) {
  // Custom hooks and state at top
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [_isSaving, _setIsSaving] = useState(false);
  const { getToken: _getToken } = useCSRFToken();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Computed values
  const elementCount = useMemo(() => elements.length, [elements]);
  const hasElements = useMemo(() => elementCount > 0, [elementCount]);

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (!isEditable) {return;}
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedElement(elementId);
    setIsDragging(true);
    
    const element = elements.find(el => el.id === elementId);
    if (element) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [elements, isEditable]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) {return;}

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    const updatedElements = elements.map(element => 
      element.id === selectedElement
        ? {
            ...element,
            position: {
              x: Math.max(0, Math.min(newX, canvasRect.width - element.size.width)),
              y: Math.max(0, Math.min(newY, canvasRect.height - element.size.height))
            }
          }
        : element
    );

    onElementsChange(updatedElements);
  }, [isDragging, selectedElement, dragOffset, elements, onElementsChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const deleteElement = useCallback((elementId: string) => {
    const updatedElements = elements.filter(el => el.id !== elementId);
    onElementsChange(updatedElements);
    setSelectedElement(null);
  }, [elements, onElementsChange]);

  // Validation effect
  useEffect(() => {
    const errors: Record<string, string[]> = {};
    
    elements.forEach(element => {
      const validation = validateData(MoodboardElementSchema, element);
      if (!validation.success) {
        errors[element.id] = validation.error.split(', ');
      }
    });
    
    setValidationErrors(errors);
  }, [elements]);

  const updateElementContent = useCallback((elementId: string, newContent: string) => {
    // Validate the new content
    const element = elements.find(el => el.id === elementId);
    if (!element) {return;}

    const updatedElement = { ...element, content: newContent };
    const validation = validateData(MoodboardElementSchema, updatedElement);
    
    if (!validation.success) {
      setValidationErrors(prev => ({
        ...prev,
        [elementId]: validation.error.split(', ')
      }));
      return;
    }

    // Clear validation errors for this element
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      const { [elementId]: _removed, ...rest } = newErrors;
      return rest;
    });

    const updatedElements = elements.map(element =>
      element.id === elementId ? updatedElement : element
    );
    onElementsChange(updatedElements);
  }, [elements, onElementsChange]);

  const _handleSecureSave = useCallback(async () => {
    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      alert('Please fix validation errors before saving.');
      return;
    }

    _setIsSaving(true);
    try {
      // Create secure form data with CSRF token
      const _secureFormData = await createSecureFormData({
        elements: elements,
        timestamp: new Date().toISOString(),
      });

      // Call the parent's onSave function
      await onSave();
    } catch (error) {
      console.error('Error saving moodboard:', error);
      alert('Failed to save moodboard. Please try again.');
    } finally {
      _setIsSaving(false);
    }
  }, [validationErrors, elements, onSave]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElement(null);
    }
  }, []);

  const handleShare = useCallback(() => {
    const shareData = {
      title: 'My Vision Board',
      text: 'Check out my vision board - visualizing my future goals and dreams!',
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert('Vision board details copied to clipboard!');
    }
  }, []);

  // Element render function
  const renderElement = useCallback((element: MoodboardElement) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`absolute cursor-move transition-all duration-200 ${
          isSelected ? 'ring-2 ring-accent shadow-lg' : 'hover:shadow-md'
        } ${isEditable ? 'cursor-move' : 'cursor-default'}`}
        style={{
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        }}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
      >
        <ElementContent 
          element={element}
          isSelected={isSelected}
          isEditable={isEditable}
          onContentChange={updateElementContent}
        />

        {/* Element Controls */}
        {isEditable && isSelected && (
          <ElementControls onDelete={() => deleteElement(element.id)} />
        )}
      </div>
    );
  }, [selectedElement, isEditable, handleMouseDown, updateElementContent, deleteElement]);

  // Early returns for loading/error states would go here if needed

  // Main JSX render
  return (
    <div className="relative">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-96 glass-lavender rounded-lg overflow-hidden cursor-crosshair"
        style={{ minHeight: `${MIN_CANVAS_HEIGHT}px` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Background Pattern */}
        <CanvasBackground />

        {/* Grid */}
        <CanvasGrid gridSize={GRID_SIZE} />

        {/* Elements */}
        {elements.map(renderElement)}

        {/* Empty State */}
        {!hasElements && <EmptyState />}
      </div>

      {/* Canvas Controls */}
      {isEditable && (
        <CanvasControls 
          elementCount={elementCount}
          onSave={onSave}
          onShare={handleShare}
        />
      )}
    </div>
  );
}

// Sub-components
interface ElementContentProps {
  element: MoodboardElement;
  isSelected: boolean;
  isEditable: boolean;
  onContentChange: (elementId: string, content: string) => void;
}

function ElementContent({ element, isSelected, isEditable, onContentChange }: ElementContentProps) {
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(element.id, e.target.value);
  }, [element.id, onContentChange]);

  if (element.type === 'text') {
    return (
      <div
        className="w-full h-full p-3 rounded-lg border border-white/30 backdrop-blur-sm"
        style={{
          backgroundColor: element.style.backgroundColor || 'rgba(255, 255, 255, 0.9)',
          fontSize: element.style.fontSize || 16,
          color: element.style.color || '#3A3A3A',
          fontWeight: element.style.fontWeight || 'normal',
          borderRadius: element.style.borderRadius || 8,
        }}
      >
        {isEditable && isSelected ? (
          <textarea
            value={element.content}
            onChange={handleContentChange}
            className="w-full h-full resize-none bg-transparent border-none outline-none"
            style={{ 
              fontSize: element.style.fontSize || 16,
              color: element.style.color || '#3A3A3A',
              fontWeight: element.style.fontWeight || 'normal'
            }}
            autoFocus
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center">
            {element.content}
          </div>
        )}
      </div>
    );
  }

  if (element.type === 'image') {
    return (
      <div
        className="w-full h-full rounded-lg overflow-hidden border border-white/30 backdrop-blur-sm bg-gradient-to-br from-primary/20 to-accent/20"
        style={{ borderRadius: element.style.borderRadius || 8 }}
      >
        {element.content.startsWith('http') ? (
          <img
            src={element.content}
            alt="Vision board element"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center p-3 text-sm text-text-secondary">
            {element.content || 'Click to add image'}
          </div>
        )}
      </div>
    );
  }

  if (element.type === 'goal' || element.type === 'affirmation' || element.type === 'quote') {
    const typeLabel = element.type.charAt(0).toUpperCase() + element.type.slice(1);
    
    return (
      <div
        className="w-full h-full p-4 rounded-lg border-2 border-dashed border-accent/50 backdrop-blur-sm bg-gradient-to-br from-accent/10 to-primary/10"
        style={{ borderRadius: element.style.borderRadius || 12 }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-center">
          <Sparkles className="w-6 h-6 text-accent mb-2" />
          <div className="text-accent font-semibold mb-1">{typeLabel}</div>
          {isEditable && isSelected ? (
            <textarea
              value={element.content}
              onChange={handleContentChange}
              className="w-full flex-1 resize-none bg-transparent border-none outline-none text-center text-sm"
              placeholder={`Enter your ${element.type}...`}
              autoFocus
            />
          ) : (
            <div className="text-sm text-text-primary">{element.content}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

interface ElementControlsProps {
  onDelete: () => void;
}

function ElementControls({ onDelete }: ElementControlsProps) {
  return (
    <div className="absolute -top-8 left-0 flex space-x-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        title="Delete element"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function CanvasBackground() {
  return (
    <div className="absolute inset-0 opacity-5">
      <div className="w-full h-full bg-gradient-to-br from-primary via-transparent to-accent"></div>
    </div>
  );
}

interface CanvasGridProps {
  gridSize: number;
}

function CanvasGrid({ gridSize }: CanvasGridProps) {
  return (
    <div className="absolute inset-0 opacity-10">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#8A2BE2" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center text-text-secondary">
        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">Your Vision Board Awaits</p>
        <p className="text-sm">Add elements to bring your dreams to life</p>
      </div>
    </div>
  );
}

interface CanvasControlsProps {
  elementCount: number;
  onSave: () => void;
  onShare: () => void;
}

function CanvasControls({ elementCount, onSave, onShare }: CanvasControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-text-secondary">
        {elementCount} element{elementCount !== 1 ? 's' : ''} on your board
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Save Board
        </button>
        
        <button
          onClick={onShare}
          className="px-4 py-2 bg-white border border-accent text-accent rounded-lg hover:bg-accent hover:text-white transition-colors flex items-center"
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </button>
      </div>
    </div>
  );
}