-- 警告：此脚本会删除 xhblogs 库内所有业务表及数据（不可恢复）
USE xhblogs;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS album_photos;
DROP TABLE IF EXISTS albums;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS moments;
DROP TABLE IF EXISTS chatters;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS site_settings;

SET FOREIGN_KEY_CHECKS = 1;
