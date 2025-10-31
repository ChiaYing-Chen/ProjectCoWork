import React, { useMemo, useState, useRef } from 'react';
import { Task, Warning, TaskGroup } from '../types';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';

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
}

const GanttTaskBar: React.FC<GanttTaskBarProps> = ({ task, isWarning, left, width, top, onDragStart, onDoubleClick, groupColor }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      className={`absolute h-8 px-2 flex items-center rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 group`}
      style={{ left: `${left}px`, width: `${width}px`, top: `${top}px` }}
    >
      <div
        className={`w-full h-full rounded-md flex items-center justify-between text-white ${
          isWarning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        }`}
        style={{ borderLeft: groupColor ? `5px solid ${groupColor}` : 'none' }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-blue-400 rounded-l-md"
          style={{ width: `${task.progress}%`, marginLeft: groupColor ? '5px' : '0' }}
        ></div>
        <span className="relative text-xs font-semibold truncate px-2">{task.name}</span>
        <span className="relative text-xs font-light pr-2">{task.progress}%</span>
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
}> = ({ tasks, warnings, onDragTask, taskGroups, onEditTask }) => {
  const [timelineWidth, setTimelineWidth] = useState(2000);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { startDate: today, endDate: addDays(today, 30), totalDays: 30 };
    }
    const startDates = tasks.map(t => t.start);
    const endDates = tasks.map(t => t.end);
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    return {
      startDate: startOfDay(minDate),
      endDate: startOfDay(addDays(maxDate, 5)), // Add some buffer
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

        const startX = (differenceInDays(predecessor.end, startDate)) * DAY_WIDTH + DAY_WIDTH / 2;
        const startY = tasks.indexOf(predecessor) * ROW_HEIGHT + ROW_HEIGHT / 2;
        const endX = (differenceInDays(task.start, startDate)) * DAY_WIDTH + DAY_WIDTH / 2;
        const endY = tasks.indexOf(task) * ROW_HEIGHT + ROW_HEIGHT / 2;
        const isWarning = warnings.some(w => w.taskId === task.id);

        return {
            id: `${predecessor.id}-${task.id}`,
            isWarning,
            path: `M ${startX} ${startY} L ${startX + 20} ${startY} L ${startX + 20} ${endY} L ${endX} ${endY}`
        };
    }).filter(Boolean);
  }, [tasks, startDate, warnings]);

  const taskGroupMap = useMemo(() => {
    const map = new Map<string, TaskGroup>();
    taskGroups.forEach(group => map.set(group.id, group));
    return map;
  }, [taskGroups]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {taskGroups.length > 0 && (
        <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-md font-semibold mb-2 text-slate-700">時間關聯群組圖例</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {taskGroups.map((group, index) => (
                    <div key={group.id} className="flex items-center">
                        <div className="w-4 h-4 rounded-sm mr-2 shadow-inner" style={{ backgroundColor: group.color }}></div>
                        <span className="text-sm text-slate-600">群組 {index + 1}</span>
                    </div>
                ))}
            </div>
        </div>
      )}
      <div className="flex">
        {/* Sidebar */}
        <div className="flex-shrink-0 bg-slate-50 border-r border-slate-200" style={{ width: `${SIDEBAR_WIDTH}px` }}>
          <div className="h-16 flex items-center px-4 font-semibold text-slate-700 border-b border-slate-200">
            任務名稱
          </div>
          <div className="relative">
            {tasks.map((task, index) => (
              <div key={task.id} className="h-10 flex items-center px-4 text-sm truncate border-b border-slate-200" style={{top: `${index * ROW_HEIGHT}px`}}>
                {task.name}
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-grow overflow-x-auto">
          <div className="relative" style={{ height: `${tasks.length * ROW_HEIGHT + 64}px`, width: `${timelineWidth}px` }} ref={chartContainerRef} onDrop={handleDrop} onDragOver={handleDragOver}>
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
             <div className="absolute top-16 left-0 w-full" style={{height: `${tasks.length * ROW_HEIGHT}px`}}>
               {Array.from({ length: totalDays }).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100" style={{ left: `${i * DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }}></div>
                ))}
                {tasks.map((_, i) => (
                     <div key={i} className="absolute left-0 right-0 border-b border-slate-100" style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}></div>
                ))}
            </div>

            {/* Dependency Lines */}
            <svg className="absolute top-16 left-0 w-full h-full pointer-events-none" style={{height: `${tasks.length * ROW_HEIGHT}px`}}>
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
            {tasks.map((task, index) => {
              const left = (differenceInDays(task.start, startDate)) * DAY_WIDTH;
              const width = (differenceInDays(task.end, task.start) + 1) * DAY_WIDTH - 4; // a bit of padding
              const isWarning = warnings.some(w => w.taskId === task.id);
              const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;

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