-- 004: Smart Columns domain — auto-outdated trigger
--
-- GWT S2: "Given a smart column is completed
--          When new rows are uploaded
--          Then the column becomes Outdated"
--
-- When dataset rows are inserted, every completed smart column
-- for that project is automatically transitioned to 'outdated'
-- so the user can Reapply (mode=outdated) or fill future rows (mode=future).

CREATE OR REPLACE FUNCTION mark_smart_columns_outdated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE smart_columns
  SET    status     = 'outdated',
         updated_at = now()
  WHERE  project_id = NEW.project_id
    AND  status     = 'completed';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dataset_rows_mark_sc_outdated
  AFTER INSERT ON dataset_rows
  FOR EACH ROW
  EXECUTE FUNCTION mark_smart_columns_outdated();
