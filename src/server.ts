/**
 * Web 服务器
 * 提供 API 接口和静态文件服务
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { db } from './database';
import { apiRoutes } from './routes/api';

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api', apiRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🌐 Web 服务器已启动`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`📍 API 地址: http://localhost:${PORT}/api`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});

export { app };
