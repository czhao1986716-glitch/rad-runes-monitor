/**
 * API 路由
 * 提供数据查询接口
 */

import { Router } from 'express';
import { db } from '../database';

const router = Router();

/**
 * 获取最新的持币快照
 */
router.get('/holders/latest', (req, res) => {
  try {
    const snapshot = db.getLatestSnapshot();
    if (!snapshot) {
      res.json({ success: false, message: '暂无数据' });
      return;
    }
    res.json({
      success: true,
      data: {
        timestamp: snapshot.timestamp,
        total_supply: snapshot.total_supply,
        holders: snapshot.holders,
        count: snapshot.holders.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取历史快照列表
 */
router.get('/snapshots', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 24; // 默认24条
    const offset = parseInt(req.query.offset as string) || 0;

    const snapshots = db.getSnapshots(
      Date.now() - 30 * 24 * 60 * 60 * 1000, // 最近30天
      Date.now()
    );

    res.json({
      success: true,
      data: {
        snapshots: snapshots.slice(offset, offset + limit),
        total: snapshots.length,
        hasMore: offset + limit < snapshots.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取持仓变化记录
 */
router.get('/changes', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const changes = db.getRecentChanges(limit);

    // 统计变化类型
    const stats = {
      new: changes.filter(c => c.change_type === 'new').length,
      exit: changes.filter(c => c.change_type === 'exit').length,
      increase: changes.filter(c => c.change_type === 'increase').length,
      decrease: changes.filter(c => c.change_type === 'decrease').length,
    };

    res.json({
      success: true,
      data: {
        changes,
        stats,
        count: changes.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取大额交易记录
 */
router.get('/transactions', (req, res) => {
  try {
    // 从数据库获取大额交易
    const transactions = db.getRecentTransactions(100);

    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取统计概览
 */
router.get('/stats', (req, res) => {
  try {
    const latestSnapshot = db.getLatestSnapshot();
    const recentChanges = db.getRecentChanges(100);
    const recentTransactions = db.getRecentTransactions(50);

    if (!latestSnapshot) {
      res.json({ success: false, message: '暂无数据' });
      return;
    }

    // 计算统计数据
    const topHolders = latestSnapshot.holders.slice(0, 10);
    const totalSupply = BigInt(latestSnapshot.total_supply);
    const topHoldersSupply = topHolders.reduce(
      (sum, holder) => sum + BigInt(holder.balance),
      BigInt(0)
    );

    const stats = {
      // 基础信息
      lastUpdate: latestSnapshot.timestamp,
      totalSupply: latestSnapshot.total_supply,
      holdersCount: latestSnapshot.holders.length,

      // 前10大户占比
      top10Concentration: (Number(topHoldersSupply) / Number(totalSupply) * 100).toFixed(2),

      // 最近变化统计
      recentChanges: {
        newEntries: recentChanges.filter(c => c.change_type === 'new').length,
        exits: recentChanges.filter(c => c.change_type === 'exit').length,
        increases: recentChanges.filter(c => c.change_type === 'increase').length,
        decreases: recentChanges.filter(c => c.change_type === 'decrease').length,
      },

      // 大额交易统计
      largeTransactions: {
        total: recentTransactions.length,
        buys: recentTransactions.filter(t => t.type === 'buy').length,
        sells: recentTransactions.filter(t => t.type === 'sell').length,
      },

      // 前5大户
      top5Holders: latestSnapshot.holders.slice(0, 5).map(h => ({
        address: h.address,
        balance: h.balance,
        percentage: h.percentage || '0',
      })),
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export { router as apiRoutes };
