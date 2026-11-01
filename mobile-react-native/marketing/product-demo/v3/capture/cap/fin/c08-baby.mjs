export const profile='priya'; export const start='/pregnancy?id=98a65fbe-5820-4d31-af5e-87765522d65d&birth=1';
export async function run(a){
  await a.wait(900); await a.tap({placeholder:'A nickname is fine'}); await a.type('Tara',{cps:8}); await a.wait(400);
  await a.tap({text:'Girl', exact:true}, {after:400}); await a.tap({text:'Normal', exact:true}, {after:400});
  await a.tap({placeholder:'3.2'}); await a.type('3.1',{cps:8});
  await a.wait(500);
  await a.mark('add'); await a.tap({role:'button', name:'Add the baby to the family'}, {after:3800}); await a.shot('welcome');
}
