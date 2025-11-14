
import React, { useMemo, useState, useRef } from 'react';
import { Task, Warning, TaskGroup } from '../types';
// FIX: Update date-fns imports for v3 compatibility.
import { format, differenceInDays, addDays } from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';

const ROW_HEIGHT = 40;
const DAY_WIDTH = 40;
const SIDEBAR_WIDTH = 250;
const UNIT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#22d3ee', '#a3e635', '#818cf8'];

const getUnitColor = (unit: string, allUnits: string[]) => {
    const index = allUnits.indexOf(unit);
    if (index === -1) return '#a1a1aa'; // zinc-400 for unlisted units
    return UNIT_COLORS[index % UNIT_COLORS.length];
};

interface GanttTaskBarProps {
  task: Task;
  isWarning: boolean;
  left: number;
  width: number;
  top: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: number) => void;
  onDoubleClick: (task: Task) => void;
  groupColor?: string;
  taskColor?: string;
}

const GanttTaskBar: React.FC<GanttTaskBarProps> = ({ task, isWarning, left, width, top, onDragStart, onDoubleClick, groupColor, taskColor }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      className={`absolute h-8 px-2 flex items-center rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 group`}
      style={{ left: `${left}px`, width: `${width}px`, top: `${top}px` }}
    >
      <div
        className={`w-full h-full rounded-md flex items-center justify-start text-white transition-colors`}
        style={{ 
          backgroundColor: isWarning ? '#ef4444' : taskColor || '#3b82f6',
          borderLeft: groupColor ? `5px solid ${groupColor}` : 'none'
        }}
      >
        <span className="relative text-xs font-semibold truncate px-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{task.name}</span>
      </div>
    </div>
  );
};


const GanttChartView: React.FC<{
  tasks: Task[];
  warnings: Warning[];
  onDragTask: (taskId: number, newStartDate: Date) => void;
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: string[];
  selectedUnits: string[];
}> = ({ tasks, warnings, onDragTask, taskGroups, onEditTask, executingUnits, selectedUnits }) => {
  const [timelineWidth, setTimelineWidth] = useState(2000);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const filteredTasks = useMemo(() => {
    if (selectedUnits.length === 0) {
        return tasks;
    }
    return tasks.filter(task => 
        task.executingUnit && selectedUnits.includes(task.executingUnit)
    );
  }, [tasks, selectedUnits]);

  const visualIndexMap = useMemo(() => {
    return new Map<number, number>(filteredTasks.map((t, i) => [t.id, i]));
  }, [filteredTasks]);
  
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

  React.useEffect(() => {
    setTimelineWidth(totalDays * DAY_WIDTH);
  }, [totalDays]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    const target = e.target as HTMLElement;
    e.dataTransfer.setDragImage(target.parentElement || target, 20, 20);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'), 10);
    if (!chartContainerRef.current || !taskId) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const daysOffset = Math.floor(x / DAY_WIDTH);
    const newStartDate = addDays(startDate, daysOffset);
    onDragTask(taskId, newStartDate);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const dependencyLines = useMemo(() => {
    return tasks.filter(t => t.predecessorId).map(task => {
        const predecessor = tasks.find(p => p.id === task.predecessorId);
        if (!predecessor) return null;

        const startIndex = visualIndexMap.get(predecessor.id);
        const endIndex = visualIndexMap.get(task.id);

        if (startIndex === undefined || endIndex === undefined) return null;

        const startX = (differenceInDays(predecessor.end, startDate)) * DAY_WIDTH + DAY_WIDTH / 2;
        const startY = startIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const endX = (differenceInDays(task.start, startDate)) * DAY_WIDTH + DAY_WIDTH / 2;
        const endY = endIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        const isWarning = warnings.some(w => w.taskId === task.id);

        return {
            id: `${predecessor.id}-${task.id}`,
            isWarning,
            path: `M ${startX} ${startY} L ${startX + 20} ${startY} L ${startX + 20} ${endY} L ${endX} ${endY}`
        };
    }).filter(Boolean);
  }, [tasks, startDate, warnings, visualIndexMap]);

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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden view-container">
      {(taskGroups.length > 0 || unitsInUse.length > 0) && (
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
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
                            <div key={unit} className="flex items-center">
                                <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: unitColorMap.get(unit) }}></div>
                                <span className="text-sm text-slate-600">{unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
      <div className="flex">
        {/* Sidebar */}
        <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200" style={{ width: `${SIDEBAR_WIDTH}px` }}>
          <div className="h-16 flex items-center px-4 font-semibold text-slate-700 border-b border-slate-200">
            任務名稱
          </div>
          <div className="relative" style={{ height: `${filteredTasks.length * ROW_HEIGHT}px`}}>
            {filteredTasks.map((task, index) => (
              <div key={task.id} className="absolute w-full h-10 flex flex-col justify-center items-start px-4 truncate border-b border-slate-200" style={{top: `${index * ROW_HEIGHT}px`}}>
                <span className="text-sm text-slate-800">{task.name}</span>
                {task.executingUnit && <span className="text-xs text-slate-500">{task.executingUnit}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-grow overflow-x-auto gantt-chart-print-container">
          <div className="relative" style={{ height: `${filteredTasks.length * ROW_HEIGHT + 64}px`, width: `${timelineWidth}px` }} ref={chartContainerRef} onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10">
              <div className="flex h-16 border-b border-slate-200">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = addDays(startDate, i);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={i} className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-slate-200 ${isWeekend ? 'bg-slate-50' : ''}`} style={{ width: `${DAY_WIDTH}px` }}>
                       <span className="text-xs text-slate-500">{format(day, 'EEE')}</span>
                       <span className="text-sm font-medium">{format(day, 'd')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Grid */}
             <div className="absolute top-16 left-0 w-full" style={{height: `${filteredTasks.length * ROW_HEIGHT}px`}}>
               {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100" style={{ left: `${i * DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }}></div>
                ))}
                {filteredTasks.map((_, i) => (
                     <div key={i} className="absolute left-0 right-0 border-b border-slate-100" style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}></div>
                ))}
            </div>

            {/* Dependency Lines */}
            <svg className="absolute top-16 left-0 w-full h-full pointer-events-none" style={{height: `${filteredTasks.length * ROW_HEIGHT}px`}}>
                 {dependencyLines.map(line => line && (
                     <path key={line.id} d={line.path} stroke={line.isWarning ? '#ef4444' : '#94a3b8'} strokeWidth="2" fill="none" markerEnd="url(#arrow)"/>
                 ))}
                 <defs>
                     <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                         <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                     </marker>
                 </defs>
            </svg>

            {/* Task Bars */}
            <div className="absolute top-16 left-0">
            {filteredTasks.map((task, index) => {
              const left = (differenceInDays(task.start, startDate)) * DAY_WIDTH;
              const width = (differenceInDays(task.end, task.start) + 1) * DAY_WIDTH - 4; // a bit of padding
              const isWarning = warnings.some(w => w.taskId === task.id);
              const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
              const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;

              return (
                <GanttTaskBar
                  key={task.id}
                  task={task}
                  isWarning={isWarning}
                  left={left}
                  width={width}
                  top={index * ROW_HEIGHT + 4}
                  onDragStart={handleDragStart}
                  onDoubleClick={onEditTask}
                  groupColor={group?.color}
                  taskColor={taskColor}
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