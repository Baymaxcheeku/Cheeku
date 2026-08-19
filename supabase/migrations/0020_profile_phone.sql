-- Where the phone number was going: nowhere.
--
-- Onboarding has asked for a phone number since the first build, validated it,
-- and then dropped it on the floor — there was no column to put it in. Nobody
-- noticed because the field is optional and the screen still advanced.
--
-- Storing it is the honest end of asking for it. It is contact information,
-- not health data, and it is nullable because it always was optional.
--
-- Text, not a parsed international type. Numbers are written differently
-- everywhere and there is no format the world agrees on; the app validates
-- that it looks like a phone number and stores what the person typed. Guessing
-- a country from a prefix in order to reformat somebody's own number is how an
-- app ends up confidently rejecting a real one.
alter table profiles
add column phone text;

comment on column profiles.phone is 'Contact number as entered. Optional, not health data.';
