import {doc,getDoc,onSnapshot,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
const tournament=doc(db,'tournaments','mahanaim-2026');
export function watchTournament(callback,error){return onSnapshot(tournament,s=>callback(s.exists()?s.data():null),error);}
export async function loadPublicRoster(){const s=await getDoc(doc(db,'public','mahanaim-roster'));return s.exists()?s.data():null;}
export async function loadPlayerResult(id){const s=await getDoc(doc(db,'playerResults',id));return s.exists()?s.data():null;}
export async function saveTournament({players,teamNames,captains,draft}){
 const batch=writeBatch(db);
 batch.set(tournament,{players,teamNames,captains,draft:draft||null,updatedAt:serverTimestamp()});
 batch.set(doc(db,'public','mahanaim-roster'),{players:players.map(p=>({id:p.id,name:p.name})),published:!!draft,updatedAt:serverTimestamp()});
 // Remove previously published results for the current roster when resetting.
 for(const p of players){const ref=doc(db,'playerResults',p.id);const team=draft?.teams.find(t=>t.players.some(x=>x.id===p.id));if(team){batch.set(ref,{playerId:p.id,playerName:p.name,teamName:team.name,color:team.color,captainName:team.players.find(x=>x.id===team.captain)?.name||''});}else{batch.delete(ref);}}
 await batch.commit();
}
