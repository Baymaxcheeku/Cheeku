-- Ask Baymax grows two new message shapes: a photo attachment on a user
-- message (the product-safety demo scenarios), and a structured assessment on
-- the assistant's reply to one. Both are nullable additions to the existing
-- append-only `messages` table — no new table, no change to its RLS.

alter table messages
  add column attachment jsonb,
  add column product_assessment jsonb;
