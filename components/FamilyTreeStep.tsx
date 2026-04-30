import React, { useState } from 'react';
import { User, Plus, X, MapPin } from 'lucide-react';
import { IdentityEntry, FactorType } from '../types';

interface FamilyTreeStepProps {
  entries: IdentityEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IdentityEntry[]>>;
  onNext: () => void;
  onBack: () => void;
}

// Tree Configuration Structure
interface AncestorNodeConfig {
  designation: string;
  label: string;
  type: FactorType;
  ancestors?: AncestorNodeConfig[];
}

// Define the tree structure (Bottom-Up conceptually, but configured Top-Down here for ancestors)
const ANCESTRY_TREE: AncestorNodeConfig[] = [
  {
    designation: 'Father',
    label: 'Father',
    type: FactorType.PARENT,
    ancestors: [
      { designation: 'Paternal Grandfather', label: 'Grandfather', type: FactorType.GRANDPARENT },
      { designation: 'Paternal Grandmother', label: 'Grandmother', type: FactorType.GRANDPARENT }
    ]
  },
  {
    designation: 'Mother',
    label: 'Mother',
    type: FactorType.PARENT,
    ancestors: [
       { designation: 'Maternal Grandfather', label: 'Grandfather', type: FactorType.GRANDPARENT },
       { designation: 'Maternal Grandmother', label: 'Grandmother', type: FactorType.GRANDPARENT }
    ]
  }
];

export const FamilyTreeStep: React.FC<FamilyTreeStepProps> = ({
  entries,
  setEntries,
  onNext,
  onBack,
}) => {
  const [editingNode, setEditingNode] = useState<{
    designation: string;
    label: string;
    type: FactorType;
  } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const getEntry = (designation: string) => {
    return entries.find((e) => e.designation === designation);
  };

  const openPopup = (config: AncestorNodeConfig) => {
    const entry = getEntry(config.designation);
    setInputValue(entry?.location || '');
    setEditingNode({
      designation: config.designation,
      label: config.label,
      type: config.type,
    });
  };

  const closePopup = () => {
    setEditingNode(null);
    setInputValue('');
  };

  const saveNode = () => {
    if (!editingNode) return;

    if (!inputValue.trim()) {
      // Remove entry if empty
      setEntries((prev) => prev.filter((e) => e.designation !== editingNode.designation));
    } else {
      setEntries((prev) => {
        const existing = prev.find((e) => e.designation === editingNode.designation);
        if (existing) {
          return prev.map((e) =>
            e.designation === editingNode.designation ? { ...e, location: inputValue } : e
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            location: inputValue,
            type: editingNode.type,
            designation: editingNode.designation,
          },
        ];
      });
    }
    closePopup();
  };

  const RecursiveNode: React.FC<{ config: AncestorNodeConfig }> = ({ config }) => {
    const entry = getEntry(config.designation);
    const isFilled = !!entry;

    return (
      <div className="flex flex-col items-center">
        {/* Render Ancestors if current node is filled */}
        <div className={`flex gap-4 mb-6 transition-all duration-500 ${isFilled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute bottom-full'}`}>
           {/* Only render ancestors logic if we have them in config. 
               This supports the "recursive" requirement - just add more to ANCESTRY_TREE if needed. */}
           {config.ancestors && config.ancestors.map((ancestor) => (
               <RecursiveNode key={ancestor.designation} config={ancestor} />
           ))}
        </div>
        
        {/* Connector Lines (Visual Only) */}
        {isFilled && config.ancestors && (
            <div className="relative w-full h-6 mb-[-2px]">
                {/* Vertical line from node up */}
                <div className="absolute left-1/2 bottom-0 h-full w-px bg-slate-300 -translate-x-1/2"></div>
                {/* Horizontal bar connecting ancestors */}
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-slate-300"></div>
                {/* Small ticks down to node (simplified, relies on flex alignment) */}
            </div>
        )}

        {/* The Node Itself */}
        <div className="relative group z-10">
            <button
            onClick={() => openPopup(config)}
            className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-300 bg-white shadow-lg hover:-translate-y-1
                ${isFilled 
                ? 'border-green-500 shadow-green-100' 
                : 'border-slate-200 border-dashed hover:border-blue-400'
                }`}
            >
            <User className={`w-8 h-8 mb-2 ${isFilled ? 'text-green-600' : 'text-slate-300'}`} />
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">{config.label}</span>
            
            {isFilled ? (
                <div className="text-center px-2 mt-1 w-full overflow-hidden">
                    <p className="font-bold text-slate-800 text-xs md:text-sm leading-tight truncate">
                        {entry.location}
                    </p>
                </div>
            ) : (
                <div className="flex items-center text-blue-500 text-xs font-medium mt-1">
                    <Plus className="w-3 h-3 mr-1" /> Add
                </div>
            )}
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-in slide-in-from-right-8 duration-500 text-center">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Your Bloodline</h2>
        <p className="text-slate-500 mt-2">
            Click on family members to add their origin. Ancestors appear as you fill the tree.
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-end min-h-[400px] py-8 pb-16 overflow-x-auto">
        
        {/* Roots Container */}
        <div className="flex justify-center gap-16 md:gap-32 items-end">
            {ANCESTRY_TREE.map(root => (
                <RecursiveNode key={root.designation} config={root} />
            ))}
        </div>

        {/* Connection to Me */}
        <div className="relative w-64 h-16 mt-[-4px] z-0">
             {/* Horizontal Bar */}
             <div className="absolute top-0 left-0 right-0 h-px bg-slate-300"></div>
             {/* Left Up Vertical */}
             <div className="absolute top-0 left-0 h-4 w-px bg-slate-300"></div>
             {/* Right Up Vertical */}
             <div className="absolute top-0 right-0 h-4 w-px bg-slate-300"></div>
             
             {/* Center Down Vertical to Me */}
             <div className="absolute top-0 left-1/2 h-full w-px bg-slate-300 -translate-x-1/2"></div>
        </div>

        {/* Me Node */}
        <div className="w-24 h-24 rounded-full bg-slate-900 flex flex-col items-center justify-center shadow-xl text-white z-10 border-4 border-slate-900">
            <span className="font-bold">ME</span>
            <span className="text-[10px] text-slate-400 mt-1">Result</span>
        </div>
      </div>

      <div className="flex justify-between pt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          Next: Deep Connections
        </button>
      </div>

      {/* Popup Bubble / Modal */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">
                        Where is your <span className="text-blue-600">{editingNode.label}</span> from?
                    </h3>
                    <button onClick={closePopup} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="relative mb-6">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        autoFocus
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveNode()}
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
                        placeholder="City or Country"
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={saveNode}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
