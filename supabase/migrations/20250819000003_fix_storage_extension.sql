-- Fix the storage.extension function to properly return file extensions
-- This replaces the buggy implementation that has a TODO comment

CREATE OR REPLACE FUNCTION storage.extension(name text) 
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    _parts text[];
    _filename text;
    _extension text;
BEGIN
    -- Handle null or empty input
    IF name IS NULL OR name = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split path by '/' to get filename
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    
    -- Handle cases with no extension
    IF _filename NOT LIKE '%.%' THEN
        RETURN '';
    END IF;
    
    -- Get everything after the last dot
    -- This properly handles files like 'archive.tar.gz' -> 'gz'
    -- and 'file.name.with.dots.txt' -> 'txt'
    SELECT reverse(split_part(reverse(_filename), '.', 1)) INTO _extension;
    
    -- Return lowercase extension for consistency
    RETURN lower(_extension);
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION storage.extension(text) IS 'Returns the file extension from a full path or filename. Returns everything after the last dot, or empty string if no extension.';

-- Test cases to verify the function works correctly
-- These can be run manually to verify:
-- SELECT storage.extension('path/to/file.txt'); -- Should return 'txt'
-- SELECT storage.extension('archive.tar.gz'); -- Should return 'gz'
-- SELECT storage.extension('no_extension'); -- Should return ''
-- SELECT storage.extension('path/to/.hidden'); -- Should return 'hidden'
-- SELECT storage.extension('file.NAME.TXT'); -- Should return 'txt' (lowercase)