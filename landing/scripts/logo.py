import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
P="#4a2ade"; P5="#5b4ef0"; L="#b9adf9"; L2="#d6cdfd"; INK="#17123a"; PINK="#f7a8d8"; M="#ff6a2b"; W="#ffffff"
BODY="M60 24c23.5 0 41 16.5 41 39.5S83.5 103 60 103c-6.6 0-12.8-1.3-18.3-3.8l-15.4 4.6c-2.3.7-4.4-1.5-3.6-3.7l5-14.2C22.300 79.500 19 71.900 19 63.500 19 40.500 36.500 24 60 24z"
TUFT="M57.500 26.500c-3.200-10.500 2.600-19.800 13.800-21.500 1.500 0 2.500 1.200 2.300 2.700-1.200 9.800-7.300 16.500-16.100 18.800z"
TUFT2="M55 27c-6.800-1.600-11.200-6.600-11.600-13.400 0-1.300 1.200-2.200 2.400-1.900 6.400 1.700 10.300 6.900 9.200 15.300z"
def face(eye=W, pupil=INK, cheek=PINK, mouth=INK, mood="happy"):
    s=""
    if cheek: s+=f'<ellipse cx="35.500" cy="73" rx="7" ry="4.800" fill="{cheek}" /><ellipse cx="84.500" cy="73" rx="7" ry="4.800" fill="{cheek}" />'
    def eye_open(cx):
        t=f'<circle cx="{cx}" cy="59" r="8.500" fill="{eye}"/>'
        if pupil: t+=f'<circle cx="{cx+.8}" cy="60" r="5" fill="{pupil}"/><circle cx="{cx+2.6}" cy="57.800" r="1.700" fill="{W}"/>'
        return t
    def eye_arc(cx,up=True):
        d=f"M{cx-7} 61q7 -8 14 0" if up else f"M{cx-7} 57q7 8 14 0"
        return f'<path d="{d}" fill="none" stroke="{eye}" stroke-width="3.600" stroke-linecap="round"/>'
    def eye_heart(cx):
        return f'<path transform="translate({cx-9} 50) scale(.75)" d="M12 21C5 15.500 1 12 1 7.500 1 4.500 3.400 2 6.400 2c2 0 4 1 5.600 3C13.600 3 15.600 2 17.600 2c3 0 5.400 2.500 5.400 5.500C23 12 19 15.500 12 21z" fill="{M}"/>'
    if mood=="happy": s+=eye_open(45)+eye_open(75)
    elif mood=="wink": s+=eye_open(45)+eye_arc(75)
    elif mood=="calm": s+=eye_arc(45,False)+eye_arc(75,False)
    elif mood=="joy": s+=eye_arc(45)+eye_arc(75)
    elif mood=="love": s+=eye_heart(45)+eye_heart(75)
    if mood in("joy","love"):
        s+=f'<path d="M52 72.500h16c0 5.500-3.500 9-8 9s-8-3.500-8-9z" fill="{mouth}"/>'
    else:
        s+=f'<path d="M53 74.500q7 6.500 14 0" fill="none" stroke="{mouth}" stroke-width="3" stroke-linecap="round"/>'
    return s
def mark(mood="happy"):
    return f'<path d="{TUFT2}" fill="{L}"/><path d="{TUFT}" fill="{P5}"/><path d="{BODY}" fill="{P}"/>'+face(mood=mood)
def mark_simple(fill=P, feat=W):  # flat: no pupils, no cheeks
    return f'<path d="{TUFT2}" fill="{fill}"/><path d="{TUFT}" fill="{fill}"/><path d="{BODY}" fill="{fill}"/>'+face(eye=feat,pupil=None,cheek=None,mouth=feat)
def mark_mono(fill):  # true knockout
    return f'<mask id="k"><rect width="120" height="120" fill="#fff"/>'+face(eye="#000",pupil=None,cheek=None,mouth="#000")+f'</mask><g mask="url(#k)" fill="{fill}"><path d="{TUFT2}"/><path d="{TUFT}"/><path d="{BODY}"/></g>'
def svg(inner,w=120,h=120,vb=None,bg=None):
    vb=vb or f"0 0 {w} {h}"
    b=f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">{b}{inner}</svg>\n'
# wordmark outlined from Instrument Serif
def word(text, fontpath, size, fill):
    f=TTFont(fontpath); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f["head"].unitsPerEm; sc=size/upm
    x=0; out=""
    for ch in text:
        g=cmap[ord(ch)]; pen=SVGPathPen(gs); gs[g].draw(pen)
        out+=f'<path transform="translate({x*sc:.2f} 0) scale({sc:.5f} {-sc:.5f})" d="{pen.getCommands()}"/>'
        x+=gs[g].width
    return f'<g fill="{fill}">{out}</g>', x*sc
# alternatives
def alt_heart():
    return (f'<path d="M60 88L38 58" stroke="{P}" stroke-width="38" stroke-linecap="round"/>'
            f'<path d="M60 88L82 58" stroke="{L}" stroke-width="38" stroke-linecap="round"/>'
            f'<circle cx="60" cy="30" r="9" fill="{M}"/>')
def alt_home():
    return (f'<path d="M60 14c2.600 0 5.200.900 7.300 2.600l30 24.500c3 2.400 4.700 6 4.700 9.800V90c0 8.800-7.200 16-16 16H34c-8.800 0-16-7.200-16-16V50.900c0-3.800 1.700-7.400 4.700-9.800l30-24.500c2.100-1.700 4.700-2.600 7.300-2.600z" fill="{P}"/>'
            f'<path d="M60 92V64" stroke="{W}" stroke-width="5" stroke-linecap="round"/>'
            f'<path d="M60 70c0-10 6-16 17-16 0 10-6 16-17 16z" fill="{W}"/><path d="M60 78c0-8-5-13-14-13 0 8 5 13 14 13z" fill="{L2}"/>')
if __name__=="__main__":
    out=sys.argv[1]; font=sys.argv[2]; os.makedirs(out,exist_ok=True)
    w=lambda n,s: open(os.path.join(out,n),"w").write(s)
    w("cheeku-mark.svg", svg(mark()))
    w("cheeku-mark-flat.svg", svg(mark_simple()))
    w("cheeku-mark-purple.svg", svg(mark_mono(P)))
    w("cheeku-mark-ink.svg", svg(mark_mono(INK)))
    w("cheeku-mark-white.svg", svg(mark_mono(W)))
    for m in ("happy","wink","calm","joy","love"): w(f"mood-{m}.svg", svg(mark(m)))
    icon=lambda inner,r: f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f1ff"/><stop offset="1" stop-color="{L2}"/></linearGradient></defs><rect width="120" height="120" rx="{r}" fill="url(#g)"/><g transform="translate(60 62) scale(.8) translate(-60 -58)">{inner}</g>'
    w("app-icon.svg", svg(icon(mark(),0),1024,1024,"0 0 120 120"))
    w("app-icon-rounded.svg", svg(icon(mark(),27),1024,1024,"0 0 120 120"))
    w("app-icon-purple.svg", svg(f'<rect width="120" height="120" fill="{P}"/><g transform="translate(60 62) scale(.8) translate(-60 -58)">{mark_simple(W,P)}</g>',1024,1024,"0 0 120 120"))
    w("favicon.svg", svg(f'<g transform="translate(60 60) scale(1.130) translate(-60 -57)">{mark_simple()}</g>',64,64,"0 0 120 120"))
    for name,fill,mk in (("",INK,mark()),("-white",W,mark_mono(W))):
        g,wd=word("Cheeku",font,84,fill)
        W_=int(132+wd+8)
        w(f"lockup-horizontal{name}.svg", svg(mk+f'<g transform="translate(132 86)">{g}</g>',W_,120))
        g2,wd2=word("Cheeku",font,56,fill)
        w(f"lockup-stacked{name}.svg", svg(f'<g transform="translate({(200-120)/2} 0)">{mk}</g><g transform="translate({(200-wd2)/2:.1f} 166)">{g2}</g>',200,184))
    w("alt-family-heart.svg", svg(alt_heart())); w("alt-sprout-home.svg", svg(alt_home()))
