import type { Handler, HandlerEvent } from "@netlify/functions";
import pkg from 'pg';
const { Client } = pkg;

// 一個輔助函數，用於建立標準化的 JSON 回應
const jsonResponse = (statusCode: number, body: any) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// 用於設定資料表的 SQL 指令。如果資料表不存在，它將會被建立。
const setupTableSql = `
  CREATE TABLE IF NOT EXISTS projects_store (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB
  );
`;

const handler: Handler = async (event: HandlerEvent) => {
  // Netlify 會為連結的 Neon 資料庫注入連線字串
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL 環境變數未設定。");
    return jsonResponse(500, { error: "資料庫設定遺失。" });
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    // 在繼續之前，確保資料表已存在。
    await client.query(setupTableSql);

    const dataKey = "all_projects";

    switch (event.httpMethod) {
      case "GET": {
        const result = await client.query('SELECT value FROM projects_store WHERE key = $1', [dataKey]);
        // 如果沒有資料，則回傳一個空陣列，以確保前端行為一致
        const data = result.rows[0]?.value || [];
        return jsonResponse(200, data);
      }
      case "PUT": {
        if (!event.body) {
          return jsonResponse(400, { error: "請求內文為必填。" });
        }
        // 使用 "upsert" 操作來插入或更新專案資料
        const upsertQuery = `
          INSERT INTO projects_store (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value;
        `;
        // event.body 已經是一個 JSON 字串，這正是驅動程式對於 JSONB 欄位所期望的格式
        await client.query(upsertQuery, [dataKey, event.body]);
        return jsonResponse(200, { message: "專案儲存成功。" });
      }
      default:
        return jsonResponse(405, { error: "不允許的方法" });
    }
  } catch (error) {
    console.error("資料庫操作失敗:", error);
    return jsonResponse(500, { error: "發生內部伺服器錯誤。" });
  } finally {
    await client.end();
  }
};

export { handler };
