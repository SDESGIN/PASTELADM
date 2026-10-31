import {getStore} from '@netlify/blobs';
import {createHandler} from '../../server/api.js';
export default async function handler(request){
 try{
 const store=getStore({name:'pastel-diferente-admin',consistency:'strong',fetch:async(input,init)=>{
   const response=await fetch(input,init);
   if(response.status>=500||[401,403,429].includes(response.status))throw new Error('StorageUnavailable');
   return response;
 }});
 return await createHandler(store,process.env)(request);
 }catch{return Response.json({error:'Armazenamento indisponível. Verifique o deploy da Netlify e tente novamente.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
export const config={path:'/api/*'};
