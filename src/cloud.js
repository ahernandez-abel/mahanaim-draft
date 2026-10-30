import {doc,getDoc,onSnapshot,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
const tournament=doc(db,'tournaments','mahanaim-2026');
const roster=doc(db,'public','mahanaim-roster');
export function watchTournament(callback,error){return onSnapshot(tournament,s=>callback(s.exists()?s.data():null),error);}
export async function loadPublicRoster(){const s=await getDoc(roster);return s.exists()?s.data():null;}
export async function loadPlayerResult(id){const s=await getDoc(doc(db,'playerResults',id));return s.exists()?s.data():null;}
export async function saveTournament({players,teamNames,captains,draft}){
 // Read previous roster before writing so removed players' results are deleted too.
 const previous=await getDoc(roster);
 const oldIds=(previous.exists()?previous.data().players||[]:[]).map(p=>p.id);
 const ids=new Set([...oldIds,...players.map(p=>p.id)]);
 // Firestore batches allow at most 500 writes; this tournament is deliberately small.
 if(ids.size>490)throw new Error('Demasiados participantes para guardar en una operación.');
 const batch=writeBatch(db);
 batch.set(tournament,{players,teamNames,captains,draft:draft||null,updatedAt:serverTimestamp()});
 batch.set(roster,{players:players.map(p=>({id:p.id,name:p.name})),published:!!draft,updatedAt:serverTimestamp()});
 for(const id of ids){
  const ref=doc(db,'playerResults',id);
  const team=draft?.teams?.find(t=>t.players.some(p=>p.id===id));
  if(team){
   const player=team.players.find(p=>p.id===id);
   batch.set(ref,{playerId:id,playerName:player.name,teamName:team.name,color:team.color,captainName:team.players.find(p=>p.id===team.captain)?.name||''});
  }else batch.delete(ref);
 }
 await batch.commit();
}
