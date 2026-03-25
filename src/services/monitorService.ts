/**
 * 监控服务模块
 * 核心监控逻辑：检测持仓变化、大额交易等
 */

import { Holder, HolderSnapshot, HolderChange, LargeTransaction } from '../types';
import { RunesApiClient, isExchangeAddress } from '../api/runesClient';
import { db } from '../database';
import { monitorConfig } from '../config';

export class MonitorService {
  private apiClient: RunesApiClient;

  constructor() {
    this.apiClient = new RunesApiClient(monitorConfig.runeId);
  }

  /**
   * 执行完整的监控检查
   * 这是主要的监控流程
   */
  async performMonitoringCheck(): Promise<{
    holderChanges: HolderChange[];
    largeTransactions: LargeTransaction[];
  }> {
    console.log('\n📊 开始执行监控检查...');
    const startTime = Date.now();

    // 1. 获取当前持币快照
    console.log('1️⃣ 获取当前持币数据...');
    const currentHolders = await this.apiClient.getHolders(monitorConfig.topHoldersCount);
    const totalSupply = await this.apiClient.getTotalSupply();

    const currentSnapshot: HolderSnapshot = {
      timestamp: Date.now(),
      holders: currentHolders,
      total_supply: totalSupply,
    };

    // 2. 获取上一次的快照
    console.log('2️⃣ 获取历史数据进行对比...');
    const previousSnapshot = db.getLatestSnapshot();

    // 3. 检测持仓变化
    console.log('3️⃣ 分析持仓变化...');
    const holderChanges = previousSnapshot
      ? this.analyzeHolderChanges(previousSnapshot, currentSnapshot)
      : [];

    // 4. 检测大额交易
    console.log('4️⃣ 检测大额交易...');
    const largeTransactions = await this.detectLargeTransactions(currentHolders);

    // 5. 保存当前快照
    console.log('5️⃣ 保存快照数据...');
    db.saveSnapshot(currentSnapshot);

    // 6. 保存变化记录
    if (holderChanges.length > 0) {
      console.log(`6️⃣ 保存 ${holderChanges.length} 条持仓变化记录...`);
      db.saveHolderChanges(holderChanges);
    }

    // 7. 保存大额交易
    if (largeTransactions.length > 0) {
      console.log(`7️⃣ 保存 ${largeTransactions.length} 条大额交易记录...`);
      for (const tx of largeTransactions) {
        db.saveLargeTransaction(tx);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ 监控检查完成，耗时 ${duration} 秒`);
    console.log(`   - 持仓变化: ${holderChanges.length} 条`);
    console.log(`   - 大额交易: ${largeTransactions.length} 条\n`);

    return { holderChanges, largeTransactions };
  }

  /**
   * 分析持仓变化
   * 对比两次快照，检测新增、退出、增持、减持的地址
   */
  private analyzeHolderChanges(
    previous: HolderSnapshot,
    current: HolderSnapshot
  ): HolderChange[] {
    const changes: HolderChange[] = [];
    const timestamp = Date.now();

    // 创建地址到持仓的映射（前一次快照）
    const previousMap = new Map<string, Holder>();
    previous.holders.forEach(h => previousMap.set(h.address, h));

    // 创建地址到持仓的映射（当前快照）
    const currentMap = new Map<string, Holder>();
    current.holders.forEach(h => currentMap.set(h.address, h));

    // 检测新增的地址（进入前100）
    for (const [address, currentHolder] of currentMap) {
      if (!previousMap.has(address)) {
        changes.push({
          timestamp,
          address,
          new_rank: currentHolder.rank,
          old_balance: '0',
          new_balance: currentHolder.balance,
          balance_change: currentHolder.balance,
          change_type: 'new',
        });
      }
    }

    // 检测退出的地址（离开前100）
    for (const [address, previousHolder] of previousMap) {
      if (!currentMap.has(address)) {
        changes.push({
          timestamp,
          address,
          old_rank: previousHolder.rank,
          new_rank: 999, // 退出排名
          old_balance: previousHolder.balance,
          new_balance: '0',
          balance_change: `-${previousHolder.balance}`,
          change_type: 'exit',
        });
      }
    }

    // 检测持仓变化（增持/减持）
    for (const [address, currentHolder] of currentMap) {
      const previousHolder = previousMap.get(address);
      if (previousHolder && previousHolder.balance !== currentHolder.balance) {
        const prevBalance = BigInt(previousHolder.balance);
        const currBalance = BigInt(currentHolder.balance);
        const diff = currBalance - prevBalance;

        const changeType: 'increase' | 'decrease' = diff > 0 ? 'increase' : 'decrease';

        changes.push({
          timestamp,
          address,
          old_rank: previousHolder.rank,
          new_rank: currentHolder.rank,
          old_balance: previousHolder.balance,
          new_balance: currentHolder.balance,
          balance_change: diff.toString(),
          change_type: changeType,
        });
      }
    }

    return changes;
  }

  /**
   * 检测大额交易
   * 通过比较持仓变化来识别大额转账
   */
  private async detectLargeTransactions(currentHolders: Holder[]): Promise<LargeTransaction[]> {
    const transactions: LargeTransaction[] = [];
    const threshold = BigInt(monitorConfig.largeTransactionThreshold);

    // 获取最近的交易记录
    try {
      const recentTxs = await this.apiClient.getTransactions(50);

      for (const tx of recentTxs) {
        // 检查交易金额是否超过阈值
        const amount = BigInt(tx.amount || '0');
        if (amount >= threshold) {
          // 判断是买入还是卖出
          // 这里的逻辑需要根据实际API返回的数据格式调整
          const type: 'buy' | 'sell' = tx.type || 'buy';

          transactions.push({
            timestamp: tx.timestamp || Date.now(),
            txid: tx.txid || '',
            from_address: tx.from || '',
            to_address: tx.to || '',
            amount: amount.toString(),
            type,
          });

          console.log(`   💰 检测到大额${type === 'buy' ? '买入' : '卖出'}: ${amount} RAD`);
        }
      }
    } catch (error: any) {
      console.error('检测大额交易时出错:', error.message);
    }

    return transactions;
  }

  /**
   * 生成持仓变化报告
   */
  generateChangeReport(changes: HolderChange[]): string {
    if (changes.length === 0) {
      return '本次监控未检测到显著变化。';
    }

    const lines: string[] = [];
    lines.push('## 持仓变化报告\n');
    lines.push(`检测时间: ${new Date().toLocaleString('zh-CN')}\n`);
    lines.push(`变化数量: ${changes.length} 条\n`);

    // 按变化类型分组
    const newEntries = changes.filter(c => c.change_type === 'new');
    const exits = changes.filter(c => c.change_type === 'exit');
    const increases = changes.filter(c => c.change_type === 'increase');
    const decreases = changes.filter(c => c.change_type === 'decrease');

    if (newEntries.length > 0) {
      lines.push(`### 🆕 新进入前100 (${newEntries.length} 个地址)\n`);
      newEntries.slice(0, 10).forEach(c => {
        lines.push(`  排名 ${c.new_rank}: ${c.address.substring(0, 20)}... 持有 ${c.new_balance} RAD\n`);
      });
    }

    if (exits.length > 0) {
      lines.push(`### 🚪 退出前100 (${exits.length} 个地址)\n`);
      exits.slice(0, 10).forEach(c => {
        lines.push(`  原排名 ${c.old_rank}: ${c.address.substring(0, 20)}... 减少 ${c.old_balance} RAD\n`);
      });
    }

    if (increases.length > 0) {
      // 排序：按增持数量降序
      increases.sort((a, b) => {
        const diffA = BigInt(a.balance_change);
        const diffB = BigInt(b.balance_change);
        return Number(diffB - diffA);
      });

      lines.push(`### 📈 大幅增持 (>${monitorConfig.largeTransactionThreshold} RAD, ${increases.length} 个地址)\n`);
      increases.slice(0, 10).forEach(c => {
        const isExchange = isExchangeAddress(c.address);
        lines.push(`  ${isExchange ? '🏦' : '👤'} ${c.address.substring(0, 20)}... +${c.balance_change} RAD (排名: ${c.old_rank}→${c.new_rank})\n`);
      });
    }

    if (decreases.length > 0) {
      // 排序：按减持数量降序
      decreases.sort((a, b) => {
        const diffA = BigInt(a.balance_change);
        const diffB = BigInt(b.balance_change);
        return Number(diffA - diffB); // 注意：这里是负数，所以是反序
      });

      lines.push(`### 📉 大幅减持 (>${monitorConfig.largeTransactionThreshold} RAD, ${decreases.length} 个地址)\n`);
      decreases.slice(0, 10).forEach(c => {
        const isExchange = isExchangeAddress(c.address);
        lines.push(`  ${isExchange ? '🏦' : '👤'} ${c.address.substring(0, 20)}... ${c.balance_change} RAD (排名: ${c.old_rank}→${c.new_rank})\n`);
      });
    }

    return lines.join('');
  }
}

// 导出单例
export const monitorService = new MonitorService();
