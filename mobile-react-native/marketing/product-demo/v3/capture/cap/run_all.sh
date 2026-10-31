#!/bin/bash
# Re-record every clip in story order, switching the database between phases.
cd "$(dirname "$0")"
ST=../stack/state.sh; P="psql -h /tmp -p 54322 -U postgres -d app -q"
rec() { timeout 400 node rec.mjs fin/$1.mjs out/$1 2>&1 | grep -i "frames\|waiting for" | head -2; ./peek.sh out/$1 6; }
$ST ttc; $P -c "delete from messages; delete from conversations; delete from lab_bookings;"
for c in c01-home c02-chat c03-labs c04-report; do rec $c; done
$ST preg; $P -c "delete from messages; delete from conversations;"
PID=$($P -Atc "select id from pregnancies limit 1"); sed -i "s/id=[A-Za-z0-9-]*&birth=1/id=$PID\&birth=1/" fin/c08-baby.mjs
for c in c05-memory c06-gyne c07-medcheck c08-baby; do rec $c; done
$P -c "set session_replication_role=replica; delete from profiles where name like 'Tara%' and id <> 'b3333333-3333-4333-8333-333333333333';"
$ST baby; $P -f ../stack/seed-tara.sql; $P -c "delete from documents where id in ('c3000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000004'); delete from messages; delete from conversations;"
for c in c09-family c21-tarahome c10-fever; do rec $c; done
$P -f ../stack/seed-tara.sql
for c in c11-rx c12-tmemory c13-services c14-meds c15-gp c16-fitness c17-today c18-care c19-file c20-home; do rec $c; done
echo ALL DONE
