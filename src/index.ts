/**
 * RAD 符文监控系统主程序
 * 每小时自动检查并记录前100持币地址变化
 * 检测大额交易并发送邮件提醒
 */

import cron from 'node-cron';
import { monitorService } from './services/monitorService';
import { emailService } from './services/emailService';
import { monitorConfig } from './config';
import { db } from './database';

/**
 * 执行监控任务的主流程
 */
async function runMonitoringTask(): Promise<void> {
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 开始执行监控任务 - ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(60));

    // 执行监控检查
    const { holderChanges, largeTransactions } = await monitorService.performMonitoringCheck();

    // 如果有大额交易，发送邮件提醒
    if (largeTransactions.length > 0) {
      console.log(`\n📧 发送大额交易提醒邮件...`);
      await emailService.sendLargeTransactionAlert(largeTransactions);
    }

    // 如果有重要的持仓变化，发送邮件提醒
    // 这里可以设置过滤条件，比如只提醒变化超过一定数量的
    const importantChanges = holderChanges.filter(change => {
      // 新进入或退出前100
      if (change.change_type === 'new' || change.change_type === 'exit') {
        return true;
      }
      // 变化量超过阈值
      const changeAmount = BigInt(change.balance_change);
      const threshold = BigInt(monitorConfig.largeTransactionThreshold);
      return changeAmount >= threshold || changeAmount <= -threshold;
    });

    if (importantChanges.length > 0) {
      console.log(`\n📧 发送持仓变化提醒邮件...`);
      await emailService.sendHolderChangeAlert(importantChanges);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 监控任务完成 - ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ 监控任务执行失败:', error.message);
    console.error(error.stack);
  }
}

/**
 * 系统启动时的初始化流程
 */
async function initialize(): Promise<void> {
  console.log('\n🎯 RAD 符文监控系统启动中...\n');

  // 发送系统启动通知
  try {
    await emailService.sendSystemStartNotification();
  } catch (error: any) {
    console.error('⚠️  发送启动通知失败:', error.message);
    // 不影响系统启动，继续运行
  }

  // 立即执行一次监控任务
  console.log('📊 执行首次监控检查...');
  await runMonitoringTask();

  // 设置定时任务，每小时执行一次
  const cronPattern = '0 * * * *'; // 每小时的第0分钟执行
  console.log(`\n⏰ 定时任务已设置: ${cronPattern} (每小时执行一次)\n`);

  cron.schedule(cronPattern, async () => {
    await runMonitoringTask();
  });

  console.log('✅ 系统初始化完成，监控系统正在运行...\n');
}

/**
 * 优雅退出处理
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n\n⚠️  收到 ${signal} 信号，准备退出...`);
    console.log('🔒 关闭数据库连接...');
    db.close();
    console.log('👋 监控系统已安全退出\n');
    process.exit(0);
  };

  // 监听退出信号
  process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => shutdown('SIGTERM')); // kill 命令

  // 捕获未处理的异常
  process.on('uncaughtException', (error: Error) => {
    console.error('❌ 未捕获的异常:', error.message);
    console.error(error.stack);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * 主入口
 */
async function main(): Promise<void> {
  try {
    // 设置优雅退出
    setupGracefulShutdown();

    // 初始化并启动系统
    await initialize();

  } catch (error: any) {
    console.error('❌ 系统启动失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 启动程序
main();
