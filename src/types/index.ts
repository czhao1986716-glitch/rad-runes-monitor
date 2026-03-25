/**
 * 类型定义文件
 * 定义系统中使用的主要数据结构
 */

// 持币地址信息
export interface Holder {
  address: string;           // 地址
  balance: string;           // 持币数量（字符串格式，避免精度问题）
  rank: number;              // 排名
  percentage?: string;       // 占总量的百分比
}

// 持币快照
export interface HolderSnapshot {
  id?: number;               // 数据库ID
  timestamp: number;         // 快照时间戳
  holders: Holder[];         // 前100持币地址列表
  total_supply: string;      // 总供应量
}

// 持仓变化记录
export interface HolderChange {
  id?: number;               // 数据库ID
  timestamp: number;         // 变化检测时间戳
  address: string;           // 地址
  old_rank?: number;         // 旧排名
  new_rank: number;          // 新排名
  old_balance: string;       // 旧持仓
  new_balance: string;       // 新持仓
  balance_change: string;    // 持仓变化量
  change_type: 'new' | 'exit' | 'increase' | 'decrease' | 'no_change'; // 变化类型
}

// 大额交易记录
export interface LargeTransaction {
  id?: number;               // 数据库ID
  timestamp: number;         // 交易时间戳
  txid: string;              // 交易ID
  from_address: string;      // 发送地址
  to_address: string;        // 接收地址
  amount: string;            // 交易数量
  type: 'buy' | 'sell';      // 交易类型
}

// 邮件通知类型
export type NotificationType = 'large_transaction' | 'holder_change' | 'whale_movement';

// 监控配置
export interface MonitorConfig {
  runeId: string;                    // 符文ID
  largeTransactionThreshold: number; // 大额交易阈值
  topHoldersCount: number;           // 监控前N名持币地址
  snapshotInterval: number;          // 快照间隔（小时）
}
