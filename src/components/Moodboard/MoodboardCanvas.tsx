import React, { useState, useRef, useCallback } from 'react';
import { Move, Trash2, Edit3, Download, Share, Sparkles } from 'lucide-react';

interface MoodboardElement {
  id: string;
  type: 'text' | 'image' | 'goal';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    fontWeight?: string;
  };
}

interface MoodboardCanvasProps {
  elements: MoodboardElement[];
  onElementsChange: (elements: MoodboardElement[]) => void;
  onSave: () => void;
  isEditable?: boolean;
}

export default function MoodboardCanvas({ elements, onElementsChange, onSave, isEditable = true }: MoodboardCanvasProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (!isEditable) return;
    
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
    if (!isDragging || !selectedElement || !canvasRef.current) return;

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

  const deleteElement = (elementId: string) => {
    const updatedElements = elements.filter(el => el.id !== elementId);
    onElementsChange(updatedElements);
    setSelectedElement(null);
  };

  const updateElementContent = (elementId: string, newContent: string) => {
    const updatedElements = elements.map(element =>
      element.id === elementId
        ? { ...element, content: newContent }
        : element
    );
    onElementsChange(updatedElements);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElement(null);
    }
  };

  const renderElement = (element: MoodboardElement) => {
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
        {element.type === 'text' && (
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
                onChange={(e) => updateElementContent(element.id, e.target.value)}
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
        )}

        {element.type === 'image' && (
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
        )}

        {element.type === 'goal' && (
          <div
            className="w-full h-full p-4 rounded-lg border-2 border-dashed border-accent/50 backdrop-blur-sm bg-gradient-to-br from-accent/10 to-primary/10"
            style={{ borderRadius: element.style.borderRadius || 12 }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <Sparkles className="w-6 h-6 text-accent mb-2" />
              <div className="text-accent font-semibold mb-1">Goal</div>
              {isEditable && isSelected ? (
                <textarea
                  value={element.content}
                  onChange={(e) => updateElementContent(element.id, e.target.value)}
                  className="w-full flex-1 resize-none bg-transparent border-none outline-none text-center text-sm"
                  placeholder="Enter your goal..."
                  autoFocus
                />
              ) : (
                <div className="text-sm text-text-primary">{element.content}</div>
              )}
            </div>
          </div>
        )}

        {/* Element Controls */}
        {isEditable && isSelected && (
          <div className="absolute -top-8 left-0 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteElement(element.id);
              }}
              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Delete element"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-96 glass-lavender rounded-lg overflow-hidden cursor-crosshair"
        style={{ minHeight: '600px' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-primary via-transparent to-accent"></div>
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#8A2BE2" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Elements */}
        {elements.map(renderElement)}

        {/* Empty State */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Your Vision Board Awaits</p>
              <p className="text-sm">Add elements to bring your dreams to life</p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Controls */}
      {isEditable && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-secondary">
            {elements.length} element{elements.length !== 1 ? 's' : ''} on your board
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
              onClick={() => {
                // TODO: Implement share functionality
                alert('Share functionality coming soon!');
              }}
              className="px-4 py-2 bg-white border border-accent text-accent rounded-lg hover:bg-accent hover:text-white transition-colors flex items-center"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}