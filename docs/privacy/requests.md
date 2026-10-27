# Answering privacy requests

Owner: Athar Ali, Grievance Officer. Inbox: privacy@cheekuai.in.

People open a request in the app under Settings, Privacy, Your rights. Each
one lands in `privacy_requests` with a due date 90 days out, and an email
goes to privacy@cheekuai.in (the `privacy-alert` function, once its mail key
is set). The email carries the kind and the due date only. What the person
wrote and their account email stay in the database.

Export and deletion are not requests. The app does both by itself: Download
my data (Settings, Privacy) and Delete all my data (Profile).

## Every week

In the Supabase SQL editor:

```sql
select * from privacy_queue;
```

Oldest due date first. `days_left` under 14 means it gets answered this week.
`overdue` should never say true.

## Moving a request on

```sql
-- picked up: the person gets "We're on your privacy request"
select answer_privacy_request('<id>', 'in_progress', null, 'Athar');

-- done: the person gets "Your privacy request is answered" and reads the reply in the app
select answer_privacy_request('<id>', 'resolved', '<the reply, in plain words>', 'Athar');

-- cannot do it: say why, and that they can still write to the Grievance Officer
select answer_privacy_request('<id>', 'rejected', '<why, in plain words>', 'Athar');
```

The reply is shown to the person word for word. Write it to them, in the
second person, with no internal notes. A closed request cannot be reopened;
if they write again it is a new request.

## What each kind needs

| Kind | What they want | What to do | Reply with |
|---|---|---|---|
| Correction | Something we hold is wrong | Fix it in the table it lives in (a record's date, a value, a profile field). If it came from a report, fix the extracted value, not the file. | What changed, and where they can see it |
| Access | How their data is used | Send the summary: what we hold (the export covers it), who processes it (Supabase hosting, the AI model provider, care partners they booked with), and why. | The summary, and a pointer to Download my data |
| Nomination | Someone to act for them | Record the nominee's name and contact against the account (a note in the reply is enough for now). Ask for proof only when the nominee acts. | Who is now nominated |
| Grievance | A complaint | Read it, find what happened, fix it if it is ours. | What happened, what we changed, and that they can go to the Data Protection Board of India if not satisfied |

Erasure and withdrawal rows exist from older builds; the app now does both
itself. If one appears, check the account is gone or the consent is off,
then resolve it saying so.

## Rules

- Answer within 90 days. Aim for 30.
- Never paste what the person wrote into Slack, email or a ticket. Point to the request id.
- Verify it is really them: the request came from their signed-in account, so it is. A request by email to privacy@ has to be checked against the account's email before anything is shared or changed.
