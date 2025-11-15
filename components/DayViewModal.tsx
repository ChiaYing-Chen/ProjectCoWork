import React from 'react';
import { Task, TaskGroup } from '../types';
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
  executingUnits: string[];
  onEditTask: (task: Task) => void;
  getUnitColor: (unit: string, allUnits: string[]) => string;
}

const DayViewModal: React.FC<DayViewModalProps> = ({
  date,
  onClose,
  tasks,
  taskGroups,
  executingUnits,
  onEditTask,
  getUnitColor
}) => {
  if (!date) {
    return null;
  }

  const dayTasks = tasks.filter(t => format(t.start, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));

  const taskGroupMap = new Map<string, TaskGroup>();
  taskGroups.forEach(group => taskGroupMap.set(group.id, group));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-0 w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
                {format(date, 'yyyy年 MMMM d日 (EEEE)', { locale: zhTW })}
            </h2>
            <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {dayTasks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">這天沒有排定的任務。</p>
          ) : (
            <div className="space-y-2">
              {dayTasks.sort((a,b) => a.id - b.id).map(task => {
                  const group = task.groupId ? taskGroupMap.get(task.groupId) : undefined;
                  const taskColor = task.executingUnit ? getUnitColor(task.executingUnit, executingUnits) : undefined;
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
      </div>
    </div>
  );
};

export default DayViewModal;
