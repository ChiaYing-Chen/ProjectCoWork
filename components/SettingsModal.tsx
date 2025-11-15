
import React, { useState, useEffect } from 'react';
import { ExecutingUnit } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newKey: string, newModifierName: string) => void;
  currentKey: string;
  currentModifierName: string;
  units: ExecutingUnit[];
  onUpdateUnits: (newUnits: ExecutingUnit[]) => void;
}

const UNIT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#22d3ee', '#a3e635', '#818cf8'];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, onSave, currentKey, currentModifierName, units, onUpdateUnits 
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'units'>('general');
  const [key, setKey] = useState(currentKey);
  const [modifierName, setModifierName] = useState(currentModifierName);
  const [error, setError] = useState('');
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey(currentKey);
      setModifierName(currentModifierName);
      setError('');
      setNewUnit('');
      setActiveTab('general');
    }
  }, [isOpen, currentKey, currentModifierName]);

  const handleGeneralSettingsSubmit = () => {
    if (!key.trim()) {
      setError('儲存位置 (Key) 不可為空。');
      return;
    }
    if (!modifierName.trim()) {
      setError('修改人員名稱不可為空。');
      return;
    }
    onSave(key.trim(), modifierName.trim());
    onClose();
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUnit = newUnit.trim();
    if (trimmedUnit && !units.some(u => u.name === trimmedUnit)) {
        const newColor = UNIT_COLORS[units.length % UNIT_COLORS.length];
        onUpdateUnits([...units, { name: trimmedUnit, color: newColor }]);
        setNewUnit('');
    }
  };

  const handleDeleteUnit = (unitToDelete: string) => {
      onUpdateUnits(units.filter(unit => unit.name !== unitToDelete));
  };
  
  const handleColorChange = (unitName: string, newColor: string) => {
      onUpdateUnits(units.map(unit => unit.name === unitName ? { ...unit, color: newColor } : unit));
  };

  if (!isOpen) {
    return null;
  }
  
  const TabButton: React.FC<{ isActive: boolean, onClick: () => void, children: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none ${
            isActive 
            ? 'bg-white text-blue-600' 
            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
    >
        {children}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-0">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">設定</h2>
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-2">
                    <TabButton isActive={activeTab === 'general'} onClick={() => setActiveTab('general')}>
                        一般設定
                    </TabButton>
                    <TabButton isActive={activeTab === 'units'} onClick={() => setActiveTab('units')}>
                        執行單位管理
                    </TabButton>
                </nav>
            </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="storage-key" className="block text-sm font-medium text-slate-700">儲存位置 (Key)</label>
                  <p className="text-xs text-slate-500 mb-2">
                    自訂專案資料在瀏覽器中的儲存位置。變更後，應用程式將會從新的位置讀取資料。
                  </p>
                  <input
                    type="text"
                    id="storage-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                    placeholder="例如：my-company-projects"
                  />
                </div>
                <div>
                  <label htmlFor="modifier-name" className="block text-sm font-medium text-slate-700">修改人員名稱</label>
                  <p className="text-xs text-slate-500 mb-2">
                    當您修改專案時，此名稱將會被記錄下來。
                  </p>
                  <input
                    type="text"
                    id="modifier-name"
                    value={modifierName}
                    onChange={(e) => setModifierName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                    placeholder="例如：您的姓名或電腦名稱"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}

            {activeTab === 'units' && (
              <div>
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
                  <form onSubmit={handleAddUnit} className="flex items-center gap-2">
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
              </div>
            )}
        </div>
        
        <div className="mt-auto p-6 bg-slate-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition"
          >
            {activeTab === 'general' ? '取消' : '關閉'}
          </button>
          {activeTab === 'general' && (
            <button
              onClick={handleGeneralSettingsSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              儲存
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
