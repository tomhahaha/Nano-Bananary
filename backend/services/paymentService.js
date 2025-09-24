const crypto = require('crypto');
const crypto = require('crypto');
const axios = require('axios');

class PaymentService {
  constructor() {
    // 支付宝配置
    this.alipayConfig = {
      appId: process.env.ALIPAY_APP_ID || 'your_alipay_app_id',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || 'your_alipay_private_key',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || 'your_alipay_public_key',
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://your-domain.com/api/payment/alipay/notify',
      returnUrl: process.env.ALIPAY_RETURN_URL || 'https://your-domain.com/payment/success'
    };

    // 微信支付配置
    this.wechatConfig = {
      appId: process.env.WECHAT_APP_ID || 'your_wechat_app_id',
      mchId: process.env.WECHAT_MCH_ID || 'your_wechat_mch_id',
      key: process.env.WECHAT_KEY || 'your_wechat_key',
      gateway: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify'
    };
  }

  // 生成支付宝支付链接
  async createAlipayOrder(orderId, amount, subject, description) {
    try {
      const params = {
        app_id: this.alipayConfig.appId,
        method: 'alipay.trade.page.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: this.formatDate(new Date()),
        version: '1.0',
        notify_url: this.alipayConfig.notifyUrl,
        return_url: this.alipayConfig.returnUrl,
        biz_content: JSON.stringify({
          out_trade_no: orderId,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: amount.toString(),
          subject: subject,
          body: description
        })
      };

      // 生成签名
      const sign = this.generateAlipaySign(params);
      params.sign = sign;

      // 构建支付URL
      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      return {
        success: true,
        paymentUrl: `${this.alipayConfig.gateway}?${queryString}`,
        orderId
      };
    } catch (error) {
      console.error('创建支付宝订单失败:', error);
      return {
        success: false,
        message: '创建支付订单失败'
      };
    }
  }

  // 生成微信支付二维码
  async createWechatOrder(orderId, amount, subject, description, clientIp) {
    try {
      const params = {
        appid: this.wechatConfig.appId,
        mch_id: this.wechatConfig.mchId,
        nonce_str: this.generateNonceStr(),
        body: subject,
        detail: description,
        out_trade_no: orderId,
        total_fee: Math.round(amount * 100), // 微信支付金额单位为分
        spbill_create_ip: clientIp,
        notify_url: this.wechatConfig.notifyUrl,
        trade_type: 'NATIVE' // 扫码支付
      };

      // 生成签名
      const sign = this.generateWechatSign(params);
      params.sign = sign;

      // 构建XML请求
      const xml = this.buildXml(params);

      // 调用微信支付接口
      const response = await axios.post(this.wechatConfig.gateway, xml, {
        headers: { 'Content-Type': 'text/xml' }
      });

      const result = this.parseXml(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          qrCodeUrl: result.code_url,
          orderId
        };
      } else {
        return {
          success: false,
          message: result.return_msg || result.err_code_des || '创建微信支付订单失败'
        };
      }
    } catch (error) {
      console.error('创建微信支付订单失败:', error);
      return {
        success: false,
        message: '创建支付订单失败'
      };
    }
  }

  // 验证支付宝回调
  verifyAlipayNotify(params) {
    try {
      const sign = params.sign;
      delete params.sign;
      delete params.sign_type;

      // 按字母顺序排序
      const sortedParams = {};
      Object.keys(params).sort().forEach(key => {
        if (params[key] !== '') {
          sortedParams[key] = params[key];
        }
      });

      // 构建待签名字符串
      const signStr = Object.keys(sortedParams)
        .map(key => `${key}=${sortedParams[key]}`)
        .join('&');

      // 验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signStr, 'utf8');
      return verify.verify(this.alipayConfig.publicKey, sign, 'base64');
    } catch (error) {
      console.error('验证支付宝回调失败:', error);
      return false;
    }
  }

  // 验证微信支付回调
  verifyWechatNotify(params) {
    try {
      const sign = params.sign;
      delete params.sign;

      const generatedSign = this.generateWechatSign(params);
      return sign === generatedSign;
    } catch (error) {
      console.error('验证微信支付回调失败:', error);
      return false;
    }
  }

  // 生成支付宝签名
  generateAlipaySign(params) {
    // 按字母顺序排序
    const sortedParams = {};
    Object.keys(params).sort().forEach(key => {
      if (params[key] !== '' && key !== 'sign') {
        sortedParams[key] = params[key];
      }
    });

    // 构建待签名字符串
    const signStr = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');

    // 使用私钥签名
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr, 'utf8');
    return sign.sign(this.alipayConfig.privateKey, 'base64');
  }

  // 生成微信支付签名
  generateWechatSign(params) {
    // 按字母顺序排序
    const sortedParams = {};
    Object.keys(params).sort().forEach(key => {
      if (params[key] !== '' && key !== 'sign') {
        sortedParams[key] = params[key];
      }
    });

    // 构建待签名字符串
    const signStr = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&') + `&key=${this.wechatConfig.key}`;

    // MD5签名
    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
  }

  // 生成随机字符串
  generateNonceStr(length = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 格式化日期
  formatDate(date) {
    return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  }

  // 构建XML
  buildXml(params) {
    let xml = '<xml>';
    Object.keys(params).forEach(key => {
      xml += `<${key}><![CDATA[${params[key]}]]></${key}>`;
    });
    xml += '</xml>';
    return xml;
  }

  // 解析XML
  parseXml(xml) {
    const result = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }
}

module.exports = new PaymentService();