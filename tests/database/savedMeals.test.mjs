import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from '../../scripts/schema.mjs';
let db;const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function user(uid,action){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');}}
const foods=()=>[{id:id(10),name:'Rice',protein_g:2.25,carbs_g:40,fat_g:null,calories:200},{id:id(11),name:'Chicken',protein_g:30,carbs_g:0,fat_g:5,calories:190}];
const save=(op,template,items=foods(),caller=id(1),claimed=caller)=>user(caller,()=>db.query('SELECT save_personal_meal($1,$2,$3,$4,$5::jsonb) AS id',[op,template,claimed,'Lunch',JSON.stringify(items)]));
before(async()=>{db=await createSchema();for(const n of [1,2])await db.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)',[id(n),`meal-${n}@test.invalid`]);},{timeout:90000});
after(async()=>db?.close());
test('commits ordered snapshot once and replays exactly; different content/ownership rejected',async()=>{
  assert.equal((await save(id(20),id(21))).rows[0].id,id(21));
  assert.equal((await save(id(20),id(21))).rows[0].id,id(21));
  assert.deepEqual((await user(id(1),()=>db.query('SELECT name,"order" FROM meal_template_items WHERE meal_template_id=$1 ORDER BY "order"',[id(21)]))).rows,[{name:'Rice',order:0},{name:'Chicken',order:1}]);
  await assert.rejects(save(id(20),id(21),[{...foods()[0],calories:99}]),/different/);
  await assert.rejects(save(id(20),id(21),foods(),id(2)),/different/);
  await assert.rejects(save(id(22),id(23),foods(),id(2),id(1)),/Matching trainee/);
  assert.equal((await user(id(2),()=>db.query('SELECT * FROM meal_templates'))).rows.length,0);
  await assert.rejects(user(id(1),()=>db.query('SELECT * FROM meal_save_operations')),/permission denied/);
});
test('bad child insert rolls back parent, all items and receipt, preserving retry identities',async()=>{
  await assert.rejects(save(id(30),id(31),[{...foods()[0],id:id(40)},{...foods()[1],id:id(40)}]),/unique constraint/);
  assert.equal((await db.query('SELECT * FROM meal_templates WHERE id=$1',[id(31)])).rows.length,0);
  assert.equal((await db.query('SELECT * FROM meal_save_operations WHERE operation_id=$1',[id(30)])).rows.length,0);
  assert.equal((await save(id(30),id(31),foods().map((item,n)=>({...item,id:id(41+n)})))).rows[0].id,id(31));
});
test('rejects invalid precision and bounds, and cannot recreate a deleted meal via its receipt',async()=>{
  for(const override of [{calories:1.5},{protein_g:-1},{protein_g:10000},{fat_g:0.001},{name:''}])await assert.rejects(save(id(50),id(51),[{...foods()[0],...override}]));
  await user(id(1),()=>db.query('DELETE FROM meal_templates WHERE id=$1',[id(21)]));
  await assert.rejects(save(id(20),id(21)),/no longer available/);
});
