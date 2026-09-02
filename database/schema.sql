-- ============================================================
-- SCHEMA PARA PIRIO
-- Diario / Ranking / Wordle / Minería
-- PostgreSQL
-- ============================================================
-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    wins INTEGER NOT NULL DEFAULT 0,
    last_daily_date DATE,
    daily_attempts INTEGER NOT NULL DEFAULT 0,
    daily_solved INTEGER NOT NULL DEFAULT 0,
    daily_streak INTEGER NOT NULL DEFAULT 0,
    streak_last_date DATE,
    most_valuable_mineral TEXT,
    last_mining_date DATE,
    voice_joined_at TIMESTAMPTZ,
    last_voice_xp_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================================
CREATE
OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $ $ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER PARA updated_at
-- ============================================================
DROP TRIGGER IF EXISTS users_updated_at ON users;

CREATE TRIGGER users_updated_at BEFORE
UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HISTORIAL DE CANCIONES DEL DIARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_song_history (
    id SERIAL PRIMARY KEY,
    song_file TEXT NOT NULL,
    played_date DATE NOT NULL UNIQUE
);

-- ============================================================
-- HISTORIAL DE IMÁGENES DEL DIARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_image_history (
    id SERIAL PRIMARY KEY,
    image_file TEXT NOT NULL,
    played_date DATE NOT NULL UNIQUE
);