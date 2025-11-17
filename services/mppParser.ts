
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
    { id: 1, name: '停機前準備與安全會議', start: addDays(today, 0), end: addDays(today, 2), executingUnit: '工安部', notes: '確認所有停機程序與安全措施，完成危害辨識。' },
    { id: 2, name: '鍋爐水牆與過熱器檢查', start: addDays(today, 3), end: addDays(today, 10), predecessorId: 1, executingUnit: '機械組', notes: '檢查管排磨損與洩漏情況，進行 NDT 檢測。' },
    { id: 3, name: '空氣預熱器與風道檢查', start: addDays(today, 3), end: addDays(today, 8), predecessorId: 1, executingUnit: '機械組' },
    { id: 4, name: '發電機拆解與內部檢查', start: addDays(today, 3), end: addDays(today, 12), predecessorId: 1, executingUnit: '電氣組', notes: '檢查轉子與定子線圈絕緣，清潔匯流排。' },
    { id: 5, name: '燃燒器與點火系統檢修', start: addDays(today, 11), end: addDays(today, 15), predecessorId: 2, executingUnit: '儀控組', notes: '清潔並校正燃燒器噴嘴。' },
    { id: 6, name: '安全閥與儀表校驗', start: addDays(today, 9), end: addDays(today, 14), predecessorId: 3, executingUnit: '儀控組' },
    { id: 7, name: '勵磁系統檢查與測試', start: addDays(today, 13), end: addDays(today, 18), predecessorId: 4, executingUnit: '電氣組' },
    { id: 8, name: '保護電驛測試', start: addDays(today, 19), end: addDays(today, 22), predecessorId: 7, executingUnit: '電氣組' },
    { id: 9, name: '發電機回裝與對心', start: addDays(today, 23), end: addDays(today, 28), predecessorId: 8, executingUnit: '檢修協力廠' },
    { id: 10, name: '系統復原與啟動前檢查', start: addDays(today, 29), end: addDays(today, 32), predecessorId: 5, executingUnit: '運轉部' },
    { id: 11, name: '點火升溫與併聯測試', start: addDays(today, 33), end: addDays(today, 35), predecessorId: 9, executingUnit: '運轉部' },
    { id: 12, name: '滿載性能測試', start: addDays(today, 36), end: addDays(today, 38), predecessorId: 11, executingUnit: '運轉部', notes: '測試完成後提交大修報告。' },
  ];
};