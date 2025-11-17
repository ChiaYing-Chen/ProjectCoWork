import React from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const baseClasses = "fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center border";
  
  const typeClasses = {
    success: "bg-green-100 border-green-400 text-green-700",
    error: "bg-red-100 border-red-400 text-red-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      {type === 'error' && <span className="mr-3 text-xl">⚠️</span>}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 -mr-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition">
        <span className="text-base">❌</span>
      </button>
    </div>
  );
};

export default Notification;
