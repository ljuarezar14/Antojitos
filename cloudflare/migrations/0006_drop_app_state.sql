-- The whole-state row kept since 0003 as a historical copy. Everything lives in
-- order_records, records and app_files now, and the row still held the PINs from before
-- they were hashed, so it goes.
DROP TABLE IF EXISTS app_state;
