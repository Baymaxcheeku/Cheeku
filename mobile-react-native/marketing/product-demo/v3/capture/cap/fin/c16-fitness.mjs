export const profile='arjun'; export const start='/fitness';
export async function run(a){ await a.wait(1400); await a.scroll(250,900); await a.wait(600); await a.tap({text:'Gym for beginners'}, {after:1800}); await a.shot('sheet'); await a.tap({text:'Book for me', exact:true}, {after:3200}); await a.shot('end'); }
