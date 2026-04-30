import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, MapPin, Clock, Heart, Users } from 'lucide-react';
import { FactorType, IdentityEntry } from '../types';
import { FACTOR_LABELS } from '../constants';

interface CalculatorFormProps {
  age: number | '';
  setAge: (val: number | '') => void;
  entries: IdentityEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IdentityEntry[]>>;
  onCalculate: () => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({
  age,
  setAge,
  entries,
  setEntries,
  onCalculate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEntry = () => {
    const newEntry: IdentityEntry = {
      id: crypto.randomUUID(),
      location: '',
      type: FactorType.TIME_SPENT,
      years: undefined,
    };
    setEntries([...entries, newEntry]);
    
    // Smooth scroll to bottom after render
    setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof IdentityEntry, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        // If switching away from TIME_SPENT, remove years
        if (field === 'type' && value !== FactorType.TIME_SPENT) {
            delete updated.years;
        }
        return updated;
      }
      return e;
    }));
  };

  const isValid = age !== '' && age > 0 && entries.length > 0 && entries.every(e => e.location.trim().length > 0);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Age Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          First, how old are you?
        </label>
        <div className="relative">
            <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
            placeholder="e.g. 30"
            className="w-full text-2xl font-bold p-3 border-b-2 border-slate-200 focus:border-blue-500 focus:outline-none transition-colors placeholder-slate-300"
            />
             <span className="absolute right-3 top-4 text-slate-400 font-medium">years old</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">This is the denominator for your time calculations.</p>
      </div>

      {/* Entries Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-semibold text-slate-800">Your Identity Factors</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{entries.length} items</span>
        </div>
        
        {entries.map((entry, index) => (
          <div 
            key={entry.id} 
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-start md:items-center group transition-all hover:shadow-md"
          >
            <div className="flex-grow w-full md:w-auto space-y-3 md:space-y-0 md:flex md:gap-4">
                {/* Location Input */}
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">Location</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={entry.location}
                            onChange={(e) => updateEntry(entry.id, 'location', e.target.value)}
                            placeholder="City or Country"
                            className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Type Select */}
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">Connection Type</label>
                    <div className="relative">
                        {entry.type === FactorType.TIME_SPENT ? <Clock className="absolute left-3 top-3 w-4 h-4 text-blue-500" /> :
                         entry.type === FactorType.EMOTION || entry.type === FactorType.PARTNER ? <Heart className="absolute left-3 top-3 w-4 h-4 text-pink-500" /> :
                         <Users className="absolute left-3 top-3 w-4 h-4 text-green-500" />}
                        
                        <select
                            value={entry.type}
                            onChange={(e) => updateEntry(entry.id, 'type', e.target.value as FactorType)}
                            className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                        >
                            {Object.entries(FACTOR_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Years Input (Conditional) */}
                {entry.type === FactorType.TIME_SPENT && (
                     <div className="w-full md:w-32 animate-in fade-in duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 md:hidden">Duration</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={entry.years || ''}
                                onChange={(e) => updateEntry(entry.id, 'years', parseFloat(e.target.value))}
                                placeholder="Years"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">yrs</span>
                        </div>
                     </div>
                )}
            </div>

            <button
                onClick={() => removeEntry(entry.id)}
                className="self-end md:self-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Remove entry"
            >
                <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        
        <div ref={scrollRef} />

        <button
            onClick={addEntry}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
        >
            <Plus className="w-5 h-5" />
            Add Another Place
        </button>
      </div>

      <div className="sticky bottom-6 z-10 pt-4">
        <button
            onClick={onCalculate}
            disabled={!isValid}
            className={`w-full py-4 text-lg font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 ${
                isValid 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
        >
            Generate My Pie Chart
        </button>
      </div>
    </div>
  );
};
