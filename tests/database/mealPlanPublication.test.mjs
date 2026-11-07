import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from '../../scripts/schema.mjs';
let db;const id=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function asUser(uid,action){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('SET ROLE authenticated');try{return await action();}finally{await db.exec('RESET ROLE');}}
const data={appliedTarget:2100,days:[{label:'Daily',meals:[{name:'Lunch',items:[{foodId:id(10),servings:1.5}]}]}]};
const publish=(op=id(30),assignment=id(31),expected=data,recipient=id(3),caller=id(1),claimed=caller,start='2026-11-07')=>asUser(caller,()=>db.query('SELECT publish_meal_plan($1,$2,$3,$4,$5,$6,$7::jsonb) AS id',[op,assignment,claimed,id(20),recipient,start,JSON.stringify(expected)]));
const read=(uid,date='2026-11-07',claimed=uid)=>asUser(uid,async()=>(await db.query('SELECT get_current_meal_plan($1,$2) AS plan',[claimed,date])).rows[0].plan);
before(async()=>{
  db=await createSchema();await db.exec("INSERT INTO coach_allowlist(email) VALUES ('plan-a@test.invalid'),('plan-b@test.invalid')");
  for(const [n,email,role] of [[1,'plan-a','coach'],[2,'plan-b','coach'],[3,'plan-client','trainee'],[4,'plan-other','trainee']])await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)',[id(n),`${email}@test.invalid`,JSON.stringify({role})]);
  await asUser(id(3),()=>db.query('SELECT claim_coach_by_id($1)',[id(1)]));await asUser(id(4),()=>db.query('SELECT claim_coach_by_id($1)',[id(2)]));
  await db.query("INSERT INTO foods(id,coach_id,name,serving_size,calories,protein_g,carbs_g,fat_g) VALUES ($1,$2,'Rice','100g',200,3.25,40,1)",[id(10),id(1)]);
  await db.query("INSERT INTO meal_plans(id,coach_id,client_id,name,data) VALUES ($1,$2,$3,'Daily plan',$4::jsonb)",[id(20),id(1),id(3),JSON.stringify(data)]);
},{timeout:90000});
after(async()=>db?.close());
test('publishes ordered food snapshots, repeats exact receipt and preserves values after catalog edits',async()=>{
  assert.equal((await publish()).rows[0].id,id(31));assert.equal((await publish()).rows[0].id,id(31));
  const plan=await read(id(3));assert.equal(plan.id,id(31));assert.equal(plan.snapshot.target_calories,2100);
  assert.deepEqual(plan.snapshot.days[0].meals[0].items[0],{food_id:id(10),name:'Rice',serving_size:'100g',servings:1.5,protein_g:4.9,carbs_g:60,fat_g:1.5,calories:300});
  assert.equal(plan.source_data,undefined);
  await db.query('UPDATE foods SET calories=999 WHERE id=$1',[id(10)]);assert.equal((await read(id(3))).snapshot.days[0].calories,300);
  await assert.rejects(publish(id(30),id(32)),/different content/);
  await assert.rejects(asUser(id(3),()=>db.query('UPDATE meal_plan_assignments SET name=$1 WHERE id=$2',['Forged',id(31)])),/permission denied/);
});
test('rejects unrelated recipients, foreign coaches, stale draft and invalid quantities without publication',async()=>{
  await assert.rejects(publish(id(40),id(41),data,id(4)),/not currently linked/);
  await assert.rejects(publish(id(40),id(41),data,id(3),id(2)),/not currently linked/);
  await assert.rejects(publish(id(40),id(41),data,id(3),id(1),id(2)),/Authenticated coach/);
  await assert.rejects(publish(id(40),id(41),{...data,appliedTarget:2200}),/Draft changed/);
  const invalid={...data,days:[{label:'Day',meals:[{name:'Meal',items:[{foodId:id(10),servings:-1}]}]}]};
  await db.query('UPDATE meal_plans SET data=$1::jsonb WHERE id=$2',[JSON.stringify(invalid),id(20)]);
  await assert.rejects(publish(id(40),id(41),invalid),/Servings/);
  assert.equal((await db.query('SELECT id FROM meal_plan_assignments WHERE id=$1',[id(41)])).rows.length,0);
  await db.query('UPDATE meal_plans SET data=$1::jsonb WHERE id=$2',[JSON.stringify(data),id(20)]);
});
test('selects dated publications, denies another trainee, and removes former-coach current-plan access',async()=>{
  assert.equal(await read(id(3),'2026-11-06'),null);
  await publish(id(50),id(51),data,id(3),id(1),id(1),'2026-11-10');
  assert.equal((await read(id(3),'2026-11-09')).id,id(31));assert.equal((await read(id(3),'2026-11-10')).id,id(51));
  assert.equal(await read(id(4)),null);await assert.rejects(read(id(4),'2026-11-07',id(3)),/Owning trainee/);
  assert.equal((await asUser(id(2),()=>db.query('SELECT id FROM meal_plan_assignments'))).rows.length,0);
  await assert.rejects(asUser(id(3),()=>db.query('SELECT source_data FROM meal_plan_assignments')),/permission denied/);
  await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[id(2),id(3)]);
  assert.equal(await read(id(3)),null);assert.equal((await asUser(id(1),()=>db.query('SELECT id FROM meal_plan_assignments'))).rows.length,0);
  assert.equal((await asUser(id(3),()=>db.query('SELECT id FROM meal_plan_assignments'))).rows.length,2);
});
