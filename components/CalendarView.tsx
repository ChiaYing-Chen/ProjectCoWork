
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
  startOfMonth,
  startOfWeek,
  isBefore,
  isAfter,
  differenceInDays,
  addDays,
  parseISO,
} from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';


interface CalendarViewProps {
  tasks: Task[];
  projectStartDate: Date;
  projectEndDate: Date;
  warnings: Warning[];
  onDragTask: (taskId: number, newStartDate: Date) => void;
  onResizeTask: (taskId: number, newStartDate: Date, newEndDate: Date) => void;
  selectedTaskIds: number[];
  onSelectTask: (taskId: number, isCtrlOrMetaKey: boolean) => void;
  onMultiSelectTasks: (taskIds: number[]) => void;
  onCreateGroup: () => void;
  onOpenAddTaskModal: (date?: Date) => void;
  onUngroupTask: (taskId: number) => void;
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: ExecutingUnit[];
  onDeleteSelectedTasks: (taskIds: number[]) => void;
  onExportSelectedTasks: (taskIds: number[]) => void;
}

interface ResizingInfo {
    taskId: number;
    side: 'start' | 'end';
    originalTask: Task;
}

const MONTH_COLORS = ['#4f46e5', '#db2777', '#16a34a', '#d97706', '#6d28d9', '#0891b2', '#ca8a04', '#be185d'];


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projectStartDate, projectEndDate, warnings, onDragTask, onResizeTask, selectedTaskIds, onSelectTask, onMultiSelectTasks, onCreateGroup, onOpenAddTaskModal, onUngroupTask, taskGroups, onEditTask, executingUnits, onDeleteSelectedTasks, onExportSelectedTasks }) => {
  const [touchedTaskIds, setTouchedTaskIds] = useState<Set<number>>(new Set());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef({ touchedTaskIds: new Set<number>() });
  const longPressTimer = useRef<number | null>(null);
  const today = useMemo(() => new Date(), []);
  
  const [deselectedUnits, setDeselectedUnits] = useState<Set<string>>(new Set());
  const [deselectedMonths, setDeselectedMonths] = useState<Set<string>>(new Set());
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [resizingInfo, setResizingInfo] = useState<ResizingInfo | null>(null);
  const [resizePreview, setResizePreview] = useState<{ start: Date; end: Date } | null>(null);

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

  // Effect to handle global mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingInfo) return;

      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const dayCell = targetElement?.closest<HTMLElement>('[data-date]');
      
      if (dayCell && dayCell.dataset.date) {
        const currentDate = parseISO(dayCell.dataset.date);
        const { side, originalTask } = resizingInfo;
        
        if (side === 'start') {
          setResizePreview({
            start: isAfter(currentDate, originalTask.end) ? originalTask.end : currentDate,
            end: originalTask.end,
          });
        } else { // side === 'end'
          setResizePreview({
            start: originalTask.start,
            end: isBefore(currentDate, originalTask.start) ? originalTask.start : currentDate,
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (!resizingInfo || !resizePreview) {
        setResizingInfo(null);
        setResizePreview(null);
        return;
      }
      onResizeTask(resizingInfo.taskId, resizePreview.start, resizePreview.end);
      
      // Cleanup
      setResizingInfo(null);
      setResizePreview(null);
    };

    if (resizingInfo) {
      // Initialize preview state when resizing starts
      setResizePreview({ start: resizingInfo.originalTask.start, end: resizingInfo.originalTask.end });
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingInfo, onResizeTask]);


  const handleToggleUnit = (unitName: string) => {
    setDeselectedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitName)) {
        newSet.delete(unitName);
      } else {
        newSet.add(unitName);
      }
      return newSet;
    });
  };

  const handleToggleMonth = (monthKey: string) => {
    setDeselectedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
        (!task.executingUnit || !deselectedUnits.has(task.executingUnit))
    );
  }, [tasks, deselectedUnits]);

  // Create a new task list for rendering that includes the resize preview
  const tasksToRender = useMemo(() => {
    if (!resizingInfo || !resizePreview) {
      return filteredTasks;
    }
    return filteredTasks.map(task => 
      task.id === resizingInfo.taskId 
        ? { ...task, start: resizePreview.start, end: resizePreview.end }
        : task
    );
  }, [filteredTasks, resizingInfo, resizePreview]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, task: Task, side: 'start' | 'end') => {
      e.preventDefault();
      e.stopPropagation();
      setResizingInfo({
          taskId: task.id,
          side: side,
          originalTask: task,
      });
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
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('[data-task-id]')) {
      return;
    }
    setDayViewDate(day);
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

  const monthColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allMonths.forEach((month, index) => {
      const key = format(month, 'yyyy-MM');
      if (!map.has(key)) {
        map.set(key, MONTH_COLORS[index % MONTH_COLORS.length]);
      }
    });
    return map;
  }, [allMonths]);

  const calendarDays = useMemo(() => {
    if (!projectStartDate || !projectEndDate) return [];
    
    const visibleMonths = allMonths.filter(month => !deselectedMonths.has(format(month, 'yyyy-MM')));
    if (visibleMonths.length === 0) return [];
    
    const firstMonth = visibleMonths[0];
    const lastMonth = visibleMonths[visibleMonths.length - 1];
    
    const start = startOfWeek(startOfMonth(firstMonth));
    const end = endOfWeek(endOfMonth(lastMonth));
    return eachDayOfInterval({ start, end });
  }, [projectStartDate, projectEndDate, allMonths, deselectedMonths]);

  const weeks = useMemo(() => {
    const chunks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      chunks.push(calendarDays.slice(i, i + 7));
    }
    return chunks;
  }, [calendarDays]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col view-container" style={{ height: 'calc(100vh - 120px)' }}>
      {(unitsInUse.length > 0 || allMonths.length > 0) && (
        <div className="bg-slate-50 rounded-md border border-slate-200 mb-2 flex-shrink-0">
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="w-full flex items-center justify-between p-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            aria-expanded={isFilterVisible}
            aria-controls="filter-panel"
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-1.586l-3.707-3.707A1 1 0 018 12V6.414L3.293 4.707A1 1 0 013 4z" />
              </svg>
              <span>圖例與篩選</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 transform transition-transform duration-300 ${isFilterVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            id="filter-panel"
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-[500px]' : 'max-h-0'}`}
          >
            <div className="p-4 border-t border-slate-200 flex-shrink-0 flex">
              {allMonths.length > 0 && (
                  <div className="w-1/4 pr-4 flex-shrink-0">
                      <div className="flex flex-col space-y-2">
                          {Array.from(monthColorMap.entries()).map(([monthKey, color]) => (
                              <button key={monthKey} className="flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors text-left" onClick={() => handleToggleMonth(monthKey)}>
                                  <div className="w-4 h-4 rounded-sm mr-2 shadow-inner flex-shrink-0" style={{ backgroundColor: color }}></div>
                                  <span className={`text-sm text-slate-600 ${deselectedMonths.has(monthKey) ? 'line-through text-slate-400' : ''}`}>
                                      {format(new Date(monthKey + '-01T00:00:00'), 'yyyy / M', { locale: zhTW })}
                                  </span>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
              {allMonths.length > 0 && unitsInUse.length > 0 && (
                  <div className="border-l border-slate-200"></div>
              )}
              {unitsInUse.length > 0 && (
                  <div className={`flex-1 ${allMonths.length > 0 ? 'pl-4' : ''}`}>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {unitsInUse.map(unit => (
                              <button key={unit.name} className="flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors" onClick={() => handleToggleUnit(unit.name)}>
                                  <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: unit.color }}></div>
                                  <span className={`text-sm text-slate-600 ${deselectedUnits.has(unit.name) ? 'line-through text-slate-400' : ''}`}>{unit.name}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="overflow-y-auto calendar-print-container flex-grow"
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sticky top-0 bg-white z-20 border-b-2 border-slate-200">
          <div className="relative">
            {selectedTaskIds.length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
                  <div className="bg-white p-2 rounded-lg shadow-lg flex items-center space-x-2 border border-slate-200">
                      <button onClick={() => onExportSelectedTasks(selectedTaskIds)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="將選取的任務匯出為 .ics 檔案"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>匯出</button>
                      <button onClick={handleDeleteClick} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="刪除選取的任務"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>刪除</button>
                      {selectedTaskIds.length > 1 && (<button onClick={onCreateGroup} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="將選取的任務建立時間關聯"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>關聯</button>)}
                  </div>
                </div>
            )}
            <div className="grid grid-cols-7 text-center font-bold text-slate-600">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (<div key={day} className="py-2">{day}</div>))}
            </div>
          </div>
        </div>

        <div>
          {weeks.map((week, weekIndex) => {
            const weekStart = week[0];
            const weekEnd = week[6];

            const tasksInWeek = tasksToRender
              .filter(task => task.start <= weekEnd && task.end >= weekStart)
              .sort((a, b) => a.start.getTime() - b.start.getTime() || (b.end.getTime() - a.start.getTime()) - (a.end.getTime() - a.start.getTime()));

            const taskLayoutRows: { task: Task, row: number, startDay: number, span: number }[] = [];
            const rows: (Task | null)[][] = [];

            tasksInWeek.forEach(task => {
              const startDay = isBefore(task.start, weekStart) ? 0 : differenceInDays(task.start, weekStart);
              const endDay = isAfter(task.end, weekEnd) ? 6 : differenceInDays(task.end, weekStart);

              let targetRow = 0;
              while (true) {
                if (rows.length <= targetRow) rows.push(Array(7).fill(null));

                const canPlace = !rows[targetRow].slice(startDay, endDay + 1).some(Boolean);

                if (canPlace) {
                  for (let i = startDay; i <= endDay; i++) rows[targetRow][i] = task;
                  taskLayoutRows.push({ task, row: targetRow, startDay, span: endDay - startDay + 1 });
                  break;
                } else {
                  targetRow++;
                }
              }
            });

            const weekHeight = `calc(1.75rem + ${rows.length * 2.25}rem)`;
            const monthOfFirstDay = startOfMonth(week[0]);

            return (
              <div key={weekIndex} className="flex border-t border-slate-200">
                 <div className="w-4 flex-shrink-0" style={{ backgroundColor: monthColorMap.get(format(monthOfFirstDay, 'yyyy-MM')) || '#64748b' }}></div>
                 <div className="grid grid-cols-7 flex-grow relative" style={{ minHeight: weekHeight }}>
                  {week.map((day, dayIndex) => (
                    <div
                      key={day.toString()}
                      data-date={day.toISOString()}
                      className={`border-l border-slate-200 p-1.5 transition-colors duration-200 ${!isSameMonth(day, monthOfFirstDay) ? 'bg-slate-50' : 'bg-white'} ${isSameDay(day, today) ? 'bg-blue-100' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day)}
                      onClick={(e) => handleDayClick(e, day)}
                      onTouchStart={() => handleDayTouchStart(day)} onTouchMove={handleDayTouchMove} onTouchEnd={handleDayTouchEnd}
                    >
                      <div className={`text-sm text-right ${!isSameMonth(day, monthOfFirstDay) ? 'text-slate-400' : 'text-slate-700'}`}>{format(day, 'd')}</div>
                    </div>
                  ))}
                  <div className="absolute top-0 left-0 right-0 bottom-0 mt-[1.75rem] px-1 space-y-1">
                    {taskLayoutRows.map(({ task, row, startDay, span }) => {
                       const [showTooltip, setShowTooltip] = useState(false);
                       const tooltipTimer = useRef<number | null>(null);
                       const handleMouseEnter = () => { if (task.notes) { tooltipTimer.current = window.setTimeout(() => setShowTooltip(true), 1500); } };
                       const handleMouseLeave = () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); setShowTooltip(false); };
                       
                       const isActualStart = isSameDay(task.start, addDays(weekStart, startDay));
                       const isActualEnd = isSameDay(task.end, addDays(weekStart, startDay + span - 1));
                       
                       let borderRadiusClasses = '';
                       if (isActualStart) borderRadiusClasses += ' rounded-l-lg';
                       if (isActualEnd) borderRadiusClasses += ' rounded-r-lg';
                       if (isActualStart && isActualEnd) borderRadiusClasses = 'rounded-lg';

                       const showText = isActualStart || startDay === 0;
                       const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
                       const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;
                       
                       const isResizingThisTask = resizingInfo?.taskId === task.id;
                       
                       const dynamicClasses = touchedTaskIds.has(task.id)
                         ? 'transform scale-105 ring-2 ring-yellow-400 ring-offset-2 z-10 shadow-lg'
                         : selectedTaskIds.includes(task.id)
                         ? 'ring-2 ring-offset-1 ring-blue-500 z-10'
                         : 'shadow-sm hover:shadow-md';

                      const style: React.CSSProperties = {
                        top: `calc(${row * 2.25}rem)`,
                        left: `calc(${(startDay / 7) * 100}% + 1px)`,
                        width: `calc(${(span / 7) * 100}% - 2px)`,
                      };

                      return (
                         <div
                            key={task.id}
                            draggable={!isResizingThisTask}
                            data-task-id={task.id}
                            onDragStart={(e) => {
                                if (isResizingThisTask) {
                                    e.preventDefault();
                                    return;
                                }
                                handleDragStart(e, task.id);
                            }}
                            onClick={(e) => onSelectTask(task.id, e.ctrlKey || e.metaKey)}
                            onDoubleClick={() => onEditTask(task)}
                            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                            className={`group absolute h-8 flex items-center text-xs text-white transition-all duration-200 ${borderRadiusClasses} ${dynamicClasses} overflow-hidden`}
                            style={style}
                            title={task.name}
                        >
                            <div className="absolute inset-0 w-full h-full" style={{backgroundColor: taskColor || '#3b82f6', borderLeft: group && isActualStart ? `4px solid ${group.color}` : 'none' }}></div>
                            {isActualStart && (
                                <div 
                                    onMouseDown={(e) => handleResizeMouseDown(e, task, 'start')}
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 opacity-50 hover:opacity-100 bg-black/20"
                                />
                            )}
                            <div className="relative px-2 font-semibold truncate w-full h-full flex items-center" style={{ paddingLeft: group && isActualStart ? '0.25rem' : '0.5rem' }}>
                              {showText ? task.name : ''}
                            </div>
                            {isActualEnd && (
                                <div 
                                    onMouseDown={(e) => handleResizeMouseDown(e, task, 'end')}
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 opacity-50 hover:opacity-100 bg-black/20"
                                />
                            )}
                            
                            {task.groupId && showText && (
                              <button onClick={(e) => { e.stopPropagation(); onUngroupTask(task.id); }} className="absolute -top-1 -right-1 bg-white p-0.5 rounded-full text-slate-500 hover:text-red-500 transition-colors shadow z-20" title="從群組中移除">
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
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <DayViewModal date={dayViewDate} onClose={() => setDayViewDate(null)} tasks={filteredTasks} taskGroups={taskGroups} executingUnits={executingUnits} onEditTask={(task) => { setDayViewDate(null); onEditTask(task); }} onAddTaskForDate={(date) => { setDayViewDate(null); onOpenAddTaskModal(date); }} />
    </div>
  );
};

export default CalendarView;
