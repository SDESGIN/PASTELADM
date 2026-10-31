import {pbkdf2Sync,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {initialState,applyAction} from './domain.js';
import {bootstrap} from './bootstrap.js';
const hash=(p,s)=>pbkdf2Sync(p,s,100000,32,'sha256').toString('hex');
const sha=s=>createHash('sha256').update(s).digest('hex');
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
class AppError extends Error{constructor(message,status=400){super(message);this.status=status}}
const cookie=(req,value,age)=>`pd_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`;
const tokenFrom=req=>{const raw=req.headers.get('cookie')?.match(/(?:^|;\s*)pd_session=([^;]+)/)?.[1];return raw?sha(raw):''};
const authorize=(root,req)=>{const token=tokenFrom(req);if(!root.sessions.some(s=>s.token===token&&s.expires>Date.now()))throw new AppError('Sessão expirada. Entre novamente.',401);return token};
export function createHandler(store,env={}){
 async function read(){let found=await store.getWithMetadata('painel-v1',{type:'json',consistency:'strong'});if(found)return found;
 let admin=bootstrap;if(env.ADMIN_PASSWORD){if(env.ADMIN_PASSWORD.length<10||env.ADMIN_PASSWORD.length>200)throw new AppError('A senha inicial deve ter entre 10 e 200 caracteres.',503);const salt=randomUUID();admin={salt,hash:hash(env.ADMIN_PASSWORD,salt)}}
 const root={schema:1,version:0,state:initialState(),admin,sessions:[],attempts:{count:0,expires:0}};
 await store.setJSON('painel-v1',root,{onlyIfNew:true});found=await store.getWithMetadata('painel-v1',{type:'json',consistency:'strong'});if(!found)throw new AppError('Não foi possível iniciar o armazenamento. Tente novamente.',503);return found;
 }
 async function change(update){for(let i=0;i<8;i++){const current=await read();const root=structuredClone(current.data);const result=await update(root);if(result.noWrite)return result.response;
 if(Buffer.byteLength(JSON.stringify(root))>4000000)throw new AppError('O histórico atingiu o limite desta versão. Exporte uma cópia em Configurações e solicite a ampliação do armazenamento.',409);
 const saved=await store.setJSON('painel-v1',root,{onlyIfMatch:current.etag});if(saved.modified)return result.response;}throw new AppError('Outro registro foi salvo ao mesmo tempo. Tente novamente.',409)}
 return async function handler(req){try{
 const route=new URL(req.url).pathname;const method=route==='/api/data'?'GET':'POST';if(!['/api/login','/api/logout','/api/data','/api/action','/api/password'].includes(route))return json({error:'Página não encontrada.'},404);if(req.method!==method)return json({error:'Método inválido.'},405);
 let body={};if(method==='POST'){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new AppError('Origem inválida.');if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError('Formato inválido.');const text=await req.text();if(Buffer.byteLength(text)>100000)throw new AppError('Requisição muito grande.',413);try{body=JSON.parse(text)}catch{throw new AppError('Formato inválido.')}if(!body||typeof body!=='object'||Array.isArray(body))throw new AppError('Formato inválido.')}
 if(route==='/api/login')return await change(root=>{const now=Date.now();if(root.attempts.expires<=now)root.attempts={count:0,expires:now+900000};if(root.attempts.count>=10)throw new AppError('Muitas tentativas. Aguarde 15 minutos.',429);root.attempts.count++;
 const valid=body.username==='admin'&&typeof body.password==='string'&&body.password.length<=200&&equal(hash(body.password,root.admin.salt),root.admin.hash);
 if(!valid)return {response:json({error:'Usuário ou senha inválidos.'},401)};root.attempts={count:0,expires:0};const raw=randomUUID()+randomUUID();root.sessions=root.sessions.filter(s=>s.expires>now).slice(-31);root.sessions.push({token:sha(raw),expires:now+43200000});return {response:json({ok:true},200,{'Set-Cookie':cookie(req,raw,43200)})}});
 if(route==='/api/data'){const {data:root}=await read();authorize(root,req);return json({state:root.state,version:root.version})}
 if(route==='/api/logout')return await change(root=>{root.sessions=root.sessions.filter(s=>s.token!==tokenFrom(req)&&s.expires>Date.now());return {response:json({ok:true},200,{'Set-Cookie':cookie(req,'',0)})}});
 return await change(root=>{authorize(root,req);
 if(route==='/api/password'){if(typeof body.current!=='string'||body.current.length>200||typeof body.password!=='string'||body.password.length<10||body.password.length>200)throw new AppError('Use uma senha de pelo menos 10 caracteres.');if(!equal(hash(body.current,root.admin.salt),root.admin.hash))throw new AppError('Senha atual incorreta.');const salt=randomUUID();root.admin={salt,hash:hash(body.password,salt)};root.sessions=[];return {response:json({ok:true},200,{'Set-Cookie':cookie(req,'',0)})}}
 if(typeof body.requestId!=='string'||!body.requestId||body.requestId.length>100)throw new AppError('Identificador inválido.');let result;try{result=applyAction(root.state,body.action,body.requestId)}catch(e){throw new AppError(e.message)}if(result.duplicate)return {noWrite:true,response:json({state:root.state,version:root.version})};root.version++;return {response:json({state:root.state,version:root.version})};
 });
 }catch(e){if(e instanceof AppError)return json({error:e.message},e.status);console.error('Falha de armazenamento do painel:',e?.name);return json({error:'Não foi possível acessar o armazenamento. Tente novamente em instantes.'},503)}};
}
