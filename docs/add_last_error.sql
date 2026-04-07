-- Add last_error column to the sources table
ALTER TABLE sources ADD COLUMN IF NOT EXISTS last_error TEXT;
