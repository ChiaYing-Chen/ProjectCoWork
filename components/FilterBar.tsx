
import React, { useState, useRef, useEffect } from 'react';
import { ExecutingUnit } from '../types';

interface FilterBarProps {
  executingUnits: ExecutingUnit[];
  selectedUnits: string[];
  onSelectedUnitsChange: (selected: string[]) => void;
}

const FilterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-1.586l-3.707-3.707A1 1 0 018 12V6.414L3.293 4.707A1 1 0 013 4z" />
    </svg>
);

const FilterBar: React.FC<FilterBarProps> = ({ executingUnits, selectedUnits, onSelectedUnitsChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleUnitToggle = (unitName: string) => {
        const newSelected = selectedUnits.includes(unitName)
            ? selectedUnits.filter(u => u !== unitName)
            : [...selectedUnits, unitName];
        onSelectedUnitsChange(newSelected);
    };

    const handleClear = () => {
        onSelectedUnitsChange([]);
        setIsOpen(false);
    }
    
    const uniqueUnitNames = [...new Set(executingUnits.map(u => u.name))].filter((u): u is string => !!u);

    if (uniqueUnitNames.length === 0) return null;

    return (
        <div className="mb-4 flex justify-end">
            <div className="relative" ref={wrapperRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-sm"
                >
                    <FilterIcon />
                    篩選執行單位
                    {selectedUnits.length > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {selectedUnits.length}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-20 border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">依執行單位篩選</h3>
                            <button onClick={handleClear} className="text-sm text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={selectedUnits.length === 0}>
                                清除
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2">
                            {uniqueUnitNames.map(unitName => (
                                <label key={unitName} className="flex items-center px-2 py-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedUnits.includes(unitName)}
                                        onChange={() => handleUnitToggle(unitName)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-slate-700">{unitName}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterBar;