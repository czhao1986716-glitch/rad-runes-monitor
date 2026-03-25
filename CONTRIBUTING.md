# 贡献指南

感谢你有兴趣为 RAD 符文监控系统做出贡献！

## 如何贡献

### 报告 Bug

如果你发现了 bug，请：

1. 检查 [Issues](https://github.com/czhao1986716-glitch/rad-runes-monitor/issues) 中是否已经有人报告
2. 如果没有，创建一个新的 Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 系统环境信息（Node.js 版本、操作系统等）
   - 相关的日志输出

### 提出新功能

如果你有新功能的建议：

1. 先创建一个 Issue 讨论你的想法
2. 说明功能的用途和实现思路
3. 等待维护者反馈后再开始开发

### 提交代码

#### 开发流程

1. **Fork 仓库**
   ```bash
   // 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆到本地**
   ```bash
   git clone https://github.com/your-username/rad-runes-monitor.git
   cd rad-runes-monitor
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **进行开发**
   - 遵循现有的代码风格
   - 添加必要的注释（中文）
   - 确保代码能正常编译

6. **测试更改**
   ```bash
   npm run build
   npm start
   ```

7. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加你的功能描述"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `style:` 代码格式（不影响功能）
   - `refactor:` 重构
   - `test:` 添加测试
   - `chore:` 构建/工具变更

8. **推送到你的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **创建 Pull Request**
   - 访问原仓库
   - 点击 "New Pull Request"
   - 选择你的分支
   - 填写 PR 描述

#### 代码规范

- 使用 TypeScript 编写
- 所有注释使用中文
- 遵循现有的代码结构
- 函数和类添加清晰的注释说明

#### 示例代码

```typescript
/**
 * 这是一个示例函数
 * 功能：计算两个数字的和
 * 参数：a - 第一个数字
 *       b - 第二个数字
 * 返回值：两个数字的和
 */
function add(a: number, b: number): number {
    return a + b;
}
```

## 开发指南

### 项目结构

```
rad-runes-monitor/
├── src/
│   ├── api/              # API 客户端
│   ├── config/           # 配置管理
│   ├── database/         # 数据库模块
│   ├── services/         # 业务服务
│   ├── types/            # TypeScript 类型定义
│   └── index.ts          # 主程序入口
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目文档
```

### 添加新功能示例

如果你想添加新的数据源：

1. 在 `src/api/` 目录下创建新的 API 客户端
2. 实现相同的方法接口
3. 在主客户端中添加对新 API 的调用

### 编译和测试

```bash
# 编译 TypeScript
npm run build

# 开发模式运行
npm run dev

# 生产模式运行
npm start
```

## 获取帮助

如果你有任何问题：

- 📧 邮件：664924250@qq.com
- 🐙 [GitHub Issues](https://github.com/czhao1986716-glitch/rad-runes-monitor/issues)

## 行为准则

- 尊重所有贡献者
- 欢迎不同观点的建设性讨论
- 专注于对项目最有利的事情

感谢你的贡献！🎉
