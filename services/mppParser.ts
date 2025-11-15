
import { Task } from '../types';
import { addDays } from 'date-fns';

// 這是一個模擬的解析器。在實際應用中，這裡會使用像 mpxj-for-js 這樣的庫來解析二進位的 .mpp 檔案。
export const parseMppFile = async (file: File): Promise<Task[]> => {
  console.log(`模擬解析檔案: ${file.name}...`);
  
  // 模擬解析過程的延遲
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 在此範例中，我們忽略實際的檔案內容，並回傳一組靜態的模擬資料。
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
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
  ];
};