
import React, { useState, useMemo } from 'react';
import { Task, Warning, TaskGroup } from '../types';
// FIX: Update date-fns imports for v3 compatibility.
import {
  format,
  endOfMonth,
  eachDayOfInterval,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
} from 'date-fns';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { subMonths } from 'date-fns/subMonths';
import { zhTW } from 'date-fns/locale/zh-TW';

const UNIT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#22d3ee', '#a3e635', '#818cf8'];

const getUnitColor = (unit: string, allUnits: string[]) => {
    const index = allUnits.indexOf(unit);
    if (index === -1) return '#a1a1aa'; // zinc-400 for unlisted units
    return UNIT_COLORS[index % UNIT_COLORS.length];
};

interface CalendarViewProps {
  tasks: Task[];
  warnings: Warning[];
  onDragTask: (taskId: number, newStartDate: Date) => void;
  selectedTaskIds: number[];
  onSelectTask: (taskId: number, isCtrlOrMetaKey: boolean) => void;
  onCreateGroup: () => void;
  onOpenAddTaskModal: () => void;
  onUngroupTask: (taskId: number) => void;
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: string[];
  onDeleteSelectedTasks: (taskIds: number[]) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, warnings, onDragTask, selectedTaskIds, onSelectTask, onCreateGroup, onOpenAddTaskModal, onUngroupTask, taskGroups, onEditTask, executingUnits, onDeleteSelectedTasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const firstDayOfGrid = startOfWeek(firstDayOfMonth, { locale: zhTW });
  const lastDayOfGrid = endOfWeek(lastDayOfMonth, { locale: zhTW });

  const daysInGrid = eachDayOfInterval({
    start: firstDayOfGrid,
    end: lastDayOfGrid,
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (taskId) {
        onDragTask(taskId, day);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
        const key = format(task.start, 'yyyy-MM-dd');
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const taskGroupMap = useMemo(() => {
    const map = new Map<string, TaskGroup>();
    taskGroups.forEach(group => map.set(group.id, group));
    return map;
  }, [taskGroups]);
  
  const unitColorMap = useMemo(() => {
    const map = new Map<string, string>();
    executingUnits.forEach(unit => {
        map.set(unit, getUnitColor(unit, executingUnits));
    });
    return map;
  }, [executingUnits]);

  const unitsInUse = useMemo(() => executingUnits.filter(u => tasks.some(t => t.executingUnit === u)), [executingUnits, tasks]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  
  const handleDeleteClick = () => {
      if (selectedTaskIds.length > 0) {
          onDeleteSelectedTasks(selectedTaskIds);
      }
  };


  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 flex justify-start">
            <div className="flex items-center space-x-2">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 transition">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 transition">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
        
        <h2 className="flex-shrink-0 text-xl sm:text-2xl font-bold text-slate-800 text-center">
          {format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}
        </h2>
        
        <div className="flex-1 flex justify-end items-center space-x-2">
            {selectedTaskIds.length > 0 && (
                <button
                    onClick={handleDeleteClick}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center"
                    title="刪除選取的任務"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    刪除 ({selectedTaskIds.length})
                </button>
            )}
            {selectedTaskIds.length > 1 && (
                <button
                    onClick={onCreateGroup}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    時間關聯 ({selectedTaskIds.length})
                </button>
            )}
        </div>
      </div>
      
      {/* Legend */}
      {unitsInUse.length > 0 && (
         <div className="pb-4 mb-4 border-b border-slate-200">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {unitsInUse.map(unit => (
                    <div key={unit} className="flex items-center">
                        <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: unitColorMap.get(unit) }}></div>
                        <span className="text-sm text-slate-600">{unit}</span>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="text-center py-2 bg-slate-50 font-semibold text-sm text-slate-600">
            {day}
          </div>
        ))}

        {daysInGrid.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const tasksForDay = tasksByDate.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={key}
              className={`min-h-[120px] bg-white p-2 flex flex-col ${isCurrentMonth ? '' : 'bg-slate-50'}`}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={handleDragOver}
            >
              <span className={`font-semibold ${isToday ? 'bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-600'} ${!isCurrentMonth ? 'text-slate-400' : ''}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1 overflow-y-auto">
                {tasksForDay.map(task => {
                   const isWarning = warnings.some(w => w.taskId === task.id);
                   const isSelected = selectedTaskIds.includes(task.id);
                   const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
                   const taskColor = isWarning ? '#ef4444' : task.executingUnit ? unitColorMap.get(task.executingUnit) : '#3b82f6';
                   
                   return (
                     <div 
                        key={task.id}
                        draggable
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(task.id, e.ctrlKey || e.metaKey)
                        }}
                        onDoubleClick={() => onEditTask(task)}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`relative text-xs p-1.5 rounded-md text-white cursor-grab transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}`}
                        style={{ 
                            backgroundColor: taskColor,
                            borderLeft: group ? `5px solid ${group.color}` : 'none' 
                        }}
                     >
                       <div className="flex flex-col items-start">
                         <p className="font-semibold truncate pr-4">{task.name}</p>
                         {task.executingUnit && (
                            <span className="mt-1 text-xs bg-black bg-opacity-20 px-1.5 py-0.5 rounded-full font-medium">
                                {task.executingUnit}
                            </span>
                         )}
                       </div>
                       {group && isSelected && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUngroupTask(task.id);
                            }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black bg-opacity-20 rounded-full text-white flex items-center justify-center hover:bg-opacity-50 transition-colors"
                            title="解除關聯"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                     </div>
                   )
                })}
              </div>
            </div>
          );
        })}
      </div>

       {/* Floating Add Button */}
       <button 
        onClick={onOpenAddTaskModal}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="新增任務"
       >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
           </svg>
       </button>
    </div>
  );
};

export default CalendarView;
