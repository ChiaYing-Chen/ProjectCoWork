
import React, { useMemo, useState, useRef } from 'react';
import { Task, Warning, TaskGroup, ExecutingUnit } from '../types';
// FIX: Update date-fns imports for v3 compatibility.
import { format, differenceInDays, addDays } from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { zhTW } from 'date-fns/locale/zh-TW';

const ROW_HEIGHT = 40;
const DAY_WIDTH = 40;
const SIDEBAR_WIDTH = 250;

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
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
  taskGroups: TaskGroup[];
  onEditTask: (task: Task) => void;
  executingUnits: ExecutingUnit[];
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

  const unitColorMap = useMemo(() => {
    return new Map(executingUnits.map(u => [u.name, u.color]));
  }, [executingUnits]);

  const unitsInUse = useMemo(() => executingUnits.filter(u => tasks.some(t => t.executingUnit === u.name)), [executingUnits, tasks]);

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col view-container">
      {(taskGroups.length > 0 || unitsInUse.length > 0) && (
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4 rounded-t-lg">
            {taskGroups.length > 0 && (
                <div>
                    <h3 className="text-md font-semibold mb-2 text-slate-700">時間關聯群組圖例</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {taskGroups.map((group, index) => (
                            <div key={group.id} className="flex items-center">
                                <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ borderLeft: `4px solid ${group.color}` }}></div>
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
      <div className="overflow-x-auto gantt-print-container">
        <div className="flex" style={{ width: SIDEBAR_WIDTH + timelineWidth }}>
          {/* Sidebar */}
          <div className="w-[250px] flex-shrink-0 border-r border-slate-200 bg-slate-50 sticky left-0 z-20">
            <div className="h-16 flex items-center px-4 border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
              <h3 className="font-bold text-slate-700">任務名稱</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredTasks.map((task) => (
                <div key={task.id} className="h-10 flex items-center px-4 text-sm text-slate-600" style={{ height: ROW_HEIGHT }}>
                  <span className="truncate">{task.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="relative" ref={chartContainerRef} onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Timeline Header */}
            <div className="sticky top-0 bg-white z-10">
              <div className="flex" style={{ width: timelineWidth }}>
                {[...Array(totalDays)].map((_, i) => {
                  const day = addDays(startDate, i);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={i} className={`flex-shrink-0 border-r border-b border-slate-200 text-center ${isWeekend ? 'bg-slate-50' : ''}`} style={{ width: DAY_WIDTH }}>
                      <div className="text-xs text-slate-500">{format(day, 'EEE', { locale: zhTW })}</div>
                      <div className="text-sm font-semibold text-slate-700">{format(day, 'd')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Grid and Tasks */}
            <div className="relative" style={{ height: filteredTasks.length * ROW_HEIGHT }}>
              {/* Vertical Grid lines */}
              {[...Array(totalDays)].map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-slate-200" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}></div>
              ))}
              {/* Horizontal Grid lines */}
              {filteredTasks.map((_, index) => (
                <div key={index} className="absolute left-0 right-0 border-b border-slate-200" style={{ top: (index + 1) * ROW_HEIGHT }}></div>
              ))}

              {/* Task Bars */}
              {filteredTasks.map(task => {
                const visualIndex = visualIndexMap.get(task.id);
                if (visualIndex === undefined) return null;

                const top = visualIndex * ROW_HEIGHT + (ROW_HEIGHT - 32) / 2;
                const left = differenceInDays(task.start, startDate) * DAY_WIDTH;
                const width = (differenceInDays(task.end, task.start) + 1) * DAY_WIDTH - 4;
                const isWarning = warnings.some(w => w.taskId === task.id);
                
                const group = task.groupId ? taskGroups.find(g => g.id === task.groupId) : undefined;
                const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;
                
                return (
                  <GanttTaskBar
                    key={task.id}
                    task={task}
                    isWarning={isWarning}
                    left={left}
                    width={width}
                    top={top}
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