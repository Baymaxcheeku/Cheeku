const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const A='/home/user/Baymax/mobile-react-native/assets/';
const b64=f=>'data:image/png;base64,'+fs.readFileSync(A+f).toString('base64');
const font=(f)=>'data:font/ttf;base64,'+fs.readFileSync(f).toString('base64');
const IS=font('/home/user/Baymax/landing/public/fonts/InstrumentSerif_400Regular.ttf');
const ISI=font('/mnt/skills/examples/canvas-design/canvas-fonts/InstrumentSerif-Italic.ttf');
const W=2400,H=560;
const B=[
 {k:'hq',eyebrow:'Cheeku wiki · Start here',t1:'Everything we know,',t2:'in one place.',sub:'Plans, specs, protocols and models for the family health home.',img:'mascot/wave-still.png',chips:['Product','Engineering','Clinical','Growth'],dark:false},
 {k:'prod',eyebrow:'Product and Design',t1:'What we build,',t2:'and why.',sub:'Cheeku Doctor, the roadmap, PRDs and the rules every screen follows.',img:'mascot/present-still.png',chips:['₹49 Cheeku Doctor','Roadmap','PRDs'],dark:false},
 {k:'eng',eyebrow:'Engineering and AI',t1:'Rules decide.',t2:'The model explains.',sub:'Longevity engine, architecture, model research and runbooks.',img:'mascot/working-still.png',chips:['Longevity engine','Family memory','Own model'],dark:false},
 {k:'clin',eyebrow:'Clinical and Trust',t1:'Safe first,',t2:'smart second.',sub:'Protocols, cut-offs, red flags and the rules that earn a family\'s trust.',img:'care/doctor.png',chips:['Signed protocols','4 safety tiers','DPDP'],dark:false},
 {k:'grow',eyebrow:'Growth and Partnerships',t1:'Every family finds us,',t2:'every need is met.',sub:'Acquisition, competition intelligence and the care supply network.',img:'mascot/cheer-still.png',chips:['Acquisition','Competition','Care network'],dark:false},
 {k:'ops',eyebrow:'Ops and People',t1:'The team',t2:'behind Cheeku.',sub:'Roles, onboarding and the paperwork that keeps us legal.',img:'mascot/joy-still.png',chips:['Team','Onboarding','Registration'],dark:false},
 {k:'fund',eyebrow:'Strategy and Fundraise · Founders only',t1:'The story',t2:'and the numbers.',sub:'₹921 cr revenue in 2031 · 65% gross margin · EBITDA positive May 2030',img:'mascot/celebrate-still.png',chips:['Decks','Models','Raise'],dark:true},
 {k:'dr',eyebrow:'Data Room · Founders only',t1:'Ready for',t2:'diligence.',sub:'Final, investor-ready files. Shared with investors through Papermark.',img:'mascot/think-still.png',chips:['9 sections','Checklist','Q&A log'],dark:true},
];
function html(b){
 const bg=b.dark?'radial-gradient(circle at 78% 45%, #3b2bc9 0%, #22208f 30%, #14136b 70%)':'radial-gradient(circle at 78% 45%, #d9d3ff 0%, #ece9ff 32%, #f7f6ff 68%, #fbfaff 100%)';
 const ink=b.dark?'#ffffff':'#0f1030', acc=b.dark?'#b9b3f7':'#5b4ef0', sub=b.dark?'#d9d6ff':'#3a3b57', eye=b.dark?'#b9b3f7':'#5b4ef0';
 const chipBg=b.dark?'rgba(255,255,255,0.10)':'#ffffff', chipBd=b.dark?'rgba(185,179,247,0.45)':'#dcdafb', chipTx=b.dark?'#ffffff':'#3b2bc9';
 const ring=b.dark?'rgba(185,179,247,0.22)':'rgba(91,78,240,0.14)';
 return `<!doctype html><html><head><meta charset="utf-8"><style>
 @font-face{font-family:IS;src:url(${IS})} @font-face{font-family:IS;font-style:italic;src:url(${ISI})}
 *{margin:0;padding:0;box-sizing:border-box} body{width:${W}px;height:${H}px;overflow:hidden;background:${bg};font-family:Inter,sans-serif;position:relative}
 .l{position:absolute;left:300px;top:0;height:${H}px;width:1250px;display:flex;flex-direction:column;justify-content:center;gap:18px}
 .e{font-size:24px;font-weight:600;letter-spacing:5px;text-transform:uppercase;color:${eye}}
 h1{font-family:IS;font-weight:400;font-size:104px;line-height:0.98;letter-spacing:-2px;color:${ink}} h1 i{color:${acc}}
 .s{font-size:30px;line-height:1.35;color:${sub};max-width:1100px}
 .c{display:flex;gap:12px;margin-top:6px} .c span{font-size:22px;font-weight:600;padding:9px 20px;border-radius:999px;background:${chipBg};border:1.5px solid ${chipBd};color:${chipTx}}
 .ring{position:absolute;border-radius:50%;border:3px solid ${ring}}
 .dot{position:absolute;border-radius:50%;background:${acc};opacity:.55}
 .m{position:absolute;right:340px;top:50%;transform:translateY(-50%);height:${b.img.startsWith('care')?300:420}px;filter:drop-shadow(0 26px 40px rgba(42,31,107,.25))}
 .halo{position:absolute;right:250px;top:50%;width:560px;height:560px;transform:translateY(-50%);border-radius:50%;background:${b.dark?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.75)'}}
 .brand{position:absolute;right:90px;bottom:40px;font-family:IS;font-style:italic;font-size:38px;color:${acc}}
 </style></head><body>
 <div class="ring" style="width:760px;height:760px;right:150px;top:-100px"></div>
 <div class="ring" style="width:1040px;height:1040px;right:10px;top:-240px"></div>
 <div class="dot" style="width:22px;height:22px;right:860px;top:110px"></div>
 <div class="dot" style="width:14px;height:14px;right:210px;top:380px"></div>
 <div class="dot" style="width:18px;height:18px;right:980px;bottom:120px;opacity:.3"></div>
 <div class="halo"></div>
 <img class="m" src="${b64(b.img)}">
 <div class="brand">Cheeku AI</div>
 <div class="l"><p class="e">${b.eyebrow}</p><h1>${b.t1}<br><i>${b.t2}</i></h1><p class="s">${b.sub}</p><div class="c">${b.chips.map(c=>`<span>${c}</span>`).join('')}</div></div>
 </body></html>`;}
(async()=>{const br=await chromium.launch();const p=await br.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 for(const b of B){await p.setContent(html(b),{waitUntil:'load'});await p.waitForTimeout(200);await p.screenshot({path:path.join(__dirname,`banner-${b.k}.png`)});}
 await br.close();})();
