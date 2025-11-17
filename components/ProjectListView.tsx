

import React, { useRef, useState, useEffect } from 'react';
import { Project } from '../types';
import { format } from 'date-fns';

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
  onDeleteProject: (projectId: string) => void;
  onExportProject: (projectId: string) => void;
  onUpdateProjectName: (projectId: string, newName: string) => void;
  onUpdateProjectDates: (projectId: string, newStartDate: Date, newEndDate: Date) => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ 
    projects, 
    onSelectProject, 
    onDeleteProject, 
    onExportProject,
    onUpdateProjectName,
    onUpdateProjectDates
}) => {

  return (
    <div>
      {projects.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-slate-700">尚未建立任何專案</h2>
            <p className="text-slate-500">點擊上方的「建立新專案」或「匯入專案」按鈕來開始。</p>
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
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                    <input
                        type="date"
                        value={format(project.startDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                            const newStartDate = new Date(e.target.value + 'T00:00:00'); // Prevent timezone issues
                            if (!isNaN(newStartDate.getTime())) {
                                onUpdateProjectDates(project.id, newStartDate, project.endDate);
                            }
                        }}
                        className="bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1 cursor-pointer"
                        aria-label="專案開始日期"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={format(project.endDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                            const newEndDate = new Date(e.target.value + 'T00:00:00'); // Prevent timezone issues
                            if (!isNaN(newEndDate.getTime())) {
                                onUpdateProjectDates(project.id, project.startDate, newEndDate);
                            }
                        }}
                        className="bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1 cursor-pointer"
                        aria-label="專案結束日期"
                    />
                  </div>
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
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition w-9 h-9 flex items-center justify-center"
                        title="匯出專案 (JSON)"
                    >
                       <span className="text-lg">📤</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition w-9 h-9 flex items-center justify-center"
                        title="刪除專案"
                    >
                        <span className="text-lg">🗑️</span>
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