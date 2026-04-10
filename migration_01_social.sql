USE szdev;

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
