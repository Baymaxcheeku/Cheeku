import re
pb=open('template.html',encoding='utf-8').read()
css=pb[pb.index('<style>')+7:pb.index('</style>')]
head=pb[:pb.index('<style>')].replace('<title>Cheeku Doctor Playbook</title>','<title>Cheeku Doctor Build Sheet</title>')
extra=r'''
code { font: 500 0.88em/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--soft-2); color: var(--accent-2); padding: 1px 5px; border-radius: 5px; }
pre.code { margin: 0; font: 500 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--navy); color: #E8E6FF; padding: 14px 16px; border-radius: 14px; overflow-x: auto; white-space: pre; }
td.l { text-align: left; white-space: normal; min-width: 220px; }
td.no { color: var(--bad); }
table.rls td { white-space: normal; text-align: left; min-width: 120px; }
/* architecture */
.arch { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr); gap: 14px; }
.arch .col { display: grid; gap: 10px; align-content: start; min-width: 0; padding: 14px; border-radius: 20px; background: var(--soft); }
.arch .col.mid { background: var(--accent-soft); }
.arch .ch { font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.node { background: var(--page); border-radius: 14px; padding: 11px 12px; display: grid; gap: 4px; border: 1px solid var(--line); min-width: 0; }
.node b { font-size: 13.5px; } .node span { font-size: 12px; color: var(--ink-2); line-height: 1.4; }
.node.app { border-color: var(--accent); }
.node.fn { background: var(--navy); border-color: var(--navy); } .node.fn b, .node.fn span { color: #E8E6FF; }
.node.fn i { font-style: normal; font-size: 10.5px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; background: var(--accent); color: #FFFFFF; padding: 1px 6px; border-radius: 999px; margin-right: 4px; }
.node.fn i.re { background: rgba(255,255,255,.18); }
.node code { justify-self: start; }
.two-n { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 860px) { .arch { grid-template-columns: minmax(0, 1fr); } }
/* sequence */
.seqWrap { background: var(--soft); border-radius: 22px; padding: 14px; }
.seq { min-width: 860px; width: 100%; }
.seq .lane { stroke: var(--line); stroke-width: 2; stroke-dasharray: 3 5; }
.seq .lh rect { fill: var(--page); stroke: var(--line); }
.seq .lh text { fill: var(--ink); font-size: 12.5px; font-weight: 650; text-anchor: middle; }
.seq .m { stroke: var(--accent); stroke-width: 1.8; fill: none; }
.seq .m.push { stroke-dasharray: 5 4; stroke: var(--accent-2); }
.seq .ah { fill: var(--accent); }
.seq .lbl { fill: var(--ink-2); font-size: 11.5px; }
.seq .no { fill: var(--muted); font-size: 10.5px; font-weight: 700; }
.seq .band { fill: var(--accent-soft); }
/* fsm */
.fsm { display: grid; gap: 10px; min-width: 760px; }
.fsm .rowS { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.fsm span.s { font-size: 12px; font-weight: 650; padding: 6px 10px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-2); white-space: nowrap; }
.fsm span.s.who-d { background: var(--navy); color: #FFFFFF; }
.fsm span.s.x { background: var(--bad-bg); color: var(--bad); }
.fsm span.s.r { background: var(--warn-bg); color: var(--warn); }
.fsm em { font-style: normal; color: var(--muted); }
.fsm .key { display: flex; gap: 14px; font-size: 11.5px; color: var(--muted); flex-wrap: wrap; }
.fsm .key i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
/* er */
.er { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.tbl { background: var(--soft); border-radius: 14px; padding: 12px; min-width: 0; }
.tbl.wide { grid-row: span 2; background: var(--accent-soft); }
.tbl h4 { font: 650 13px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 6px; }
.tbl h4 em { font: 600 10.5px/1.6 var(--body); font-style: normal; color: var(--muted); }
.tbl ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 3px; }
.tbl li { font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--ink-2); border-top: 1px solid var(--line); padding-top: 3px; }
@media (max-width: 860px) { .er { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
/* flows */
.flowRow { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.flowRow > div { background: var(--soft); border-radius: 14px; padding: 12px; display: grid; gap: 6px; align-content: start; position: relative; min-width: 0; }
.flowRow b { font-size: 13px; } .flowRow span { font-size: 12px; color: var(--ink-2); line-height: 1.4; }
.flowRow code { justify-self: start; font-size: 10.5px; }
@media (max-width: 860px) { .flowRow { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
ol.steps { margin: 0; padding-left: 18px; display: grid; gap: 5px; font-size: 13.5px; color: var(--ink-2); }
.warn { font-size: 12.5px; color: var(--warn); background: var(--warn-bg); border-radius: 10px; padding: 8px 10px; }
/* gantt */
.tgantt { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 7px 12px; align-items: center; min-width: 760px; }
.tscale { grid-column: 2; display: grid; grid-template-columns: 4fr 5fr 4fr 4fr; font-size: 11.5px; font-weight: 650; color: var(--muted); }
.tscale span { border-left: 1px solid var(--line); padding-left: 6px; }
.tg-l { font-size: 12.5px; font-weight: 650; } .tg-l span { display: block; font-size: 11px; color: var(--muted); font-weight: 500; }
.tg-t { position: relative; height: 22px; background: var(--soft); border-radius: 7px; }
.tg-t i { position: absolute; top: 0; bottom: 0; border-radius: 7px; background: var(--lav); }
.tg-t i.k1 { background: var(--accent); } .tg-t i.k2 { background: var(--navy); }
.tg-t b.mk { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--bad); }
.miles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.miles div { background: var(--soft); border-radius: 16px; padding: 14px; display: grid; gap: 4px; align-content: start; }
.miles div.on { background: var(--accent); color: #FFFFFF; } .miles div.on span { color: #E8E6FF; } .miles div.on code { background: rgba(255,255,255,.18); color: #FFFFFF; }
.miles div.dk { background: var(--navy); color: #FFFFFF; } .miles div.dk span { color: #E8E6FF; }
.miles .mk { font-size: 11px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; opacity: .8; }
.miles b { font: 400 21px/1.15 var(--display); } .miles span { font-size: 12.5px; color: var(--ink-2); line-height: 1.4; }
@media (max-width: 860px) { .miles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.check { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.check div { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; font-size: 13.5px; align-items: start; }
.sheet table th, .sheet table td { text-align: left; }
.fsm .key i { border: 1px solid var(--line); }
.check i { width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--accent); margin-top: 1px; }
@media (max-width: 760px) { .check { grid-template-columns: minmax(0, 1fr); } }
'''
body=open('tech_body.html',encoding='utf-8').read()

# sequence diagram
lanes=[('Member app',90),('Edge Functions',290),('Postgres',490),('Doctor console',690),('Partners',880)]
L={n:x for n,x in lanes}
msgs=[('Member app','Member app','safety/detect + protocol engine: eligible','c'),
('Member app','Edge Functions','quickrx-intake (answers, member id)','c'),
('Edge Functions','Postgres','re-check rules · insert case: eligible','c'),
('Edge Functions','Member app','eligible · ₹49 or "included, 1 of 2"','c'),
('Member app','Partners','Razorpay UPI intent (order = case id)','c'),
('Partners','Edge Functions','payments-webhook, signature verified','c'),
('Edge Functions','Postgres','case_transition(paid → queued)','c'),
('Postgres','Doctor console','Realtime: new case in queue','p'),
('Doctor console','Postgres','claim_case() · SKIP LOCKED','c'),
('Doctor console','Postgres','decide_case(diagnosis, plan, PIN)','c'),
('Postgres','Edge Functions','webhook: approved → rx-issue','p'),
('Edge Functions','Postgres','PDF to rx bucket · record · ledger · rx-score','c'),
('Edge Functions','Member app','push-dispatch: prescription ready','p'),
('Member app','Edge Functions','Order medicines → partner-gateway','c'),
('Edge Functions','Partners','LabStack pharmacy order','c'),
('Postgres','Edge Functions','pg_cron +24 h → quickrx-tick','p'),
('Edge Functions','Member app','push: how are you feeling?','p')]
top=60; rh=34; H=top+rh*len(msgs)+20; W=960
s=['<svg class="seq" viewBox="0 0 %d %d" role="img" aria-label="Sequence of one Cheeku Doctor case across the member app, Edge Functions, Postgres, the doctor console and partners.">'%(W,H)]
for i in range(len(msgs)):
    if i in (7,8,9): s.append('<rect class="band" x="0" y="%d" width="%d" height="%d" rx="6"/>'%(top+rh*i-4,W,rh))
for n,x in lanes:
    s.append('<line class="lane" x1="%d" y1="40" x2="%d" y2="%d"/>'%(x,x,H-8))
    s.append('<g class="lh"><rect x="%d" y="6" width="150" height="28" rx="14"/><text x="%d" y="25">%s</text></g>'%(x-75,x,n))
for i,(a,b,lab,k) in enumerate(msgs):
    y=top+rh*i+14; x1,x2=L[a],L[b]
    s.append('<text class="no" x="8" y="%d">%d</text>'%(y+4,i+1))
    if a==b:
        s.append('<path class="m" d="M%d %d h40 v12 h-36"/>'%(x1,y-8))
        s.append('<polygon class="ah" points="%d,%d %d,%d %d,%d"/>'%(x1+2,y+4,x1+9,y,x1+9,y+8))
        s.append('<text class="lbl" x="%d" y="%d">%s</text>'%(x1+48,y+3,lab)); continue
    d=1 if x2>x1 else -1
    s.append('<line class="m%s" x1="%d" y1="%d" x2="%d" y2="%d"/>'%(' push' if k=='p' else '',x1,y,x2-d*8,y))
    s.append('<polygon class="ah" points="%d,%d %d,%d %d,%d"/>'%(x2,y,x2-d*9,y-5,x2-d*9,y+5))
    tx=(x1+x2)/2
    s.append('<text class="lbl" x="%.0f" y="%d" text-anchor="middle">%s</text>'%(tx,y-6,lab))
s.append('</svg>')
seq=''.join(s)

fsm='''<div class="rowS"><span class="s">draft</span><em>→</em><span class="s">eligible</span><em>→</em><span class="s">paid</span><em>→</em><span class="s">queued</span><em>→</em><span class="s who-d">claimed</span><em>⇄</em><span class="s who-d">needs_info</span><em>→</em><span class="s who-d">approved</span><em>→</em><span class="s">rx_issued</span><em>→</em><span class="s">fulfilled</span><em>→</em><span class="s">followup_due</span><em>→</em><span class="s">closed</span></div>
<div class="rowS"><span style="font-size:12px;color:var(--muted);width:92px">Side exits</span><span class="s r">ineligible</span><span class="s r">referred to care</span><span class="s x">escalated</span><span class="s who-d">declined</span><span class="s who-d">moved_to_video</span><span class="s">expired</span><em>→</em><span class="s">refunded</span></div>
<div class="key"><span><i style="background:var(--accent-soft)"></i>system or member</span><span><i style="background:var(--navy)"></i>doctor action</span><span><i style="background:var(--warn-bg)"></i>care network door</span><span><i style="background:var(--bad-bg)"></i>emergency door</span></div>'''

# gantt: 17 weeks; Dec 0-3, Jan 4-8, Feb 9-12, Mar 13-16
rows=[('Migrations, RLS, state machine','Archit',0,3,''),('Protocol engine and red-flag suite','Suraj, clinical lead',1,4,''),('Legal opinion, clinical lead, panel','Deepesh',0,6,''),('App flow, in Build 1 (flag off)','Athar',2,6,'k1'),('Payments, webhook, refunds','Archit',4,7,''),('Doctor console','Archit, Athar',4,8,''),('rx-issue, verify, quickrx-tick','Archit, Suraj',7,9,''),('Dry run, 200 synthetic cases','Everyone',9,10.5,''),('Soft launch, one city, invited','Everyone',10.5,13,'k1'),('Build 2: Hindi voice, delivery','Suraj, Archit',10,14,''),('Open in two cities','Everyone',14,17,'k2')]
g=[]
for lab,who,a,b,k in rows:
    g.append('<div class="tg-l">%s<span>%s</span></div><div class="tg-t"><i class="%s" style="left:%.1f%%;width:%.1f%%"></i>%s</div>'%(lab,who,k,a/17*100,(b-a)/17*100,'<b class="mk" style="left:%.1f%%" title="Build 1 in stores"></b>'%(6/17*100) if k=='k1' and a<5 else ''))
gantt=''.join(g)

body=body.replace('{{SEQ}}',seq).replace('{{FSM}}',fsm).replace('{{GANTT}}',gantt)
out=head+'<style>'+css+extra+'</style>\n'+body
assert '—' not in out and '{{' not in out
open('cheeku-doctor-build.html','w',encoding='utf-8').write(out)
print(len(out))
