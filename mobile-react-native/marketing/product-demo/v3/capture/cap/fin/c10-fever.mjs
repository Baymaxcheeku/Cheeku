export const profile='tara'; export const start='/ask';
export async function run(a){
  await a.wait(500); await a.tap({ placeholder: 'Ask, or tell me' }); await a.wait(250);
  await a.type("Tara feels hot. The thermometer says 100.6°F.", { cps: 20 });
  await a.wait(300); await a.mark('send'); await a.tap(a.page.getByLabel('Send', { exact: true }));
  await a.wait(4500); await a.mark('answered'); await a.shot('ans'); await a.wait(2600); await a.mark('online'); await a.tap({text:'Online consultation', exact:true}, {after:3500}); await a.shot('end');
}
