import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from '../../scripts/schema.mjs';
let db;const id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function asUser(uid,action){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');}}
const send=(message,content='Hello',caller=id(2),sender=caller,recipient=id(1))=>asUser(caller,async()=>(await db.query('SELECT send_direct_message($1,$2,$3,$4) AS result',[message,sender,recipient,content])).rows[0].result);
const page=(cursor,owner=id(2),caller=owner)=>asUser(caller,async()=>(await db.query('SELECT * FROM get_direct_messages_page($1,$2,$3,$4,50)',[owner,id(1),cursor?.created_at??null,cursor?.id??null])).rows);
before(async()=>{
 db=await createSchema();await db.exec("INSERT INTO coach_allowlist(email) VALUES ('dm-coach@test.invalid')");
 for(const [n,email]of[[1,'dm-coach'],[2,'dm-trainee'],[3,'dm-stranger']])await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id(n),`${email}@test.invalid`]);
 await asUser(id(2),()=>db.query('SELECT claim_coach_by_id($1)',[id(1)]));
},{timeout:90000});after(async()=>db?.close());
test('returns one send receipt after response loss and rejects changed/forged sends',async()=>{
 const first=await send(id(10));assert.equal(first.id,id(10));assert.deepEqual(await send(id(10)),first);
 await assert.rejects(send(id(10),'Different'),/different content/);
 await assert.rejects(send(id(11),'Hello',id(3),id(2)),/Authenticated sender/);
 await assert.rejects(send(id(11),'Hello',id(3)),/No active coaching/);
 await assert.rejects(send(id(11),'\n\t'),/1 to 4000/);
 await db.query('UPDATE profiles SET coach_id=NULL WHERE id=$1',[id(2)]);
 assert.deepEqual(await send(id(10)),first);await assert.rejects(send(id(11)),/No active coaching/);
 await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[id(1),id(2)]);
});
test('paginates beyond 200 tied timestamps exactly once, including null legacy dates, with owner isolation',async()=>{
 for(let n=0;n<225;n++)await db.query("INSERT INTO direct_messages(id,sender_id,recipient_id,content,created_at) VALUES($1,$2,$3,$4,'2026-11-07T00:00:00Z')",[id(100+n),id(2),id(1),`Message ${n}`]);
 await db.query("INSERT INTO direct_messages(id,sender_id,recipient_id,content,created_at) VALUES($1,$2,$3,'Legacy',NULL)",[id(500),id(2),id(1)]);
 let cursor;const seen=[];
 for(let iteration=0;iteration<10;iteration++){const rows=await page(cursor);seen.push(...rows.map(r=>r.id));if(rows.length<50)break;cursor=rows.at(-1);}
 assert.equal(seen.length,227);assert.equal(new Set(seen).size,227);assert.equal(seen.at(-1),id(500));
 await assert.rejects(page(undefined,id(2),id(3)),/Conversation owner/);
 const invisible=await asUser(id(3),()=>db.query('SELECT * FROM get_direct_messages_page($1,$2)',[id(3),id(1)]));assert.equal(invisible.rows.length,0);
});
