
import React, { useRef, useState, useEffect } from 'react';
import { ViewMode, Project } from '../types';
import { format } from 'date-fns';

interface HeaderProps {
  project: Project | null | undefined;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onBackToProjects: () => void;
  onOpenSettings?: () => void;
  onPrint: () => void;
  onCreateProject?: () => void;
  onImportProject?: (file: File) => void;
  onImportData: (file: File) => void;
  onExportData: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSaveProject?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    project, 
    viewMode, 
    onSetViewMode, 
    onBackToProjects, 
    onOpenSettings, 
    onPrint,
    onCreateProject,
    onImportProject,
    onImportData,
    onExportData,
    isEditMode,
    onToggleEditMode,
    onSaveProject,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
}) => {
  const icsFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const [isViewModeMenuOpen, setIsViewModeMenuOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const viewModeMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewModeMenuRef.current && !viewModeMenuRef.current.contains(event.target as Node)) setIsViewModeMenuOpen(false);
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) setIsFileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleIcsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportData(file);
    if (icsFileInputRef.current) icsFileInputRef.current.value = '';
  };
  
  const handleProjectFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportProject) onImportProject(file);
    if (projectFileInputRef.current) projectFileInputRef.current.value = '';
  };
  
  const handleProjectImportClick = () => {
    projectFileInputRef.current?.click();
    setIsFileMenuOpen(false);
  };

  const viewModeOptions = {
    [ViewMode.Gantt]: { label: '甘特圖', icon: '📊' },
    [ViewMode.Calendar]: { label: '月曆', icon: '🗓️' },
    [ViewMode.Group]: { label: '編輯關聯', icon: '🔗' },
  };

  const currentView = viewModeOptions[viewMode];

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 min-w-0">
            {project ? (
               <>
                <div className="flex items-baseline space-x-4 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{project.name}</h1>
                    <div className="hidden md:flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                        <span className="text-xs bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">{project.tasks.length} 項任務</span>
                    </div>
                </div>
                {project.lastModified && (
                    <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500 ml-4 border-l border-slate-200 pl-4 flex-shrink-0">
                        <span className="text-sm">🕒</span>
                        <span>
                            最後更新: {format(project.lastModified, 'yyyy/MM/dd HH:mm')} 由 <strong>{project.lastModifiedBy}</strong>
                        </span>
                    </div>
                )}
               </>
            ) : (
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">專案列表</h1>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input type="file" ref={icsFileInputRef} onChange={handleIcsFileChange} className="hidden" accept=".ics,text/calendar" />
            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".json" />

            {/* File Menu Dropdown */}
            <div className="relative" ref={fileMenuRef}>
                <button
                    onClick={() => setIsFileMenuOpen(p => !p)}
                    className="flex items-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1 px-2.5 h-7 text-sm rounded-md transition duration-300 shadow-sm min-w-[45px] sm:min-w-[90px] justify-center"
                    aria-haspopup="true"
                    aria-expanded={isFileMenuOpen}
                >
                    <div className="flex items-center">
                        <span className="text-sm">📃</span>
                        <span className="ml-2 hidden sm:inline">檔案</span>
                    </div>
                    <span className="ml-2 text-slate-400 text-xs">▼</span>
                </button>
                {isFileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-slate-200">
                        <ul className="py-1">
                          {project ? (
                            <>
                              <li className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">匯入</li>
                              <li><button onClick={() => { icsFileInputRef.current?.click(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-3">📥</span>從 iCalendar 檔案 (.ics)</button></li>
                              <li className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 uppercase">匯出</li>
                              <li><button onClick={() => { onExportData(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-3">📤</span>匯出為 iCalendar (.ics)</button></li>
                              <div className="my-1 border-t border-slate-100"></div>
                              {onSaveProject && 
                                <li><button onClick={() => { onSaveProject(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-3">💾</span>儲存 (Ctrl+S)</button></li>
                              }
                              <li><button onClick={() => { onPrint(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-3">🖨️</span>列印</button></li>
                              <div className="my-1 border-t border-slate-100"></div>
                              <li><button onClick={() => { onBackToProjects(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-3">🗂️</span>返回專案列表</button></li>
                            </>
                          ) : (
                            <>
                              {onCreateProject && 
                                <li><button onClick={() => { onCreateProject(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-2">✨</span>建立新專案</button></li>
                              }
                              <li><button onClick={handleProjectImportClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><span className="w-5 text-center mr-2">📥</span>匯入專案 (.json)</button></li>
                            </>
                          )}
                        </ul>
                    </div>
                )}
            </div>

            {project && (
                <>
                    {(canUndo || canRedo) && (
                        <div className="flex items-center pl-2 ml-2 border-l border-slate-200">
                            {canUndo && (
                                <button
                                    onClick={onUndo}
                                    className="p-1.5 w-7 h-7 flex items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
                                    title="恢復上一步 (Ctrl+Z)"
                                >
                                    <span className="text-sm">↩️</span>
                                </button>
                            )}
                            {canRedo && (
                                <button
                                    onClick={onRedo}
                                    className="p-1.5 w-7 h-7 flex items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
                                    title="重做"
                                >
                                    <span className="text-sm">↪️</span>
                                </button>
                            )}
                        </div>
                    )}

                    <div className="relative" ref={viewModeMenuRef}>
                        <button
                            onClick={() => setIsViewModeMenuOpen(prev => !prev)}
                            className="flex items-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1 px-2.5 h-7 text-sm rounded-md transition duration-300 shadow-sm min-w-[45px] sm:min-w-[110px] justify-center"
                            aria-haspopup="true"
                            aria-expanded={isViewModeMenuOpen}
                        >
                            <div className="flex items-center">
                                <span className="text-sm">{currentView.icon}</span>
                                <span className="ml-2 hidden sm:inline">{currentView.label}</span>
                            </div>
                            <span className="ml-2 text-slate-400 text-xs">▼</span>
                        </button>
                        {isViewModeMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-slate-200">
                                <ul className="py-1" role="menu">
                                    {(Object.keys(viewModeOptions) as ViewMode[]).map((mode) => (
                                        <li key={mode}>
                                            <button
                                                onClick={() => {
                                                    onSetViewMode(mode);
                                                    setIsViewModeMenuOpen(false);
                                                }}
                                                className={`w-full text-left flex items-center px-4 py-2 text-sm ${viewMode === mode ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-100'}`}
                                                role="menuitem"
                                            >
                                                <span className="text-lg w-5 text-center">{viewModeOptions[mode].icon}</span>
                                                <span className="ml-3">{viewModeOptions[mode].label}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onToggleEditMode}
                        className={`flex items-center justify-center w-7 h-7 border border-slate-200 text-sm rounded-md transition duration-300 shadow-sm ${
                        isEditMode
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300'
                            : 'bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                        title={isEditMode ? "目前為拖拉模式。點擊以鎖定。" : "目前為點擊模式。點擊以啟用拖拉。"}
                    >
                        <span className="text-sm">
                            {isEditMode ? '👆' : '✏️'}
                        </span>
                    </button>
                </>
            )}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 ml-2">
                {onOpenSettings && (
                    <button onClick={onOpenSettings} className="flex items-center text-slate-700 hover:bg-slate-100 font-semibold py-1 px-2.5 h-7 text-sm rounded-md transition-colors duration-200" title="設定">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">⚙️</span>
                            <span className="hidden sm:inline">設定</span>
                        </div>
                    </button>
                )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
