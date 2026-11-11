-- `getAllData` pages the card tables in 5000-row batches ordered by name then card_code, the order every tie-break downstream relies on.
-- Without an index on that order each batch sorts the whole table (about 21000 rows, 6 MB) past the 2 MB work_mem and writes a 5 MB
-- temp file. Those files drain the Disk IO budget of the instance, and once it is empty the batches pass the 3 s statement timeout of `anon`.
-- With the index a batch is an index scan with no temp file: 27 to 58 ms against 98 to 197 ms on `cards` (median of 10 runs per offset).
-- Each index weighs about 1.1 MB.
--
-- A build holds a write lock on its table while reads keep working, so run the three statements one at a time, away from the
-- 04:00 UTC sync and from a load peak: it takes 1.4 s on a healthy instance and 22 s on one whose IO budget is empty.
create index if not exists cards_name_card_code_idx on public.cards (name, card_code);
create index if not exists jp_cards_name_card_code_idx on public.jp_cards (name, card_code);
create index if not exists fr_cards_name_card_code_idx on public.fr_cards (name, card_code);
