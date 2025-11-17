export interface Project {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tasks: Task[];
  taskGroups: TaskGroup[];
  lastModified?: Date;
  lastModifiedBy?: string;
  executingUnits?: ExecutingUnit[]; // 雖然執行單位是全域的，但保留此欄位可相容舊的專案檔
}

export interface Task {
  id: number;
  name: string;
  start: Date;
  end: Date;
  predecessorId?: number;
  groupId?: string;
  executingUnit?: string;
  notes?: string;
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

export interface ExecutingUnit {
  name: string;
  color: string;
}

// 用於儲存可撤銷的專案狀態快照
export type ProjectStateSnapshot = Pick<Project, 'tasks' | 'taskGroups'>;