
import React, { useState, useCallback, useEffect } from 'react';
import { Task, ViewMode, Warning, TaskGroup, Project, ExecutingUnit } from './types';
import { parseMppFile } from './services/mppParser';
import Header from './components/Header';
import GanttChartView from './components/GanttChartView';
import CalendarView from './components/CalendarView';
import TaskFormModal from './components/AddTaskModal';
import Notification from './components/Notification';
import GroupRelationshipView from './components/GroupRelationshipView';
import ProjectListView from './components/ProjectListView';
import ProjectFormModal from './components/ProjectFormModal';
import SettingsModal from './components/SettingsModal';
import FilterBar from './components/FilterBar';
// FIX: Update date-fns imports for v3 compatibility.
import { addDays, differenceInBusinessDays, differenceInDays } from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const UNIT_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171', '#4ade80', '#fb923c', '#22d3ee', '#a3e635', '#818cf8'];

// Helper to revive dates from JSON serialization
const reviveDates = (project: any): Project => ({
  ...project,
  startDate: new Date(project.startDate),
  endDate: new Date(project.endDate),
  lastModified: project.lastModified ? new Date(project.lastModified) : undefined,
  tasks: (project.tasks || []).map((task: any) => ({
    ...task,
    start: new Date(task.start),
    end: new Date(task.end),
  })),
  taskGroups: project.taskGroups || [], // Ensure taskGroups exists
});

// A simple debounce hook
function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  wait: number
) {
  // FIX: Initialize useRef with null to provide an initial argument and improve robustness.
  const timeoutRef = React.useRef<number | null>(null);

  return React.useCallback(
    (...args: A) => {
      // FIX: Add a check to ensure timeoutRef.current is a valid ID before clearing.
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, wait);
    },
    [callback, wait]
  );
}


const App: React.FC = () => {
  const [storageKey, setStorageKey] = useState<string>(
    () => localStorage.getItem('project-scheduler-storage-key') || 'project-scheduler-data'
  );
  const [modifierName, setModifierName] = useState<string>(
    () => localStorage.getItem('project-scheduler-modifier-name') || '預設使用者'
  );
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Calendar);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const [executingUnits, setExecutingUnits] = useState<ExecutingUnit[]>([]);
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    const timer = setTimeout(() => {
        setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Load executing units from Local Storage on initial render
  useEffect(() => {
    try {
      const storedUnits = localStorage.getItem('project-scheduler-units');
      if (storedUnits) {
        const parsed = JSON.parse(storedUnits);
        // Migration logic: check if it's the old string[] format
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          const migratedUnits: ExecutingUnit[] = parsed.map((name, index) => ({
            name,
            color: UNIT_COLORS[index % UNIT_COLORS.length]
          }));
          setExecutingUnits(migratedUnits);
          localStorage.setItem('project-scheduler-units', JSON.stringify(migratedUnits));
        } else if (Array.isArray(parsed)) { // It's the new format
          setExecutingUnits(parsed);
        } else { // Data is corrupted or in an unknown format, reset to default
          throw new Error("Invalid format in local storage");
        }
      } else {
        const defaultUnits: ExecutingUnit[] = [
          { name: "W521", color: "#34d399" },
          { name: "W561", color: "#60a5fa" },
          { name: "W562", color: "#fbbf24" },
        ];
        setExecutingUnits(defaultUnits);
        localStorage.setItem('project-scheduler-units', JSON.stringify(defaultUnits));
      }
    } catch (e) {
      console.error("無法載入執行單位，重設為預設值:", e);
      const defaultUnits: ExecutingUnit[] = [
        { name: "W521", color: "#34d399" },
        { name: "W561", color: "#60a5fa" },
        { name: "W562", color: "#fbbf24" },
      ];
      setExecutingUnits(defaultUnits);
    }
  }, []);

  // Load projects from Local Storage on initial render or when storageKey changes
  useEffect(() => {
    setIsLoading(true);
    try {
        const storedProjects = localStorage.getItem(storageKey);
        if (storedProjects) {
            const parsedData = JSON.parse(storedProjects);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                const revivedProjects = parsedData.map(reviveDates);
                setProjects(revivedProjects);
                // We no longer set a default project, so the user starts at the project list.
            } else {
               setProjects([]);
            }
        } else {
            // No projects in storage for this key, create a sample one
            const today = startOfDay(new Date());
            const sampleProject: Project = {
                id: `proj-${Date.now()}`,
                name: '範例專案',
                startDate: today,
                endDate: addDays(today, 60),
                tasks: [
                    { id: 1, name: '專案啟動與規劃', start: addDays(today, 0), end: addDays(today, 4), progress: 100, executingUnit: '產品部', notes: '這是專案的關鍵第一步，需要與所有利害關係人對齊目標。' },
                    { id: 2, name: '需求訪談與分析', start: addDays(today, 2), end: addDays(today, 7), progress: 85, predecessorId: 1, executingUnit: '產品部' },
                    { id: 3, name: '系統架構設計', start: addDays(today, 8), end: addDays(today, 12), progress: 60, predecessorId: 2, executingUnit: '開發部', notes: '重點在於設計可擴展且穩定的後端架構。' },
                    { id: 4, name: 'UI/UX 設計', start: addDays(today, 8), end: addDays(today, 15), progress: 75, predecessorId: 2, executingUnit: '設計部' },
                    { id: 5, name: '資料庫設計', start: addDays(today, 13), end: addDays(today, 18), progress: 40, predecessorId: 3, executingUnit: '開發部' },
                    { id: 6, name: '前端開發', start: addDays(today, 16), end: addDays(today, 28), progress: 20, predecessorId: 4, executingUnit: '開發部', notes: '採用 React 框架，並確保響應式設計。' },
                    { id: 7, name: '後端開發', start: addDays(today, 19), end: addDays(today, 30), progress: 15, predecessorId: 5, executingUnit: '開發部' },
                    { id: 8, name: '整合測試', start: addDays(today, 31), end: addDays(today, 35), progress: 0, predecessorId: 7, executingUnit: '測試部' },
                    { id: 9, name: '使用者驗收測試 (UAT)', start: addDays(today, 36), end: addDays(today, 39), progress: 0, predecessorId: 8, executingUnit: '測試部' },
                    { id: 10, name: '部署上線', start: addDays(today, 40), end: addDays(today, 40), progress: 0, predecessorId: 9, executingUnit: '開發部', notes: '上線前需完成最後的資料備份與伺服器檢查。' },
                ],
                taskGroups: [],
                lastModified: new Date(),
                lastModifiedBy: '系統'
            };
            setProjects([sampleProject]);
            // We no longer automatically open the sample project.
        }
    } catch (error) {
        console.error("無法從 localStorage 載入專案:", error);
        showNotification("無法載入專案資料，您的瀏覽器儲存空間可能已損壞。", "error");
        setProjects([]);
        setCurrentProjectId(null);
    } finally {
        setIsLoading(false);
    }
  }, [storageKey, showNotification]);

  const saveProjectsToLocalStorage = useDebouncedCallback((projectsToSave: Project[]) => {
      try {
          localStorage.setItem(storageKey, JSON.stringify(projectsToSave));
          console.log(`Projects saved successfully to key: ${storageKey}`);
      } catch (error) {
          console.error("無法儲存專案至 localStorage:", error);
          showNotification("儲存專案失敗，您的變更可能不會保留。", "error");
      }
  }, 1000);

  // Save projects to Local Storage whenever they change
  useEffect(() => {
    if (!isLoading) {
        saveProjectsToLocalStorage(projects);
    }
  }, [projects, isLoading, saveProjectsToLocalStorage]);

  const currentProject = projects.find(p => p.id === currentProjectId);
  
  const checkForWarnings = useCallback((updatedTasks: Task[]) => {
    const newWarnings: Warning[] = [];
    for (const task of updatedTasks) {
      if (task.predecessorId) {
        const predecessor = updatedTasks.find(p => p.id === task.predecessorId);
        if (predecessor && task.start < predecessor.end) {
          newWarnings.push({
            taskId: task.id,
            message: `"${task.name}" 的開始時間早於其前置作業 "${predecessor.name}" 的結束時間。`,
          });
        }
      }
    }
    setWarnings(newWarnings);
  }, []);

  const updateCurrentProject = (updater: (project: Project) => Partial<Project>) => {
    const now = new Date();
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === currentProjectId ? { 
            ...p, 
            ...updater(p),
            lastModified: now,
            lastModifiedBy: modifierName 
        } : p
      )
    );
  };
  
  const handleFileImport = async (file: File) => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const parsedTasks = await parseMppFile(file);
      updateCurrentProject(proj => ({ ...proj, tasks: parsedTasks, name: proj.name || file.name }));
      checkForWarnings(parsedTasks);
    } catch (error) {
      console.error("檔案解析失敗:", error);
      showNotification("無法解析此檔案。請確認格式是否正確。", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragTask = useCallback((taskId: number, newStartDate: Date) => {
    if (!currentProject) return;
    const { tasks, taskGroups } = currentProject;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    const deltaDays = differenceInDays(newStartDate, taskToMove.start);
    if (deltaDays === 0) return;

    let updatedTasks = [...tasks];
    if (taskToMove.groupId) {
        const group = taskGroups.find(g => g.id === taskToMove.groupId);
        if (group) {
            const groupTaskIds = new Set(group.taskIds);
            updatedTasks = updatedTasks.map(task => {
                if (groupTaskIds.has(task.id)) {
                    const duration = differenceInBusinessDays(task.end, task.start);
                    const newStart = addDays(task.start, deltaDays);
                    const newEnd = addDays(newStart, duration);
                    return { ...task, start: newStart, end: newEnd };
                }
                return task;
            });
        }
    } else {
        const duration = differenceInBusinessDays(taskToMove.end, taskToMove.start);
        const newEndDate = addDays(newStartDate, duration);
        updatedTasks = tasks.map(task =>
            task.id === taskId ? { ...task, start: newStartDate, end: newEndDate } : task
        );
    }
    
    checkForWarnings(updatedTasks);
    updateCurrentProject(() => ({ tasks: updatedTasks }));
  }, [currentProject, checkForWarnings]);

  const handleSelectTask = useCallback((taskId: number, isCtrlOrMetaKey: boolean) => {
    if (isCtrlOrMetaKey) {
        setSelectedTaskIds(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    } else {
        setSelectedTaskIds([taskId]);
    }
  }, []);

  const handleMultiSelectTasks = useCallback((taskIds: number[]) => {
      setSelectedTaskIds(taskIds);
  }, []);

  const handleCreateGroup = useCallback(() => {
    if (!currentProject || selectedTaskIds.length < 2) return;
    const { tasks, taskGroups } = currentProject;

    const isDuplicate = selectedTaskIds.some(id => {
        const task = tasks.find(t => t.id === id);
        return task && task.groupId;
    });

    if (isDuplicate) {
        showNotification('選取的任務中，有任務已被關聯，無法重複關聯。', 'error');
        return;
    }

    const newGroupId = `group-${Date.now()}`;
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc'];
    const randomColor = colors[taskGroups.length % colors.length];

    const newGroup: TaskGroup = { id: newGroupId, taskIds: selectedTaskIds, color: randomColor };
    const newGroups = [...taskGroups, newGroup];
    const newTasks = tasks.map(task => 
        selectedTaskIds.includes(task.id) ? { ...task, groupId: newGroupId } : task
    );

    updateCurrentProject(() => ({ tasks: newTasks, taskGroups: newGroups }));
    setSelectedTaskIds([]);
  }, [currentProject, selectedTaskIds, showNotification]);

  const handleSaveTask = useCallback((taskData: { id?: number; name: string; start: Date; end: Date; executingUnit?: string; predecessorId?: number; notes?: string; }) => {
    if (!currentProject) return;
    
    // Add new executing unit to the list if it doesn't exist
    if (taskData.executingUnit && !executingUnits.some(u => u.name === taskData.executingUnit)) {
        const newUnit: ExecutingUnit = {
          name: taskData.executingUnit,
          color: UNIT_COLORS[executingUnits.length % UNIT_COLORS.length]
        };
        const newUnits = [...executingUnits, newUnit];
        setExecutingUnits(newUnits);
        localStorage.setItem('project-scheduler-units', JSON.stringify(newUnits));
    }

    updateCurrentProject(proj => {
        const { tasks } = proj;
        let newTasks;
        if (taskData.id) { // Update
            newTasks = tasks.map(task =>
                task.id === taskData.id
                    ? { ...task, name: taskData.name, start: taskData.start, end: taskData.end, executingUnit: taskData.executingUnit, predecessorId: taskData.predecessorId, notes: taskData.notes }
                    : task
            );
        } else { // Create
            const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
            const newTask: Task = {
                id: newId,
                name: taskData.name,
                start: taskData.start,
                end: taskData.end,
                progress: 0,
                executingUnit: taskData.executingUnit,
                predecessorId: taskData.predecessorId,
                notes: taskData.notes,
            };
            newTasks = [...tasks, newTask];
        }
        checkForWarnings(newTasks);
        return { tasks: newTasks };
    });
    setIsTaskFormOpen(false);
  }, [currentProject, checkForWarnings, executingUnits]);

  const handleUngroupTask = useCallback((taskIdToUngroup: number) => {
    if (!currentProject) return;
    updateCurrentProject(proj => {
        const { tasks, taskGroups } = proj;
        const taskToUngroup = tasks.find(t => t.id === taskIdToUngroup);
        if (!taskToUngroup || !taskToUngroup.groupId) return {};

        const groupId = taskToUngroup.groupId;
        const updatedGroups = taskGroups.map(group => 
            group.id === groupId 
            ? { ...group, taskIds: group.taskIds.filter(id => id !== taskIdToUngroup) } 
            : group
        );

        const targetGroup = updatedGroups.find(g => g.id === groupId);
        const shouldDissolveGroup = targetGroup && targetGroup.taskIds.length < 2;

        const finalGroups = shouldDissolveGroup ? updatedGroups.filter(g => g.id !== groupId) : updatedGroups;
        const finalTasks = tasks.map(task => {
            if (task.id === taskIdToUngroup || (shouldDissolveGroup && task.groupId === groupId)) {
                return { ...task, groupId: undefined };
            }
            return task;
        });

        setSelectedTaskIds(prev => prev.filter(id => id !== taskIdToUngroup));
        return { tasks: finalTasks, taskGroups: finalGroups };
    });
  }, [currentProject]);

  const handleDeleteTasks = useCallback((taskIdsToDelete: number[]) => {
    if (!currentProject) return;
    if (taskIdsToDelete.length === 0) return;

    const taskNoun = taskIdsToDelete.length > 1 ? `這 ${taskIdsToDelete.length} 項任務` : '此任務';
    if (!window.confirm(`您確定要刪除${taskNoun}嗎？此操作無法復原。`)) {
        return;
    }

    updateCurrentProject(proj => {
        const idsToDeleteSet = new Set(taskIdsToDelete);
        
        const newTasks = proj.tasks.filter(t => !idsToDeleteSet.has(t.id));
        
        const updatedGroupsResult = proj.taskGroups.map(group => {
            const newTaskIds = group.taskIds.filter(id => !idsToDeleteSet.has(id));
            return { ...group, taskIds: newTaskIds };
        }).reduce((acc, group) => {
            if (group.taskIds.length < 2) {
                acc.dissolvedGroupIds.add(group.id);
            } else {
                acc.finalGroups.push(group);
            }
            return acc;
        }, { finalGroups: [] as TaskGroup[], dissolvedGroupIds: new Set<string>() });

        const { finalGroups, dissolvedGroupIds } = updatedGroupsResult;

        const finalTasks = newTasks.map(task => {
            if (task.groupId && dissolvedGroupIds.has(task.groupId)) {
                return { ...task, groupId: undefined };
            }
            return task;
        });
        
        return { tasks: finalTasks, taskGroups: finalGroups };
    });

    setSelectedTaskIds([]);
    showNotification(`已成功刪除 ${taskIdsToDelete.length} 項任務`, 'success');
  }, [currentProject, updateCurrentProject, showNotification]);


  const openTaskFormForCreate = () => { setTaskToEdit(null); setIsTaskFormOpen(true); };
  const openTaskFormForEdit = (task: Task) => { setTaskToEdit(task); setIsTaskFormOpen(true); };
  
  const handleUpdateGroup = useCallback((groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'taskIds'>>) => {
      updateCurrentProject(proj => ({
          taskGroups: proj.taskGroups.map(g => g.id === groupId ? { ...g, ...updates } : g)
      }));
  }, []);

  const handleUpdateTaskInterval = useCallback((groupId: string, previousTaskId: number, taskToShiftId: number, newInterval: number) => {
    if (!currentProject) return;
    updateCurrentProject(proj => {
        const { tasks, taskGroups } = proj;
        const previousTask = tasks.find(t => t.id === previousTaskId);
        const taskToShift = tasks.find(t => t.id === taskToShiftId);
        if (!previousTask || !taskToShift) return {};

        const newStartDate = addDays(previousTask.end, newInterval);
        const delta = differenceInDays(newStartDate, taskToShift.start);
        if (delta === 0) return {};

        const group = taskGroups.find(g => g.id === groupId);
        if (!group) return {};

        const groupTasks = group.taskIds
            .map(id => tasks.find(t => t.id === id)!)
            .filter(Boolean)
            .sort((a, b) => a.start.getTime() - b.start.getTime());
        
        const startIndex = groupTasks.findIndex(t => t.id === taskToShiftId);
        const idsToShift = new Set(groupTasks.slice(startIndex).map(t => t.id));

        const newTasks = tasks.map(task => {
            if (idsToShift.has(task.id)) {
                const duration = differenceInDays(task.end, task.start);
                const newStart = addDays(task.start, delta);
                const newEnd = addDays(newStart, duration);
                return { ...task, start: newStart, end: newEnd };
            }
            return task;
        });
        
        checkForWarnings(newTasks);
        return { tasks: newTasks };
    });
  }, [currentProject, checkForWarnings]);

  const handleReorderGroupTasks = useCallback((groupId: string, newOrderedTaskIds: number[]) => {
      handleUpdateGroup(groupId, { taskIds: newOrderedTaskIds });

      updateCurrentProject(proj => {
          const { tasks } = proj;
          const groupTasks = newOrderedTaskIds.map(id => tasks.find(t => t.id === id)!).filter(Boolean);

          if (groupTasks.length < 2) return {};

          const durationMap = new Map(groupTasks.map(t => [t.id, differenceInDays(t.end, t.start)]));
          const taskUpdates = new Map<number, {start: Date, end: Date}>();

          // First task in new order keeps its position
          let lastEndDate = groupTasks[0].end;

          for (let i = 1; i < groupTasks.length; i++) {
              const task = groupTasks[i];
              const newStart = addDays(lastEndDate, 1); // 1 day interval
              const duration = durationMap.get(task.id)!;
              const newEnd = addDays(newStart, duration);
              taskUpdates.set(task.id, { start: newStart, end: newEnd });
              lastEndDate = newEnd;
          }

          const newTasks = tasks.map(t => {
              if (taskUpdates.has(t.id)) {
                  return { ...t, ...taskUpdates.get(t.id)! };
              }
              return t;
          });

          checkForWarnings(newTasks);
          return { tasks: newTasks };
      });
  }, [handleUpdateGroup, checkForWarnings]);

  const handleSaveProject = (name: string, startDate: Date, endDate: Date) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      startDate,
      endDate,
      tasks: [],
      taskGroups: [],
      lastModified: new Date(),
      lastModifiedBy: modifierName,
    };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    setIsProjectFormOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('您確定要刪除此專案嗎？此操作無法復原。')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProjectId === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        setCurrentProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null);
      }
    }
  };

  const handleUpdateProjectName = useCallback((projectId: string, newName: string) => {
    const isDuplicate = projects.some(p => p.name === newName && p.id !== projectId);
    if (isDuplicate) {
        showNotification(`專案名稱 "${newName}" 已存在，請更換一個名稱。`, 'error');
        return; 
    }

    const now = new Date();
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === projectId ? { 
            ...p, 
            name: newName,
            lastModified: now,
            lastModifiedBy: modifierName 
        } : p
      )
    );
    showNotification('專案名稱已更新', 'success');
  }, [projects, modifierName, showNotification]);

  const handleUpdateProjectDates = useCallback((projectId: string, newStartDate: Date, newEndDate: Date) => {
    if (newEndDate < newStartDate) {
      showNotification('專案結束日期不能早于開始日期。', 'error');
      // To prevent a flicker, we don't immediately revert in the UI,
      // but the state won't be updated, so it will revert on the next render.
      // A more robust solution might involve temporarily storing the invalid state and reverting.
      // For now, the notification is the primary feedback.
      return;
    }

    const now = new Date();
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === projectId ? { 
            ...p, 
            startDate: newStartDate,
            endDate: newEndDate,
            lastModified: now,
            lastModifiedBy: modifierName 
        } : p
      )
    );
    // Silent success or a subtle notification could be used here.
    // showNotification('專案日期已更新', 'success');
  }, [modifierName, showNotification]);

  const handleDeleteGroup = (groupId: string) => {
    if (!currentProject) return;
    updateCurrentProject(proj => {
      const groupToDissolve = proj.taskGroups.find(g => g.id === groupId);
      if (!groupToDissolve) return {};
      
      const taskIdsInGroup = new Set(groupToDissolve.taskIds);
      const newTasks = proj.tasks.map(t => taskIdsInGroup.has(t.id) ? { ...t, groupId: undefined } : t);
      const newGroups = proj.taskGroups.filter(g => g.id !== groupId);

      return { tasks: newTasks, taskGroups: newGroups };
    });
  };

  const handleExportProject = (projectId: string) => {
    const projectToExport = projects.find(p => p.id === projectId);
    if (projectToExport) {
        const dataStr = JSON.stringify(projectToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${projectToExport.name}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
  };

  const handleProjectImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result;
            if (typeof result !== 'string') {
                throw new Error('無法讀取檔案內容。');
            }
            
            const parsedProject = JSON.parse(result);
            if (!parsedProject.id || !parsedProject.name || !Array.isArray(parsedProject.tasks)) {
                throw new Error('無效的專案檔案格式。');
            }

            const revivedProject = reviveDates(parsedProject);
            const existingProject = projects.find(p => p.name === revivedProject.name);

            if (existingProject) {
                if (window.confirm(`專案 "${revivedProject.name}" 已存在。您確定要覆蓋它嗎？`)) {
                    // 處理因覆蓋而可能產生的ID衝突
                    if (projects.some(p => p.id === revivedProject.id && p.id !== existingProject.id)) {
                        revivedProject.id = `proj-${Date.now()}`;
                        showNotification(`專案ID衝突，已為匯入的專案指派新ID。`, 'info');
                    }
                    
                    setProjects(prev => {
                        const projectsWithoutOld = prev.filter(p => p.id !== existingProject.id);
                        return [...projectsWithoutOld, revivedProject];
                    });
                    showNotification(`專案 "${revivedProject.name}" 已成功覆蓋！`, 'success');
                } else {
                    showNotification('專案匯入已取消。', 'info');
                }
            } else {
                // 處理無名稱衝突但可能有ID衝突的情況
                if (projects.some(p => p.id === revivedProject.id)) {
                    revivedProject.id = `proj-${Date.now()}`;
                    showNotification(`專案ID衝突，已為匯入的專案指派新ID。`, 'info');
                }
                setProjects(prev => [...prev, revivedProject]);
                showNotification(`專案 "${revivedProject.name}" 匯入成功！`, 'success');
            }
        } catch (error) {
            console.error("專案匯入失敗:", error);
            const message = error instanceof Error ? error.message : "請確認格式是否正確。";
            showNotification(`無法匯入專案檔案。${message}`, "error");
        }
    };
    reader.onerror = () => {
         showNotification("讀取檔案時發生錯誤。", "error");
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = (newKey: string, newModifierName: string) => {
    localStorage.setItem('project-scheduler-modifier-name', newModifierName);
    setModifierName(newModifierName);

    if (newKey !== storageKey) {
        localStorage.setItem('project-scheduler-storage-key', newKey);
        setStorageKey(newKey);
        setCurrentProjectId(null); 
    }
    showNotification('設定已儲存', 'success');
  };

  const handleUpdateExecutingUnits = useCallback((newUnits: ExecutingUnit[]) => {
    // No need for unique check here as the modal should handle it, but good practice.
    const uniqueUnits = newUnits.filter((unit, index, self) => 
        index === self.findIndex((u) => u.name === unit.name)
    );
    setExecutingUnits(uniqueUnits);
    try {
      localStorage.setItem('project-scheduler-units', JSON.stringify(uniqueUnits));
      showNotification('執行單位列表已更新', 'success');
    } catch (e) {
      console.error("無法儲存執行單位:", e);
      showNotification('儲存執行單位失敗', 'error');
    }
  }, [showNotification]);

  const handleSelectedUnitsChange = (units: string[]) => {
    setSelectedUnits(units);
  };
  
  const handlePrint = () => {
    window.print();
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><div>載入中...</div></div>;
  }
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Header
        project={currentProject}
        onFileImport={handleFileImport}
        onImportProject={handleProjectImport}
        onCreateProject={() => setIsProjectFormOpen(true)}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onBackToProjects={() => setCurrentProjectId(null)}
        onAddTask={openTaskFormForCreate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onPrint={handlePrint}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!currentProjectId ? (
           <ProjectListView 
              projects={projects}
              onSelectProject={setCurrentProjectId}
              onDeleteProject={handleDeleteProject}
              onExportProject={handleExportProject}
              onUpdateProjectName={handleUpdateProjectName}
              onUpdateProjectDates={handleUpdateProjectDates}
           />
        ) : currentProject ? (
          <>
            <FilterBar 
              executingUnits={executingUnits.filter(u => currentProject.tasks.some(t => t.executingUnit === u.name))}
              selectedUnits={selectedUnits}
              onSelectedUnitsChange={handleSelectedUnitsChange}
            />
            {viewMode === ViewMode.Gantt && (
              <GanttChartView 
                key={currentProject.id}
                tasks={currentProject.tasks} 
                warnings={warnings} 
                onDragTask={handleDragTask} 
                taskGroups={currentProject.taskGroups} 
                onEditTask={openTaskFormForEdit} 
                executingUnits={executingUnits}
                selectedUnits={selectedUnits}
              />
            )}
            {viewMode === ViewMode.Calendar && (
              <CalendarView
                key={currentProject.id}
                tasks={currentProject.tasks}
                projectStartDate={currentProject.startDate}
                projectEndDate={currentProject.endDate}
                warnings={warnings} 
                onDragTask={handleDragTask} 
                selectedTaskIds={selectedTaskIds}
                onSelectTask={handleSelectTask}
                onMultiSelectTasks={handleMultiSelectTasks}
                onCreateGroup={handleCreateGroup}
                onOpenAddTaskModal={openTaskFormForCreate}
                onUngroupTask={handleUngroupTask}
                taskGroups={currentProject.taskGroups}
                onEditTask={openTaskFormForEdit}
                executingUnits={executingUnits}
                onDeleteSelectedTasks={handleDeleteTasks}
                selectedUnits={selectedUnits}
              />
            )}
            {viewMode === ViewMode.Group && (
              <GroupRelationshipView 
                  tasks={currentProject.tasks}
                  taskGroups={currentProject.taskGroups}
                  onUpdateGroup={handleUpdateGroup}
                  onUpdateTaskInterval={handleUpdateTaskInterval}
                  onReorderTasks={handleReorderGroupTasks}
                  onDeleteGroup={handleDeleteGroup}
                  onUngroupTask={handleUngroupTask}
              />
            )}
          </>
        ) : (
          <div>找不到專案</div>
        )}
      </main>
      {isTaskFormOpen && <TaskFormModal 
            isOpen={isTaskFormOpen} 
            onClose={() => setIsTaskFormOpen(false)} 
            onSave={handleSaveTask} 
            taskToEdit={taskToEdit} 
            tasks={currentProject?.tasks || []}
            executingUnits={executingUnits}
            onDelete={(taskId) => {
              handleDeleteTasks([taskId]);
              setIsTaskFormOpen(false);
            }} 
        />}
      {isProjectFormOpen && <ProjectFormModal 
            isOpen={isProjectFormOpen} 
            onClose={() => setIsProjectFormOpen(false)} 
            onSave={handleSaveProject} 
            projects={projects}
      />}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentKey={storageKey}
        currentModifierName={modifierName}
        units={executingUnits}
        onUpdateUnits={handleUpdateExecutingUnits}
      />
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};

export default App;
