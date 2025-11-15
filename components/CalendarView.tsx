import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Task, Warning, TaskGroup, ExecutingUnit } from '../types';
import DayViewModal from './DayViewModal';
import {
  format,
  endOfMonth,
  eachDayOfInterval,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  getYear,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';

interface CalendarTaskItemProps {
  task: Task;
  isSelected: boolean;
  isTouched: boolean;
  group?: TaskGroup;
  taskColor?: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number) => void;
  onSelectTask: (taskId: number, isCtrlOrMetaKey: boolean) => void;
  onEditTask: (task: Task) => void;
  onUngroupTask: (taskId: number) => void;
}

const CalendarTaskItem: React.FC<CalendarTaskItemProps> = ({ task, isSelected, isTouched, group, taskColor, onDragStart, onSelectTask, onEditTask, onUngroupTask }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (task.notes) {
      tooltipTimer.current = window.setTimeout(() => {
        setShowTooltip(true);
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
    }
    setShowTooltip(false);
  };
  
  const dynamicClasses = isTouched
    ? 'transform scale-105 ring-2 ring-yellow-400 ring-offset-2 z-10 shadow-lg'
    : isSelected
    ? 'ring-2 ring-offset-1 ring-blue-500'
    : '';

  return (
    <div
        draggable
        data-task-id={task.id}
        onDragStart={(e) => onDragStart(e, task.id)}
        onClick={(e) => onSelectTask(task.id, e.ctrlKey || e.metaKey)}
        onDoubleClick={() => onEditTask(task)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`p-1.5 rounded-md text-xs cursor-pointer text-white relative transition-all duration-200 ${dynamicClasses}`}
        style={{
          backgroundColor: taskColor || '#3b82f6',
          borderLeft: group ? `4px solid ${group.color}` : 'none'
        }}
        title={task.name}
    >
        <p className="font-semibold truncate">{task.name}</p>
        {task.groupId && (
          <button onClick={(e) => { e.stopPropagation(); onUngroupTask(task.id); }} className="absolute -top-1 -right-1 bg-white p-0.5 rounded-full text-slate-500 hover:text-red-500 transition-colors shadow" title="從群組中移除">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </button>
        )}
        {showTooltip && task.notes && (
          <div className="absolute bottom-full mb-2 w-max max-w-xs bg-slate-800 text-white text-xs rounded py-1 px-2 z-50 shadow-lg whitespace-pre-wrap" style={{ left: 0 }}>
            {task.notes}
          </div>
        )}
    </div>
  );
};


interface CalendarViewProps {
  tasks: Task[];
  projectStartDate: Date;
  projectEndDate: Date;
  warnings: Warning[];
  onDragTask: (taskId: number, newStartDate: Date) => void;
  selectedTaskIds: number[];
  onSelectTask: (taskId: number, isCtrlOrMetaKey: boolean) => void;
  onMultiSelectTasks: (taskIds: number[]) => void;
  onCreateGroup: () => void;
  onOpenAddTaskModal: () => void;
  onUngroupTask: (taskId: number) => void;
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: ExecutingUnit[];
  onDeleteSelectedTasks: (taskIds: number[]) => void;
  selectedUnits: string[];
}

const YEAR_COLORS = ['#4f46e5', '#db2777', '#16a34a', '#d97706', '#6d28d9', '#0891b2', '#ca8a04', '#be185d'];


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projectStartDate, projectEndDate, warnings, onDragTask, selectedTaskIds, onSelectTask, onMultiSelectTasks, onCreateGroup, onOpenAddTaskModal, onUngroupTask, taskGroups, onEditTask, executingUnits, onDeleteSelectedTasks, selectedUnits }) => {
  const [touchedTaskIds, setTouchedTaskIds] = useState<Set<number>>(new Set());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef({ touchedTaskIds: new Set<number>() });
  const longPressTimer = useRef<number | null>(null);
  const today = useMemo(() => new Date(), []);

  const allMonths = useMemo(() => {
    const months = [];
    if (!projectStartDate || !projectEndDate) {
        return [];
    }
    let current = startOfMonth(projectStartDate);
    const end = startOfMonth(projectEndDate);
    while (current <= end) {
        months.push(current);
        current = addMonths(current, 1);
    }
    return months;
  }, [projectStartDate, projectEndDate]);

  useEffect(() => {
    touchStateRef.current.touchedTaskIds = touchedTaskIds;
  }, [touchedTaskIds]);

  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  }, [projectStartDate]);


  const filteredTasks = useMemo(() => {
    if (selectedUnits.length === 0) {
        return tasks;
    }
    return tasks.filter(task => 
        task.executingUnit && selectedUnits.includes(task.executingUnit)
    );
  }, [tasks, selectedUnits]);

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

  const getTaskIdsFromTouches = useCallback((touches: React.TouchList): Set<number> => {
    const ids = new Set<number>();
    const touchCount = Math.min(touches.length, 4);

    for (let i = 0; i < touchCount; i++) {
        const touch = touches[i];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const taskElement = element?.closest<HTMLElement>('[data-task-id]');
        if (taskElement && taskElement.dataset.taskId) {
            ids.add(parseInt(taskElement.dataset.taskId, 10));
        }
    }
    return ids;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 1) {
        e.preventDefault();
        const ids = getTaskIdsFromTouches(e.touches);
        setTouchedTaskIds(ids);
    }
  }, [getTaskIdsFromTouches]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length > 1) {
          e.preventDefault();
          const ids = getTaskIdsFromTouches(e.touches);
          setTouchedTaskIds(ids);
      }
  }, [getTaskIdsFromTouches]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0 && touchStateRef.current.touchedTaskIds.size > 1) {
          e.preventDefault();
          onMultiSelectTasks(Array.from(touchStateRef.current.touchedTaskIds));
      }
      if (e.touches.length === 0) {
          setTouchedTaskIds(new Set());
      }
  }, [onMultiSelectTasks]);

  const handleDayClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if (e.target === e.currentTarget) {
        setDayViewDate(day);
    }
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleDayTouchStart = (day: Date) => {
      clearLongPressTimer();
      longPressTimer.current = window.setTimeout(() => {
          setDayViewDate(day);
      }, 500);
  };
  
  const handleDayTouchMove = () => {
      clearLongPressTimer();
  };

  const handleDayTouchEnd = () => {
      clearLongPressTimer();
  };


  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
        const key = format(task.start, 'yyyy-MM-dd');
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key)!.push(task);
    });
    return map;
  }, [filteredTasks]);

  const taskGroupMap = useMemo(() => {
    const map = new Map<string, TaskGroup>();
    taskGroups.forEach(group => map.set(group.id, group));
    return map;
  }, [taskGroups]);
  
  const unitColorMap = useMemo(() => {
    return new Map(executingUnits.map(u => [u.name, u.color]));
  }, [executingUnits]);

  const unitsInUse = useMemo(() => executingUnits.filter(u => tasks.some(t => t.executingUnit === u.name)), [executingUnits, tasks]);

  const handleDeleteClick = () => {
      if (selectedTaskIds.length > 0) {
          onDeleteSelectedTasks(selectedTaskIds);
      }
  };

  const yearColorMap = useMemo(() => {
    const map = new Map<number, string>();
    let colorIndex = 0;
    const sortedUniqueYears = [...new Set(allMonths.map(month => getYear(month)))].sort((a,b) => a-b);
    
    sortedUniqueYears.forEach(year => {
      if (!map.has(year)) {
        map.set(year, YEAR_COLORS[colorIndex % YEAR_COLORS.length]);
        colorIndex++;
      }
    });
    return map;
  }, [allMonths]);

  const sortedYears = useMemo(() => {
    return Array.from(yearColorMap.keys()).sort((a, b) => a - b);
  }, [yearColorMap]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 relative flex flex-col view-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center mb-4 flex-shrink-0 min-h-[40px]">
        {/* The year/month title has been removed as per user request. */}
        <div className="w-full sm:w-auto flex justify-center sm:justify-end items-center space-x-2">
            {selectedTaskIds.length > 0 && (
                <button
                    onClick={handleDeleteClick}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center"
                    title="刪除選取的任務"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    刪除
                </button>
            )}
             {selectedTaskIds.length > 1 && (
                <button
                    onClick={onCreateGroup}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm flex items-center"
                    title="將選取的任務建立時間關聯"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
                    關聯
                </button>
            )}
        </div>
      </div>
      
      {sortedYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
            {sortedYears.map(year => (
                <div key={year} className="flex items-center">
                    <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: yearColorMap.get(year) }}></div>
                    <span className="text-sm font-semibold text-slate-600">{year}</span>
                </div>
            ))}
        </div>
      )}

      {(taskGroups.length > 0 || unitsInUse.length > 0) && (
        <div className="p-4 border-b border-t border-slate-200 bg-slate-50 space-y-4 mb-4 rounded-md flex-shrink-0">
            {taskGroups.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold mb-2 text-slate-700">時間關聯群組圖例</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {taskGroups.map((group, index) => (
                            <div key={group.id} className="flex items-center">
                                <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: group.color }}></div>
                                <span className="text-sm text-slate-600">{group.name || `群組 ${index + 1}`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {unitsInUse.length > 0 && (
                 <div>
                    <h3 className="text-md font-semibold mb-2 text-slate-700">執行單位圖例</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {unitsInUse.map(unit => (
                            <div key={unit.name} className="flex items-center">
                                <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: unit.color }}></div>
                                <span className="text-sm text-slate-600">{unit.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      <div 
        className="flex-grow overflow-y-auto calendar-print-container" 
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-7 text-center font-bold text-slate-600 sticky top-0 bg-white z-10 border-b-2 border-slate-200">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="py-2">{day}</div>
            ))}
        </div>
        {allMonths.map(month => {
          const start = startOfWeek(startOfMonth(month));
          const end = endOfWeek(endOfMonth(month));
          const days = eachDayOfInterval({ start, end });
          const year = getYear(month);
          const yearColor = yearColorMap.get(year) || '#64748b';

          return (
            <div key={format(month, 'yyyy-MM')} className="flex border-t border-slate-200">
                <div className="w-4 flex-shrink-0" style={{ backgroundColor: yearColor }}>
                </div>
                <div 
                  className="grid grid-cols-7 flex-grow"
                >
                  {days.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasksByDate.get(dayKey) || [];

                    return (
                      <div
                        key={day.toString()}
                        className={`border-b border-l border-slate-200 min-h-[120px] p-1.5 transition-colors duration-200 cursor-pointer ${!isSameMonth(day, month) ? 'bg-slate-50' : 'bg-white'} ${isSameDay(day, today) ? 'bg-blue-100' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                        onClick={(e) => handleDayClick(e, day)}
                        onTouchStart={() => handleDayTouchStart(day)}
                        onTouchMove={handleDayTouchMove}
                        onTouchEnd={handleDayTouchEnd}
                      >
                        <div className={`text-sm ${!isSameMonth(day, month) ? 'text-slate-400' : 'text-slate-700'}`}>
                          {format(day, 'M/d')}
                        </div>
                        <div className="mt-1 space-y-1">
                          {dayTasks.map(task => {
                            const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
                            const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;
                            return (
                              <CalendarTaskItem 
                                key={task.id}
                                task={task}
                                isSelected={selectedTaskIds.includes(task.id)}
                                isTouched={touchedTaskIds.has(task.id)}
                                group={group}
                                taskColor={taskColor}
                                onDragStart={handleDragStart}
                                onSelectTask={onSelectTask}
                                onEditTask={onEditTask}
                                onUngroupTask={onUngroupTask}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          );
        })}
      </div>
      <DayViewModal 
        date={dayViewDate} 
        onClose={() => setDayViewDate(null)} 
        tasks={filteredTasks}
        taskGroups={taskGroups}
        executingUnits={executingUnits}
        onEditTask={(task) => {
          setDayViewDate(null);
          onEditTask(task);
        }}
      />
    </div>
  );
};

export default CalendarView;