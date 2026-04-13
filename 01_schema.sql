-- 클라이언트 연결 인코딩을 UTF-8로 강제 설정 (도커 초기화 한글 깨짐 방지)
SET NAMES utf8mb4;

-- 전역 타임존을 한국 시간으로 설정
SET GLOBAL time_zone = '+09:00';
SET time_zone = '+09:00';

-- ────────────────────────────────────────────────────────────
-- 1. Database & Utility Setup
-- ────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `szdev` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE szdev;

DELIMITER $$
CREATE FUNCTION IF NOT EXISTS `FN_GEN_ID`() RETURNS varchar(50)
NO SQL
DETERMINISTIC
BEGIN
  RETURN CONV(UUID_SHORT(), 10, 36);
END$$
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- 2. Create Tables
-- ────────────────────────────────────────────────────────────

-- User Table
CREATE TABLE IF NOT EXISTS `T_USER` (
  `user_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_no`),
  UNIQUE KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Table
CREATE TABLE IF NOT EXISTS `T_ROLE` (
  `role_no`   varchar(50)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_no`),
  UNIQUE KEY `idx_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Role Mapping Table
CREATE TABLE IF NOT EXISTS `T_USER_ROLE` (
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`user_id`, `role_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Menu Table
CREATE TABLE IF NOT EXISTS `T_MENU` (
  `menu_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `board_sort` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `use_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Y',
  `del_yn` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `is_board` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `is_public` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Y',
  `board_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`menu_no`),
  UNIQUE KEY `idx_menu_name` (`menu_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Menu Mapping Table
CREATE TABLE IF NOT EXISTS `T_ROLE_MENU` (
  `role_no`   varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_no`   varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `can_read`  tinyint(1)  DEFAULT 1,
  `can_write` tinyint(1)  DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`role_no`, `menu_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Board Table
CREATE TABLE IF NOT EXISTS `T_BOARD` (
  `board_no`   varchar(50)  COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FN_GEN_ID() 사용',
  `board_code` varchar(50)  COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '게시판 분류 코드 (예: CONTENT, NOTICE)',
  `title`      varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content`    longtext     COLLATE utf8mb4_unicode_ci,
  `user_id`    varchar(50)  COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `del_yn`     char(1)      NOT NULL DEFAULT 'N' COMMENT '논리 삭제 여부',
  PRIMARY KEY (`board_no`),
  KEY `idx_board_code` (`board_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Board Read History Table
CREATE TABLE IF NOT EXISTS `T_BOARD_READ_HISTORY` (
  `user_id` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사용자 아이디',
  `board_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '게시판 코드',
  `last_read_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 접속 시간',
  PRIMARY KEY (`user_id`, `board_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시판별 사용자 마지막 조회 시간';

-- Notification Table
CREATE TABLE IF NOT EXISTS `T_NOTIFICATION` (
  `notif_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FN_GEN_ID() 사용',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '알림을 받는 유저',
  `actor_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '알림을 발생시킨 유저',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'POST_COMMENT, POST_REACTION, COMMENT_REACTION',
  `target_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notif_no`),
  KEY `idx_notif_user` (`user_id`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 1. Create Social Tables (Comments & Reactions)
-- ────────────────────────────────────────────────────────────

-- Comment Table
CREATE TABLE IF NOT EXISTS `T_COMMENT` (
  `comment_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FN_GEN_ID() 사용',
  `board_no`   varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id`    varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content`    text        COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp   NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `del_yn`     char(1)     NOT NULL DEFAULT 'N' COMMENT '논리 삭제 여부',
  PRIMARY KEY (`comment_no`),
  KEY `idx_comment_board` (`board_no`),
  CONSTRAINT `fk_comment_board` FOREIGN KEY (`board_no`) REFERENCES `T_BOARD` (`board_no`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reaction Table
CREATE TABLE IF NOT EXISTS `T_REACTION` (
  `reaction_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FN_GEN_ID() 사용',
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BOARD, COMMENT',
  `target_no`   varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id`     varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emotion`     varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'LIKE, HEART, SURPRISE, LAUGH, SAD, ANGRY',
  `created_at`  timestamp   NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reaction_no`),
  UNIQUE KEY `idx_reaction_unique` (`target_type`, `target_no`, `user_id`),
  KEY `idx_reaction_target` (`target_type`, `target_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 4. Chat Tables Setup
-- ────────────────────────────────────────────────────────────

-- Chat Room Table
CREATE TABLE IF NOT EXISTS `T_CHAT_ROOM` (
  `room_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FN_GEN_ID() 사용',
  `room_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLIC' COMMENT 'PUBLIC, PRIVATE',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Member Table
CREATE TABLE IF NOT EXISTS `T_CHAT_MEMBER` (
  `room_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_no`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat Message Table
CREATE TABLE IF NOT EXISTS `T_CHAT_MESSAGE` (
  `msg_no` bigint(20) NOT NULL AUTO_INCREMENT,
  `room_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`msg_no`),
  KEY `idx_chat_room` (`room_no`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


