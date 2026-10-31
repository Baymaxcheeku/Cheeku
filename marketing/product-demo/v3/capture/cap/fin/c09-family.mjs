export const profile='arjun'; export const start='/family';
export async function run(a){ await a.wait(1400); await a.tap({text:'Tara Sharma'}, {after:2400}); await a.scroll(420,1400); await a.wait(1600); await a.shot('end'); }
