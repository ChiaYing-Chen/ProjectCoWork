
import React, { useRef, useState, useEffect } from 'react';
import { ViewMode, Project } from '../types';
import { format } from 'date-fns';

interface HeaderProps {
  project: Project | null | undefined;
  onFileImport: (file: File) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onBackToProjects: () => void;
  onAddTask: () => void;
  onOpenSettings?: () => void;
  onPrint: () => void;
  onCreateProject?: () => void;
  onImportProject?: (file: File) => void;
}

const BackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
    </svg>
);

const MppImportIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ImportIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const AddIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AddProjectIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const PrintIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ClockIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const MoreIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ 
    project, 
    onFileImport, 
    viewMode, 
    onSetViewMode, 
    onBackToProjects, 
    onAddTask, 
    onOpenSettings, 
    onPrint,
    onCreateProject,
    onImportProject
}) => {
  const mppFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMppFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileImport(file);
    }
     if (mppFileInputRef.current) {
        mppFileInputRef.current.value = '';
    }
  };
  const handleMppImportClick = () => mppFileInputRef.current?.click();
  
  const handleProjectFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImportProject) {
      onImportProject(file);
    }
     if (projectFileInputRef.current) {
        projectFileInputRef.current.value = '';
    }
  };
  const handleProjectImportClick = () => projectFileInputRef.current?.click();


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
                <div className="flex items-center space-x-2">
                    <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".json" />
                    {onCreateProject &&
                        <button
                            onClick={onCreateProject}
                            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            <AddProjectIcon />
                            建立新專案
                        </button>
                    }
                    <button
                        onClick={handleProjectImportClick}
                        className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition duration-300"
                    >
                        <ImportIcon />
                        匯入專案
                    </button>
                </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {project && (
                <>
                    <input type="file" ref={mppFileInputRef} onChange={handleMppFileChange} className="hidden" accept=".mpp" />
                    
                    <button onClick={handleMppImportClick} title="匯入 MPP 檔案" className="hidden md:flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2 sm:py-2 sm:px-4 rounded-lg transition duration-300">
                        <MppImportIcon />
                        <span className="hidden sm:inline sm:ml-2">匯入</span>
                    </button>
                    <button onClick={onAddTask} title="新增任務" className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg transition duration-300">
                        <AddIcon />
                        <span className="hidden sm:inline sm:ml-2">新增任務</span>
                    </button>
                    <button onClick={onPrint} title="列印" className="hidden md:flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2 sm:py-2 sm:px-4 rounded-lg transition duration-300">
                        <PrintIcon />
                        <span className="hidden sm:inline sm:ml-2">列印</span>
                    </button>

                    <div className="bg-slate-200 p-1 rounded-lg flex space-x-1">
                        <button onClick={() => onSetViewMode(ViewMode.Gantt)} title="甘特圖" className={`flex items-center p-2 sm:px-3 sm:py-1 rounded-md text-sm font-semibold transition ${viewMode === ViewMode.Gantt ? 'bg-white text-blue-600 shadow' : 'bg-transparent text-slate-600'}`}>
                            <GanttIcon /><span className="hidden sm:inline sm:ml-2">甘特圖</span>
                        </button>
                        <button onClick={() => onSetViewMode(ViewMode.Calendar)} title="月曆" className={`flex items-center p-2 sm:px-3 sm:py-1 rounded-md text-sm font-semibold transition ${viewMode === ViewMode.Calendar ? 'bg-white text-blue-600 shadow' : 'bg-transparent text-slate-600'}`}>
                            <CalendarIcon /><span className="hidden sm:inline sm:ml-2">月曆</span>
                        </button>
                        <button onClick={() => onSetViewMode(ViewMode.Group)} title="編輯關聯" className={`flex items-center p-2 sm:px-3 sm:py-1 rounded-md text-sm font-semibold transition ${viewMode === ViewMode.Group ? 'bg-white text-blue-600 shadow' : 'bg-transparent text-slate-600'}`}>
                            <GroupIcon /><span className="hidden sm:inline sm:ml-2">編輯關聯</span>
                        </button>
                    </div>
                    
                    {/* Mobile More Menu */}
                    <div ref={menuRef} className="relative md:hidden">
                        <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                            <MoreIcon />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-slate-200">
                                <ul className="py-1">
                                    <li>
                                        <button onClick={() => { handleMppImportClick(); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                            <MppImportIcon /> <span className="ml-3">匯入 MPP</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => { onPrint(); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                            <PrintIcon /> <span className="ml-3">列印</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 ml-2">
                {onOpenSettings && (
                    <button onClick={onOpenSettings} className="text-slate-500 hover:text-blue-600 transition duration-300 p-2" title="設定">
                        <SettingsIcon />
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
