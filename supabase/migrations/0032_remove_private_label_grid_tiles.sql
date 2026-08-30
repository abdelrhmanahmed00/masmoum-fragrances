-- Prompt 101 -- removes the 6-tile image grid section entirely from
-- /private-label (client request). The 6 tile_1..tile_6 rows are now
-- orphaned: PRIVATE_LABEL_IMAGE_SLOTS no longer includes them, so no
-- app code reads or writes them going forward. Confirmed all 6 are
-- currently storage_path: null (verification-tested with real uploads
-- in Prompts 92/101-prep, then reverted to null, never re-populated) --
-- safe to delete outright rather than leave as harmless-but-undocumented
-- dead rows in the table.
delete from public.private_label_images
where slot in ('tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6');
