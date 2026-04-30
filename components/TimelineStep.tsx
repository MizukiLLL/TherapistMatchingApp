import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { IdentityEntry, FactorType } from '../types';

interface TimelineStepProps {
  age: number;
  entries: IdentityEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IdentityEntry[]>>;
  onNext: () => void;
  onBack: () => void;
}

export const TimelineStep: React.FC<TimelineStepProps> = ({
  age,
  entries,
  setEntries,
  onNext,
  onBack,
}) => {
  const [newLocation, setNewLocation] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'left' | 'right' | 'move' | null>(null);

  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;

  // Filter for only time entries
  const timeEntries = entries.filter((e) => e.type === FactorType.TIME_SPENT);

  const addTimeEntry = () => {
    if (!newLocation.trim()) return;
    const newEntry: IdentityEntry = {
      id: crypto.randomUUID(),
      location: newLocation,
      type: FactorType.TIME_SPENT,
      startYear: 0,
      endYear: age,
      years: age,
    };
    setEntries([...entries, newEntry]);
    setNewLocation('');
  };

  const updateTimeEntry = (id: string, start: number, end: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return { ...e, startYear: start, endYear: end, years: end - start };
        }
        return e;
      })
    );
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Drag logic
  const handlePointerDown = (
    e: React.PointerEvent,
    id: string,
    type: 'left' | 'right' | 'move'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(id);
    setDragType(type);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !dragType || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const entry = entries.find((e) => e.id === draggingId);
    if (!entry) return;

    const currentStart = entry.startYear !== undefined ? entry.startYear : 0;
    const currentEnd = entry.endYear !== undefined ? entry.endYear : age;
    
    // Calculate year based on mouse X relative to track width
    const ratio = (e.clientX - rect.left) / rect.width;
    const yearAtCursor = Math.max(0, Math.min(age, ratio * age));

    let newStart = currentStart;
    let newEnd = currentEnd;

    if (dragType === 'left') {
      newStart = Math.min(yearAtCursor, currentEnd - 0.5); // Min 0.5 year duration
    } else if (dragType === 'right') {
      newEnd = Math.max(yearAtCursor, currentStart + 0.5);
    } else if (dragType === 'move') {
      const duration = currentEnd - currentStart;
      const centerYear = yearAtCursor;
      newStart = Math.max(0, centerYear - duration / 2);
      newEnd = Math.min(age, newStart + duration);
      // Re-adjust start if end hit the wall
      if (newEnd === age) {
        newStart = Math.max(0, age - duration);
      }
    }

    updateTimeEntry(draggingId, Number(newStart.toFixed(1)), Number(newEnd.toFixed(1)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    setDragType(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">Timeline of Your Life</h2>
        <p className="text-slate-500 mt-2">
          Where have you lived during your {age} years? Drag the bars to adjust timing.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTimeEntry()}
            placeholder="Add a location (e.g. Hong Kong)"
            className="flex-grow p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={addTimeEntry}
            disabled={!newLocation.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Timeline Visualization */}
        <div className="relative pt-6 pb-2 select-none touch-none" ref={trackRef}>
          {/* Ruler */}
          <div className="absolute top-0 left-0 w-full h-full border-b border-slate-200 pointer-events-none flex justify-between text-xs text-slate-400 pt-2">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="transform -translate-x-1/2">
                 {Math.round(birthYear + (age * (i / 5)))}
              </span>
            ))}
          </div>

          {/* Tracks */}
          <div className="space-y-3 mt-6">
            {timeEntries.length === 0 && (
              <div className="h-12 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                Add a location to start the timeline
              </div>
            )}
            
            {timeEntries.map((entry) => {
              const start = entry.startYear !== undefined ? entry.startYear : 0;
              const end = entry.endYear !== undefined ? entry.endYear : age;
              const leftPct = (start / age) * 100;
              const widthPct = ((end - start) / age) * 100;

              return (
                <div
                  key={entry.id}
                  className="relative h-12 bg-slate-100 rounded-lg overflow-visible group"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                    {/* Background track visual */}
                   <div className="absolute w-full h-full bg-slate-50 rounded-lg border border-slate-100"></div>

                  <div
                    className="absolute h-full bg-blue-500/20 border border-blue-500 rounded-md flex items-center justify-between cursor-move hover:bg-blue-500/30 transition-colors"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    onPointerDown={(e) => handlePointerDown(e, entry.id, 'move')}
                  >
                    {/* Left Handle */}
                    <div
                      className="w-4 h-full cursor-ew-resize flex items-center justify-center hover:bg-blue-600/20 rounded-l-md"
                      onPointerDown={(e) => handlePointerDown(e, entry.id, 'left')}
                    >
                      <div className="w-1 h-4 bg-blue-400 rounded-full" />
                    </div>

                    <div className="flex-grow flex flex-col items-center justify-center overflow-hidden px-1">
                        <span className="text-xs font-bold text-blue-900 truncate w-full text-center">{entry.location}</span>
                        <span className="text-[10px] text-blue-700 font-mono">
                            {Math.round(birthYear + start)} - {Math.round(birthYear + end)}
                        </span>
                    </div>

                    {/* Right Handle */}
                    <div
                      className="w-4 h-full cursor-ew-resize flex items-center justify-center hover:bg-blue-600/20 rounded-r-md"
                      onPointerDown={(e) => handlePointerDown(e, entry.id, 'right')}
                    >
                      <div className="w-1 h-4 bg-blue-400 rounded-full" />
                    </div>
                  </div>
                  
                  {/* Delete Button (outside) */}
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={timeEntries.length === 0}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Bloodline
        </button>
      </div>
    </div>
  );
};