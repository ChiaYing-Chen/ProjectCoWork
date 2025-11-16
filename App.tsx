

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Task, ViewMode, Warning, TaskGroup, Project, ExecutingUnit } from './types';
import { parseMppFile } from './services/mppParser';
import { parseIcsFile } from './services/icsParser';
import { exportProjectToIcs } from './services/icsExporter';
import { exportProjectToMpp } from './services/mppExporter';
import Header from './components/Header';
import GanttChartView from './components/GanttChartView';
import CalendarView from './components/CalendarView';
import TaskFormModal from './components/AddTaskModal';
import Notification from './components/Notification';
import GroupRelationshipView from './components/GroupRelationshipView';
import ProjectListView from './components/ProjectListView';
import ProjectFormModal from './components/ProjectFormModal';
import SettingsModal from './components/SettingsModal';
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
  
  // Create a ref to hold the current project ID to avoid stale closures in callbacks.
  const currentProjectIdRef = useRef(currentProjectId);
  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Calendar);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

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
          { name: "工安部", color: "#34d399" },
          { name: "機械組", color: "#60a5fa" },
          { name: "儀控組", color: "#fbbf24" },
          { name: "電氣組", color: "#c084fc" },
          { name: "檢修協力廠", color: "#f87171" },
          { name: "運轉部", color: "#4ade80" },
        ];
        setExecutingUnits(defaultUnits);
        localStorage.setItem('project-scheduler-units', JSON.stringify(defaultUnits));
      }
    } catch (e) {
      console.error("無法載入執行單位，重設為預設值:", e);
      const defaultUnits: ExecutingUnit[] = [
        { name: "工安部", color: "#34d399" },
        { name: "機械組", color: "#60a5fa" },
        { name: "儀控組", color: "#fbbf24" },
        { name: "電氣組", color: "#c084fc" },
        { name: "檢修協力廠", color: "#f87171" },
        { name: "運轉部", color: "#4ade80" },
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
                name: '發電機與鍋爐大修專案',
                startDate: today,
                endDate: addDays(today, 45),
                tasks: [
                    { id: 1, name: '停機前準備與安全會議', start: addDays(today, 0), end: addDays(today, 2), progress: 100, executingUnit: '工安部', notes: '確認所有停機程序與安全措施，完成危害辨識。' },
                    { id: 2, name: '鍋爐水牆與過熱器檢查', start: addDays(today, 3), end: addDays(today, 10), progress: 80, predecessorId: 1, executingUnit: '機械組', notes: '檢查管排磨損與洩漏情況，進行 NDT 檢測。' },
                    { id: 3, name: '空氣預熱器與風道檢查', start: addDays(today, 3), end: addDays(today, 8), progress: 90, predecessorId: 1, executingUnit: '機械組' },
                    { id: 4, name: '發電機拆解與內部檢查', start: addDays(today, 3), end: addDays(today, 12), progress: 70, predecessorId: 1, executingUnit: '電氣組', notes: '檢查轉子與定子線圈絕緣，清潔匯流排。' },
                    { id: 5, name: '燃燒器與點火系統檢修', start: addDays(today, 11), end: addDays(today, 15), progress: 50, predecessorId: 2, executingUnit: '儀控組', notes: '清潔並校正燃燒器噴嘴。' },
                    { id: 6, name: '安全閥與儀表校驗', start: addDays(today, 9), end: addDays(today, 14), progress: 60, predecessorId: 3, executingUnit: '儀控組' },
                    { id: 7, name: '勵磁系統檢查與測試', start: addDays(today, 13), end: addDays(today, 18), progress: 40, predecessorId: 4, executingUnit: '電氣組' },
                    { id: 8, name: '保護電驛測試', start: addDays(today, 19), end: addDays(today, 22), progress: 10, predecessorId: 7, executingUnit: '電氣組' },
                    { id: 9, name: '發電機回裝與對心', start: addDays(today, 23), end: addDays(today, 28), progress: 0, predecessorId: 8, executingUnit: '檢修協力廠' },
                    { id: 10, name: '系統復原與啟動前檢查', start: addDays(today, 29), end: addDays(today, 32), progress: 0, predecessorId: 5, executingUnit: '運轉部' },
                    { id: 11, name: '點火升溫與併聯測試', start: addDays(today, 33), end: addDays(today, 35), progress: 0, predecessorId: 9, executingUnit: '運轉部' },
                    { id: 12, name: '滿載性能測試', start: addDays(today, 36), end: addDays(today, 38), progress: 0, predecessorId: 11, executingUnit: '運轉部', notes: '測試完成後提交大修報告。' },
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
  
  const handleImportData = useCallback(async (file: File, format: 'mpp' | 'ics') => {
    if (!currentProjectIdRef.current) return;
    setIsLoading(true);
    try {
      let parsedTasks: Task[];
      if (format === 'mpp') {
        parsedTasks = await parseMppFile(file);
      } else {
        parsedTasks = await parseIcsFile(file);
      }
      
      setProjects(prev => prev.map(p => {
          if (p.id !== currentProjectIdRef.current) return p;
          checkForWarnings(parsedTasks);
          return {
              ...p,
              tasks: parsedTasks,
              name: format === 'mpp' ? p.name || file.name : p.name,
              lastModified: new Date(),
              lastModifiedBy: modifierName,
          };
      }));
      showNotification(`${format.toUpperCase()} 檔案匯入成功！`, 'success');
    } catch (error) {
      console.error("檔案解析失敗:", error);
      showNotification(`無法解析 ${format.toUpperCase()} 檔案。請確認格式是否正確。`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [modifierName, showNotification, checkForWarnings]);

  const handleExportData = async (format: 'mpp' | 'ics') => {
    const project = projects.find(p => p.id === currentProjectIdRef.current);
    if (!project) {
        showNotification('請先選擇一個專案來匯出。', 'info');
        return;
    }
    
    if (format === 'ics') {
        const icsContent = exportProjectToIcs(project);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8,' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${project.name}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('已成功匯出為 ICS 檔案。', 'success');
    } else if (format === 'mpp') {
        await exportProjectToMpp(project);
        showNotification('MPP 匯出功能目前為模擬狀態。', 'info');
    }
  };

  const handleDragTask = (taskId: number, newStartDate: Date) => {
    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const { tasks, taskGroups } = p;
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove) return p;

        const deltaDays = differenceInDays(newStartDate, taskToMove.start);
        if (deltaDays === 0) return p;

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
        return {
            ...p,
            tasks: updatedTasks,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));
  };

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

  const handleCreateGroup = () => {
    if (selectedTaskIds.length < 2) return;

    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const { tasks, taskGroups } = p;
        const isDuplicate = selectedTaskIds.some(id => {
            const task = tasks.find(t => t.id === id);
            return task && task.groupId;
        });

        if (isDuplicate) {
            showNotification('選取的任務中，有任務已被關聯，無法重複關聯。', 'error');
            return p;
        }

        const newGroupId = `group-${Date.now()}`;
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc'];
        const randomColor = colors[taskGroups.length % colors.length];

        const newGroup: TaskGroup = { id: newGroupId, taskIds: selectedTaskIds, color: randomColor };
        const newGroups = [...taskGroups, newGroup];
        const newTasks = tasks.map(task => 
            selectedTaskIds.includes(task.id) ? { ...task, groupId: newGroupId } : task
        );

        setSelectedTaskIds([]);
        return {
            ...p,
            tasks: newTasks,
            taskGroups: newGroups,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));
  };
  
  const handleSaveTask = (taskData: { id?: number; name: string; start: Date; end: Date; executingUnit?: string; predecessorId?: number; notes?: string; }) => {
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

    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const { tasks } = p;
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
        return {
            ...p,
            tasks: newTasks,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));
    setIsTaskFormOpen(false);
  };

  const handleUngroupTask = (taskIdToUngroup: number) => {
    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const { tasks, taskGroups } = p;
        const taskToUngroup = tasks.find(t => t.id === taskIdToUngroup);
        if (!taskToUngroup || !taskToUngroup.groupId) return p;

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
        return {
            ...p,
            tasks: finalTasks,
            taskGroups: finalGroups,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));
  };

  const handleDeleteTasks = (taskIdsToDelete: number[]) => {
    if (taskIdsToDelete.length === 0) return;

    const taskNoun = taskIdsToDelete.length > 1 ? `這 ${taskIdsToDelete.length} 項任務` : '此任務';
    if (!window.confirm(`您確定要刪除${taskNoun}嗎？此操作無法復原。`)) {
        return;
    }

    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const idsToDeleteSet = new Set(taskIdsToDelete);
        
        // Filter tasks and clean up predecessor links in one pass
        const remainingTasks = p.tasks
            .filter(t => !idsToDeleteSet.has(t.id))
            .map(t => {
                if (t.predecessorId && idsToDeleteSet.has(t.predecessorId)) {
                    return { ...t, predecessorId: undefined };
                }
                return t;
            });
        
        // Update groups, dissolving any that become too small
        const updatedGroupsResult = p.taskGroups.map(group => {
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

        // Clean up groupId for tasks in dissolved groups
        const finalTasks = remainingTasks.map(task => {
            if (task.groupId && dissolvedGroupIds.has(task.groupId)) {
                return { ...task, groupId: undefined };
            }
            return task;
        });
        
        return {
            ...p,
            tasks: finalTasks,
            taskGroups: finalGroups,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));

    setSelectedTaskIds([]);
    showNotification(`已成功刪除 ${taskIdsToDelete.length} 項任務`, 'success');
  };

  const handleExportSelectedTasks = (taskIdsToExport: number[]) => {
    const project = projects.find(p => p.id === currentProjectIdRef.current);
    if (!project || taskIdsToExport.length === 0) {
        showNotification('沒有選取任何任務可匯出。', 'info');
        return;
    }
    
    const selectedTasks = project.tasks.filter(t => taskIdsToExport.includes(t.id));

    if (selectedTasks.length === 0) {
        showNotification('找不到選取的任務。', 'info');
        return;
    }

    const tempProject: Project = {
        ...project,
        tasks: selectedTasks,
        name: `${project.name} (選取項目)`
    };

    const icsContent = exportProjectToIcs(tempProject);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8,' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tempProject.name}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`已成功匯出 ${selectedTasks.length} 項任務為 ICS 檔案。`, 'success');
  };

  const openTaskFormForCreate = (date?: Date) => {
    if (date) {
      const transientTask = {
        start: date,
        end: date,
        name: '',
        progress: 0,
      } as Task;
      setTaskToEdit(transientTask);
    } else {
      setTaskToEdit(null);
    }
    setIsTaskFormOpen(true);
  };
  const openTaskFormForEdit = (task: Task) => { setTaskToEdit(task); setIsTaskFormOpen(true); };
  
  const handleUpdateGroup = (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'taskIds'>>) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== currentProjectIdRef.current) return p;
          return {
              ...p,
              taskGroups: p.taskGroups.map(g => g.id === groupId ? { ...g, ...updates } : g),
              lastModified: new Date(),
              lastModifiedBy: modifierName,
          };
      }));
  };

  const handleUpdateTaskInterval = (groupId: string, previousTaskId: number, taskToShiftId: number, newInterval: number) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== currentProjectIdRef.current) return p;

        const { tasks, taskGroups } = p;
        const previousTask = tasks.find(t => t.id === previousTaskId);
        const taskToShift = tasks.find(t => t.id === taskToShiftId);
        if (!previousTask || !taskToShift) return p;

        const newStartDate = addDays(previousTask.end, newInterval);
        const delta = differenceInDays(newStartDate, taskToShift.start);
        if (delta === 0) return p;

        const group = taskGroups.find(g => g.id === groupId);
        if (!group) return p;

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
        return {
            ...p,
            tasks: newTasks,
            lastModified: new Date(),
            lastModifiedBy: modifierName,
        };
    }));
  };

  const handleReorderGroupTasks = (groupId: string, newOrderedTaskIds: number[]) => {
      setProjects(prev => prev.map(p => {
          if (p.id !== currentProjectIdRef.current) return p;

          const { tasks } = p;
          const groupTasks = newOrderedTaskIds.map(id => tasks.find(t => t.id === id)!).filter(Boolean);
          if (groupTasks.length < 2) return p;

          const durationMap = new Map(groupTasks.map(t => [t.id, differenceInDays(t.end, t.start)]));
          const taskUpdates = new Map<number, {start: Date, end: Date}>();

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
          return {
              ...p,
              tasks: newTasks,
              taskGroups: p.taskGroups.map(g => g.id === groupId ? { ...g, taskIds: newOrderedTaskIds } : g),
              lastModified: new Date(),
              lastModifiedBy: modifierName,
          };
      }));
  };

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
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;
    if (window.confirm(`您確定要刪除專案「${projectToDelete.name}」嗎？此操作無法復原。`)) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setCurrentProjectId(prevId => (prevId === projectId ? null : prevId));
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
    const project = projects.find(p => p.id === currentProjectId);
    const groupName = project?.taskGroups.find(g => g.id === groupId)?.name || '該關聯';

    if (window.confirm(`您確定要刪除「${groupName}」嗎？\n此操作將解除群組內所有任務的關聯，但不會刪除任務本身。`)) {
        setProjects(prev => prev.map(p => {
            if (p.id !== currentProjectIdRef.current) return p;

            const groupToDissolve = p.taskGroups.find(g => g.id === groupId);
            if (!groupToDissolve) return p;
            
            const taskIdsInGroup = new Set(groupToDissolve.taskIds);
            const newTasks = p.tasks.map(t => taskIdsInGroup.has(t.id) ? { ...t, groupId: undefined } : t);
            const newGroups = p.taskGroups.filter(g => g.id !== groupId);
      
            return {
                ...p,
                tasks: newTasks,
                taskGroups: newGroups,
                lastModified: new Date(),
                lastModifiedBy: modifierName,
            };
        }));
    }
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
        onImportData={handleImportData}
        onExportData={handleExportData}
        onImportProject={handleProjectImport}
        onCreateProject={() => setIsProjectFormOpen(true)}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onBackToProjects={() => setCurrentProjectId(null)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onPrint={handlePrint}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-4 sm:pb-6 lg:pb-8">
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
            {viewMode === ViewMode.Gantt && (
              <GanttChartView 
                key={currentProject.id}
                tasks={currentProject.tasks} 
                warnings={warnings} 
                onDragTask={handleDragTask} 
                taskGroups={currentProject.taskGroups} 
                onEditTask={openTaskFormForEdit} 
                executingUnits={executingUnits}
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
                onExportSelectedTasks={handleExportSelectedTasks}
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
