export const profile='arjun'; export const start='/services/medicines';
export async function run(a){ await a.wait(1200); await a.tap('Refill current medicines', {after:2000}); await a.tap({placeholder:'House, street'}); await a.type('4th floor, 12th Main, Indiranagar',{cps:30}); await a.wait(300); await a.tap({role:'button', name:'Request for'}, {after:3200}); await a.shot('end'); }
