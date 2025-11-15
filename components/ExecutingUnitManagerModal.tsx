
import React, { useState } from 'react';
import { ExecutingUnit } from '../types';

interface ExecutingUnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: ExecutingUnit[];
  onUpdate: (newUnits: ExecutingUnit[]) => void;
}

const UNIT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#22d3ee', '#a3e635', '#818cf8'];

const ExecutingUnitManagerModal: React.FC<ExecutingUnitManagerModalProps> = ({ isOpen, onClose, units, onUpdate }) => {
    const [newUnit, setNewUnit] = useState('');

    const handleAddUnit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUnit = newUnit.trim();
        if (trimmedUnit && !units.some(u => u.name === trimmedUnit)) {
            const newColor = UNIT_COLORS[units.length % UNIT_COLORS.length];
            onUpdate([...units, { name: trimmedUnit, color: newColor }]);
            setNewUnit('');
        }
    };

    const handleDeleteUnit = (unitToDelete: string) => {
        onUpdate(units.filter(unit => unit.name !== unitToDelete));
    };
    
    const handleColorChange = (unitName: string, newColor: string) => {
        onUpdate(units.map(unit => unit.name === unitName ? { ...unit, color: newColor } : unit));
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">執行單位管理</h2>
                <div className="mb-4 max-h-60 overflow-y-auto pr-2 space-y-2">
                    {units.length > 0 ? (
                        units.map(unit => (
                            <div key={unit.name} className="flex items-center justify-between bg-slate-100 p-2 rounded-md">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={unit.color}
                                        onChange={(e) => handleColorChange(unit.name, e.target.value)}
                                        className="w-8 h-8 rounded-md border-slate-300 cursor-pointer p-0"
                                        style={{ appearance: 'none', backgroundColor: 'transparent', border: 'none' }}
                                        title="點擊以變更顏色"
                                    />
                                    <span className="text-slate-700 font-medium">{unit.name}</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteUnit(unit.name)}
                                    className="w-6 h-6 flex items-center justify-center bg-slate-400 hover:bg-red-500 text-white rounded-full transition-colors flex-shrink-0"
                                    aria-label={`刪除 ${unit.name}`}
                                >
                                    &times;
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 text-sm py-4 text-center">尚未新增任何執行單位。</p>
                    )}
                </div>
                <form onSubmit={handleAddUnit} className="flex items-center gap-2 mb-6">
                    <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                        placeholder="輸入新的單位名稱..."
                    />
                    <button
                        type="submit"
                        className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                    >
                        新增
                    </button>
                </form>
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExecutingUnitManagerModal;