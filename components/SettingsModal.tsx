import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newKey: string, newModifierName: string) => void;
  currentKey: string;
  currentModifierName: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentKey, currentModifierName }) => {
  const [key, setKey] = useState(currentKey);
  const [modifierName, setModifierName] = useState(currentModifierName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey(currentKey);
      setModifierName(currentModifierName);
      setError('');
    }
  }, [isOpen, currentKey, currentModifierName]);

  const handleSubmit = () => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">儲存設定</h2>
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
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;