import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskGroup } from '../types';
import { format, differenceInDays, isAfter } from 'date-fns';

interface GroupRelationshipViewProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  onUpdateGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name'>>) => void;
  onUpdateTask: (taskId: number, updates: Partial<Pick<Task, 'name' | 'start' | 'end'>>) => void;
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
        if (text.trim() && text.trim() !== value) {
            onSave(text.trim());
        } else {
            setText(value); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                        setText(value);
                        setIsEditing(false);
                    }
                }}
                className={`${textClasses} bg-transparent border-b-2 border-blue-500 focus:outline-none w-full`}
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className={`${textClasses} cursor-pointer hover:bg-slate-100 rounded-md -m-1 p-1 truncate`}>
            {value || <span className="text-slate-400">{placeholder}</span>}
        </div>
    );
};

const GroupRelationshipView: React.FC<GroupRelationshipViewProps> = ({ tasks, taskGroups, onUpdateGroup, onUpdateTask, onUpdateTaskInterval, onReorderTasks, onDeleteGroup, onUngroupTask }) => {
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
                    <span className="text-lg">🗑️</span>
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
                    className={`flex items-center flex-wrap sm:flex-nowrap gap-x-4 gap-y-2 p-2 rounded-lg transition-all duration-200 group ${draggedItemId === task.id ? 'opacity-30' : ''} ${dragOverItemId === task.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 flex-shrink-0 cursor-grab text-slate-400 group-hover:text-slate-600 flex items-center justify-center">
                        <span className="text-lg">⠿</span>
                    </div>
                    <div className="flex-shrink-0 w-64">
                        <EditableText
                            value={task.name}
                            onSave={(newName) => onUpdateTask(task.id, { name: newName })}
                            placeholder="任務名稱"
                            textClasses="font-semibold text-slate-700"
                        />
                        <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <input
                                type="date"
                                value={format(task.start, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    const newStartDate = new Date(e.target.value + 'T00:00:00');
                                    if (!isNaN(newStartDate.getTime())) {
                                        const newEndDate = isAfter(newStartDate, task.end) ? newStartDate : task.end;
                                        onUpdateTask(task.id, { start: newStartDate, end: newEndDate });
                                    }
                                }}
                                className="bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1 cursor-pointer w-full text-xs"
                                aria-label="任務開始日期"
                            />
                            <span>-</span>
                            <input
                                type="date"
                                value={format(task.end, 'yyyy-MM-dd')}
                                min={format(task.start, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    const newEndDate = new Date(e.target.value + 'T00:00:00');
                                    if (!isNaN(newEndDate.getTime())) {
                                        onUpdateTask(task.id, { end: newEndDate });
                                    }
                                }}
                                className="bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1 cursor-pointer w-full text-xs"
                                aria-label="任務結束日期"
                            />
                        </div>
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
                        <span className="text-lg">💔</span>
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