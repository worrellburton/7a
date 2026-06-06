-- Per-org ordering for the hardware page's type cards. One row per
-- distinct hardware type. The desktop page sorts the cards by this
-- column (falling back to alpha for unknown types), so admins can
-- drag a type higher / lower and the new order shows up for every
-- viewer in realtime.
CREATE TABLE IF NOT EXISTS hardware_type_order (
  type text PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);
ALTER TABLE hardware_type_order ENABLE ROW LEVEL SECURITY;
-- Same access shape as hardware_items: anyone signed in can read,
-- only admins (is_admin or is_super_admin) can write.
DROP POLICY IF EXISTS hardware_type_order_read ON hardware_type_order;
CREATE POLICY hardware_type_order_read ON hardware_type_order FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS hardware_type_order_write ON hardware_type_order;
CREATE POLICY hardware_type_order_write ON hardware_type_order FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
ALTER PUBLICATION supabase_realtime ADD TABLE hardware_type_order;
