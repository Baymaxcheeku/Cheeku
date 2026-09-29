-- The product is now Cheeku AI, and the companion inside it is Cheeku.
--
-- Migrations 0017 and 0021 seeded article bodies that name the companion
-- "Baymax". Those files have already run against live databases and are left
-- exactly as they were; this rewrites the stored copy instead. Only the
-- article body and standfirst carry the name, and a plain text swap on the
-- JSON is safe because "Baymax" never appears as a key, only inside values.

update articles
set body = replace(body::text, 'Baymax', 'Cheeku')::jsonb
where body::text like '%Baymax%';

update articles
set standfirst = replace(standfirst, 'Baymax', 'Cheeku')
where standfirst like '%Baymax%';

update articles
set title = replace(title, 'Baymax', 'Cheeku')
where title like '%Baymax%';
