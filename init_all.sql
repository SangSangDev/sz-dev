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


-- ────────────────────────────────────────────────────────────
-- 3. Initial Data Inserts
-- ────────────────────────────────────────────────────────────

-- 3.1 Provide 기본 사용자 (admin / user)
INSERT IGNORE INTO `T_USER` (`user_no`, `user_id`, `password`, `user_name`) 
VALUES (FN_GEN_ID(), 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '시스템관리자');

INSERT IGNORE INTO `T_USER` (`user_no`, `user_id`, `password`, `user_name`)
VALUES (FN_GEN_ID(), 'user', '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb', '일반사용자');


-- 3.2 Provide 기본 권한 롤 (ROLE_ADMIN / ROLE_USER)
INSERT IGNORE INTO `T_ROLE` (`role_no`, `role_name`) VALUES
  (FN_GEN_ID(), 'ROLE_ADMIN'),
  (FN_GEN_ID(), 'ROLE_USER');


-- 3.3 사용자별 권한 매핑
INSERT IGNORE INTO `T_USER_ROLE` (`user_id`, `role_no`)
SELECT 'admin', role_no FROM `T_ROLE` WHERE role_name = 'ROLE_ADMIN';

INSERT IGNORE INTO `T_USER_ROLE` (`user_id`, `role_no`)
SELECT 'user', role_no FROM `T_ROLE` WHERE role_name = 'ROLE_USER';


-- 3.4 Provide 메뉴 생성 (멱등성을 위해 INSERT IGNORE + 고유키 적용)
INSERT IGNORE INTO `T_MENU` (`menu_no`, `menu_name`, `parent_no`, `url`, `sort_order`, `created_at`, `description`, `use_yn`, `del_yn`, `is_board`, `board_code`) VALUES 
(FN_GEN_ID(), '컨텐츠 관리', NULL, '/user/content', 2, '2026-04-06 09:10:24', NULL, 'Y', 'N', 'N', NULL),
(FN_GEN_ID(), '대시보드', NULL, '/dashboard', 1, '2026-04-06 09:13:30', NULL, 'Y', 'N', 'N', NULL),
(FN_GEN_ID(), '시스템 설정', NULL, '/system', 5, '2026-04-06 09:10:24', NULL, 'Y', 'N', 'N', NULL),
(FN_GEN_ID(), '모드 관리', NULL, '/user/mode', 3, '2026-04-06 09:10:24', NULL, 'Y', 'N', 'N', NULL);

-- Sub-menus (Parent를 가져와서 추가)
INSERT IGNORE INTO `T_MENU` (`menu_no`, `menu_name`, `parent_no`, `url`, `sort_order`, `created_at`)
SELECT FN_GEN_ID(), '메뉴 관리', m.menu_no, '/system/menu', 6, '2026-04-06 09:10:24' FROM `T_MENU` m WHERE m.menu_name = '시스템 설정';

INSERT IGNORE INTO `T_MENU` (`menu_no`, `menu_name`, `parent_no`, `url`, `sort_order`, `created_at`)
SELECT FN_GEN_ID(), '역할 권한', m.menu_no, '/system/role', 7, '2026-04-06 09:10:24' FROM `T_MENU` m WHERE m.menu_name = '시스템 설정';

INSERT IGNORE INTO `T_MENU` (`menu_no`, `menu_name`, `parent_no`, `url`, `sort_order`, `created_at`)
SELECT FN_GEN_ID(), '사용자 관리', m.menu_no, '/user/user-admin', 8, '2026-04-06 09:10:24' FROM `T_MENU` m WHERE m.menu_name = '시스템 설정';


-- 3.5 역할 ↔ 메뉴 권한 매핑
-- ROLE_ADMIN 권한 매핑
INSERT IGNORE INTO `T_ROLE_MENU` (`role_no`, `menu_no`, `can_read`, `can_write`, `can_delete`)
SELECT r.role_no, m.menu_no, 1, 0, 1 
FROM `T_ROLE` r CROSS JOIN `T_MENU` m 
WHERE r.role_name = 'ROLE_ADMIN' AND m.menu_name = '대시보드';

INSERT IGNORE INTO `T_ROLE_MENU` (`role_no`, `menu_no`, `can_read`, `can_write`, `can_delete`)
SELECT r.role_no, m.menu_no, 1, 1, 1 
FROM `T_ROLE` r CROSS JOIN `T_MENU` m 
WHERE r.role_name = 'ROLE_ADMIN' AND m.menu_name IN ('시스템 설정', '역할 권한', '메뉴 관리', '사용자 관리', '컨텐츠 관리', '모드 관리');

-- ROLE_USER 권한 매핑
INSERT IGNORE INTO `T_ROLE_MENU` (`role_no`, `menu_no`, `can_read`, `can_write`, `can_delete`)
SELECT r.role_no, m.menu_no, 1, 0, 0 
FROM `T_ROLE` r CROSS JOIN `T_MENU` m 
WHERE r.role_name = 'ROLE_USER' AND m.menu_name IN ('대시보드', '사용자 관리', '컨텐츠 관리', '모드 관리');


-- 3.6 샘플 게시글 데이터
INSERT IGNORE INTO `T_BOARD` (`board_no`, `board_code`, `title`, `content`, `user_id`) VALUES
  (FN_GEN_ID(), 'CONTENT', '첫 번째 컨텐츠', '<p>안녕하세요! 첫 번째 컨텐츠입니다.</p>', 'admin'),
  (FN_GEN_ID(), 'CONTENT', '두 번째 컨텐츠', '<p>두 번째 컨텐츠 내용입니다. <strong>굵게</strong> 표시됩니다.</p>', 'admin');

-- ────────────────────────────────────────────────────────────
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
