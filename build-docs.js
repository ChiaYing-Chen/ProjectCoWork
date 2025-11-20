import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("🚀 開始建置專案...");

try {
    // 執行 vite build
    // 使用 npx 確保使用專案內的 vite 版本
    execSync('npx vite build', { stdio: 'inherit', shell: true });
    
    // 確保 docs 資料夾存在 (vite build 應該已經建立了，但為了保險起見)
    const docsDir = 'docs';
    if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir);
    }

    // 建立 .nojekyll 檔案
    // 這對於 GitHub Pages 很重要，可以防止它忽略以 _ 開頭的檔案 (如 _assets)
    console.log("📄 建立 .nojekyll 檔案...");
    fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
    
    console.log("✅ 建置完成！檔案已輸出至 docs 資料夾。");
    console.log("👉 請將變更推送到 GitHub main 分支以更新 GitHub Pages。");
    
} catch (error) {
    console.error("❌ 建置失敗:", error);
    process.exit(1);
}
