-- Zawed Supply — Migration 8 : close two internal helpers off the REST API
--
-- Found by running Supabase's database linter against the live project after
-- shipping the RFQ migration.
--
-- PostgREST exposes every function in `public` that a role can execute as an
-- RPC endpoint. next_doc_number() and write_audit() are internal helpers, but
-- both were executable by `authenticated`, which means any signed-in customer
-- could POST /rest/v1/rpc/next_doc_number and consume document numbers —
-- leaving gaps in invoice and order sequences that are tax records.
--
-- Revoking is safe: PostgreSQL checks EXECUTE on a trigger function at CREATE
-- TRIGGER time, not when the trigger fires. Verified on a local copy of this
-- schema across both write paths — through a SECURITY DEFINER RPC
-- (submit_quote_request) and through a direct staff INSERT into quotations —
-- and re-verified against the live database, where document numbering still
-- produced RFQ-2026-0001 with all 4 numbering and 7 audit triggers intact.
-- Neither function is named anywhere in the frontend.
revoke execute on function next_doc_number(text) from authenticated, anon, public;
revoke execute on function write_audit()         from authenticated, anon, public;
