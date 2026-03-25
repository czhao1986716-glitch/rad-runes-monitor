/**
 * 配置管理模块
 * 负责读取和管理环境变量配置
 */

import dotenv from 'dotenv';
import path from 'path';
import { MonitorConfig } from '../types';

// 加载环境变量
dotenv.config();

/**
 * 获取环境变量，如果不存在则抛出错误
 */
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${key}`);
  }
  return value;
}

/**
 * 获取环境变量，如果不存在则返回默认值
 */
function getEnvVarOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * 邮件配置
 */
export const emailConfig = {
  host: getEnvVar('SMTP_HOST'),
  port: parseInt(getEnvVarOrDefault('SMTP_PORT', '587')),
  user: getEnvVar('SMTP_USER'),
  pass: getEnvVar('SMTP_PASS'),
  notificationEmail: getEnvVar('NOTIFICATION_EMAIL'),
};

/**
 * 监控配置
 */
export const monitorConfig: MonitorConfig = {
  runeId: getEnvVarOrDefault('RAD_RUNE_ID', '907897:2259'),
  largeTransactionThreshold: parseInt(getEnvVarOrDefault('LARGE_TRANSACTION_THRESHOLD', '100000')),
  topHoldersCount: parseInt(getEnvVarOrDefault('TOP_HOLDERS_COUNT', '100')),
  snapshotInterval: parseInt(getEnvVarOrDefault('SNAPSHOT_INTERVAL_HOURS', '1')),
};

/**
 * 数据库配置
 */
export const dbConfig = {
  path: path.join(process.cwd(), 'rad_monitor.db'),
};
