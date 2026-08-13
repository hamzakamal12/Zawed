-- Zawed Supply — Migration 10 : reconcile orders approved under the old rule
--
-- Before migration 9, approving an order set internal_approval and left the
-- status alone, so `approved + pending_approval` was the correct state for
-- "the customer authorised this; the supplier has not picked it up yet".
-- Migration 9 made approval itself the confirmation, so that pair can no
-- longer arise — leaving already-approved orders stranded in a state the
-- application no longer produces, and which the admin screen would show as
-- still awaiting something.
--
-- Written as a set-based backfill rather than a fix for the one row that
-- happens to exist today, so a database rebuilt from these migrations, or any
-- other environment, lands in the same place. Idempotent: re-running matches
-- nothing.
--
-- Deliberately narrow. It does NOT touch:
--   * internal_approval = 'not_required' orders awaiting supplier confirmation
--     — that is a legitimate live state, not a leftover;
--   * anything already past confirmation (picking, delivered, cancelled).
update orders
   set status = 'confirmed'
 where internal_approval = 'approved'
   and status = 'pending_approval';
