export const profile='arjun'; export const start='/services';
export async function run(a){ await a.wait(1200); for (let i=0;i<4;i++){ await a.scroll(560,1500); await a.wait(900);} }
