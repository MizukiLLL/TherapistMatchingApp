import React, { useState } from 'react';
import { Plus, Trash2, Heart, MapPin } from 'lucide-react';
import { IdentityEntry, FactorType } from '../types';

interface OtherFactorsStepProps {
  entries: IdentityEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IdentityEntry[]>>;
  onCalculate: () => void;
  onBack: () => void;
}

export const OtherFactorsStep: React.FC<OtherFactorsStepProps> = ({
  entries,
  setEntries,
  onCalculate,
  onBack,
}) => {
  // We are focusing on EMOTION type for this step
  const myEntries = entries.filter(e => e.type === FactorType.EMOTION);

  const addEntry = () => {
    const newEntry: IdentityEntry = {
      id: crypto.randomUUID(),
      location: '',
      type: FactorType.EMOTION,
      rating: 5, // Default mid-tier rating
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof IdentityEntry, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const HeartRating = ({ rating, onChange }: { rating: number, onChange: (r: number) => void }) => {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHover(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                    title={`${star}/10`}
                >
                    <Heart 
                        className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-200 ${
                            star <= (hover || rating) 
                            ? 'fill-pink-500 text-pink-500' 
                            : 'text-slate-300'
                        }`} 
                    />
                </button>
            ))}
        </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">Emotional Belonging</h2>
        <p className="text-slate-500 mt-2">
          Which cities do you feel most attached to? Rank them on a scale of 1 to 10.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[300px] flex flex-col">
        {myEntries.length === 0 && (
           <div className="text-center py-10 text-slate-400">
               <Heart className="w-12 h-12 mx-auto mb-3 text-slate-200" />
               <p>No cities added yet.</p>
               <p className="text-xs mt-1">Add a city to tell us where your heart is.</p>
           </div>
        )}

        <div className="space-y-6 mb-6">
            {myEntries.map((entry) => (
            <div key={entry.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all hover:shadow-md">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    
                    {/* Location Input */}
                    <div className="relative w-full md:w-1/3">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={entry.location}
                            onChange={(e) => updateEntry(entry.id, 'location', e.target.value)}
                            placeholder="City Name"
                            className="w-full pl-9 p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none font-medium text-slate-800"
                            autoFocus={!entry.location}
                        />
                    </div>

                    {/* Rating */}
                    <div className="flex-grow flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                            Belonging Scale ({entry.rating || 0})
                        </span>
                        <HeartRating 
                            rating={entry.rating || 0} 
                            onChange={(r) => updateEntry(entry.id, 'rating', r)} 
                        />
                    </div>

                    {/* Delete */}
                    <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors self-end md:self-center"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
            ))}
        </div>

        <button
            onClick={addEntry}
            className="mt-auto w-full py-4 border-2 border-dashed border-pink-200 bg-pink-50/30 rounded-xl text-pink-600 font-bold hover:bg-pink-50 hover:border-pink-300 transition-colors flex items-center justify-center gap-2"
        >
            <Plus className="w-5 h-5" />
            Add a City
        </button>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onCalculate}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Calculate Result
        </button>
      </div>
    </div>
  );
};