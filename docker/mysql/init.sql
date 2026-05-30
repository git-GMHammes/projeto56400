CREATE TABLE IF NOT EXISTS messages (
    id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username  VARCHAR(50)   NOT NULL,
    message   TEXT          NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
