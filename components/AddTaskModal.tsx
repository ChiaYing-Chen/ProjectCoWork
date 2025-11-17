

import React, { useState, useEffect } from 'react';
import { Task, ExecutingUnit } from '../types';
import { format } from 'date-fns';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: { id?: number; name: string; start: Date; end: Date; executingUnit?: string; predecessorId?: number; notes?: string; }) => void;
  taskToEdit?: Task | null;
  tasks: Task[];
  executingUnits: ExecutingUnit[];
  onDelete?: (taskId: number) => void;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, taskToEdit, tasks, executingUnits, onDelete }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [executingUnit, setExecutingUnit] = useState('');
  const [predecessorId, setPredecessorId] = useState('');
  const [notes, setNotes] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    const today = new Date();
    setName('');
    setStartDate(format(today, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
    setExecutingUnit('');
    setPredecessorId('');
    setNotes('');
    setCustomUnit('');
    setIsCustom(false);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setName(taskToEdit.name);
        setStartDate(format(taskToEdit.start, 'yyyy-MM-dd'));
        setEndDate(format(taskToEdit.end, 'yyyy-MM-dd'));
        setPredecessorId(taskToEdit.predecessorId?.toString() || '');
        setNotes(taskToEdit.notes || '');
        const unitName = taskToEdit.executingUnit || '';
        if (unitName && !executingUnits.some(u => u.name === unitName)) {
            setIsCustom(true);
            setCustomUnit(unitName);
            setExecutingUnit('custom');
        } else {
            setExecutingUnit(unitName);
            setIsCustom(false);
            setCustomUnit('');
        }
      } else {
        resetForm();
      }
      setError('');
    }
  }, [isOpen, taskToEdit, executingUnits]);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === 'custom') {
          setIsCustom(true);
      } else {
          setIsCustom(false);
          setCustomUnit('');
      }
      setExecutingUnit(value);
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('任務名稱不可為空。');
      return;
    }
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (end < start) {
      setError('結束日期不可早於開始日期。');
      return;
    }

    const finalExecutingUnit = isCustom ? customUnit.trim() : executingUnit;
    if (isCustom && !finalExecutingUnit) {
        setError('自訂單位名稱不可為空。');
        return;
    }
    
    const finalPredecessorId = predecessorId ? parseInt(predecessorId, 10) : undefined;

    onSave({ 
      id: taskToEdit?.id, 
      name: name.trim(), 
      start, 
      end, 
      executingUnit: finalExecutingUnit || undefined,
      predecessorId: finalPredecessorId,
      notes: notes.trim() || undefined
    });
  };
  
  const handleDelete = () => {
    if (taskToEdit && onDelete) {
        onDelete(taskToEdit.id);
    }
  };

  if (!isOpen) {
    return null;
  }
  
  const title = taskToEdit && taskToEdit.id ? '編輯任務' : '新增任務';
  const buttonText = taskToEdit && taskToEdit.id ? '儲存變更' : '儲存任務';
  const possiblePredecessors = tasks.filter(task => task.id !== taskToEdit?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-slate-800">{title}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="task-name" className="block text-sm font-medium text-slate-700">任務名稱</label>
            <input
              type="text"
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
              placeholder="例如：完成初步設計"
            />
          </div>
          <div>
            <label htmlFor="predecessor-task" className="block text-sm font-medium text-slate-700">前置任務</label>
            <select
              id="predecessor-task"
              value={predecessorId}
              onChange={(e) => setPredecessorId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
            >
              <option value="">無</option>
              {possiblePredecessors.map(task => (
                <option key={task.id} value={task.id}>{`#${task.id} ${task.name}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="executing-unit" className="block text-sm font-medium text-slate-700">執行單位</label>
            <select
              id="executing-unit"
              value={executingUnit}
              onChange={handleUnitChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
            >
              <option value="">未指派</option>
              {executingUnits.map(unit => (
                <option key={unit.name} value={unit.name}>{unit.name}</option>
              ))}
              <option value="custom">-- 自訂 --</option>
            </select>
             {isCustom && (
                <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="mt-2 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                    placeholder="輸入自訂單位名稱"
                    autoFocus
                />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-slate-700">開始日期</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-slate-700">結束日期</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
              />
            </div>
          </div>
           <div>
            <label htmlFor="task-notes" className="block text-sm font-medium text-slate-700">備註</label>
            <textarea
                id="task-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900"
                placeholder="輸入任務的相關備註..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-between items-center">
          <div>
            {taskToEdit && taskToEdit.id && onDelete && (
                <button
                onClick={handleDelete}
                className="px-4 py-2 bg-transparent text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition flex items-center"
                >
                <span className="mr-2">🗑️</span>
                刪除任務
              </button>
            )}
          </div>
          <div className="flex justify-end space-x-3">
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
                {buttonText}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;