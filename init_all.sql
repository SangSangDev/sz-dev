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
-- 3. Initial Data Inserts (Moved to Bottom)
-- ────────────────────────────────────────────────────────────

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


-- Local Database Data Dump
-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: szdev
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `T_BOARD`
--

LOCK TABLES `T_BOARD` WRITE;
/*!40000 ALTER TABLE `T_BOARD` DISABLE KEYS */;
INSERT IGNORE INTO `T_BOARD` (`board_no`, `board_code`, `title`, `content`, `user_id`, `created_at`, `updated_at`, `del_yn`) VALUES ('RUU1XIV0XE3','CONTENT','첫 번째 컨텐츠','<p>안녕하세요! 첫 번째 컨텐츠입니다.</p>','admin','2026-04-08 08:51:36','2026-04-08 08:51:36','N'),('RUU1XIV0XE4','CONTENT','두 번째 컨텐츠','<p>두 번째 컨텐츠 내용입니다. <strong>굵게</strong> 표시됩니다.</p>','admin','2026-04-08 08:51:36','2026-04-08 08:51:36','N'),('RUU1XL2XOG2','B_HCB7EI','새로운 노트','<p><strong>새로운 노트입니다.</strong></p><p><strong>와우</strong></p>','user','2026-04-08 08:59:42','2026-04-08 08:59:42','N'),('RUU1XL2XOGB','B_HCB7EI','ㅇㅇ','<p>ㅇㅇㅇ<img src=\"/uploads/256x256-1775725604270-554935184.png\"></p>','user','2026-04-09 03:52:19','2026-04-09 09:06:46','N'),('RUUW006Y137','B_HCB7EI','초간단 Node.js api 서버 만들기','<p>자바 서버를 구축하자니 너무 무겁고 신경쓸께 많다면</p><p>노드서버를 이용해보는건 어떨까요?</p><p>mybatis, file 관리, 시스템 명령어 등 java에서 할 수 있는건 다 할 수 있습니다.</p><p>노드 서버 구축하는 소스를 전달드립니다.</p><p>개발하는데 도움이 되었으면 좋겠네요.</p><p>노드 모듈은 서버를 띄우기 위한 express</p><p>request 파람을 json 형태로 받아와 처리할 수 있는 body-parser</p><p>두개입니다.</p><pre><code>===============================\n\"devDependencies\": {\n    \"typescript\": \"^5.5.4\",\n  },\n  \"dependencies\": {\n    \"body-parser\": \"^1.20.2\",\n    \"express\": \"^5.2.1\",\n  }\n===============================\n \nconst express = require(\'express\');\nconst bodyParser = require(\'body-parser\');\nconst app = express();\nconst PORT = 3000;\n \napp.set(\'trust proxy\', true);\n \napp.use(bodyParser.json?.({limit : \"50mb\"}));\napp.use(bodyParser.urlencoded?.({ extended : false }));\n \n// JSON body 파싱\napp.use((req:any, res:any, next:any) =&gt; {\n   if (req.method !== \'GET\') {\n    return res.sendStatus(405);\n  }\n  const ip = req.ip;\n  if (![\'127.0.0.1\', \'::1\', \'::ffff:127.0.0.1\'].includes(ip)) {\n    return res.sendStatus(403);\n  }\n  next();\n});\n \n// 기본 라우트\napp.get(\'/\', (_req:any, res:any) =&gt; {\n  res.json({ message: \'Node server is running\' });\n});\n \n// GET 방식\napp.get(\'/get\', (_req:any, res:any) =&gt; {\n  const result = {\n    \n  }\n  res.json(result);\n});\n \n// POST 방식\napp.post(\'/post/(:mapper/*)?\', async (req: any, res: any) =&gt; {\n  const mapper = req.params.mapper;\n  const body: any = req.body;\n  res.status(500).send({});\n});\n \napp.listen(PORT, () =&gt; {\n  console.log(`Server listening on http://localhost:${PORT}`);\n});</code></pre><p></p>','admin','2026-04-10 00:51:33','2026-04-10 00:55:48','N'),('RUUW006Y13K','B_HCB7EI','ㄹㅇㄴㅁ','<p>ㄹㅇㄴㅁ</p>','admin','2026-04-10 01:14:44','2026-04-10 01:14:44','N');
/*!40000 ALTER TABLE `T_BOARD` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_BOARD_READ_HISTORY`
--

LOCK TABLES `T_BOARD_READ_HISTORY` WRITE;
/*!40000 ALTER TABLE `T_BOARD_READ_HISTORY` DISABLE KEYS */;
INSERT IGNORE INTO `T_BOARD_READ_HISTORY` (`user_id`, `board_code`, `last_read_time`) VALUES ('admin','B_D7UHOK','2026-04-10 10:35:21'),('admin','B_HANG0E','2026-04-10 10:14:52'),('admin','B_HCB7EI','2026-04-10 10:35:24'),('user','B_D7UHOK','2026-04-09 12:52:12'),('user','B_HANG0E','2026-04-10 10:30:37'),('user','B_HCB7EI','2026-04-10 10:24:15');
/*!40000 ALTER TABLE `T_BOARD_READ_HISTORY` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_CHAT_MEMBER`
--

LOCK TABLES `T_CHAT_MEMBER` WRITE;
/*!40000 ALTER TABLE `T_CHAT_MEMBER` DISABLE KEYS */;
INSERT IGNORE INTO `T_CHAT_MEMBER` (`room_no`, `user_id`, `joined_at`, `last_read_time`) VALUES ('RUU1XL2XOG9','admin','2026-04-09 02:11:16','2026-04-10 01:35:17'),('RUU1XL2XOG9','user','2026-04-09 02:11:16','2026-04-10 01:30:54'),('RUU1XL2XOGA','admin','2026-04-09 03:50:19','2026-04-10 01:32:02'),('RUU1XL2XOGA','user','2026-04-09 03:50:19','2026-04-10 01:30:51');
/*!40000 ALTER TABLE `T_CHAT_MEMBER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_CHAT_MESSAGE`
--

LOCK TABLES `T_CHAT_MESSAGE` WRITE;
/*!40000 ALTER TABLE `T_CHAT_MESSAGE` DISABLE KEYS */;
INSERT IGNORE INTO `T_CHAT_MESSAGE` (`msg_no`, `room_no`, `user_id`, `content`, `created_at`) VALUES (51,'RUU1XL2XOG9','user','0717a194478ae58a126d30b20bbed621:a7fb998aa9e7a5c3053e749645b93fa6','2026-04-09 02:11:20'),(52,'RUU1XL2XOG9','admin','39204d80138fe149843dcdbb1832c99b:c38998cff709cdd25249568da8e79d93','2026-04-09 02:14:28'),(53,'RUU1XL2XOG9','user','5b0e03a5bf86fc61abd2e9673e0c529c:793eff377371ae89c945ea394f86de8c','2026-04-09 02:14:37'),(54,'RUU1XL2XOG9','user','de2e550228005d3d14c18b80a73a9a60:99b99ad439af00782d0bda5310bc7cc0ccf26aabab179abb01f3baeccba084641613d38bb8fa6c795b7d5f137b483200','2026-04-09 02:14:43'),(55,'RUU1XL2XOG9','user','9de1710c28be2196a21077609ca49cf2:1268274d432f6a59359bd92676c9311c','2026-04-09 02:14:47'),(56,'RUU1XL2XOG9','user','9bfc7a6cf4cc50fe49a53af10de7b63d:ddb6032fd8d8b686a7df51bc2827befa','2026-04-09 02:14:48'),(57,'RUU1XL2XOG9','admin','f6db459db8cd041fcfc97a6670b50d71:ae1eaa15ab77b709a07019cc72d6c415','2026-04-09 02:14:52'),(60,'RUU1XL2XOGA','admin','f1acf2d56e38155c12b7a196f862c74b:c600ece7f3ecc6bb743aa441680d49af','2026-04-09 03:50:21'),(61,'RUU1XL2XOGA','user','7f16ad45d722fcf185af7c8064711034:313fad0c8b78777684434dcccaec70f7','2026-04-09 03:50:30'),(62,'RUU1XL2XOG9','admin','fd1a9ba1d06dc71339789d74bdf13d60:58a0d34eab833a9b65c480c29affddee','2026-04-10 01:27:56');
/*!40000 ALTER TABLE `T_CHAT_MESSAGE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_CHAT_ROOM`
--

LOCK TABLES `T_CHAT_ROOM` WRITE;
/*!40000 ALTER TABLE `T_CHAT_ROOM` DISABLE KEYS */;
INSERT IGNORE INTO `T_CHAT_ROOM` (`room_no`, `room_name`, `created_by`, `room_type`, `created_at`) VALUES ('RUU1XL2XOG9','일반사용자, 시스템관리자',NULL,'PRIVATE','2026-04-09 02:11:16'),('RUU1XL2XOGA','ㅋㅋ','admin','PUBLIC','2026-04-09 03:50:19');
/*!40000 ALTER TABLE `T_CHAT_ROOM` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_COMMENT`
--

LOCK TABLES `T_COMMENT` WRITE;
/*!40000 ALTER TABLE `T_COMMENT` DISABLE KEYS */;
INSERT IGNORE INTO `T_COMMENT` (`comment_no`, `board_no`, `user_id`, `content`, `created_at`, `updated_at`, `del_yn`) VALUES ('RUU1XL2XOG4','RUU1XL2XOG2','admin','오케이 쉽죠?','2026-04-08 09:00:07','2026-04-09 08:34:29','N'),('RUU1XL2XOGM','RUU1XL2XOG2','admin','ㅇㅇㅇ','2026-04-09 08:43:32','2026-04-09 08:43:32','N'),('RUU1XL2XOGN','RUU1XL2XOG2','admin','ㅇㅇㅇㅇ','2026-04-09 08:43:35','2026-04-09 08:43:35','N'),('RUU1XL2XOGO','RUU1XL2XOG2','admin','나이스 입니다~','2026-04-09 08:43:38','2026-04-09 08:58:50','N'),('RUUW006Y138','RUUW006Y137','admin','gg','2026-04-10 01:01:28','2026-04-10 01:01:28','N'),('RUUW006Y13A','RUUW006Y137','admin','zzaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','2026-04-10 01:01:57','2026-04-10 01:06:56','N'),('RUUW006Y13J','RUUW006Y137','admin','댓글~~~','2026-04-10 01:11:34','2026-04-10 01:11:34','N');
/*!40000 ALTER TABLE `T_COMMENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_MENU`
--

LOCK TABLES `T_MENU` WRITE;
/*!40000 ALTER TABLE `T_MENU` DISABLE KEYS */;
INSERT IGNORE INTO `T_MENU` (`menu_no`, `menu_name`, `parent_no`, `url`, `sort_order`, `created_at`, `description`, `use_yn`, `del_yn`, `is_board`, `is_public`, `board_code`, `board_sort`) VALUES ('RUU1XIV0XDW','컨텐츠 관리',NULL,'/user/content',2,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XDX','대시보드',NULL,'/dashboard',1,'2026-04-06 00:13:30',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XDY','시스템 설정',NULL,'/system',5,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XDZ','모드 관리',NULL,'/user/mode',3,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XE0','메뉴 관리','RUU1XIV0XDY','/system/menu',6,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XE1','역할 권한','RUU1XIV0XDY','/system/role',7,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XIV0XE2','사용자 관리','RUU1XIV0XDY','/user/user-admin',8,'2026-04-06 00:10:24',NULL,'Y','N','N','Y',NULL,0),('RUU1XL2XOG0','게시판 테스트',NULL,'/boards/B_HCB7EI',9,'2026-04-08 08:57:33',NULL,'Y','N','Y','Y','B_HCB7EI',2),('RUU1XL2XOG6','나의 게시판',NULL,'/boards/B_D7UHOK',10,'2026-04-09 00:42:38',NULL,'Y','N','Y','N','B_D7UHOK',1),('RUUW006Y134','이슈리스트',NULL,'/boards/B_HANG0E',11,'2026-04-10 00:09:56',NULL,'Y','N','Y','Y','B_HANG0E',3);
/*!40000 ALTER TABLE `T_MENU` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_REACTION`
--

LOCK TABLES `T_REACTION` WRITE;
/*!40000 ALTER TABLE `T_REACTION` DISABLE KEYS */;
INSERT IGNORE INTO `T_REACTION` (`reaction_no`, `target_type`, `target_no`, `user_id`, `emotion`, `created_at`) VALUES ('RUU1XL2XOGL','COMMENT','RUU1XL2XOG4','user','SURPRISE','2026-04-09 08:41:14'),('RUU1XL2XOGQ','COMMENT','RUU1XL2XOGO','user','LAUGH','2026-04-09 08:58:39'),('RUU1XL2XOGR','BOARD','RUU1XL2XOG2','admin','SURPRISE','2026-04-09 09:06:08'),('RUUW006Y135','COMMENT','RUU1XL2XOG4','admin','SURPRISE','2026-04-10 00:10:46'),('RUUW006Y136','COMMENT','RUU1XL2XOGO','admin','LIKE','2026-04-10 00:15:11'),('RUUW006Y13C','COMMENT','RUUW006Y13A','admin','CRY','2026-04-10 01:04:07'),('RUUW006Y13D','COMMENT','RUUW006Y138','admin','LAUGH','2026-04-10 01:04:27'),('RUUW006Y13I','COMMENT','RUUW006Y13A','user','HEART','2026-04-10 01:05:23');
/*!40000 ALTER TABLE `T_REACTION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_ROLE`
--

LOCK TABLES `T_ROLE` WRITE;
/*!40000 ALTER TABLE `T_ROLE` DISABLE KEYS */;
INSERT IGNORE INTO `T_ROLE` (`role_no`, `role_name`, `created_at`) VALUES ('RUU1XIV0XDU','ROLE_ADMIN','2026-04-08 08:51:36'),('RUU1XIV0XDV','ROLE_USER','2026-04-08 08:51:36');
/*!40000 ALTER TABLE `T_ROLE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_ROLE_MENU`
--

LOCK TABLES `T_ROLE_MENU` WRITE;
/*!40000 ALTER TABLE `T_ROLE_MENU` DISABLE KEYS */;
INSERT IGNORE INTO `T_ROLE_MENU` (`role_no`, `menu_no`, `can_read`, `can_write`, `can_delete`) VALUES ('RUU1XIV0XDU','RUU1XIV0XDW',1,1,1),('RUU1XIV0XDU','RUU1XIV0XDX',1,1,1),('RUU1XIV0XDU','RUU1XIV0XDY',1,1,1),('RUU1XIV0XDU','RUU1XIV0XDZ',1,1,1),('RUU1XIV0XDU','RUU1XIV0XE0',1,1,1),('RUU1XIV0XDU','RUU1XIV0XE1',1,1,1),('RUU1XIV0XDU','RUU1XIV0XE2',1,1,1),('RUU1XIV0XDU','RUU1XL2XOG0',1,1,1),('RUU1XIV0XDU','RUU1XL2XOG6',1,0,0),('RUU1XIV0XDU','RUUW006Y134',1,1,1),('RUU1XIV0XDV','RUU1XIV0XDW',1,0,0),('RUU1XIV0XDV','RUU1XIV0XDX',1,0,0),('RUU1XIV0XDV','RUU1XIV0XDZ',1,0,0),('RUU1XIV0XDV','RUU1XIV0XE2',1,0,0),('RUU1XIV0XDV','RUU1XL2XOG0',1,0,0),('RUU1XIV0XDV','RUU1XL2XOG6',1,1,1),('RUU1XIV0XDV','RUUW006Y134',1,0,0);
/*!40000 ALTER TABLE `T_ROLE_MENU` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_USER`
--

LOCK TABLES `T_USER` WRITE;
/*!40000 ALTER TABLE `T_USER` DISABLE KEYS */;
INSERT IGNORE INTO `T_USER` (`user_no`, `user_id`, `password`, `user_name`, `created_at`) VALUES ('RUU1XIV0XDS','admin','8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918','시스템관리자','2026-04-08 08:51:36'),('RUU1XIV0XDT','user','04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb','일반사용자','2026-04-08 08:51:36');
/*!40000 ALTER TABLE `T_USER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `T_USER_ROLE`
--

LOCK TABLES `T_USER_ROLE` WRITE;
/*!40000 ALTER TABLE `T_USER_ROLE` DISABLE KEYS */;
INSERT IGNORE INTO `T_USER_ROLE` (`user_id`, `role_no`) VALUES ('admin','RUU1XIV0XDU'),('user','RUU1XIV0XDV');
/*!40000 ALTER TABLE `T_USER_ROLE` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-10 13:32:11
