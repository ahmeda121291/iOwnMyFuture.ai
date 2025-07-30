import React, { useState, useEffect } from 'react';
import { RefreshCw, Lightbulb, Sparkles, Clock, Heart } from 'lucide-react';

interface JournalPromptProps {
  onPromptSelect: (prompt: string) => void;
}

export default function JournalPrompt({ onPromptSelect }: JournalPromptProps) {
  const prompts = [
    {
      category: "Gratitude",
      icon: Heart,
      color: "rose",
      questions: [
        "What am I most grateful for today?",
        "Who in my life am I thankful for and why?",
        "What small moment brought me joy today?",
        "What blessing in my life do I often take for granted?",
        "How did someone make my day better today?"
      ]
    },
    {
      category: "Growth",
      icon: Sparkles,
      color: "purple",
      questions: [
        "What progress did I make toward my goals today?",
        "What did I learn about myself today?",
        "How did I step out of my comfort zone?",
        "What skill am I developing and how is it progressing?",
        "What mistake did I make today that taught me something valuable?"
      ]
    },
    {
      category: "Reflection",
      icon: Lightbulb,
      color: "blue",
      questions: [
        "What challenged me today and how did I handle it?",
        "If I could redo today, what would I do differently?",
        "What patterns am I noticing in my thoughts or behaviors?",
        "What emotion dominated my day and why?",
        "How did I practice self-care today?"
      ]
    },
    {
      category: "Future Focus",
      icon: RefreshCw,
      color: "green",
      questions: [
        "How did I move closer to my dreams today?",
        "What do I want to accomplish tomorrow?",
        "What vision am I working toward right now?",
        "What would my future self thank me for doing today?",
        "What habit would I like to develop or change?"
      ]
    },
    {
      category: "Mindfulness",
      icon: Clock,
      color: "amber",
      questions: [
        "How am I feeling right now, both mentally and physically?",
        "What am I avoiding that I should address?",
        "What do I need more of in my life right now?",
        "What moments today made me feel fully present?",
        "How did I treat myself with kindness today?"
      ]
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState(prompts[0]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [promptOfTheDay, setPromptOfTheDay] = useState("");

  const currentPrompt = selectedCategory.questions[currentPromptIndex];

  useEffect(() => {
    // Generate a "prompt of the day" based on the current date
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const allQuestions = prompts.flatMap(category => category.questions);
    const dailyPrompt = allQuestions[dayOfYear % allQuestions.length];
    setPromptOfTheDay(dailyPrompt);
  }, []);

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

  const getColorClasses = (color: string, active: boolean = false) => {
    const colorMap = {
      rose: active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
      purple: active ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: active ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100',
      amber: active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="w-5 h-5 text-accent mr-2" />
            <h3 className="text-lg font-semibold text-text-primary">Writing Inspiration</h3>
          </div>
          <button
            onClick={getRandomPrompt}
            className="p-2 rounded-full hover:bg-primary/20 transition-colors group"
            title="Get random prompt"
          >
            <RefreshCw className="w-4 h-4 text-accent group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Prompt of the Day */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-600 mb-1">Prompt of the Day</p>
              <p className="text-sm text-amber-800 leading-relaxed">{promptOfTheDay}</p>
              <button
                onClick={() => onPromptSelect(promptOfTheDay)}
                className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
              >
                Use this prompt →
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {prompts.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory.category === category.category;
            return (
              <button
                key={category.category}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPromptIndex(0);
                }}
                className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${getColorClasses(category.color, isActive)}`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {category.category}
              </button>
            );
          })}
        </div>

        {/* Current Prompt */}
        <div className="space-y-3">
          <div className="flex items-start">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${getColorClasses(selectedCategory.color, true)}`}>
              <selectedCategory.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-text-primary font-medium leading-relaxed mb-3">
                {currentPrompt}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={nextPrompt}
              className={`text-sm font-medium transition-colors ${getColorClasses(selectedCategory.color).replace('bg-', 'text-').replace('-50', '-600').replace(' hover:bg-', ' hover:text-').replace('-100', '-800')}`}
            >
              Next prompt in {selectedCategory.category.toLowerCase()} →
            </button>
            
            <div className="text-xs text-text-secondary bg-gray-50 px-2 py-1 rounded-full">
              {currentPromptIndex + 1} of {selectedCategory.questions.length}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onPromptSelect(currentPrompt)}
          className="w-full py-3 px-4 bg-gradient-to-r from-primary to-accent text-white font-medium rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          Use This Prompt
        </button>

        {/* Tips */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            💡 <strong className="text-text-primary">Writing Tip:</strong> Don't overthink it! Let your thoughts flow naturally and write whatever feels authentic to you. There are no wrong answers in journaling.
          </p>
        </div>
      </div>
    </div>
  );
}