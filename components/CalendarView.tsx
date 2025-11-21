
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
  isEditMode: boolean;
}

interface ResizingInfo {
    taskId: number;
    side: 'start' | 'end';
    originalTask: Task;
}

const MONTH_COLORS = ['#4f46e5', '#db2777', '#16a34a', '#d97706', '#6d28d9', '#0891b2', '#ca8a04', '#be185d'];

const CalendarTask: React.FC<{
    task: Task;
    weekStart: Date;
    startDay: number;
    span: number;
    row: number;
    draggingTaskId: number | null;
    isResizingThisTask: boolean;
    touchedTaskIds: Set<number>;
    selectedTaskIds: number[];
    taskGroupMap: Map<string, TaskGroup>;
    unitColorMap: Map<string, string>;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number) => void;
    setDraggingTaskId: (id: number | null) => void;
    onSelectTask: (taskId: number, isCtrlOrMetaKey: boolean) => void;
    onEditTask: (task: Task) => void;
    onUngroupTask: (taskId:number) => void;
    handleResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, task: Task, side: 'start' | 'end') => void;
    isEditMode: boolean;
}> = ({
    task,
    weekStart,
    startDay,
    span,
    row,
    draggingTaskId,
    isResizingThisTask,
    touchedTaskIds,
    selectedTaskIds,
    taskGroupMap,
    unitColorMap,
    onDragStart,
    setDraggingTaskId,
    onSelectTask,
    onEditTask,
    onUngroupTask,
    handleResizeMouseDown,
    isEditMode
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimer = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (tooltipTimer.current) {
            clearTimeout(tooltipTimer.current);
        }
        if (task.notes) {
            tooltipTimer.current = window.setTimeout(() => {
                setShowTooltip(true);
            }, 1000);
        }
    };
    const handleMouseLeave = () => {
        if (tooltipTimer.current) {
            clearTimeout(tooltipTimer.current);
            tooltipTimer.current = null;
        }
        setShowTooltip(false);
    };
    
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (tooltipTimer.current) {
                clearTimeout(tooltipTimer.current);
            }
        };
    }, []);

    const isActualStart = isSameDay(task.start, addDays(weekStart, startDay));
    const isActualEnd = isSameDay(task.end, addDays(weekStart, startDay + span - 1));

    let borderRadiusClasses = '';
    if (isActualStart) borderRadiusClasses += ' rounded-l-lg';
    if (isActualEnd) borderRadiusClasses += ' rounded-r-lg';
    if (isActualStart && isActualEnd) borderRadiusClasses = 'rounded-lg';

    const showText = isActualStart || startDay === 0;
    const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
    const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;

    const isDraggingThisTask = draggingTaskId === task.id;

    const dynamicClasses = touchedTaskIds.has(task.id)
        ? 'transform scale-105 ring-2 ring-yellow-400 ring-offset-2 z-10 shadow-lg'
        : selectedTaskIds.includes(task.id)
        ? 'ring-2 ring-offset-1 ring-blue-500 z-10'
        : 'shadow-sm hover:shadow-md';

    const dragClasses = isDraggingThisTask ? 'opacity-40' : '';

    const style: React.CSSProperties = {
        top: `calc(${row * 2.25}rem)`,
        left: `calc(${(startDay / 7) * 100}% + 1px)`,
        width: `calc(${(span / 7) * 100}% - 2px)`,
        cursor: isEditMode ? 'grab' : 'pointer',
    };
    
    return (
        <div
           draggable={isEditMode && !isResizingThisTask}
           data-task-id={task.id}
           onDragStart={(e) => {
               if (!isEditMode || isResizingThisTask) {
                   e.preventDefault();
                   return;
               }
               onDragStart(e, task.id);
           }}
           onDragEnd={() => setDraggingTaskId(null)}
           onClick={(e) => onSelectTask(task.id, e.ctrlKey || e.metaKey)}
           onDoubleClick={() => onEditTask(task)}
           onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
           className={`group absolute h-8 flex items-center text-xs text-white transition-all duration-200 ${borderRadiusClasses} ${dynamicClasses} ${dragClasses}`}
           style={style}
       >
           <div className="absolute inset-0 w-full h-full" style={{backgroundColor: taskColor || '#3b82f6', borderLeft: group && isActualStart ? `4px solid ${group.color}` : 'none' }}></div>
           {isActualStart && (
               <div 
                   onMouseDown={(e) => isEditMode && handleResizeMouseDown(e, task, 'start')}
                   className={`absolute left-0 top-0 bottom-0 w-2 z-10 opacity-50 hover:opacity-100 bg-black/20 ${isEditMode ? 'cursor-col-resize' : 'cursor-default'}`}
               />
           )}
           <div className="relative px-2 font-semibold truncate w-full h-full flex items-center text-white" style={{ paddingLeft: group && isActualStart ? '0.25rem' : '0.5rem' }}>
             {showText ? task.name : ''}
           </div>
           {isActualEnd && (
               <div 
                   onMouseDown={(e) => isEditMode && handleResizeMouseDown(e, task, 'end')}
                   className={`absolute right-0 top-0 bottom-0 w-2 z-10 opacity-50 hover:opacity-100 bg-black/20 ${isEditMode ? 'cursor-col-resize' : 'cursor-default'}`}
               />
           )}
           
           {task.groupId && showText && (
             <button onClick={(e) => { e.stopPropagation(); onUngroupTask(task.id); }} className="absolute -top-1 -right-1 bg-white p-0.5 rounded-full text-slate-500 hover:text-red-500 transition-colors shadow z-20" title="從群組中移除">
               <span className="text-xs">💔</span>
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


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projectStartDate, projectEndDate, warnings, onDragTask, onResizeTask, selectedTaskIds, onSelectTask, onMultiSelectTasks, onCreateGroup, onOpenAddTaskModal, onUngroupTask, taskGroups, onEditTask, executingUnits, onDeleteSelectedTasks, onExportSelectedTasks, isEditMode }) => {
  const [touchedTaskIds, setTouchedTaskIds] = useState<Set<number>>(new Set());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef({ touchedTaskIds: new Set<number>() });
  const longPressTimer = useRef<number | null>(null);
  const today = useMemo(() => new Date(), []);
  
  const [deselectedUnits, setDeselectedUnits] = useState<Set<string>>(new Set());
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [resizingInfo, setResizingInfo] = useState<ResizingInfo | null>(null);
  const [resizePreview, setResizePreview] = useState<{ start: Date; end: Date } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);

  // Ref to hold all resizing data to avoid stale closures in event handlers
  const resizeStateRef = useRef<{ info: ResizingInfo | null, preview: { start: Date; end: Date } | null }>({ info: null, preview: null });
  useEffect(() => {
    // Keep the ref in sync with the state
    resizeStateRef.current.info = resizingInfo;
    resizeStateRef.current.preview = resizePreview;
  }, [resizingInfo, resizePreview]);


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
      const currentInfo = resizeStateRef.current.info;
      if (!currentInfo) return;

      // Use elementsFromPoint to find the day cell even if it's under other elements
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const dayCell = elements.find(el => el.hasAttribute('data-date')) as HTMLElement | undefined;
      
      if (dayCell && dayCell.dataset.date) {
        const currentDate = parseISO(dayCell.dataset.date);
        const { side, originalTask } = currentInfo;
        
        let newPreview;
        if (side === 'start') {
          newPreview = {
            start: isAfter(currentDate, originalTask.end) ? originalTask.end : currentDate,
            end: originalTask.end,
          };
        } else { // side === 'end'
          newPreview = {
            start: originalTask.start,
            end: isBefore(currentDate, originalTask.start) ? originalTask.start : currentDate,
          };
        }
        // Set state to trigger visual update
        setResizePreview(newPreview);
      }
    };

    const handleMouseUp = () => {
      const { info, preview } = resizeStateRef.current;
      if (info && preview) {
        onResizeTask(info.taskId, preview.start, preview.end);
      }
      
      // Cleanup state
      setResizingInfo(null);
      setResizePreview(null);
    };

    // Only attach listeners when resizingInfo is active
    if (resizingInfo) {
      // Initialize preview state when resizing starts
      setResizePreview({ start: resizingInfo.originalTask.start, end: resizingInfo.originalTask.end });
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      // Cleanup listeners and styles
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingInfo, onResizeTask]);


  const unitsInUse = useMemo(() => executingUnits.filter(u => tasks.some(t => t.executingUnit === u.name)), [executingUnits, tasks]);

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
    if (!isEditMode) return;
    e.dataTransfer.setData('taskId', taskId.toString());
    e.dataTransfer.effectAllowed = 'move';
    // Use setTimeout to allow the browser to capture the drag image before we modify the element's style
    setTimeout(() => {
        setDraggingTaskId(taskId);
    }, 0);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, task: Task, side: 'start' | 'end') => {
      if (!isEditMode) return;
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
    if (!isEditMode) {
      setDraggingTaskId(null);
      return;
    }
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (taskId) {
        onDragTask(taskId, day);
    }
    setDraggingTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isEditMode) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
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

  const monthlyData = useMemo(() => {
    if (!projectStartDate || !projectEndDate) return [];

    return allMonths.map(monthDate => {
        const start = startOfWeek(startOfMonth(monthDate));
        const end = endOfWeek(endOfMonth(monthDate));
        const days = eachDayOfInterval({ start, end });
        
        const monthWeeks: Date[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            monthWeeks.push(days.slice(i, i + 7));
        }
        return { month: monthDate, weeks: monthWeeks };
    });
  }, [projectStartDate, projectEndDate, allMonths]);


  // Pre-calculate layout and PAGINATION logic for Print
  const { printPages, maxRowDepth } = useMemo(() => {
    let maxDepth = 0;
    
    // 1. Flatten Weeks and Calculate Max Depth
    const flatWeeks: { 
        week: Date[], 
        taskLayoutRows: { task: Task, row: number, startDay: number, span: number }[],
        monthColor: string
    }[] = [];

    // First pass: Layout calculation and finding maxDepth
    monthlyData.forEach(({ month, weeks }) => {
        weeks.forEach(week => {
            const weekStart = week[0];
            const weekEnd = week[6];
            
            // Use the month of the first day of the week to determine color bar
            const weekMonthKey = format(startOfMonth(weekStart), 'yyyy-MM');
            const monthColor = monthColorMap.get(weekMonthKey) || '#64748b';

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
            
            if (rows.length > maxDepth) {
                maxDepth = rows.length;
            }

            flatWeeks.push({ week, taskLayoutRows, monthColor });
        });
    });

    // Ensure at least 3 rows for visual comfort
    const finalMaxDepth = Math.max(maxDepth, 3);

    // 2. Pagination Logic based on Height
    // A4 Landscape Height: ~210mm. 
    // Safe printable height target: ~150mm (leaving 60mm for margins/headers/footers)
    
    const REM_TO_MM = 4.23; // 1rem ~= 4.23mm
    const HEADER_HEIGHT_MM = 12; // "Sun Mon Tue..." header row height estimate
    
    // Week Row Height = Date Header (1.75rem) + Task Rows (maxDepth * 2.25rem)
    const weekHeightRem = 1.75 + (finalMaxDepth * 2.25); 
    const weekHeightMm = weekHeightRem * REM_TO_MM;

    const MAX_PAGE_CONTENT_HEIGHT_MM = 150;

    const pages: typeof flatWeeks[] = [];
    let currentPage: typeof flatWeeks = [];
    let currentHeightMm = HEADER_HEIGHT_MM; // Initial height includes the header

    flatWeeks.forEach(week => {
        if (currentHeightMm + weekHeightMm > MAX_PAGE_CONTENT_HEIGHT_MM) {
            // Push current page and start new one
            if (currentPage.length > 0) {
                pages.push(currentPage);
            }
            currentPage = [];
            currentHeightMm = HEADER_HEIGHT_MM;
        }
        
        currentPage.push(week);
        currentHeightMm += weekHeightMm;
    });

    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return { printPages: pages, maxRowDepth: finalMaxDepth };
  }, [monthlyData, tasksToRender, monthColorMap]);

  const uniformWeekHeight = `calc(1.75rem + ${maxRowDepth * 2.25}rem)`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 flex flex-col view-container" style={{ height: 'calc(100vh - 120px)' }}>
      {(unitsInUse.length > 0 || allMonths.length > 0) && (
        <div className="bg-slate-50 rounded-md border border-slate-200 mb-1 flex-shrink-0">
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="w-full flex items-center justify-between p-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            aria-expanded={isFilterVisible}
            aria-controls="filter-panel"
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">🎨</span>
              <span>圖例與篩選</span>
            </div>
            <span className={`text-base text-slate-500 transform transition-transform duration-300 ${isFilterVisible ? 'rotate-180' : ''}`}>▼</span>
          </button>
          <div
            id="filter-panel"
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-[500px]' : 'max-h-0'}`}
          >
            <div className="p-3 border-t border-slate-200 flex-shrink-0 flex">
              {allMonths.length > 0 && (
                  <div className="w-1/4 pr-4 flex-shrink-0">
                      <div className="flex flex-col space-y-2">
                          {Array.from(monthColorMap.entries()).map(([monthKey, color]) => (
                              <div key={monthKey} className="flex items-center p-1 rounded-md text-left">
                                  <div className="w-4 h-4 rounded-sm mr-2 shadow-inner flex-shrink-0" style={{ backgroundColor: color }}></div>
                                  <span className="text-sm text-slate-600">
                                      {format(new Date(monthKey + '-01T00:00:00'), 'yyyy / M', { locale: zhTW })}
                                  </span>
                              </div>
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
        <div className="sticky top-0 bg-white z-20 border-b-2 border-slate-200 print:hidden">
          <div className="relative">
            {selectedTaskIds.length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
                  <div className="bg-white p-2 rounded-lg shadow-lg flex items-center space-x-2 border border-slate-200">
                      <span className="text-sm font-semibold text-slate-600 px-2">
                          已選({selectedTaskIds.length})
                      </span>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <button onClick={() => onExportSelectedTasks(selectedTaskIds)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="將選取的任務匯出為 .ics 檔案"><span className="mr-2">📤</span>匯出</button>
                      <button onClick={handleDeleteClick} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="刪除選取的任務"><span className="mr-2">🗑️</span>刪除</button>
                      {selectedTaskIds.length > 1 && (<button onClick={onCreateGroup} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-300 text-sm flex items-center" title="將選取的任務建立時間關聯"><span className="mr-2">🔗</span>關聯</button>)}
                  </div>
                </div>
            )}
            <div className="grid grid-cols-7 text-center font-bold text-slate-600">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (<div key={day} className="py-2">{day}</div>))}
            </div>
          </div>
        </div>

        <div>
          {printPages.map((pageWeeks, pageIndex) => (
            <div key={pageIndex} className="print-page-block break-after-page">
                {/* 
                    Header Logic:
                    - Screen Mode: Hidden (using sticky header instead).
                    - Print Mode: Visible for EVERY page block.
                */}
                <div className={`hidden print:grid grid-cols-7 text-center font-bold text-slate-800 border-b border-slate-800 mb-1 ${pageIndex === 0 ? 'mt-0' : 'mt-4'}`}>
                     {['日', '一', '二', '三', '四', '五', '六'].map(day => (<div key={day} className="py-1">{day}</div>))}
                </div>

                {pageWeeks.map(({ week, taskLayoutRows, monthColor }) => {
                    const weekStart = week[0];
                    const monthOfFirstDay = startOfMonth(week[0]);

                    return (
                    <div key={weekStart.toISOString()} className="flex border-t border-slate-200 break-inside-avoid">
                        <div className="w-2.5 flex-shrink-0" style={{ backgroundColor: monthColor }}></div>
                        <div className="grid grid-cols-7 flex-grow relative" style={{ minHeight: uniformWeekHeight }}>
                        {week.map((day) => (
                            <div
                            key={day.toISOString()}
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
                        <div className={`absolute top-0 left-0 right-0 bottom-0 mt-[1.75rem] px-1 ${draggingTaskId !== null ? 'pointer-events-none' : ''}`}>
                            {taskLayoutRows.map(({ task, row, startDay, span }) => {
                            const isResizingThisTask = resizingInfo?.taskId === task.id;
                            return (
                                <CalendarTask
                                    key={task.id}
                                    task={task}
                                    weekStart={weekStart}
                                    startDay={startDay}
                                    span={span}
                                    row={row}
                                    draggingTaskId={draggingTaskId}
                                    isResizingThisTask={isResizingThisTask}
                                    touchedTaskIds={touchedTaskIds}
                                    selectedTaskIds={selectedTaskIds}
                                    taskGroupMap={taskGroupMap}
                                    unitColorMap={unitColorMap}
                                    onDragStart={handleDragStart}
                                    setDraggingTaskId={setDraggingTaskId}
                                    onSelectTask={onSelectTask}
                                    onEditTask={onEditTask}
                                    onUngroupTask={onUngroupTask}
                                    handleResizeMouseDown={handleResizeMouseDown}
                                    isEditMode={isEditMode}
                                />
                            );
                            })}
                        </div>
                        </div>
                    </div>
                    );
                })}
            </div>
          ))}
        </div>
      </div>
      <DayViewModal date={dayViewDate} onClose={() => setDayViewDate(null)} tasks={filteredTasks} taskGroups={taskGroups} executingUnits={executingUnits} onEditTask={(task) => { setDayViewDate(null); onEditTask(task); }} onAddTaskForDate={(date) => { setDayViewDate(null); onOpenAddTaskModal(date); }} />
    </div>
  );
};

export default CalendarView;
