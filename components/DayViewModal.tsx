

import React from 'react';
import { Task, TaskGroup, ExecutingUnit } from '../types';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';

// 為彈出視窗設計的本地、簡化版任務項目
const DayViewTaskItem: React.FC<{
  task: Task;
  group?: TaskGroup;
  taskColor?: string;
  onEditTask: (task: Task) => void;
}> = ({ task, group, taskColor, onEditTask }) => {
  return (
    <div
      onDoubleClick={() => onEditTask(task)}
      className="p-2 rounded-md text-sm cursor-pointer text-white relative transition-transform hover:scale-105"
      style={{
        backgroundColor: taskColor || '#3b82f6',
        borderLeft: group ? `4px solid ${group.color}` : 'none'
      }}
      title={`雙擊以編輯 "${task.name}"`}
    >
      <p className="font-semibold truncate">{task.name}</p>
      {task.executingUnit && <p className="text-xs opacity-80">{task.executingUnit}</p>}
    </div>
  );
};

interface DayViewModalProps {
  date: Date | null;
  onClose: () => void;
  tasks: Task[];
  taskGroups: TaskGroup[];
  executingUnits: ExecutingUnit[];
  onEditTask: (task: Task) => void;
  onAddTaskForDate: (date: Date) => void;
}

const DayViewModal: React.FC<DayViewModalProps> = ({
  date,
  onClose,
  tasks,
  taskGroups,
  executingUnits,
  onEditTask,
  onAddTaskForDate,
}) => {
  if (!date) {
    return null;
  }

  const dayTasks = tasks.filter(t => format(t.start, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));

  const taskGroupMap = new Map<string, TaskGroup>();
  taskGroups.forEach(group => taskGroupMap.set(group.id, group));

  const unitColorMap = new Map(executingUnits.map(u => [u.name, u.color]));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
                {format(date, 'yyyy年 MMMM d日 (EEEE)', { locale: zhTW })}
            </h2>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {dayTasks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">這天沒有排定的任務。</p>
          ) : (
            <div className="space-y-2">
              {dayTasks.sort((a,b) => a.id - b.id).map(task => {
                  const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
                  const taskColor = task.executingUnit ? unitColorMap.get(task.executingUnit) : undefined;
                  return (
                      <DayViewTaskItem
                          key={task.id}
                          task={task}
                          group={group}
                          taskColor={taskColor}
                          onEditTask={onEditTask}
                      />
                  );
              })}
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition"
            >
                關閉
            </button>
            <button
                onClick={() => onAddTaskForDate(date)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition flex items-center"
            >
                <span className="mr-2">➕</span>
                新增任務
            </button>
        </div>
      </div>
    </div>
  );
};

export default DayViewModal;