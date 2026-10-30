// 20 inscritos confirmados y 2 jugadores adicionales mencionados (Ridel y Yaki).
// Las posiciones provienen de las alineaciones facilitadas; son editables.
// Los apodos se conservan como nombres visibles de la inscripción.
export const initialPlayers = [
  ['Ariel','P'],['Abel','SS'],['Carlos Rodríguez','SS'],
  ['Luis Rodríguez','2B'],['Edibert','1B'],['Albert','LF'],
  ['Novas','C'],['Alexis','DH'],['Puello','2B'],
  ['Ángel Estrella','RF'],['Eduardo','1B'],
  ['King','3B'],['Iván','CF'],
  ['Ricardo','C'],['Yoyi','P'],['Bryan','CF'],
  ['Javic','LF'],['Azael','P'],['Martínez','3B'],['Guillermo','P'],
  ['Ridel','UTIL'],['Yaki','UTIL'],
].map(([name,pos],i)=>({id:`p${i+1}`,name,pos}));
export const initialNames = initialPlayers.map(p=>p.name);
export const positions = ['Sin definir','P','C','1B','2B','3B','SS','LF','CF','RF','DH','UTIL'];
const rand = max => { const lim=Math.floor(4294967296/max)*max; const a=new Uint32Array(1); do {crypto.getRandomValues(a)} while(a[0]>=lim); return a[0]%max; };
export function shuffle(items){const a=[...items]; for(let i=a.length-1;i>0;i--){const j=rand(i+1); [a[i],a[j]]=[a[j],a[i]];} return a;}
export function validate(players,captains){const names=players.map(p=>p.name.trim().toLocaleLowerCase('es')); if(players.length<4) return 'Registra al menos 4 jugadores.'; if(players.some(p=>!p.name.trim()))return 'Todos los jugadores necesitan un nombre.'; if(new Set(names).size!==names.length)return 'Hay nombres duplicados. Usa nombres distinguibles.'; if(!captains[0]||!captains[1]||captains[0]===captains[1])return 'Selecciona dos capitanes diferentes.'; if(captains.some(id=>!players.some(p=>p.id===id)))return 'Uno de los capitanes no aparece en la lista.'; return null;}
// Se buscan muchas distribuciones aleatorias; se conserva una de las mejores
// según diferencia por posición. No se usan niveles de habilidad.
export function makeDraft(players,captains,teamNames){
 const error=validate(players,captains); if(error)throw new Error(error);
 const [cA,cB]=shuffle(captains);
 const remaining=players.filter(p=>p.id!==cA&&p.id!==cB);
 const sizeA=Math.ceil(players.length/2), sizeB=players.length-sizeA;
 let best=Infinity, finalists=[];
 for(let attempt=0;attempt<2500;attempt++){
   const arr=shuffle(remaining), a=[players.find(p=>p.id===cA),...arr.slice(0,sizeA-1)], b=[players.find(p=>p.id===cB),...arr.slice(sizeA-1)];
   const positionsToScore=[...new Set(players.map(p=>p.pos).filter(p=>p!=='Sin definir'))];
   let score=0;
   for(const pos of positionsToScore){const countA=a.filter(p=>p.pos===pos).length,countB=b.filter(p=>p.pos===pos).length; score+=(countA-countB)**2;}
   if(score<best){best=score;finalists=[[a,b]];} else if(score===best&&finalists.length<60)finalists.push([a,b]);
 }
 const [a,b]=finalists[rand(finalists.length)];
 return {version:1,event:'TORNEO INTERNO MAHANAIM',createdAt:new Date().toISOString(),teams:[{name:teamNames[0].trim()||'Equipo Rojo',color:'rojo',captain:cA,players:a},{name:teamNames[1].trim()||'Equipo Azul',color:'azul',captain:cB,players:b}]};
}
const bytesToBase64Url=bytes=>{let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
export function encodeDraft(data){return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(data)));}
export function decodeDraft(value){const b64=value.replace(/-/g,'+').replace(/_/g,'/');const binary=atob(b64);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const data=JSON.parse(new TextDecoder().decode(bytes));if(data?.version!==1||!Array.isArray(data.teams)||data.teams.length!==2||data.teams.some(t=>!Array.isArray(t.players)||typeof t.name!=='string'))throw new Error('Formato inválido');return data;}
export function getSharedDraft(){try{const params=new URLSearchParams(location.hash.slice(1));const token=params.get('s');return token?decodeDraft(token):null;}catch{return null;}}
export function shareUrl(draft){return `${location.origin}${location.pathname}#s=${encodeDraft(draft)}`;}
