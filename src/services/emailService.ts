/**
 * 邮件提醒服务模块
 * 负责发送各种监控提醒邮件
 */

import nodemailer from 'nodemailer';
import { emailConfig } from '../config';
import { HolderChange, LargeTransaction } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // 创建 SMTP 传输器
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: false, // 使用 TLS
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    // 验证配置
    this.verifyConfiguration();
  }

  /**
   * 验证邮件配置是否正确
   */
  private async verifyConfiguration(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ 邮件服务配置验证成功');
    } catch (error: any) {
      console.error('❌ 邮件服务配置验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送邮件的通用方法
   */
  private async sendEmail(subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: emailConfig.user,
        to: emailConfig.notificationEmail,
        subject: subject,
        html: html,
      });

      console.log(`📧 邮件已发送: ${info.messageId}`);
    } catch (error: any) {
      console.error('❌ 发送邮件失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送大额交易提醒邮件
   */
  async sendLargeTransactionAlert(transactions: LargeTransaction[]): Promise<void> {
    if (transactions.length === 0) return;

    const subject = `🚨 RAD 大额交易提醒 - ${transactions.length} 笔`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .tx-item { background: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .tx-item.buy { border-left: 4px solid #28a745; }
    .tx-item.sell { border-left: 4px solid #dc3545; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .timestamp { color: #999; font-size: 0.9em; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 0.9em; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 RAD 符文大额交易提醒</h1>
      <p>检测到 ${transactions.length} 笔大额交易</p>
    </div>

    <div class="content">
      <div class="alert">
        <strong>⚠️ 重要提醒</strong><br>
        以下大额交易可能对价格产生重大影响，请密切关注！
      </div>

      ${transactions.map(tx => `
        <div class="tx-item ${tx.type}">
          <div><span class="label">交易类型:</span> <span class="value">${tx.type === 'buy' ? '🟢 买入' : '🔴 卖出'}</span></div>
          <div><span class="label">交易金额:</span> <span class="value"><strong>${this.formatNumber(tx.amount)} RAD</strong></span></div>
          <div><span class="label">发送地址:</span> <span class="value">${this.formatAddress(tx.from_address)}</span></div>
          <div><span class="label">接收地址:</span> <span class="value">${this.formatAddress(tx.to_address)}</span></div>
          <div><span class="label">交易ID:</span> <span class="value"><a href="https://mempool.space/tx/${tx.txid}">${tx.txid.substring(0, 20)}...</a></span></div>
          <div class="timestamp">时间: ${new Date(tx.timestamp).toLocaleString('zh-CN')}</div>
        </div>
      `).join('')}

      <div class="footer">
        <p>📊 本邮件由 RAD 持币监控系统自动发送</p>
        <p>${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(subject, html);
  }

  /**
   * 发送持仓变化提醒邮件
   */
  async sendHolderChangeAlert(changes: HolderChange[]): Promise<void> {
    if (changes.length === 0) return;

    const subject = `📊 RAD 持仓变化提醒 - ${changes.length} 个地址`;

    // 分类统计
    const newEntries = changes.filter(c => c.change_type === 'new');
    const exits = changes.filter(c => c.change_type === 'exit');
    const increases = changes.filter(c => c.change_type === 'increase');
    const decreases = changes.filter(c => c.change_type === 'decrease');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
    .section { background: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; color: #667eea; }
    .change-item { padding: 10px; margin: 5px 0; border-bottom: 1px solid #eee; }
    .change-item:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .positive { color: #28a745; }
    .negative { color: #dc3545; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 RAD 持仓变化提醒</h1>
      <p>检测到 ${changes.length} 个地址的持仓变化</p>
    </div>

    <div class="content">
      ${newEntries.length > 0 ? `
        <div class="section">
          <div class="section-title">🆕 新进入前100 (${newEntries.length} 个)</div>
          ${newEntries.slice(0, 10).map(c => `
            <div class="change-item">
              <div><span class="label">排名:</span> <span class="value">#${c.new_rank}</span></div>
              <div><span class="label">地址:</span> <span class="value">${this.formatAddress(c.address)}</span></div>
              <div><span class="label">持仓:</span> <span class="value positive">${this.formatNumber(c.new_balance)} RAD</span></div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${exits.length > 0 ? `
        <div class="section">
          <div class="section-title">🚪 退出前100 (${exits.length} 个)</div>
          ${exits.slice(0, 10).map(c => `
            <div class="change-item">
              <div><span class="label">原排名:</span> <span class="value">#${c.old_rank}</span></div>
              <div><span class="label">地址:</span> <span class="value">${this.formatAddress(c.address)}</span></div>
              <div><span class="label">减少:</span> <span class="value negative">${this.formatNumber(c.old_balance)} RAD</span></div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${increases.length > 0 ? `
        <div class="section">
          <div class="section-title">📈 大幅增持 (${increases.length} 个)</div>
          ${increases.slice(0, 10).map(c => `
            <div class="change-item">
              <div><span class="label">地址:</span> <span class="value">${this.formatAddress(c.address)}</span></div>
              <div><span class="label">增持:</span> <span class="value positive">+${this.formatNumber(c.balance_change)} RAD</span></div>
              <div><span class="label">当前持仓:</span> <span class="value">${this.formatNumber(c.new_balance)} RAD</span></div>
              <div><span class="label">排名变化:</span> <span class="value">#${c.old_rank} → #${c.new_rank}</span></div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${decreases.length > 0 ? `
        <div class="section">
          <div class="section-title">📉 大幅减持 (${decreases.length} 个)</div>
          ${decreases.slice(0, 10).map(c => `
            <div class="change-item">
              <div><span class="label">地址:</span> <span class="value">${this.formatAddress(c.address)}</span></div>
              <div><span class="label">减持:</span> <span class="value negative">${this.formatNumber(c.balance_change)} RAD</span></div>
              <div><span class="label">当前持仓:</span> <span class="value">${this.formatNumber(c.new_balance)} RAD</span></div>
              <div><span class="label">排名变化:</span> <span class="value">#${c.old_rank} → #${c.new_rank}</span></div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        <p>📊 本邮件由 RAD 持币监控系统自动发送</p>
        <p>${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(subject, html);
  }

  /**
   * 发送系统启动通知
   */
  async sendSystemStartNotification(): Promise<void> {
    const subject = '✅ RAD 监控系统已启动';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 10px; margin-top: 10px; }
    .info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ RAD 监控系统已启动</h1>
      <p>监控系统正在运行中</p>
    </div>

    <div class="content">
      <div class="info">
        <strong>系统信息</strong><br>
        符文ID: ${process.env.RAD_RUNE_ID || '907897:2259'}<br>
        监控范围: 前${process.env.TOP_HOLDERS_COUNT || '100'}名持币地址<br>
        更新频率: 每${process.env.SNAPSHOT_INTERVAL_HOURS || '1'}小时<br>
        大额交易阈值: ${process.env.LARGE_TRANSACTION_THRESHOLD || '100000'} RAD<br>
      </div>

      <p>系统将自动监控 RAD 符文的以下内容：</p>
      <ul>
        <li>前100名持币地址变化</li>
        <li>大额买入/卖出交易</li>
        <li>新增/退出前100的地址</li>
        <li>大幅增持/减持行为</li>
      </ul>

      <div class="footer">
        <p>📊 RAD 持币监控系统</p>
        <p>${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail(subject, html);
  }

  /**
   * 格式化地址显示
   */
  private formatAddress(address: string): string {
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
  }

  /**
   * 格式化数字显示（添加千分位）
   */
  private formatNumber(numStr: string): string {
    const num = BigInt(numStr);
    return num.toLocaleString('en-US');
  }
}

// 导出单例
export const emailService = new EmailService();
