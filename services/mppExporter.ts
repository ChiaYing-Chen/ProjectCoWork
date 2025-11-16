import { Project } from '../types';

/**
 * 模擬將專案匯出為 .mpp 檔案。
 * 在實際應用中，這需要一個能處理 Microsoft Project 檔案格式的複雜函式庫。
 * 這裡我們僅模擬此過程並向使用者顯示通知。
 * @param project 要匯出的專案物件
 */
export const exportProjectToMpp = async (project: Project): Promise<void> => {
  console.log(`模擬將專案匯出為 MPP 檔案: ${project.name}...`);
  // 模擬非同步操作，例如檔案生成
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("MPP 模擬匯出完成。");
};
