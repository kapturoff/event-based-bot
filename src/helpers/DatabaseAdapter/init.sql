CREATE TABLE IF NOT EXISTS users (telegram_id INTEGER PRIMARY KEY, is_on_session INT2, is_setting_date INT2); 

CREATE TABLE IF NOT EXISTS sessions (user_id INTEGER NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, FOREIGN KEY(user_id) REFERENCES user(telegram_id), PRIMARY KEY (user_id, started_at));