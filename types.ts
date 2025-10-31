export interface Project {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tasks: Task[];
  taskGroups: TaskGroup[];
}

export interface Task {
  id: number;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  predecessorId?: number;
  groupId?: string;
}

export enum ViewMode {
  Gantt = 'gantt',
  Calendar = 'calendar',
  Group = 'group',
}

export interface Warning {
  taskId: number;
  message: string;
}

export interface TaskGroup {
  id: string;
  name?: string;
  taskIds: number[];
  color: string;
}