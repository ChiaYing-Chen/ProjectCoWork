import React, { useState, useRef } from 'react';
import { Task, TaskGroup } from '../types';
import { format, differenceInDays } from 'date-fns';

interface GroupRelationshipViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  onUpdateGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name'>>) => void;
  onUpdateTaskInterval: (groupId: string, previousTaskId: number, taskToShiftId: number, newInterval: number) => void;
  onReorderTasks: (groupId: string, newOrderedTaskIds: number[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onUngroupTask: (taskId: number) => void;
}

const EditableText: React.FC<{ value: string, onSave: (newValue: string) => void, placeholder: string, textClasses: string }> = ({ value, onSave, placeholder, textClasses }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (text.trim()) {
            onSave(text.trim());
        } else {
            setText(value); // Revert if empty
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none"
                autoFocus
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className={`${textClasses} cursor-pointer`}>
            {value || <span className="text-slate-400">{placeholder}</span>}
        </div>
    );
};

const GroupRelationshipView: React.FC<GroupRelationshipViewProps> = ({ tasks, taskGroups, onUpdateGroup, onUpdateTaskInterval, onReorderTasks, onDeleteGroup, onUngroupTask }) => {
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);

  if (taskGroups.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-slate-700">沒有已建立的關聯群組</h2>
        <p className="text-slate-500">請在「月曆」視圖中，使用 Ctrl/Cmd + 點擊來選取多個任務以建立時間關聯。</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
      e.dataTransfer.effectAllowed = 'move';
      setDraggedItemId(taskId);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
      e.preventDefault();
      if (taskId !== dragOverItemId) {
          setDragOverItemId(taskId);
      }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, group: TaskGroup, targetTaskId: number) => {
      e.preventDefault();
      if (draggedItemId === null || draggedItemId === targetTaskId) return;

      const currentIds = tasks
        .filter(t => t.groupId === group.id)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map(t => t.id);

      const draggedIndex = currentIds.indexOf(draggedItemId);
      const targetIndex = currentIds.indexOf(targetTaskId);

      const newOrderedIds = [...currentIds];
      const [removed] = newOrderedIds.splice(draggedIndex, 1);
      newOrderedIds.splice(targetIndex, 0, removed);

      onReorderTasks(group.id, newOrderedIds);
      
      setDraggedItemId(null);
      setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }

  return (
    <div className="space-y-8">
      {taskGroups.map((group, index) => {
        const groupTasks = tasks
          .filter(t => t.groupId === group.id)
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        return (
          <div key={group.id} className="bg-white rounded-lg shadow-lg p-6 border-l-8" style={{ borderColor: group.color }}>
            <div className="flex justify-between items-center mb-6">
                <EditableText
                    value={group.name || `關聯群組 ${index + 1}`}
                    onSave={(newName) => onUpdateGroup(group.id, { name: newName })}
                    placeholder="點擊以命名群組"
                    textClasses="text-xl font-bold text-slate-800"
                />
                <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                    title="刪除此群組"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="space-y-2" onDragEnd={handleDragEnd}>
              {groupTasks.map((task, taskIndex) => (
                <React.Fragment key={task.id}>
                  {/* Drag and Drop Task Card */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={(e) => handleDragOver(e, task.id)}
                    onDrop={(e) => handleDrop(e, group, task.id)}
                    className={`flex items-center space-x-4 p-2 rounded-lg transition-all duration-200 group ${draggedItemId === task.id ? 'opacity-30' : ''} ${dragOverItemId === task.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 flex-shrink-0 cursor-grab text-slate-400 group-hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" /></svg>
                    </div>
                    <div className="flex-shrink-0 w-32 text-right">
                        <p className="font-semibold text-slate-700">{task.name}</p>
                        <p className="text-sm text-slate-500">{format(task.start, 'MM/dd')} - {format(task.end, 'MM/dd')}</p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: group.color }}>
                        {taskIndex + 1}
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm text-slate-600">
                          持續時間: {differenceInDays(task.end, task.start) + 1} 天
                        </p>
                    </div>
                    <button onClick={() => onUngroupTask(task.id)} className="p-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-opacity" title="從群組中移除">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1M18 12a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                    </button>
                  </div>

                  {/* Connector and Editable Interval */}
                  {taskIndex < groupTasks.length - 1 && (
                    <div className="flex items-center h-12 ml-[68px]">
                       <div className="w-px h-full bg-slate-300"></div>
                       <div className="ml-4 flex items-center text-sm font-medium bg-slate-100 px-2 py-1 rounded-md">
                         <span className="text-slate-500 mr-2">間隔:</span>
                         <EditableText
                             value={String(differenceInDays(groupTasks[taskIndex + 1].start, task.end))}
                             onSave={(newInterval) => onUpdateTaskInterval(group.id, task.id, groupTasks[taskIndex + 1].id, parseInt(newInterval, 10) || 0)}
                             placeholder="0"
                             textClasses="text-slate-700"
                         />
                         <span className="text-slate-500 ml-1">天</span>
                       </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupRelationshipView;