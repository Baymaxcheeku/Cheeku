import iso
t=open('template.html',encoding='utf-8').read()
bad="Reviews worth ₹245 included. One parent's monthly fever and a child's... no: children go to video in v1, so the family's adults share the five."
t=t.replace(bad,"Reviews worth ₹245 included. A parent's fever, a spouse's acidity: the adults in the family share the five.")
def wf(steps):
    lo,hi=-12,52; sc=lambda v:(v-lo)/(hi-lo)*100
    out=[]; run=0
    for label,delta,kind in steps:
        if kind=='tot': a,b=0,delta; run=delta
        elif kind=='sub': a,b=0,run
        else: a,b=run,run+delta; run+=delta
        x1,x2=sorted([a,b]); cls={'tot':'tot','sub':'sub'}.get(kind,'minus' if delta<0 else 'plus')
        val=(run if kind in('tot','sub') else delta)
        vtxt=('₹%g'%round(val,1)) if kind in('tot','sub') else (('+' if delta>0 else '−')+'₹%g'%abs(round(delta,1)))
        vcls='' if kind=='tot' else (' pos' if (kind=='sub' and run>0) or (kind not in('tot','sub') and delta>0) else ' neg')
        out.append('<div class="wfr"><span>%s</span><div class="tr"><span class="zero" style="left:%.1f%%"></span><i class="%s" style="left:%.1f%%;width:%.1f%%"></i></div><span class="v%s">%s</span></div>'%(label,sc(0),cls,sc(x1),max(0.8,sc(x2)-sc(x1)),vcls,vtxt))
    return ''.join(out)
w1=wf([('Price paid',49,'tot'),('GST at 18%',-7.5,'d'),('Store fee 15%',-6.2,'d'),('Doctor review, all-in',-39,'d'),('Night of chat',-3,'d'),('What follows: medicine, tests',13,'d'),('Left per pass',0,'sub')])
w2=wf([('Price paid',49,'tot'),('Payment fee',-1,'d'),('Doctor review, all-in',-39,'d'),('Night of chat',-3,'d'),('What follows: medicine, tests',13,'d'),('Left per pass',0,'sub')])
t=t.replace('{{ISO}}',iso.build()).replace('{{WF1}}',w1).replace('{{WF2}}',w2)
assert '—' not in t and '{{' not in t
open('cheeku-doctor.html','w',encoding='utf-8').write(t)
print(len(t))
