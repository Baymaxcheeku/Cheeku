export const profile='priya'; export const start='/labs';
export async function run(a){
  await a.wait(600); await a.tap({placeholder:'Try'}); await a.type('thyroid',{cps:12}); await a.wait(900);
  await a.tap({text:'Thyroid profile (T3, T4, TSH)'}, {after:1500});
  await a.tap('Add to cart', {after:900});
  await a.tap({role:'button', name:'Choose lab'}, {after:2200}); await a.mark('labs');
  await a.tap({role:'button', name:'Book with Thyrocare'}, {after:1800});
  await a.tap({role:'button', name:'Book home collection'}, {after:2200}); await a.mark('form'); await a.shot('form');
  await a.tap({placeholder:'Flat, building'}); await a.type('4th floor, 12th Main, Indiranagar, 560038',{cps:30}); await a.wait(300);
  await a.scroll(400,800); await a.wait(600);
  await a.tap({role:'button', name:'Confirm for'}, {after:3500}); await a.mark('booked'); await a.shot('booked');
}
