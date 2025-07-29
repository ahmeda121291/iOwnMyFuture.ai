import React, { useState } from 'react';
import { RefreshCw, Lightbulb } from 'lucide-react';

interface JournalPromptProps {
  onPromptSelect: (prompt: string) => void;
}

export default function JournalPrompt({ onPromptSelect }: JournalPromptProps) {
  const prompts = [
    {
      category: "Gratitude",
      questions: [
        "What am I most grateful for today?",
        "Who in my life am I thankful for and why?",
        "What small moment brought me joy today?"
      ]
    },
    {
      category: "Growth",
      questions: [
        "What progress did I make toward my goals today?",
        "What did I learn about myself today?",
        "How did I step out of my comfort zone?"
      ]
    },
    {
      category: "Reflection",
      questions: [
        "What challenged me today and how did I handle it?",
        "If I could redo today, what would I do differently?",
        "What patterns am I noticing in my thoughts or behaviors?"
      ]
    },
    {
      category: "Future Focus",
      questions: [
        "How did I move closer to my dreams today?",
        "What do I want to accomplish tomorrow?",
        "What vision am I working toward right now?"
      ]
    },
    {
      category: "Mindfulness",
      questions: [
        "How am I feeling right now, both mentally and physically?",
        "What am I avoiding that I should address?",
        "What do I need more of in my life right now?"
      ]
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState(prompts[0]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const currentPrompt = selectedCategory.questions[currentPromptIndex];

  const getRandomPrompt = () => {
    const randomCategory = prompts[Math.floor(Math.random() * prompts.length)];
    const randomIndex = Math.floor(Math.random() * randomCategory.questions.length);
    setSelectedCategory(randomCategory);
    setCurrentPromptIndex(randomIndex);
  };

  const nextPrompt = () => {
    const nextIndex = (currentPromptIndex + 1) % selectedCategory.questions.length;
    setCurrentPromptIndex(nextIndex);
  };

  return (
    <div className="card bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Lightbulb className="w-5 h-5 text-accent mr-2" />
          <h3 className="text-lg font-semibold text-text-primary">Writing Inspiration</h3>
        </div>
        <button
          onClick={getRandomPrompt}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
          title="Get random prompt"
        >
          <RefreshCw className="w-4 h-4 text-accent" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {prompts.map((category) => (
          <button
            key={category.category}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentPromptIndex(0);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory.category === category.category
                ? 'bg-accent text-white'
                : 'bg-white text-text-secondary hover:bg-primary/10'
            }`}
          >
            {category.category}
          </button>
        ))}
      </div>

      {/* Current Prompt */}
      <div className="mb-4">
        <p className="text-text-primary font-medium mb-3 leading-relaxed">
          {currentPrompt}
        </p>
        
        <div className="flex items-center justify-between">
          <button
            onClick={nextPrompt}
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Next prompt in {selectedCategory.category.toLowerCase()} →
          </button>
          
          <div className="text-xs text-text-secondary">
            {currentPromptIndex + 1} of {selectedCategory.questions.length}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onPromptSelect(currentPrompt)}
        className="w-full py-2 px-4 bg-white border border-accent/20 rounded-lg text-accent font-medium hover:bg-accent hover:text-white transition-colors"
      >
        Use This Prompt
      </button>

      {/* Tips */}
      <div className="mt-4 pt-4 border-t border-primary/10">
        <p className="text-xs text-text-secondary">
          💡 <strong>Tip:</strong> Don't overthink it! Let your thoughts flow naturally and write whatever feels authentic to you.
        </p>
      </div>
    </div>
  );
}