

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, Warning, TaskGroup, ExecutingUnit } from '../types';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { zhTW } from 'date-fns/locale/zh-TW';

const ROW_HEIGHT = 40;
const DAY_WIDTH = 40;

interface GanttTaskBarProps {
  task: Task;
  isWarning: boolean;
  left: number;
  width: number;
  top: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number) => void;
  onDragEnd: () => void;
  onDoubleClick: (task: Task) => void;
  groupColor?: string;
  taskColor?: string;
  onResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, task: Task, side: 'start' | 'end') => void;
  isResizing: boolean;
  isDragging: boolean;
  isEditMode: boolean;
}

const GanttTaskBar: React.FC<GanttTaskBarProps> = ({ task, isWarning, left, width, top, onDragStart, onDragEnd, onDoubleClick, groupColor, taskColor, onResizeMouseDown, isResizing, isDragging, isEditMode }) => {
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

  return (
    <div
      draggable={isEditMode && !isResizing}
      onDragStart={(e) => {
        if(!isEditMode || isResizing) { e.preventDefault(); return; }
        onDragStart(e, task.id);
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onDoubleClick(task)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute h-8 px-2 flex items-center rounded-lg transition-all duration-200 group ${isEditMode ? (isResizing ? 'cursor-col-resize' : 'cursor-grab active:cursor-grabbing') : 'cursor-default'} ${isDragging ? 'opacity-40' : ''} z-20`}
      style={{ left: `${left}px`, width: `${width}px`, top: `${top}px` }}
    >
      <div
        className={`w-full h-full rounded-md flex items-center justify-start text-white transition-colors relative`}
        style={{ 
          backgroundColor: isWarning ? '#ef4444' : taskColor || '#3b82f6',
          borderLeft: groupColor ? `5px solid ${groupColor}` : 'none'
        }}
      >
        <div 
            onMouseDown={(e) => isEditMode && onResizeMouseDown(e, task, 'start')}
            className={`absolute left-0 top-0 bottom-0 w-2 z-10 opacity-50 hover:opacity-100 bg-black/20 rounded-l-md ${isEditMode ? 'cursor-col-resize' : 'cursor-default'}`}
        />
        <span className="relative text-xs font-semibold truncate px-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{task.name}</span>
        <div 
            onMouseDown={(e) => isEditMode && onResizeMouseDown(e, task, 'end')}
            className={`absolute right-0 top-0 bottom-0 w-2 z-10 opacity-50 hover:opacity-100 bg-black/20 rounded-r-md ${isEditMode ? 'cursor-col-resize' : 'cursor-default'}`}
        />
      </div>
      {showTooltip && task.notes && (
        <div className="absolute bottom-full mb-2 w-max max-w-xs bg-slate-800 text-white text-xs rounded py-1 px-2 z-50 shadow-lg whitespace-pre-wrap" style={{ left: 0 }}>
          {task.notes}
        </div>
      )}
    </div>
  );
};


const GanttChartView: React.FC<{
  tasks: Task[];
  warnings: Warning[];
  onDragTask: (taskId: number, newStartDate: Date) => void;
  onResizeTask: (taskId: number, newStartDate: Date, newEndDate: Date) => void;
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: ExecutingUnit[];
  isEditMode: boolean;
}> = ({ tasks, warnings, onDragTask, onResizeTask, taskGroups, onEditTask, executingUnits, isEditMode }) => {
  const [timelineWidth, setTimelineWidth] = useState(2000);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [deselectedUnits, setDeselectedUnits] = useState<Set<string>>(new Set());

  // Interactivity State
  const [resizingInfo, setResizingInfo] = useState<{ taskId: number; side: 'start' | 'end'; originalTask: Task } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ start: Date; end: Date } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverPreview, setDragOverPreview] = useState<{ left: number; top: number; width: number } | null>(null);

  const resizeInfoRef = useRef<{ info: typeof resizingInfo; preview: typeof resizePreview }>({ info: resizingInfo, preview: resizePreview });
  useEffect(() => {
    resizeInfoRef.current = { info: resizingInfo, preview: resizePreview };
  }, [resizingInfo, resizePreview]);


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
        !task.executingUnit || !deselectedUnits.has(task.executingUnit)
    );
  }, [tasks, deselectedUnits]);
  
  const sortedTasks = useMemo(() => {
      return filteredTasks.slice().sort((a,b) => a.start.getTime() - b.start.getTime() || a.id - b.id);
  }, [filteredTasks]);

  const visualIndexMap = useMemo(() => {
    return new Map<number, number>(sortedTasks.map((t, i) => [t.id, i]));
  }, [sortedTasks]);
  
  const { startDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { startDate: today, totalDays: 30 };
    }
    const startDates = tasks.map(t => t.start);
    const endDates = tasks.map(t => t.end);
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    return {
      startDate: startOfDay(minDate),
      totalDays: differenceInDays(addDays(maxDate, 5), minDate)
    };
  }, [tasks]);

  const months = useMemo(() => {
    const monthMap = new Map<string, { name: string; dayCount: number }>();
    if (totalDays <= 0) return [];

    for (let i = 0; i < totalDays; i++) {
        const day = addDays(startDate, i);
        const monthKey = format(day, 'yyyy-MM');
        const monthName = format(day, 'M月', { locale: zhTW });
        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, { name: monthName, dayCount: 0 });
        }
        monthMap.get(monthKey)!.dayCount++;
    }
    return Array.from(monthMap.values());
  }, [startDate, totalDays]);

  React.useEffect(() => {
    setTimelineWidth(totalDays * DAY_WIDTH);
  }, [totalDays]);

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, task: Task, side: 'start' | 'end') => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setResizingInfo({ taskId: task.id, side, originalTask: task });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { info } = resizeInfoRef.current;
      if (!info || !gridContainerRef.current || !scrollContainerRef.current) return;

      const { originalTask, side } = info;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      const daysOffset = Math.max(0, Math.round(x / DAY_WIDTH));
      const currentDate = startOfDay(addDays(startDate, daysOffset));

      let newPreview;
      if (side === 'start') {
        newPreview = {
          start: isAfter(currentDate, originalTask.end) ? originalTask.end : currentDate,
          end: originalTask.end,
        };
      } else { // 'end'
        newPreview = {
          start: originalTask.start,
          end: isBefore(currentDate, originalTask.start) ? originalTask.start : currentDate,
        };
      }
      setResizePreview(newPreview);
    };

    const handleMouseUp = () => {
      const { info, preview } = resizeInfoRef.current;
      if (info && preview) {
        onResizeTask(info.taskId, preview.start, preview.end);
      }
      setResizingInfo(null);
      setResizePreview(null);
    };

    if (resizingInfo) {
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
  }, [resizingInfo, onResizeTask, startDate]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    if (!isEditMode) return;
    e.dataTransfer.setData('taskId', taskId.toString());
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setTimeout(() => setDraggedItemId(taskId), 0);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isEditMode) return;

    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!gridContainerRef.current || !scrollContainerRef.current || !taskId) return;

    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const daysOffset = Math.round(x / DAY_WIDTH);
    const newStartDate = startOfDay(addDays(startDate, daysOffset));
    onDragTask(taskId, newStartDate);
    
    setDraggedItemId(null);
    setDragOverPreview(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isEditMode) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    if (!draggedItemId || !gridContainerRef.current || !scrollContainerRef.current) return;
    
    const task = tasks.find(t => t.id === draggedItemId);
    if (!task) return;

    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const y = e.clientY - rect.top;

    const daysOffset = Math.max(0, Math.round(x / DAY_WIDTH));
    const visualIndex = Math.max(0, Math.floor(y / ROW_HEIGHT));

    const taskDurationDays = differenceInDays(task.end, task.start) + 1;

    setDragOverPreview({
      left: daysOffset * DAY_WIDTH,
      top: visualIndex * ROW_HEIGHT + (ROW_HEIGHT - 32) / 2,
      width: taskDurationDays * DAY_WIDTH - 4,
    });
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (gridContainerRef.current && !gridContainerRef.current.contains(e.relatedTarget as Node)) {
        setDragOverPreview(null);
    }
  };

  const handleDragEnd = () => {
      setDraggedItemId(null);
      setDragOverPreview(null);
  };

  const finalTasksToRender = useMemo(() => {
    if (resizingInfo && resizePreview) {
      return sortedTasks.map(task => 
        task.id === resizingInfo.taskId 
          ? { ...task, start: resizePreview.start, end: resizePreview.end }
          : task
      );
    }
    return sortedTasks;
  }, [sortedTasks, resizingInfo, resizePreview]);

  const unitColorMap = useMemo(() => {
    return new Map(executingUnits.map(u => [u.name, u.color]));
  }, [executingUnits]);

  const unitsInUse = useMemo(() => executingUnits.filter(u => tasks.some(t => t.executingUnit === u.name)), [executingUnits, tasks]);

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col view-container" style={{ height: 'calc(100vh - 120px)' }}>
      {(unitsInUse.length > 0 || warnings.length > 0) && (
        <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-lg flex justify-between items-center flex-shrink-0">
            <div className="flex-1">
                {unitsInUse.length > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {unitsInUse.map(unit => (
                            <button key={unit.name} className="flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-200 transition-colors" onClick={() => handleToggleUnit(unit.name)}>
                                <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: unit.color }}></div>
                                <span className={`text-sm text-slate-600 ${deselectedUnits.has(unit.name) ? 'line-through text-slate-400' : ''}`}>{unit.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {warnings.length > 0 && (
                <div className="ml-4 flex-shrink-0 flex items-center text-red-600 bg-red-100 border border-red-300 rounded-full px-4 py-1 animate-pulse">
                    <span className="text-xl mr-2">⚠️</span>
                    <span className="font-bold text-sm">排程衝突: {warnings.length} 處</span>
                </div>
            )}
        </div>
      )}
      <div className="overflow-x-auto overflow-y-auto gantt-print-container flex-grow" ref={scrollContainerRef}>
        <div style={{ width: timelineWidth }}>
          {/* Chart */}
          <div 
            className="relative" 
          >
            {/* Timeline Header */}
            <div className="sticky top-0 bg-white z-10">
              {/* Month Row */}
              <div className="flex border-b border-slate-200" style={{ width: timelineWidth }}>
                {months.map((month, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-center border-r border-slate-200 h-8"
                    style={{ width: month.dayCount * DAY_WIDTH }}
                  >
                    <span className="text-sm font-bold text-slate-800">{month.name}</span>
                  </div>
                ))}
              </div>
              {/* Day Row */}
              <div className="flex" style={{ width: timelineWidth }}>
                {[...Array(totalDays)].map((_, i) => {
                  const day = addDays(startDate, i);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div 
                      key={i} 
                      className={`flex flex-shrink-0 items-center justify-center border-r border-b border-slate-200 h-8 ${isWeekend ? 'bg-pink-50' : ''}`} 
                      style={{ width: DAY_WIDTH }}
                    >
                      <span className={`text-xs font-semibold ${isWeekend ? 'text-pink-600' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Grid and Tasks */}
            <div 
              className="relative" 
              ref={gridContainerRef}
              style={{ height: sortedTasks.length * ROW_HEIGHT }}
              onDrop={handleDrop} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Vertical Grid lines */}
              {[...Array(totalDays)].map((_, i) => {
                const day = addDays(startDate, i);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 border-r border-slate-200 ${isWeekend ? 'bg-pink-50' : ''}`}
                    style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  ></div>
                );
              })}
              {/* Horizontal Grid lines */}
              {sortedTasks.map((_, index) => (
                <div key={index} className="absolute left-0 right-0 border-b border-slate-200" style={{ top: (index + 1) * ROW_HEIGHT }}></div>
              ))}
              
              {/* Dependency Lines */}
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" 
                style={{ width: timelineWidth, height: sortedTasks.length * ROW_HEIGHT }}
              >
                <defs>
                  <marker 
                    id="arrow-default" 
                    viewBox="0 0 10 10" 
                    refX="8" refY="5" 
                    markerWidth="6" markerHeight="6" 
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#a0aec0" />
                  </marker>
                  <marker 
                    id="arrow-warning" 
                    viewBox="0 0 10 10" 
                    refX="8" refY="5" 
                    markerWidth="6" markerHeight="6" 
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                  </marker>
                </defs>
                {finalTasksToRender.map(task => {
                  if (!task.predecessorId) return null;

                  const predecessor = tasks.find(t => t.id === task.predecessorId);
                  if (!predecessor) return null;
                  
                  const successorIndex = visualIndexMap.get(task.id);
                  const predecessorIndex = visualIndexMap.get(predecessor.id);

                  if (successorIndex === undefined || predecessorIndex === undefined) return null;
                  
                  const fromX = (differenceInDays(predecessor.end, startDate) + 1) * DAY_WIDTH - 4;
                  const fromY = predecessorIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const toX = differenceInDays(task.start, startDate) * DAY_WIDTH;
                  const toY = successorIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                  
                  const isWarning = warnings.some(w => w.taskId === task.id);
                  const strokeColor = isWarning ? '#ef4444' : '#a0aec0';
                  const markerId = isWarning ? 'arrow-warning' : 'arrow-default';

                  const horizontalOffset = 15;
                  const pathData = `M ${fromX} ${fromY} H ${fromX + horizontalOffset} V ${toY} H ${toX}`;

                  return (
                    <path
                      key={`${predecessor.id}-${task.id}`}
                      d={pathData}
                      stroke={strokeColor}
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#${markerId})`}
                    />
                  );
                })}
              </svg>

              {/* Drag Preview */}
              {dragOverPreview && (
                <div 
                  className="absolute h-8 rounded-lg bg-blue-300 opacity-70 z-30 pointer-events-none"
                  style={{
                    left: dragOverPreview.left,
                    top: dragOverPreview.top,
                    width: dragOverPreview.width,
                  }}
                />
              )}

              {/* Task Bars */}
              {finalTasksToRender.map(task => {
                const visualIndex = visualIndexMap.get(task.id);
                if (visualIndex === undefined) return null;

                const top = visualIndex * ROW_HEIGHT + (ROW_HEIGHT - 32) / 2;
                const left = differenceInDays(task.start, startDate) * DAY_WIDTH;
                const width = (differenceInDays(task.end, task.start) + 1) * DAY_WIDTH - 4;
                const isWarning = warnings.some(w => w.taskId === task.id);
                
                const group = task.groupId ? taskGroups.find(g => g.id === task.groupId) : undefined;
                const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;
                
                const isResizingThisTask = resizingInfo?.taskId === task.id;
                const isDraggingThisTask = draggedItemId === task.id;
                
                return (
                  <GanttTaskBar
                    key={task.id}
                    task={task}
                    isWarning={isWarning}
                    left={left}
                    width={width}
                    top={top}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={onEditTask}
                    groupColor={group?.color}
                    taskColor={taskColor}
                    onResizeMouseDown={handleResizeMouseDown}
                    isResizing={isResizingThisTask}
                    isDragging={isDraggingThisTask}
                    isEditMode={isEditMode}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChartView;