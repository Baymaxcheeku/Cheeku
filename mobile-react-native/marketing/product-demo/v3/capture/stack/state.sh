#!/bin/bash
# state.sh ttc|preg|baby : put the demo family in a story phase
P="psql -h /tmp -p 54322 -U postgres -d app -q -v ON_ERROR_STOP=1"
H=a9999999-9999-4999-8999-999999999999
$P -c "insert into auth.users (id, email) values ('$H','hidden@demo') on conflict do nothing; insert into families (id, owner_id) values ('fa999999-9999-4999-8999-999999999999','$H') on conflict do nothing;"
case $1 in
ttc) $P -c "set session_replication_role=replica; update profiles set user_id='$H', family_id='fa999999-9999-4999-8999-999999999999' where id='b3333333-3333-4333-8333-333333333333'; delete from pregnancies; update profiles set journey='fertility' where id='b2222222-2222-4222-8222-222222222222';" ;;
preg) $P -c "set session_replication_role=replica; update profiles set user_id='$H', family_id='fa999999-9999-4999-8999-999999999999' where id='b3333333-3333-4333-8333-333333333333'; delete from pregnancies; insert into pregnancies (user_id, profile_id, lmp, status, baby_name) values ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222', current_date - 86, 'ongoing', null); update profiles set journey='expecting' where id='b2222222-2222-4222-8222-222222222222';" ;;
baby) $P -c "set session_replication_role=replica; update profiles set user_id='a1111111-1111-4111-8111-111111111111', family_id='fa111111-1111-4111-8111-111111111111' where id='b3333333-3333-4333-8333-333333333333'; delete from pregnancies; insert into pregnancies (user_id, profile_id, lmp, status, baby_name, delivered_on, delivery_mode, ga_at_birth_days, birth_weight_kg, child_profile_id) values ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222', current_date - 49 - 273, 'delivered', 'Tara', current_date - 49, 'vaginal', 273, 3.1, 'b3333333-3333-4333-8333-333333333333'); update profiles set journey='new_parent' where id='b2222222-2222-4222-8222-222222222222';" ;;
esac
echo state $1
