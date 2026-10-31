const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function initialState(){
 const products=[];let n=0;
 const add=(name,category,price,description='')=>products.push({id:'p'+(++n),name,category,price,description,active:true,cost:null,mode:'manual',stock:0,min:0,recipe:[]});
 ['Carne','Queijo','Pizza','Misto','Palmito','Frango','Calabresa','Bauru'].forEach(x=>add(x,'Tradicionais',1000));
 [['Parmegiana','Carne, queijo e molho de tomate'],['Sambarilov','Carne com catupiry. Conferir grafia do nome.'],['Português','Queijo, presunto e ovos'],['Mineirinho','Queijo com purê de batata'],['Carioca','Carne com purê de batata'],['Caipira','Frango com catupiry'],['Sensação','Palmito com queijo']].forEach(([n,d])=>add(n,'Diferentes',1200,d));
 add('Pasteloco','Novidades',1500,'Carne louca, catupiry e queijo');add('Pastorro','Novidades',1500,'Salsicha, purê de batata, milho, queijo ralado e vinagrete');
 add('Especial de carne','Especiais',2000,'Carne, queijo, presunto e ovo');add('Especial de frango','Especiais',2000,'Frango, queijo, presunto e ovo');add('Super especial','Especiais',2000,'5 recheios à escolha. Registre as escolhas na observação.');
 ['Banana com chocolate','Banana','Goiabada com cream cheese','Chocolate'].forEach(x=>add(x,'Doces',1000));
 add('Açaí 300 ml','Açaí',1500,'3 adicionais');add('Açaí · tamanho a confirmar','Açaí',2000,'4 adicionais. Confirmar capacidade da opção de R$ 20.');add('Barca de açaí','Açaí',3000,'5 adicionais; capacidade a confirmar');
 ['Abacaxi com hortelã','Morango','Manga','Limão','Caju','Uva','Maracujá'].forEach(x=>{add('Suco de '+x.toLowerCase()+' · água','Sucos',1200,'550 ml');add('Suco de '+x.toLowerCase()+' · leite','Sucos',1500,'550 ml');});
 return {products,ingredients:[],sales:[],entries:[],movements:[],audit:[],requests:[],categories:['Tradicionais','Diferentes','Novidades','Especiais','Doces','Açaí','Sucos'],expenseCategories:['Ingredientes','Embalagens','Aluguel','Água','Energia','Gás','Manutenção','Retirada dos donos','Outros']};
}
const check=(condition,message)=>{if(!condition)throw new Error(message)};
const num=(v,min=0,max=1e9)=>{const n=Number(v);check(Number.isFinite(n)&&n>=min&&n<=max,'Valor ou quantidade inválida.');return n};
const money=v=>{const n=num(v,0,1e8);check(Number.isInteger(n),'Valor monetário inválido.');return n};
const str=(v,max=200)=>{check(typeof v==='string'&&v.trim().length>0&&v.length<=max,'Preencha os campos obrigatórios.');return v.trim()};
const date=v=>{check(/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,'Data inválida.');return v};
const round=v=>Math.round(v*1000)/1000;
export function applyAction(s,a,id,now=new Date().toISOString()){
 check(a&&typeof a.type==='string','Ação inválida.');
 if(s.requests.includes(id))return {duplicate:true};
 const log=(text)=>s.audit.unshift({id,at:now,text});
 const move=(kind,item,delta,reason)=>{item.stock=round(item.stock+delta);s.movements.unshift({id:uid(),at:now,kind,itemId:item.id,name:item.name,delta:round(delta),balance:item.stock,reason});};
 if(a.type==='product'){
 const old=s.products.find(p=>p.id===a.id);check(!a.id||old,'Produto não encontrado.');if(old)check(a.expected===JSON.stringify(old),'Este produto foi alterado em outra tela. Atualize e tente novamente.');
 const p={id:old?.id||uid(),name:str(a.name),category:str(a.category,60),price:money(a.price),cost:a.cost===null?null:money(a.cost),description:String(a.description||'').slice(0,800),mode:a.mode,active:a.active!==false,stock:old?.stock||0,min:num(a.min||0),recipe:[]};
 check(p.price>0,'O preço deve ser maior que zero.');check(p.mode!=='unit'||Number.isInteger(p.min),'O estoque mínimo por unidade deve ser inteiro.');check(['manual','unit','recipe'].includes(p.mode),'Tipo de estoque inválido.');
 if(p.mode==='recipe'){check(Array.isArray(a.recipe)&&a.recipe.length>0,'Adicione ao menos um ingrediente à receita.');const ids=new Set();p.recipe=a.recipe.map(r=>{check(s.ingredients.find(i=>i.id===r.id),'Ingrediente não encontrado.');check(!ids.has(r.id),'Ingrediente repetido na receita.');ids.add(r.id);const qty=num(r.qty,0.001);const ingredient=s.ingredients.find(i=>i.id===r.id);check(ingredient.unit!=='un'||Number.isInteger(qty),'Ingredientes em unidades exigem quantidades inteiras.');return {id:r.id,qty};});}
 if(old)s.products[s.products.indexOf(old)]=p;else s.products.push(p);if(!s.categories.includes(p.category))s.categories.push(p.category);log((old?'Produto atualizado: ':'Produto cadastrado: ')+p.name);
 }else if(a.type==='deleteProduct'){
 const p=s.products.find(p=>p.id===a.id);check(p,'Produto não encontrado.');if(s.sales.some(v=>v.items.some(i=>i.id===p.id))||s.movements.some(m=>m.itemId===p.id)){p.active=false;log('Produto desativado: '+p.name);}else{s.products=s.products.filter(x=>x.id!==p.id);log('Produto excluído: '+p.name);}
 }else if(a.type==='ingredient'){
 const old=s.ingredients.find(i=>i.id===a.id);check(!a.id||old,'Ingrediente não encontrado.');if(old)check(a.expected===JSON.stringify(old),'Ingrediente alterado. Atualize e tente novamente.');
 check(['un','g','ml'].includes(a.unit),'Unidade inválida.');check(!old||old.unit===a.unit,'A unidade de um ingrediente existente não pode ser alterada.');
 const item={id:old?.id||uid(),name:str(a.name),unit:a.unit,stock:old?.stock||0,min:num(a.min||0)};if(old)s.ingredients[s.ingredients.indexOf(old)]=item;else s.ingredients.push(item);log('Ingrediente salvo: '+item.name);
 }else if(a.type==='stock'){
 check(['ingredient','product'].includes(a.kind),'Tipo de item inválido.');const list=a.kind==='ingredient'?s.ingredients:s.products;const item=list.find(p=>p.id===a.id);check(item,'Item não encontrado.');check(a.kind==='ingredient'||item.mode==='unit','Este produto não controla estoque por unidade.');
 const qty=num(a.qty,a.operation==='adjust'?0:0.001);check(['add','loss','adjust'].includes(a.operation),'Movimentação inválida.');check((a.kind==='ingredient'&&item.unit!=='un')||Number.isInteger(qty),'Informe uma quantidade inteira de unidades.');const delta=a.operation==='loss'?-qty:a.operation==='adjust'?qty-item.stock:qty;check(item.stock+delta>=0,'Quantidade maior que o estoque disponível.');
 move(a.kind,item,delta,str(a.reason));if(a.expense){check(a.operation==='add','Vincule despesas apenas a reposições.');s.entries.unshift({id:uid(),kind:'out',description:'Compra: '+item.name,amount:money(a.expense),category:'Ingredientes',date:today(),payment:a.payment||'Pix',note:'Reposição de estoque',stockLinked:true,created:now,cancelled:false});}log('Estoque: '+item.name+' · '+a.reason);
 }else if(a.type==='sale'){
 check(Array.isArray(a.items)&&a.items.length>0&&a.items.length<=100,'Adicione produtos à venda.');const needs=new Map();
 const items=a.items.map(i=>{const p=s.products.find(p=>p.id===i.id&&p.active);check(p,'Produto indisponível.');check(p.price===i.price,'Um preço mudou. Atualize o pedido antes de confirmar.');const qty=num(i.qty,1,999);check(Number.isInteger(qty),'Quantidade de venda deve ser inteira.');
 const addNeed=(kind,key,n)=>{const k=kind+':'+key;const v=needs.get(k)||{kind,id:key,qty:0};v.qty+=n;needs.set(k,v);};
 if(p.mode==='unit')addNeed('product',p.id,qty);if(p.mode==='recipe')p.recipe.forEach(r=>addNeed('ingredient',r.id,r.qty*qty));return {id:p.id,name:p.name,price:p.price,qty,cost:p.cost,note:String(i.note||'').slice(0,400)};});
 const deductions=[...needs.values()];deductions.forEach(d=>{const item=(d.kind==='ingredient'?s.ingredients:s.products).find(x=>x.id===d.id);check(item&&round(item.stock-d.qty)>=0,'Estoque insuficiente: '+(item?.name||'item'));});
 const total=items.reduce((t,i)=>t+i.price*i.qty,0);check(total>0,'O total precisa ser maior que zero.');const payment=str(a.payment,50);check(['Pix','Dinheiro','Débito','Crédito','Outro'].includes(payment),'Pagamento inválido.');const received=payment==='Dinheiro'?money(a.received):total;check(received>=total,'Valor recebido menor que o total.');
 deductions.forEach(d=>move(d.kind,(d.kind==='ingredient'?s.ingredients:s.products).find(x=>x.id===d.id),-d.qty,'Venda #'+String(s.sales.length+1).padStart(4,'0')));
 s.sales.unshift({id,number:s.sales.length+1,at:now,date:today(),items,total,payment,received,change:received-total,note:String(a.note||'').slice(0,500),cancelled:false,deductions});log('Venda registrada · '+items.reduce((n,i)=>n+i.qty,0)+' itens');
 }else if(a.type==='cancelSale'){
 const sale=s.sales.find(v=>v.id===a.id);check(sale&&!sale.cancelled,'Venda não encontrada ou já cancelada.');sale.cancelled=true;sale.cancelReason=str(a.reason);sale.cancelledAt=now;sale.returnStock=!!a.returnStock;if(a.returnStock)sale.deductions.forEach(d=>{const item=(d.kind==='ingredient'?s.ingredients:s.products).find(i=>i.id===d.id);check(item,'Item de estoque não encontrado.');move(d.kind,item,d.qty,'Cancelamento da venda #'+sale.number);});log('Venda #'+sale.number+' cancelada: '+sale.cancelReason);
 }else if(a.type==='entry'){
 const old=s.entries.find(e=>e.id===a.id);check(!a.id||old&&!old.cancelled,'Lançamento não encontrado.');if(old)check(a.expected===JSON.stringify(old),'Lançamento alterado em outra tela. Atualize.');check(['in','out'].includes(a.kind),'Tipo inválido.');const amount=money(a.amount);check(amount>0,'Informe um valor maior que zero.');const e={id:old?.id||uid(),kind:a.kind,description:str(a.description),amount,category:str(a.category,60),date:date(a.date),payment:str(a.payment,50),note:String(a.note||'').slice(0,500),created:old?.created||now,updated:now,cancelled:false,stockLinked:old?.stockLinked||false};if(old)s.entries[s.entries.indexOf(old)]=e;else s.entries.unshift(e);if(e.kind==='out'&&!s.expenseCategories.includes(e.category))s.expenseCategories.push(e.category);log('Lançamento salvo: '+e.description);
 }else if(a.type==='cancelEntry'){
 const e=s.entries.find(e=>e.id===a.id);check(e&&!e.cancelled,'Lançamento já cancelado ou não encontrado.');e.cancelled=true;e.cancelReason=str(a.reason);log('Lançamento cancelado: '+e.description+' · '+a.reason);
 }else if(a.type==='category'){
 const key=a.kind==='expense'?'expenseCategories':'categories';const name=str(a.name,60);if(a.old){check(s[key].includes(a.old),'Categoria não encontrada.');check(!s[key].includes(name)||name===a.old,'Categoria já existe.');s[key]=s[key].map(c=>c===a.old?name:c);if(key==='categories')s.products.forEach(p=>{if(p.category===a.old)p.category=name;});}else{check(!s[key].includes(name),'Categoria já existe.');s[key].push(name);}log('Categoria salva: '+name);
 }else throw new Error('Ação desconhecida.');
 s.requests.push(id);return {ok:true};
}
