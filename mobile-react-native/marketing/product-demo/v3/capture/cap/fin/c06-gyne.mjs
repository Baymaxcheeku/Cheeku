export const profile = 'priya';
export const start = '/services/doctors';
export async function run(a) {
  await a.tap('Gynaecologist', { after: 3800 });
  await a.tap({ text: 'Priya', exact: true }, { after: 3200 });
  await a.tap("Periods, pregnancy or women's health", { after: 3000 });
  await a.tap({ placeholder: 'e.g.' }); await a.type('12 weeks pregnant. First antenatal visit, and planning the NT scan.');
  await a.page.keyboard.press('Enter'); await a.wait(3500); 
  await a.tap('About a week', { after: 3000 }); 
  await a.tap('Hardly at all', { after: 3000 }); 
  await a.tap('Nothing yet', { after: 3500 }); 
  await a.tap('Yes, share them', { after: 4000 }); 
  await a.tap('Looks good', { after: 3500 }); 
  await a.tap('Online consultation', { after: 4000 });
  await a.tap('See available doctors', { after: 2500 }); 
  await a.tap('Choose a video slot', { after: 2500 });
  await a.tap({ text: '10:30 am', exact: true }, { after: 900 });
  await a.tap('Book 10:30 am', { after: 3500 }); 
  await a.scroll(500, 900); await a.wait(800); 
}
