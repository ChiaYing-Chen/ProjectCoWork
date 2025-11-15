
import React, { useRef, useState, useEffect } from 'react';
import { Project } from '../types';
import { format } from 'date-fns';

const ImportIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const EditableText: React.FC<{ value: string, onSave: (newValue: string) => void, textClasses: string }> = ({ value, onSave, textClasses }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (text.trim() && text.trim() !== value) {
            onSave(text.trim());
        } else {
            setText(value); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };
    
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    if (isEditing) {
        return (
            <div className={textClasses}>
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') {
                            setText(value);
                            setIsEditing(false);
                        }
                    }}
                    className="w-full bg-transparent border-b-2 border-blue-500 focus:outline-none"
                />
            </div>
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className={`${textClasses} cursor-pointer hover:bg-slate-100 rounded-md -m-2 p-2`} title="點擊以編輯名稱">
            <h3 className="truncate">{value}</h3>
        </div>
    );
};


interface ProjectListViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: (projectId: string) => void;
  onImportProject: (file: File) => void;
  onUpdateProjectName: (projectId: string, newName: string) => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ 
    projects, 
    onSelectProject, 
    onCreateProject, 
    onDeleteProject, 
    onExportProject,
    onImportProject,
    onUpdateProjectName
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          onImportProject(file);
      }
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input to allow re-importing the same file
      }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">所有專案</h2>
        <div className="flex items-center space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            <button
                onClick={handleImportClick}
                className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              <ImportIcon />
              匯入專案
            </button>
            <button
              onClick={onCreateProject}
              className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              建立新專案
            </button>
        </div>
      </div>

      {projects.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-slate-700">尚未建立任何專案</h2>
            <p className="text-slate-500">點擊右上角的「建立新專案」或「匯入專案」按鈕來開始。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <div className="p-6 flex-grow flex flex-col">
                <div>
                  <EditableText
                    value={project.name}
                    onSave={(newName) => onUpdateProjectName(project.id, newName)}
                    textClasses="text-xl font-bold text-slate-800 mb-2"
                  />
                  <p className="text-sm text-slate-500 mb-4">
                    {format(project.startDate, 'yyyy/MM/dd')} - {format(project.endDate, 'yyyy/MM/dd')}
                  </p>
                  <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full w-fit">
                      <span className="text-xs bg-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                          {project.tasks.length} 項任務
                      </span>
                  </div>
                </div>
                <div className="flex-grow"></div>
                {project.lastModified && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                            最後修改: {format(project.lastModified, 'yyyy/MM/dd HH:mm')}
                        </p>
                        <p className="text-xs text-slate-500">
                            修改者: <span className="font-medium">{project.lastModifiedBy || '未知'}</span>
                        </p>
                    </div>
                )}
              </div>
              <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onExportProject(project.id); }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition"
                        title="匯出專案 (JSON)"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition"
                        title="刪除專案"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                <button
                  onClick={() => onSelectProject(project.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  進入專案
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectListView;
