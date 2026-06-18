-- Store the author's raw SSF text so the editor can round-trip without loss.
-- The parsed scenes (content JSONB) remain the source of truth for reading/practice;
-- script_text is the source of truth for the editor.
alter table plays add column if not exists script_text text;
