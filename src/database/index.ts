/**
 * 数据库模块
 * 使用SQLite存储历史数据和监控记录
 */

import Database from 'better-sqlite3';
import path from 'path';
import { dbConfig } from '../config';
import { HolderSnapshot, HolderChange, LargeTransaction } from '../types';

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    // 初始化数据库连接
    this.db = new Database(dbConfig.path);
    this.initTables();
  }

  /**
   * 初始化数据库表结构
   */
  private initTables(): void {
    // 持币快照表 - 存储每次获取的前100持币地址数据
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS holder_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        holders_json TEXT NOT NULL,
        total_supply TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON holder_snapshots(timestamp);
    `);

    // 持仓变化记录表 - 记录每次快照之间的变化
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS holder_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        address TEXT NOT NULL,
        old_rank INTEGER,
        new_rank INTEGER NOT NULL,
        old_balance TEXT NOT NULL,
        new_balance TEXT NOT NULL,
        balance_change TEXT NOT NULL,
        change_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_change_timestamp ON holder_changes(timestamp);
      CREATE INDEX IF NOT EXISTS idx_change_address ON holder_changes(address);
    `);

    // 大额交易记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS large_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        txid TEXT NOT NULL UNIQUE,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON large_transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_tx_txid ON large_transactions(txid);
    `);

    console.log('✅ 数据库表初始化完成');
  }

  /**
   * 保存持币快照
   */
  saveSnapshot(snapshot: HolderSnapshot): void {
    const stmt = this.db.prepare(`
      INSERT INTO holder_snapshots (timestamp, holders_json, total_supply)
      VALUES (?, ?, ?)
    `);
    stmt.run(
      snapshot.timestamp,
      JSON.stringify(snapshot.holders),
      snapshot.total_supply
    );
  }

  /**
   * 获取最新的快照
   */
  getLatestSnapshot(): HolderSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT * FROM holder_snapshots
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const row = stmt.get() as any;
    if (!row) return null;

    return {
      id: row.id,
      timestamp: row.timestamp,
      holders: JSON.parse(row.holders_json),
      total_supply: row.total_supply,
    };
  }

  /**
   * 获取指定时间范围内的快照
   */
  getSnapshots(startTime: number, endTime: number): HolderSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM holder_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(startTime, endTime) as any[];
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      holders: JSON.parse(row.holders_json),
      total_supply: row.total_supply,
    }));
  }

  /**
   * 保存持仓变化记录
   */
  saveHolderChanges(changes: HolderChange[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO holder_changes (
        timestamp, address, old_rank, new_rank,
        old_balance, new_balance, balance_change, change_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((changes: HolderChange[]) => {
      for (const change of changes) {
        stmt.run(
          change.timestamp,
          change.address,
          change.old_rank,
          change.new_rank,
          change.old_balance,
          change.new_balance,
          change.balance_change,
          change.change_type
        );
      }
    });

    insertMany(changes);
  }

  /**
   * 保存大额交易记录
   */
  saveLargeTransaction(tx: LargeTransaction): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO large_transactions (
          timestamp, txid, from_address, to_address, amount, type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        tx.timestamp,
        tx.txid,
        tx.from_address,
        tx.to_address,
        tx.amount,
        tx.type
      );
      return true;
    } catch (error: any) {
      // 如果是唯一约束冲突（重复交易），忽略
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取最近的持仓变化
   */
  getRecentChanges(limit: number = 50): HolderChange[] {
    const stmt = this.db.prepare(`
      SELECT * FROM holder_changes
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      address: row.address,
      old_rank: row.old_rank,
      new_rank: row.new_rank,
      old_balance: row.old_balance,
      new_balance: row.new_balance,
      balance_change: row.balance_change,
      change_type: row.change_type,
    }));
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

// 导出单例实例
export const db = new DatabaseManager();
