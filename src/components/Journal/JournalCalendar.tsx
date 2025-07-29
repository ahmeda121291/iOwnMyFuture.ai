import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JournalCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  entriesMap: Map<string, boolean>; // Maps date strings to whether they have entries
}

export default function JournalCalendar({ selectedDate, onDateSelect, entriesMap }: JournalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSelectedDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasEntry = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    return entriesMap.has(dateKey);
  };

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(date);
  };

  return (
    <div className="card">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
        
        <h3 className="text-lg font-semibold text-text-primary">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-text-secondary py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-10"></div>
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const selected = isSelectedDate(day);
          const today = isToday(day);
          const hasEntryForDay = hasEntry(day);
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`h-10 w-10 rounded-full text-sm font-medium transition-all duration-200 relative ${
                selected
                  ? 'bg-accent text-white shadow-md'
                  : today
                  ? 'bg-primary text-white'
                  : 'text-text-primary hover:bg-primary/20'
              }`}
            >
              {day}
              {hasEntryForDay && !selected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-4 text-xs text-text-secondary">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary rounded-full mr-1"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-accent rounded-full mr-1"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 bg-accent rounded-full mr-1"></div>
            <span>Has Entry</span>
          </div>
        </div>
      </div>
    </div>
  );
}