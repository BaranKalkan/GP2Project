-- SQLite
UPDATE chat_customuser
SET online = 0
WHERE 1;

SELECT id, username, online
FROM chat_customuser;

