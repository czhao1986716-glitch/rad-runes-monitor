/**
 * 比特币符文API客户端
 * 支持多个数据源获取符文持币信息
 */

import axios, { AxiosInstance } from 'axios';
import { Holder } from '../types';

export class RunesApiClient {
  private client: AxiosInstance;
  private runeId: string;

  constructor(runeId: string) {
    this.runeId = runeId;
    this.client = axios.create({
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent': 'RAD-Monitor/1.0',
      },
    });
  }

  /**
   * 从 Unisat API 获取持币地址列表
   * Unisat 是一个主要的比特币铭文和符文市场
   */
  async getHoldersFromUnisat(topCount: number = 100): Promise<Holder[]> {
    try {
      const url = `https://unisat.io/wallet-api/v3/runes/holders`;
      const response = await this.client.get(url, {
        params: {
          runeId: this.runeId,
          limit: topCount,
        },
      });

      if (response.data && response.data.data) {
        return this.transformUnisatData(response.data.data);
      }
      throw new Error('Invalid response format from Unisat');
    } catch (error: any) {
      console.error('从 Unisat 获取数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 从 OKX API 获取持币地址列表
   * OKX 也提供符文交易和信息服务
   */
  async getHoldersFromOKX(topCount: number = 100): Promise<Holder[]> {
    try {
      const url = `https://www.okx.com/api/v5/dex/aggregator/runes/holders`;
      const response = await this.client.get(url, {
        params: {
          runeId: this.runeId,
          limit: topCount,
        },
      });

      if (response.data && response.data.data) {
        return this.transformOKXData(response.data.data);
      }
      throw new Error('Invalid response format from OKX');
    } catch (error: any) {
      console.error('从 OKX 获取数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 尝试从多个数据源获取持币信息
   * 按优先级顺序尝试，直到成功为止
   */
  async getHolders(topCount: number = 100): Promise<Holder[]> {
    console.log(`🔍 开始获取符文 ${this.runeId} 的持币信息...`);

    // 优先级 1: Unisat
    try {
      console.log('  尝试从 Unisat 获取...');
      const holders = await this.getHoldersFromUnisat(topCount);
      console.log(`  ✅ 成功从 Unisat 获取 ${holders.length} 条持币记录`);
      return holders;
    } catch (error) {
      console.log('  ❌ Unisat 失败，尝试下一个数据源');
    }

    // 优先级 2: OKX
    try {
      console.log('  尝试从 OKX 获取...');
      const holders = await this.getHoldersFromOKX(topCount);
      console.log(`  ✅ 成功从 OKX 获取 ${holders.length} 条持币记录`);
      return holders;
    } catch (error) {
      console.log('  ❌ OKX 失败');
    }

    throw new Error('所有数据源均获取失败，请稍后重试');
  }

  /**
   * 获取符文的总供应量
   */
  async getTotalSupply(): Promise<string> {
    try {
      const url = `https://unisat.io/wallet-api/v3/runes/list`;
      const response = await this.client.get(url, {
        params: {
          runeId: this.runeId,
        },
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].totalSupply || '0';
      }
      return '0';
    } catch (error: any) {
      console.error('获取总供应量失败:', error.message);
      return '0';
    }
  }

  /**
   * 获取符文的交易记录
   */
  async getTransactions(limit: number = 50): Promise<any[]> {
    try {
      const url = `https://unisat.io/wallet-api/v3/runes/txs`;
      const response = await this.client.get(url, {
        params: {
          runeId: this.runeId,
          limit: limit,
        },
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      console.error('获取交易记录失败:', error.message);
      return [];
    }
  }

  /**
   * 转换 Unisat 数据格式
   */
  private transformUnisatData(data: any[]): Holder[] {
    return data.map((item, index) => ({
      address: item.address || '',
      balance: item.balance || '0',
      rank: index + 1,
      percentage: item.percentage || '0',
    }));
  }

  /**
   * 转换 OKX 数据格式
   */
  private transformOKXData(data: any[]): Holder[] {
    return data.map((item, index) => ({
      address: item.address || '',
      balance: item.balance || '0',
      rank: index + 1,
      percentage: item.percent || '0',
    }));
  }
}

/**
 * 交易所地址列表（用于识别大额转账到交易所）
 */
export const EXCHANGE_ADDRESSES = [
  'bc1qgdjqv0av3q56jv82u6hmj0c3z4ln3ktvl2rsfa', // Binance
  'bc1qa5wkvgw7y4spv0h0lh4c2wphk8l9q69l8tx6pp', // OKX
  'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z30607u', // Bitfinex
  // 可以添加更多交易所地址
];

/**
 * 判断地址是否为交易所地址
 */
export function isExchangeAddress(address: string): boolean {
  return EXCHANGE_ADDRESSES.includes(address.toLowerCase());
}
