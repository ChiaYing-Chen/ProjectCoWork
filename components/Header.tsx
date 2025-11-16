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
  onImportData: (file: File, format: 'mpp' | 'ics') => void;
  onExportData: (format: 'mpp' | 'ics') => void;
}

const BackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
    </svg>
);

const ImportIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ExportIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


const AddProjectIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const PrintIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm-3-14H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
  </svg>
);

const GanttIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18"/></svg>
);

const CalendarIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
);

const GroupIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
);

const ClockIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DropdownArrowIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-0 sm:ml-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

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
}) => {
  const mppFileInputRef = useRef<HTMLInputElement>(null);
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

  const handleMppFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportData(file, 'mpp');
    if (mppFileInputRef.current) mppFileInputRef.current.value = '';
  };

  const handleIcsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportData(file, 'ics');
    if (icsFileInputRef.current) icsFileInputRef.current.value = '';
  };
  
  const handleProjectFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportProject) onImportProject(file);
    if (projectFileInputRef.current) projectFileInputRef.current.value = '';
  };
  
  const handleImportClick = (format: 'mpp' | 'ics') => {
    if (format === 'mpp') mppFileInputRef.current?.click();
    else icsFileInputRef.current?.click();
    setIsFileMenuOpen(false);
  };
  
  const handleProjectImportClick = () => {
    projectFileInputRef.current?.click();
    setIsFileMenuOpen(false);
  };

  const viewModeOptions = {
    [ViewMode.Gantt]: { label: '甘特圖', icon: <GanttIcon /> },
    [ViewMode.Calendar]: { label: '月曆', icon: <CalendarIcon /> },
    [ViewMode.Group]: { label: '編輯關聯', icon: <GroupIcon /> },
  };

  const currentView = viewModeOptions[viewMode];

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 min-w-0">
            {project ? (
               <>
                <button onClick={onBackToProjects} className="flex items-center text-slate-500 hover:text-blue-600 transition duration-300 p-2 -ml-2 rounded-full flex-shrink-0" title="返回專案列表">
                    <BackIcon />
                </button>
                <div className="flex items-baseline space-x-4 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">{project.name}</h1>
                    <div className="hidden md:flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                        <span className="text-xs bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">{project.tasks.length} 項任務</span>
                    </div>
                </div>
                {project.lastModified && (
                    <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500 ml-4 border-l border-slate-200 pl-4 flex-shrink-0">
                        <ClockIcon />
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
            <input type="file" ref={mppFileInputRef} onChange={handleMppFileChange} className="hidden" accept=".mpp" />
            <input type="file" ref={icsFileInputRef} onChange={handleIcsFileChange} className="hidden" accept=".ics,text/calendar" />
            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".json" />

            {/* File Menu Dropdown */}
            <div className="relative" ref={fileMenuRef}>
                <button
                    onClick={() => setIsFileMenuOpen(p => !p)}
                    className="flex items-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-sm min-w-[50px] sm:min-w-[120px] justify-center sm:justify-between"
                    aria-haspopup="true"
                    aria-expanded={isFileMenuOpen}
                >
                    <div className="flex items-center">
                        <span className="hidden sm:inline">📃檔案</span>
                        <span className="sm:hidden text-lg">📃</span>
                    </div>
                    <DropdownArrowIcon />
                </button>
                {isFileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-slate-200">
                        <ul className="py-1">
                          {project ? (
                            <>
                              <li className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">匯入</li>
                              <li><button onClick={() => handleImportClick('mpp')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><ImportIcon className="mr-3"/>從 MPP 檔案 (.mpp)</button></li>
                              <li><button onClick={() => handleImportClick('ics')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><ImportIcon className="mr-3"/>從 iCalendar 檔案 (.ics)</button></li>
                              <li className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-500 uppercase">匯出</li>
                              <li><button onClick={() => { onExportData('mpp'); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><ExportIcon className="mr-3"/>匯出為 MPP 檔案 (.mpp)</button></li>
                              <li><button onClick={() => { onExportData('ics'); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><ExportIcon className="mr-3"/>匯出為 iCalendar (.ics)</button></li>
                              <div className="my-1 border-t border-slate-100"></div>
                              <li><button onClick={() => { onPrint(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><PrintIcon className="mr-3"/>列印</button></li>
                            </>
                          ) : (
                            <>
                              {onCreateProject && 
                                <li><button onClick={() => { onCreateProject(); setIsFileMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><AddProjectIcon />建立新專案</button></li>
                              }
                              <li><button onClick={handleProjectImportClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"><ImportIcon className="mr-2"/>匯入專案 (.json)</button></li>
                            </>
                          )}
                        </ul>
                    </div>
                )}
            </div>

            {project && (
                <div className="relative" ref={viewModeMenuRef}>
                    <button
                        onClick={() => setIsViewModeMenuOpen(prev => !prev)}
                        className="flex items-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-sm min-w-[50px] sm:min-w-[120px] justify-center sm:justify-between"
                        aria-haspopup="true"
                        aria-expanded={isViewModeMenuOpen}
                    >
                        <div className="flex items-center">
                            {currentView.icon}
                            <span className="ml-2 hidden sm:inline">{currentView.label}</span>
                        </div>
                        <DropdownArrowIcon />
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
                                            {viewModeOptions[mode].icon}
                                            <span className="ml-3">{viewModeOptions[mode].label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 ml-2">
                {onOpenSettings && (
                    <button onClick={onOpenSettings} className="flex items-center text-slate-700 hover:bg-slate-100 font-semibold p-2 sm:py-2 sm:px-3 rounded-lg transition-colors duration-200" title="設定">
                        <span className="sm:hidden">⚙️</span>
                        <span className="hidden sm:inline">⚙️設定</span>
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