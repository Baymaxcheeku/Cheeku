export const profile='priya'; export const start='/ask';
export async function run(a){
  await a.wait(500); await a.mark('switch');
  await a.tap({ placeholder: 'Ask, or tell me' }); await a.wait(250);
  await a.type("We're trying for a baby. What should Priya and I do first?", { cps: 22 });
  await a.wait(300); await a.mark('send'); await a.tap(a.page.getByLabel('Send', { exact: true }));
  await a.wait(4500); await a.mark('answered'); await a.wait(3500);
}
