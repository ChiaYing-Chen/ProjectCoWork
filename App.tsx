import React, { useState, useCallback, useEffect } from 'react';
import { Task, ViewMode, Warning, TaskGroup, Project } from './types';
import { parseMppFile } from './services/mppParser';
import Header from './components/Header';
import GanttChartView from './components/GanttChartView';
import CalendarView from './components/CalendarView';
import TaskFormModal from './components/AddTaskModal';
import Notification from './components/Notification';
import GroupRelationshipView from './components/GroupRelationshipView';
import ProjectListView from './components/ProjectListView';
import ProjectFormModal from './components/ProjectFormModal';
import { addDays, differenceInBusinessDays, differenceInDays, startOfDay } from 'date-fns';

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Helper to revive dates from JSON serialization
const reviveDates = (project: any): Project => ({
  ...project,
  startDate: new Date(project.startDate),
  endDate: new Date(project.endDate),
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
  const timeoutRef = React.useRef<number>();

  return React.useCallback(
    (...args: A) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, wait);
    },
    [callback, wait]
  );
}


const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Calendar);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    const timer = setTimeout(() => {
        setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Load projects from API on initial render
  useEffect(() => {
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/.netlify/functions/projects');
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                const revivedProjects = data.map(reviveDates);
                setProjects(revivedProjects);
                setCurrentProjectId(revivedProjects[0].id);
            } else {
                // No projects on backend, create a sample one
                const today = startOfDay(new Date());
                const sampleProject: Project = {
                    id: `proj-${Date.now()}`,
                    name: '範例專案',
                    startDate: today,
                    endDate: addDays(today, 60),
                    tasks: [
                        { id: 1, name: '專案啟動與規劃', start: addDays(today, 0), end: addDays(today, 4), progress: 100 },
                        { id: 2, name: '需求訪談與分析', start: addDays(today, 2), end: addDays(today, 7), progress: 85, predecessorId: 1 },
                        { id: 3, name: '系統架構設計', start: addDays(today, 8), end: addDays(today, 12), progress: 60, predecessorId: 2 },
                        { id: 4, name: 'UI/UX 設計', start: addDays(today, 8), end: addDays(today, 15), progress: 75, predecessorId: 2 },
                        { id: 5, name: '資料庫設計', start: addDays(today, 13), end: addDays(today, 18), progress: 40, predecessorId: 3 },
                        { id: 6, name: '前端開發', start: addDays(today, 16), end: addDays(today, 28), progress: 20, predecessorId: 4 },
                        { id: 7, name: '後端開發', start: addDays(today, 19), end: addDays(today, 30), progress: 15, predecessorId: 5 },
                        { id: 8, name: '整合測試', start: addDays(today, 31), end: addDays(today, 35), progress: 0, predecessorId: 7 },
                        { id: 9, name: '使用者驗收測試 (UAT)', start: addDays(today, 36), end: addDays(today, 39), progress: 0, predecessorId: 8 },
                        { id: 10, name: '部署上線', start: addDays(today, 40), end: addDays(today, 40), progress: 0, predecessorId: 9 },
                    ],
                    taskGroups: []
                };
                setProjects([sampleProject]);
                setCurrentProjectId(sampleProject.id);
            }
        } catch (error) {
            console.error("無法從 API 載入專案:", error);
            showNotification("無法載入專案資料，請檢查您的網路連線或伺服器設定。", "error");
        } finally {
            setIsLoading(false);
        }
    };
    fetchProjects();
  }, [showNotification]);

  const saveProjectsToApi = useDebouncedCallback(async (projectsToSave: Project[]) => {
      try {
          const response = await fetch('/.netlify/functions/projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(projectsToSave),
          });
          if (!response.ok) {
              const errorBody = await response.text();
              throw new Error(`API save failed: ${response.statusText} - ${errorBody}`);
          }
          console.log("Projects saved successfully.");
      } catch (error) {
          console.error("無法儲存專案至 API:", error);
          showNotification("儲存專案失敗，您的變更可能不會保留。", "error");
      }
  }, 1500); // Debounce for 1.5 seconds

  // Save projects to API whenever they change
  useEffect(() => {
    // Avoid saving during initial load or if there are no projects
    if (!isLoading && projects.length > 0) {
        saveProjectsToApi(projects);
    }
  }, [projects, isLoading, saveProjectsToApi]);

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
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === currentProjectId ? { ...p, ...updater(p) } : p
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

  const handleSaveTask = useCallback((taskData: { id?: number; name: string; start: Date; end: Date; }) => {
    if (!currentProject) return;
    
    updateCurrentProject(proj => {
        const { tasks } = proj;
        let newTasks;
        if (taskData.id) { // Update
            newTasks = tasks.map(task =>
                task.id === taskData.id
                    ? { ...task, name: taskData.name, start: taskData.start, end: taskData.end }
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
            };
            newTasks = [...tasks, newTask];
        }
        checkForWarnings(newTasks);
        return { tasks: newTasks };
    });
    setIsTaskFormOpen(false);
  }, [currentProject, checkForWarnings]);

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
    };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
    setIsProjectFormOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('您確定要刪除此專案嗎？此操作無法復原。')) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
    }
  };

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

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><div>載入中...</div></div>;
  }
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Header
        project={currentProject}
        onFileImport={handleFileImport}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onBackToProjects={() => setCurrentProjectId(null)}
        onAddTask={openTaskFormForCreate}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!currentProjectId ? (
           <ProjectListView 
              projects={projects}
              onSelectProject={setCurrentProjectId}
              onCreateProject={() => setIsProjectFormOpen(true)}
              onDeleteProject={handleDeleteProject}
              onExportProject={handleExportProject}
           />
        ) : currentProject ? (
          <>
            {viewMode === ViewMode.Gantt && (
              <GanttChartView tasks={currentProject.tasks} warnings={warnings} onDragTask={handleDragTask} taskGroups={currentProject.taskGroups} onEditTask={openTaskFormForEdit} />
            )}
            {viewMode === ViewMode.Calendar && (
              <CalendarView 
                tasks={currentProject.tasks} 
                warnings={warnings} 
                onDragTask={handleDragTask} 
                selectedTaskIds={selectedTaskIds}
                onSelectTask={handleSelectTask}
                onCreateGroup={handleCreateGroup}
                onOpenAddTaskModal={openTaskFormForCreate}
                onUngroupTask={handleUngroupTask}
                taskGroups={currentProject.taskGroups}
                onEditTask={openTaskFormForEdit}
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
      {isTaskFormOpen && <TaskFormModal isOpen={isTaskFormOpen} onClose={() => setIsTaskFormOpen(false)} onSave={handleSaveTask} taskToEdit={taskToEdit} />}
      {isProjectFormOpen && <ProjectFormModal isOpen={isProjectFormOpen} onClose={() => setIsProjectFormOpen(false)} onSave={handleSaveProject} />}
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};

export default App;