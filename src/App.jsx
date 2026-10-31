import React,{useEffect,useMemo,useState} from 'react';
import {Trophy,Users,Shuffle,Share2,Plus,Trash2,ArrowLeft,CheckCircle2,Copy,Download,RotateCcw,ShieldCheck,Eye,LockKeyhole} from 'lucide-react';
import {initialPlayers,positions,validate,makeDraft} from './draft';
import {auth} from './firebase';
import {signInWithCustomToken,onAuthStateChanged,signOut} from 'firebase/auth';
import {watchTournament,loadPublicRoster,loadPlayerResult,saveTournament} from './cloud';
const getName=(players,id)=>players.find(p=>p.id===id)?.name||'—';
function App(){
 const [shared,setShared]=useState(null);
 const [adminUser,setAdminUser]=useState(null);
 const [playerAccessCode,setPlayerAccessCode]=useState('');
 const [loadFailed,setLoadFailed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [saved,setSaved]=useState(false);
 const [publicRoster,setPublicRoster]=useState([]);
 const [playerResult,setPlayerResult]=useState(null);
 const [players,setPlayers]=useState(initialPlayers);
 const [teamNames,setTeamNames]=useState(['Equipo Rojo','Equipo Azul']);
 const [captains,setCaptains]=useState(['','']);
 const [draft,setDraft]=useState(null);
 const [screen,setScreen]=useState('gate');
 const [access,setAccess]=useState('');
 const [code,setCode]=useState('');
 const [accessError,setAccessError]=useState('');
 const [selected,setSelected]=useState('');
 const [revealed,setRevealed]=useState(false);
 const [spinning,setSpinning]=useState(false);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const active=draft;
 const total=players.length;
 const playerList=useMemo(()=>active?.teams.flatMap(t=>t.players)||[],[active]);
 const chosen=active?.teams.find(t=>t.players.some(p=>p.id===selected));
 useEffect(()=>onAuthStateChanged(auth,user=>setAdminUser(user)),[]);
 useEffect(()=>{if(!adminUser||access!=='admin')return;setLoaded(false);setLoadFailed(false);return watchTournament(data=>{
  if(data){setPlayers(Array.isArray(data.players)?data.players:initialPlayers);setTeamNames(data.teamNames||['Equipo Rojo','Equipo Azul']);setCaptains(data.captains||['','']);setDraft(data.draft||null);setSaved(true);}
  else{setSaved(false);setDraft(null);}
  setLoaded(true);setLoadFailed(false);
 },e=>{setLoaded(true);setLoadFailed(true);setError('No se pudo cargar Firestore: '+e.message);});},[adminUser,access]);
 useEffect(()=>{if(access!=='admin'||!loaded)return;if(draft&&screen==='admin')setScreen('result');if(!draft&&screen==='result')setScreen('admin');},[draft,loaded,access,screen]);
 useEffect(()=>{loadPublicRoster().then(data=>setPublicRoster(data?.published?data.players||[]:[])).catch(()=>{});},[screen]);
 async function login(e){
  e.preventDefault();
  const adminCode=import.meta.env.VITE_ADMIN_CODE||'12345';
  const playerCode=import.meta.env.VITE_PLAYER_CODE||'222';
  setAccessError('');
  if(code===adminCode){
   try{
    const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,role:'admin'})});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'No se pudo validar el código.');
    await signInWithCustomToken(auth,payload.token);
    setAccess('admin');setScreen('admin');setLoadFailed(false);setLoaded(false);
   }catch(err){setAccessError('No se pudo autorizar al organizador: '+err.message);}
  }else if(code===playerCode){
   try{await signOut(auth);}catch{}
   setPlayerAccessCode(code);setAccess('player');setScreen('player');setSelected('');setPlayerResult(null);setRevealed(false);
  }else setAccessError('Código incorrecto.');
  setCode('');
 }
 async function persist(nextDraft=draft){if(!adminUser||!loaded||loadFailed){setError('No se puede guardar hasta recuperar el torneo de Firebase. Verifica los permisos y vuelve a entrar.');return false;}setBusy(true);setError('');try{await saveTournament({players,teamNames,captains,draft:nextDraft});return true;}catch(e){setError('No se pudo guardar: '+e.message);return false;}finally{setBusy(false);}}
 function updatePlayer(id,key,value){setPlayers(p=>p.map(x=>x.id===id?{...x,[key]:value}:x));setError('');}
 function addPlayer(){setPlayers(p=>[...p,{id:crypto.randomUUID(),name:'',pos:'Sin definir'}]);}
 function removePlayer(id){setPlayers(p=>p.filter(x=>x.id!==id));setCaptains(c=>c.map(x=>x===id?'':x));}
 async function runDraft(){if(busy)return;const e=validate(players,captains);if(e){setError(e);return;}const result=makeDraft(players,captains,teamNames);if(!await persist(result))return;setDraft(result);setScreen('result');setError('');window.scrollTo({top:0,behavior:'smooth'});}
 async function copyLink(){const url=location.origin+location.pathname;try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2400);}catch{window.prompt('Copia este enlace:',url);}}
 function shareWhatsapp(){const text=`🥎 TORNEO INTERNO MAHANAIM\n🔴 vs 🔵\n¡Descubre tu equipo! Selecciona tu nombre en el enlace:\n${location.origin+location.pathname}`;window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
 function exportResults(){const lines=['TORNEO INTERNO MAHANAIM','',...active.teams.flatMap(t=>[`${t.name} (Capitán: ${getName(t.players,t.captain)})`,...t.players.map((p,i)=>`${i+1}. ${p.name} — ${p.pos}`),''])];const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='equipos-mahanaim.txt';a.click();URL.revokeObjectURL(url);}
 async function reveal(){
  if(!selected)return;
  setRevealed(false);setPlayerResult(null);setSpinning(true);setError('');
  try{
   const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:playerAccessCode,role:'player',playerId:selected})});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||'No se pudo validar el acceso del jugador.');
   await signInWithCustomToken(auth,payload.token);
   const result=await loadPlayerResult(selected);
   if(!result)throw Error('Todavía no se ha publicado tu equipo.');
   setTimeout(()=>{setPlayerResult(result);setSpinning(false);setRevealed(true);},1200);
  }catch(e){setSpinning(false);setError(e.message);}
 }
 async function reset(){
  if(busy)return;
  if(!window.confirm('¿REINICIAR EL SORTEO? Se borrarán de Firebase las asignaciones de los equipos. Se conservarán jugadores, posiciones y capitanes. Los resultados anteriores dejarán de estar disponibles.'))return;
  if(!await persist(null))return;
  setDraft(null);setPublicRoster([]);setPlayerResult(null);setScreen('admin');setSelected('');setRevealed(false);setError('');
 }
 function editDraft(){setScreen('admin');setError('');window.scrollTo({top:0,behavior:'smooth'});}
 async function repeatDraft(){
  if(busy)return;
  if(!window.confirm('¿REPETIR EL SORTEO? Se sustituirán los equipos actuales y los resultados publicados para todos los jugadores.'))return;
  const e=validate(players,captains);if(e){setError(e);return;}
  const result=makeDraft(players,captains,teamNames);
  if(!await persist(result))return;
  setDraft(result);setPlayerResult(null);setRevealed(false);setScreen('result');
 }
 return <div className="app"><header className="topbar"><div className="brand"><span className="brand-icon">🥎</span><div><strong>MAHANAIM <em>DRAFT</em></strong><small>TORNEO INTERNO · SOFTBALL</small></div></div><span className="badge">DÍA DE JUEGO</span></header>
 <main className="container"><section className="hero"><div className="eyebrow">MAHANAIM · TORNEO INTERNO</div><h1>DOS EQUIPOS.<br/><span>UNA RIVALIDAD.</span></h1><p>El mismo escudo. Dos bandos. Que hable el terreno.</p><div className="versus"><div className="versus-team red"><span>🔴</span><strong>{active?.teams[0]?.name||teamNames[0]}</strong></div><b>VS</b><div className="versus-team blue"><span>🔵</span><strong>{active?.teams[1]?.name||teamNames[1]}</strong></div></div></section>
 {screen==='gate'&&<section className="card reveal-card"><div className="ball">🥎</div><div className="eyebrow">ACCESO AL TORNEO</div><h2>ENTRA AL TERRENO</h2><p>Introduce el código que recibiste para acceder.</p><form onSubmit={login} className="access-form"><label className="choose">CÓDIGO DE ACCESO<input type="password" inputMode="numeric" autoComplete="off" placeholder="•••••" value={code} onChange={e=>{setCode(e.target.value);setAccessError('');}} /></label>{accessError&&<p className="error" role="alert">{accessError}</p>}<button type="submit" className="btn primary large full">ENTRAR</button></form><p className="hint">Los organizadores y los jugadores utilizan códigos diferentes.</p></section>}
 {access==='admin'&&!loaded&&screen!=='gate'&&<section className="card centered"><p>Cargando torneo guardado en Firebase...</p><p className="hint">Si no termina, comprueba la conexión y los permisos de Firestore.</p></section>}
 {access==='admin'&&loadFailed&&<section className="card centered"><h2>Acceso a Firebase denegado</h2><p>No se modificaron los datos guardados. Este navegador debe estar autorizado en las reglas de Firestore.</p><p className="hint">UID de esta sesión: <strong style={{overflowWrap:'anywhere'}}>{adminUser?.uid||'Sin sesión'}</strong></p><button className="btn outline" onClick={()=>{setAccess('');setScreen('gate');setError('');}}>Volver e intentar nuevamente</button></section>}
 {screen==='admin'&&adminUser&&loaded&&!loadFailed&&access==='admin'&&<><section className="stats"><div><strong>{total}</strong><span>JUGADORES</span></div><div><strong>2</strong><span>EQUIPOS</span></div><div><strong>{Math.ceil(total/2)} / {Math.floor(total/2)}</strong><span>REPARTO</span></div></section>
 <section className="card"><div className="section-title"><h2><span>01</span> Nombres de los equipos</h2><p>Personalízalos o deja Rojo y Azul.</p></div><div className="two-cols"><label>🔴 Equipo rojo<input value={teamNames[0]} maxLength={35} onChange={e=>setTeamNames(n=>[e.target.value,n[1]])}/></label><label>🔵 Equipo azul<input value={teamNames[1]} maxLength={35} onChange={e=>setTeamNames(n=>[n[0],e.target.value])}/></label></div></section>
 <section className="card"><div className="section-title row"><div><h2><span>02</span> Lista de jugadores</h2><p>Una posición principal por jugador. Puedes agregar participantes.</p></div><span className="count">{total} inscritos</span></div><div className="player-table"><div className="table-head"><span>#</span><span>NOMBRE</span><span>POSICIÓN</span><span></span></div>{players.map((p,i)=><div className="player-row" key={p.id}><span className="num">{String(i+1).padStart(2,'0')}</span><input aria-label={`Nombre jugador ${i+1}`} value={p.name} placeholder="Nombre del jugador" onChange={e=>updatePlayer(p.id,'name',e.target.value)}/><select aria-label={`Posición de ${p.name||'jugador'}`} value={p.pos} onChange={e=>updatePlayer(p.id,'pos',e.target.value)}>{positions.map(pos=><option key={pos}>{pos}</option>)}</select><button className="icon-btn" title="Eliminar jugador" onClick={()=>removePlayer(p.id)}><Trash2 size={17}/></button></div>)}</div><button className="btn outline full" onClick={addPlayer}><Plus size={18}/> Agregar jugador</button><p className="hint">Si hay un número impar de jugadores, un equipo tendrá una persona más.</p></section>
 <section className="card"><div className="section-title"><h2><span>03</span> Capitanes elegidos</h2><p>Registra aquí los dos ganadores de la votación. Se asignarán a equipos contrarios al azar.</p></div><div className="two-cols"><label>👑 Capitán 1<select value={captains[0]} onChange={e=>setCaptains(c=>[e.target.value,c[1]])}><option value="">Seleccionar capitán</option>{players.filter(p=>p.name.trim()).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>👑 Capitán 2<select value={captains[1]} onChange={e=>setCaptains(c=>[c[0],e.target.value])}><option value="">Seleccionar capitán</option>{players.filter(p=>p.name.trim()).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div></section>
 <section className="card centered">{draft&&<p className="hint">Hay un sorteo publicado. Si guardas cambios aquí, el sorteo anterior permanecerá hasta que lo repitas o reinicies.</p>}<button className="btn primary" disabled={busy} onClick={()=>persist()}>💾 GUARDAR JUGADORES Y CONFIGURACIÓN</button><p className="hint">Guarda antes de cerrar o realizar el sorteo.</p></section>
 <section className="card action-card"><ShieldCheck size={32}/><h2>Todo listo para el sorteo</h2><p>Se sortearán los capitanes entre los colores y se buscará una distribución aleatoria que equilibre las posiciones conocidas.</p>{error&&<p className="error" role="alert">{error}</p>}<button className="btn primary large" onClick={runDraft}><Shuffle size={21}/> REALIZAR SORTEO</button><p className="hint">Revisa bien los datos antes de continuar. El sorteo se hace en este dispositivo.</p></section></>}
 {screen==='result'&&active&&adminUser&&loaded&&!loadFailed&&access==='admin'&&<><section className="card result-heading"><CheckCircle2 size={40}/><h2>ALINEACIONES DEFINIDAS</h2><p>¡El juego está servido! Envía el enlace al grupo.</p><div className="actions"><button className="btn primary" onClick={shareWhatsapp}><Share2 size={18}/> Enviar por WhatsApp</button><button className="btn outline" onClick={copyLink}><Copy size={18}/>{copied?'¡Enlace copiado!':'Copiar enlace'}</button></div></section><div className="team-grid">{active.teams.map((t,i)=><section className={`team-card ${i?'blue-card':'red-card'}`} key={i}><div className="team-heading"><span>{i?'🔵':'🔴'}</span><div><small>EQUIPO {i+1}</small><h2>{t.name}</h2></div><strong>{t.players.length}</strong></div><div className="captain"><Trophy size={17}/> CAPITÁN: {getName(t.players,t.captain)}</div>{t.players.map((p,j)=><div className="team-player" key={p.id}><span>{String(j+1).padStart(2,'0')}</span><strong>{p.name}</strong><small>{p.pos==='Sin definir'?'—':p.pos}</small></div>)}</section>)}</div><section className="card centered"><div className="actions"><button className="btn outline" onClick={exportResults}><Download size={18}/> Descargar lista</button><button className="btn outline" onClick={()=>{setScreen('player');setSelected('');setRevealed(false);window.scrollTo(0,0);}}><Eye size={18}/> Probar vista jugador</button><button className="btn outline" disabled={busy} onClick={editDraft}>✏️ Editar jugadores</button><button className="btn outline" disabled={busy} onClick={repeatDraft}><Shuffle size={17}/> Repetir sorteo</button><button className="btn subtle" disabled={busy} onClick={reset}><RotateCcw size={17}/> Reiniciar sorteo</button></div><p className="hint">Comparte el enlace únicamente con los jugadores y dales el código de jugadores. No compartas el código de administración. Aviso: los códigos restringen la interfaz, no cifran los resultados del enlace.</p></section></>}
 {screen==='player'&&access&&<section className="card reveal-card"><div className="ball">🥎</div><div className="eyebrow">DÍA DE JUEGO · MAHANAIM</div><h2>¿CUÁL ES TU EQUIPO?</h2><p>Elige tu nombre. Revela tus colores.</p><label className="choose">TU NOMBRE<select value={selected} disabled={spinning} onChange={e=>{setSelected(e.target.value);setRevealed(false);}}><option value="">Selecciona tu nombre</option>{[...publicRoster].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="btn primary large full" disabled={!selected||spinning} onClick={reveal}>{spinning?'LA RULETA ESTÁ GIRANDO...':'🎰 DESCUBRIR MI EQUIPO'}</button>{error&&screen==='player'&&<p className="error">{error}</p>}{spinning&&<div className="spin-wrap"><div className="spinner"><span>🥎</span></div><strong>¡PREPÁRATE!</strong></div>}{revealed&&playerResult&&<div className={`reveal-result ${playerResult.color==='rojo'?'reveal-red':'reveal-blue'}`}><span className="reveal-icon">{playerResult.color==='rojo'?'🔴':'🔵'}</span><small>¡YA TIENES TUS COLORES!</small><h2>{playerResult.playerName}</h2><p>PERTENECES AL</p><h3>{playerResult.teamName}</h3><div>👑 Capitán: <strong>{playerResult.captainName}</strong></div><button className="btn light" onClick={()=>{const msg=`🥎 ¡Ya descubrí mi equipo!\n${playerResult.playerName} → ${playerResult.teamName} ${playerResult.color==='rojo'?'🔴':'🔵'}\n¡Nos vemos en el terreno!`;window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');}}><Share2 size={17}/> Compartir resultado</button></div>}<p className="hint"><LockKeyhole size={13}/> Tu equipo ya fue sorteado. Repetir la animación no cambia el resultado.</p>{access==='admin'&&adminUser&&active&&<button className="btn subtle" onClick={()=>setScreen('result')}><ArrowLeft size={17}/> Volver a resultados</button>}</section>}
 <footer>🥎 MAHANAIM DRAFT <span>•</span> UN EQUIPO, DOS COLORES <span>•</span> 2026</footer></main></div>;
}
export default App;
