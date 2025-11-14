import React, { useState } from 'react';

interface ExecutingUnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: string[];
  onUpdate: (newUnits: string[]) => void;
}

const ExecutingUnitManagerModal: React.FC<ExecutingUnitManagerModalProps> = ({ isOpen, onClose, units, onUpdate }) => {
    const [newUnit, setNewUnit] = useState('');

    const handleAddUnit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUnit = newUnit.trim();
        if (trimmedUnit && !units.includes(trimmedUnit)) {
            onUpdate([...units, trimmedUnit]);
            setNewUnit('');
        }
    };

    const handleDeleteUnit = (unitToDelete: string) => {
        onUpdate(units.filter(unit => unit !== unitToDelete));
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">執行單位管理</h2>
                <div className="mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {units.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {units.map(unit => (
                                <span key={unit} className="flex items-center bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1 rounded-full">
                                    {unit}
                                    <button
                                        onClick={() => handleDeleteUnit(unit)}
                                        className="ml-2 -mr-1 w-5 h-5 flex items-center justify-center bg-slate-400 hover:bg-slate-500 text-white rounded-full transition-colors"
                                        aria-label={`刪除 ${unit}`}
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
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
