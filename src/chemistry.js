// First 20 elements: default isotope mass number, standard atomic weight.
export const elements = [
['H','Hydrogen',1,1.008],['He','Helium',4,4.0026],['Li','Lithium',7,6.94],['Be','Beryllium',9,9.0122],['B','Boron',11,10.81],['C','Carbon',12,12.011],['N','Nitrogen',14,14.007],['O','Oxygen',16,15.999],['F','Fluorine',19,18.998],['Ne','Neon',20,20.180],['Na','Sodium',23,22.990],['Mg','Magnesium',24,24.305],['Al','Aluminium',27,26.982],['Si','Silicon',28,28.085],['P','Phosphorus',31,30.974],['S','Sulfur',32,32.06],['Cl','Chlorine',35,35.45],['Ar','Argon',40,39.948],['K','Potassium',39,39.098],['Ca','Calcium',40,40.078]
].map(([symbol,name,mass,weight],i)=>({symbol,name,mass,weight,z:i+1}));
export const charge = a => a.p-a.e;
export const mass = a => a.p+a.n;
export const element = a => elements[a.p-1];
export const chargeLabel = a => charge(a)===0?'0':`${Math.abs(charge(a))}${charge(a)>0?'+':'−'}`;
export function shells(e){let left=e;return [2,8,8,2].map(c=>{const n=Math.min(c,left);left-=n;return n;}).filter(Boolean);}
export function createAtom(z,x=0,y=0){const el=elements[z-1];if(!el)throw Error('Element outside MVP range');return {id:Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''),p:z,n:el.mass-z,e:z,x,y,vx:0,vy:0};}
export function changeParticle(a,key,delta){if(!['p','n','e'].includes(key))return false;const limits={p:[1,20],n:[0,30],e:[0,20]};const v=a[key]+delta;if(v<limits[key][0]||v>limits[key][1])return false;a[key]=v;return true;}
export function validateAtoms(value){return Array.isArray(value)&&value.length<=24&&value.every(a=>a&&typeof a.id==='string'&&a.id.length<80&&['p','n','e'].every(k=>Number.isInteger(a[k]))&&a.p>=1&&a.p<=20&&a.n>=0&&a.n<=30&&a.e>=0&&a.e<=20&&['x','y'].every(k=>Number.isFinite(a[k])&&Math.abs(a[k])<1000));}
export function step(atoms,dt,held=null){dt=Math.min(dt,0.035);for(let i=0;i<atoms.length;i++)for(let j=i+1;j<atoms.length;j++){let a=atoms[i],b=atoms[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<0.001){dx=0.01;dy=0;d=0.01;}const q=charge(a)*charge(b);const force=d<2.15?-(2.15-d)*18:q===0?0:Math.max(-12,Math.min(12,-q*8/(d*d)));const fx=force*dx/d*dt,fy=force*dy/d*dt;if(a.id!==held){a.vx+=fx;a.vy+=fy;}if(b.id!==held){b.vx-=fx;b.vy-=fy;}}
for(const a of atoms){if(a.id===held){a.vx=0;a.vy=0;continue;}a.vx*=Math.exp(-3*dt);a.vy*=Math.exp(-3*dt);a.x=Math.max(-14,Math.min(14,a.x+a.vx*dt));a.y=Math.max(-9,Math.min(9,a.y+a.vy*dt));}}
