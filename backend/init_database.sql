-- Nano-Bananary 数据库表结构

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL PRIMARY KEY COMMENT '用户ID',
  `username` varchar(50) NOT NULL UNIQUE COMMENT '用户名',
  `phone` varchar(20) NOT NULL UNIQUE COMMENT '手机号',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希',
  `credits` int NOT NULL DEFAULT 100 COMMENT '用户积分',
  `avatar_url` varchar(500) NULL COMMENT '头像URL',
  `email` varchar(100) NULL COMMENT '邮箱',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '用户状态: 1=正常, 0=禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 积分交易记录表
CREATE TABLE IF NOT EXISTS `credit_transactions` (
  `id` varchar(50) NOT NULL PRIMARY KEY COMMENT '交易ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `type` enum('charge','consume','refund') NOT NULL COMMENT '交易类型: charge=充值, consume=消费, refund=退款',
  `amount` int NOT NULL COMMENT '交易金额(积分)',
  `balance` int NOT NULL COMMENT '交易后余额',
  `description` varchar(255) NOT NULL COMMENT '交易描述',
  `order_id` varchar(50) NULL COMMENT '关联订单ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分交易记录表';

-- 3. 充值订单表
CREATE TABLE IF NOT EXISTS `charge_orders` (
  `id` varchar(50) NOT NULL PRIMARY KEY COMMENT '订单ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `amount` decimal(10,2) NOT NULL COMMENT '充值金额(元)',
  `credits` int NOT NULL COMMENT '获得积分',
  `payment_method` enum('alipay','wechat','other') NOT NULL COMMENT '支付方式',
  `status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `payment_id` varchar(100) NULL COMMENT '第三方支付订单号',
  `paid_at` timestamp NULL COMMENT '支付时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值订单表';

-- 4. 用户生成历史记录表
CREATE TABLE IF NOT EXISTS `generation_history` (
  `id` varchar(50) NOT NULL PRIMARY KEY COMMENT '记录ID',
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `type` enum('image','video') NOT NULL COMMENT '生成类型',
  `transformation_key` varchar(100) NOT NULL COMMENT '变换类型key',
  `input_image_url` varchar(500) NULL COMMENT '输入图片URL',
  `output_image_url` varchar(500) NULL COMMENT '输出图片URL',
  `output_video_url` varchar(500) NULL COMMENT '输出视频URL',
  `prompt` text NULL COMMENT '使用的提示词',
  `credits_consumed` int NOT NULL DEFAULT 0 COMMENT '消耗的积分',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户生成历史记录表';

-- 5. 系统配置表
CREATE TABLE IF NOT EXISTS `system_config` (
  `key` varchar(100) NOT NULL PRIMARY KEY COMMENT '配置键',
  `value` text NOT NULL COMMENT '配置值',
  `description` varchar(255) NULL COMMENT '配置描述',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入初始系统配置
INSERT INTO `system_config` (`key`, `value`, `description`) VALUES
('image_generation_cost', '50', '图片生成消耗积分'),
('video_generation_cost', '100', '视频生成消耗积分'),
('new_user_credits', '100', '新用户初始积分'),
('credit_exchange_rate', '80', '充值汇率(积分/元)');

-- 插入测试用户
INSERT INTO `users` (`id`, `username`, `phone`, `password_hash`, `credits`) VALUES
('test-user-1', 'testuser', '13800138000', '$2a$10$example', 1000)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入测试积分记录
INSERT INTO `credit_transactions` (`id`, `user_id`, `type`, `amount`, `balance`, `description`) VALUES
('trans-1', 'test-user-1', 'charge', 100, 1000, '注册奖励')
ON DUPLICATE KEY UPDATE `id` = `id`;