import { Task } from '../types';
import { parseISO } from 'date-fns';

// 這是一個簡易的、基於正規表示法的 iCalendar 檔案解析器，用於處理基本的 VEVENT。
export const parseIcsFile = async (file: File): Promise<Task[]> => {
  const text = await file.text();
  const lines = text.split(/\r\n|\n|\r/);

  const tasks: Task[] = [];
  let currentTask: Partial<Task> & { id: number } | null = null;
  let taskIdCounter = 1;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentTask = { id: taskIdCounter++ };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentTask && currentTask.name && currentTask.start && currentTask.end) {
        tasks.push({
            progress: 0, // 為匯入的任務設定預設進度
            ...currentTask
        } as Task);
      }
      currentTask = null;
    } else if (currentTask) {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) continue;
      
      const key = line.substring(0, separatorIndex);
      const value = line.substring(separatorIndex + 1);
      const keyParts = key.split(';');

      switch (keyParts[0]) {
        case 'SUMMARY':
          currentTask.name = value;
          break;
        case 'DTSTART': {
          // 處理 YYYYMMDD 或 YYYYMMDDTHHMMSSZ 格式
          const dateStr = value.includes('T') ? value : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
          try {
            currentTask.start = parseISO(dateStr);
          } catch (e) { console.warn(`無法解析開始日期: ${value}`); }
          break;
        }
        case 'DTEND': {
           const dateStr = value.includes('T') ? value : `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
           try {
            // 對於全天事件，DTEND 通常是結束日的後一天，我們需要將其減一天以符合我們的 inclusive end date 模型
            const parsedEnd = parseISO(dateStr);
            currentTask.end = value.includes('T') ? parsedEnd : new Date(parsedEnd.getTime() - 24 * 60 * 60 * 1000);
           } catch (e) { console.warn(`無法解析結束日期: ${value}`); }
          break;
        }
        case 'DESCRIPTION':
          currentTask.notes = value.replace(/\\n/g, '\n');
          break;
      }
    }
  }

  return tasks;
};
