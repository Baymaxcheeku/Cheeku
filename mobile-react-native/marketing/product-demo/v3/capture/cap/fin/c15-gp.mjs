export const profile='arjun'; export const start='/book/doctors';
export async function run(a){ await a.wait(1200); await a.tap({text:'Choose a video slot', nth:1}, {after:2200}); await a.tap({text:'11:00 am', exact:true}, {after:800}); await a.tap('Book 11:00 am', {after:3000}); await a.shot('end'); }
