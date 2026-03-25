# RAD 符文监控系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Bitcoin Runes](https://img.shields.io/badge/Bitcoin-Runes-orange)](https://docs.ordinals.com/runes.html)

🚨 自动监控比特币链上 RAD 符文代币的前100持币地址变化和大额交易，并通过邮件发送提醒。

## ✨ 功能特性

- ✅ 自动监控前100名持币地址
- 📊 每小时自动更新数据
- 🚨 大额交易实时提醒（买入/卖出）
- 📈 持仓变化分析（增持/减持）
- 🆕 新大户进入/退出提醒
- 📧 精美的HTML邮件通知
- 💾 SQLite 数据库存储历史数据

## 系统架构

```
radfi/
├── src/
│   ├── api/                 # API 客户端
│   │   └── runesClient.ts   # 符文数据获取
│   ├── config/              # 配置管理
│   │   └── index.ts
│   ├── database/            # 数据库模块
│   │   └── index.ts         # SQLite 数据存储
│   ├── services/            # 业务服务
│   │   ├── monitorService.ts # 监控核心逻辑
│   │   └── emailService.ts   # 邮件提醒服务
│   ├── types/               # 类型定义
│   │   └── index.ts
│   └── index.ts             # 主程序入口
├── package.json
├── tsconfig.json
├── .env.example             # 环境变量模板
└── README.md
```

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 邮件配置（使用 Gmail 示例）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Gmail 需要使用应用专用密码
NOTIFICATION_EMAIL=your-notification-email@gmail.com

# RAD 符文配置
RAD_RUNE_ID=907897:2259
LARGE_TRANSACTION_THRESHOLD=100000  # 大额交易阈值（RAD）

# 监控配置
SNAPSHOT_INTERVAL_HOURS=1  # 快照间隔（小时）
TOP_HOLDERS_COUNT=100      # 监控前N名持币地址
```

### 3. 获取 Gmail 应用专用密码

如果你使用 Gmail 发送邮件，需要：

1. 访问 https://myaccount.google.com/security
2. 启用两步验证
3. 生成"应用专用密码"
4. 将应用专用密码填入 `.env` 的 `SMTP_PASS`

### 4. 编译 TypeScript

```bash
npm run build
```

### 5. 启动监控系统

```bash
# 开发模式（带自动重载）
npm run dev

# 生产模式
npm start
```

## 监控内容

### 1. 持仓变化监控

- 🆕 **新进入前100**: 检测新进入前100的大户地址
- 🚪 **退出前100**: 检测退出前100的地址
- 📈 **大幅增持**: 检测持仓增加超过阈值的地址
- 📉 **大幅减持**: 检测持仓减少超过阈值的地址
- 🏦 **交易所地址**: 特别标注交易所相关地址

### 2. 大额交易监控

- 监控链上大额转账（超过设定阈值）
- 区分买入和卖出行为
- 提供交易哈希和地址信息

### 3. 邮件提醒

系统会在以下情况发送邮件：

- ⚠️ 检测到大额交易（>100,000 RAD）
- ⚠️ 新地址进入前100
- ⚠️ 地址退出前100
- ⚠️ 大幅增持/减持（>100,000 RAD）
- ✅ 系统启动通知

## 数据库结构

系统会创建 `rad_monitor.db` SQLite 数据库，包含以下表：

### holder_snapshots（持币快照）
- 定期保存前100持币地址的完整快照
- 用于历史对比和趋势分析

### holder_changes（持仓变化）
- 记录每次检测到的持仓变化
- 包含变化类型、数量、排名变化等

### large_transactions（大额交易）
- 记录所有大额交易
- 包含交易类型、金额、地址等

## 定时任务

系统使用 node-cron 设置定时任务：

```javascript
'0 * * * *'  // 每小时的第0分钟执行
```

例如：01:00, 02:00, 03:00... 自动执行监控检查。

## 查看日志

系统运行时会输出详细日志：

```
=============================================================
🚀 开始执行监控任务 - 2025-03-25 14:00:00
=============================================================
📊 开始执行监控检查...
1️⃣ 获取当前持币数据...
  尝试从 Unisat 获取...
  ✅ 成功从 Unisat 获取 100 条持币记录
2️⃣ 获取历史数据进行对比...
3️⃣ 分析持仓变化...
4️⃣ 检测大额交易...
...
```

## 自定义配置

### 调整监控频率

编辑 `.env` 文件：

```env
# 每2小时执行一次
SNAPSHOT_INTERVAL_HOURS=2
```

然后修改 `src/index.ts` 中的 cron 表达式：

```javascript
// 每2小时执行一次
const cronPattern = '0 */2 * * *';
```

### 调整大额交易阈值

```env
# 调整为 50,000 RAD
LARGE_TRANSACTION_THRESHOLD=50000
```

### 监控更多持币地址

```env
# 监控前200名
TOP_HOLDERS_COUNT=200
```

## 数据源

系统优先使用以下 API 获取数据：

1. **Unisat API** (优先)
2. **OKX API** (备用)

如果主数据源失败，会自动切换到备用数据源。

## 故障排查

### 问题：邮件发送失败

**解决方案：**
1. 检查 `.env` 中的邮件配置是否正确
2. 确认 SMTP 服务器地址和端口
3. 如果使用 Gmail，确保使用应用专用密码
4. 检查防火墙是否阻止了 SMTP 端口

### 问题：无法获取符文数据

**解决方案：**
1. 检查网络连接
2. 确认符文 ID 是否正确
3. 查看日志中的具体错误信息
4. 可能是 API 服务暂时不可用，系统会自动重试

### 问题：数据库锁定

**解决方案：**
1. 确保只有一个监控实例在运行
2. 检查 `rad_monitor.db` 文件权限
3. 如果需要，可以删除数据库文件重新开始

## 系统要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 稳定的网络连接
- 可用的 SMTP 邮件服务

## 技术栈

- **运行时**: Node.js + TypeScript
- **数据库**: better-sqlite3
- **定时任务**: node-cron
- **邮件服务**: nodemailer
- **HTTP 客户端**: axios
- **配置管理**: dotenv

## 开发

### 编译代码

```bash
npm run build
```

### 监听文件变化自动编译

```bash
npm run watch
```

### 运行测试

（暂未实现测试）

## 📜 许可证

本项目基于 [MIT License](LICENSE) 开源。

Copyright (c) 2025 [cz](https://github.com/czhao1986716-glitch)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 👨‍💻 作者

**cz** - [GitHub](https://github.com/czhao1986716-glitch)

## 免责声明

本系统仅供学习和研究使用，不构成任何投资建议。加密货币投资有风险，请谨慎决策。

---

**📊 RAD 持币监控系统** - 自动监控，及时提醒，把握每一个重要变化！
