USE szdev;

DELIMITER $$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(255),
    IN columnName VARCHAR(255),
    IN columnDefinition VARCHAR(255)
)
BEGIN
    DECLARE colCount INT;
    SELECT COUNT(*) INTO colCount
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
      
    IF colCount = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

CALL AddColumnIfNotExists('T_MENU', 'board_sort', 'int DEFAULT 0');
CALL AddColumnIfNotExists('T_MENU', 'is_board', 'char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''N''');
CALL AddColumnIfNotExists('T_MENU', 'is_public', 'char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Y''');
CALL AddColumnIfNotExists('T_MENU', 'board_code', 'varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

CREATE TABLE IF NOT EXISTS `T_BOARD_READ_HISTORY` (
  `user_id` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사용자 아이디',
  `board_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '게시판 코드',
  `last_read_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 접속 시간',
  PRIMARY KEY (`user_id`, `board_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='게시판별 사용자 마지막 조회 시간';
