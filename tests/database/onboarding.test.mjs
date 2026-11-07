import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchema } from '../../scripts/schema.mjs';

let db;
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const coach=id(1), other=id(2), client=id(3), stranger=id(4), invite=id(10);
async function asUser(user, action, role='authenticated') {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); } finally { await db.exec('RESET ROLE'); }
}
const rpc=async(user,sql,args=[])=>asUser(user,async()=>(await db.query(sql,args)).rows[0].result);
const get=user=>rpc(user,'SELECT get_client_onboarding($1) AS result',[invite]);
const save=(user,draft,revision,answers)=>rpc(user,'SELECT save_client_onboarding($1,$2,$3::jsonb) AS result',[draft,revision,JSON.stringify(answers)]);
const complete=(user,draft,op,revision)=>rpc(user,'SELECT complete_client_onboarding($1,$2,$3) AS result',[draft,op,revision]);
before(async()=>{
  db=await createSchema();
  await db.exec("INSERT INTO coach_allowlist(email) VALUES ('onboard-a@test.invalid'),('onboard-b@test.invalid')");
  for(const [uid,email,role] of [[coach,'onboard-a','coach'],[other,'onboard-b','coach'],[client,'onboard-client','trainee'],[stranger,'onboard-stranger','trainee']])
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)',[uid,`${email}@test.invalid`,JSON.stringify({role})]);
  await db.query("INSERT INTO client_invites(id,coach_id,screens_config) VALUES ($1,$2,'[{\"k\":\"weight\",\"e\":true}]')",[invite,coach]);
},{timeout:90000});
after(async()=>{await db?.close();});

test('draft saves are recoverable, owned, bounded and revision checked',async()=>{
  const draft=await get(client);
  assert.equal(draft.coach_id,coach);
  assert.deepEqual(draft.form_config.map(x=>x.k),['name','email','weight']);
  assert.equal((await get(client)).id,draft.id);
  await assert.rejects(asUser(client,()=>db.query('SELECT * FROM client_onboarding_drafts')),/permission denied/);
  await assert.rejects(save(stranger,draft.id,0,{}),/Draft unavailable/);
  await assert.rejects(save(client,draft.id,0,{unexpected:'value'}),/Unknown|enabled|Unsupported/i);
  const answers={name:'A Client',email:'client@test.invalid',weight:'bad'};
  assert.equal((await save(client,draft.id,0,answers)).revision,1);
  assert.equal((await save(client,draft.id,0,answers)).revision,1);
  await assert.rejects(save(client,draft.id,0,{...answers,name:'Stale'}),/changed/);
  await assert.rejects(complete(client,draft.id,id(20),1));
  assert.equal((await db.query('SELECT coach_id FROM profiles WHERE id=$1',[client])).rows[0].coach_id,null);
  assert.equal((await db.query('SELECT id FROM onboarding_responses WHERE trainee_id=$1',[client])).rows.length,0);
});

test('completion atomically links, names and submits once with an exact receipt',async()=>{
  const draft=await get(client);
  await save(client,draft.id,1,{name:'A Client',email:'client@test.invalid',weight:'75'});
  const response=await complete(client,draft.id,id(21),2);
  assert.equal(await complete(client,draft.id,id(21),2),response);
  await assert.rejects(complete(client,draft.id,id(22),2),/Already submitted/);
  await assert.rejects(complete(stranger,draft.id,id(21),2),/Draft unavailable/);
  const profile=(await db.query('SELECT first_name,last_name,coach_id FROM profiles WHERE id=$1',[client])).rows[0];
  assert.deepEqual(profile,{first_name:'A',last_name:'Client',coach_id:coach});
  assert.equal((await get(client)).submitted_response_id,response);
  await assert.rejects(save(client,draft.id,2,{}),/Already submitted/);
  const own=await asUser(coach,()=>db.query('SELECT id FROM onboarding_responses WHERE id=$1',[response]));
  assert.equal(own.rows.length,1);
  assert.equal((await asUser(other,()=>db.query('SELECT id FROM onboarding_responses WHERE id=$1',[response]))).rows.length,0);
  await assert.rejects(rpc(other,'SELECT review_client_onboarding($1) AS result',[response]),/unavailable/);
  const reviewed=await rpc(coach,'SELECT review_client_onboarding($1) AS result',[response]);
  assert.deepEqual(await rpc(coach,'SELECT review_client_onboarding($1) AS result',[response]),reviewed);
  await db.query("UPDATE client_invites SET status='revoked',revoked_at=now() WHERE id=$1",[invite]);
  assert.equal(await complete(client,draft.id,id(21),2),response);
  assert.equal((await get(client)).submitted_response_id,response);
  await assert.rejects(get(stranger),/unavailable/);
});

test('rejects revoked, foreign, coach and anonymous submissions and forged legacy coach',async()=>{
  await assert.rejects(get(coach),/client account/i);
  await assert.rejects(asUser(null,()=>db.query('SELECT get_client_onboarding($1)',[invite]),'anon'),/permission denied/);
  await assert.rejects(asUser(client,()=>db.query('INSERT INTO onboarding_responses(trainee_id,coach_id,answers) VALUES ($1,$2,$3)',[client,other,{}])),/row-level security/);
  await assert.rejects(asUser(client,()=>db.query('INSERT INTO onboarding_responses(trainee_id,coach_id,answers,reviewed_at) VALUES ($1,$2,$3,now())',[client,coach,{}])),/row-level security/);
  await assert.rejects(asUser(client,()=>db.query('INSERT INTO onboarding_responses(trainee_id,coach_id,answers,invite_id) VALUES ($1,$2,$3,$4)',[client,coach,{},invite])),/row-level security/);
});

test('revocation blocks an incomplete draft without linking the client',async()=>{
  const activeInvite=id(11);
  await db.query("INSERT INTO client_invites(id,coach_id,screens_config) VALUES ($1,$2,'[]')",[activeInvite,coach]);
  const draft=await rpc(stranger,'SELECT get_client_onboarding($1) AS result',[activeInvite]);
  await save(stranger,draft.id,0,{name:'Other Client',email:'other@test.invalid'});
  await db.query("UPDATE client_invites SET status='revoked',revoked_at=now() WHERE id=$1",[activeInvite]);
  await assert.rejects(save(stranger,draft.id,1,{name:'Changed'}),/unavailable/);
  await assert.rejects(complete(stranger,draft.id,id(30),1),/unavailable/);
  assert.equal((await db.query('SELECT coach_id FROM profiles WHERE id=$1',[stranger])).rows[0].coach_id,null);
});

test('server validates the frozen enabled form and rolls back invalid completions',async()=>{
  const activeInvite=id(12);
  await db.query("INSERT INTO client_invites(id,coach_id,screens_config) VALUES ($1,$2,$3::jsonb)",[activeInvite,coach,JSON.stringify(['dob','height','daily-macros','current-goal'].map(k=>({k,e:true})))]);
  const draft=await rpc(stranger,'SELECT get_client_onboarding($1) AS result',[activeInvite]);
  await db.query("UPDATE client_invites SET screens_config='[]' WHERE id=$1",[activeInvite]);
  assert.equal((await rpc(stranger,'SELECT get_client_onboarding($1) AS result',[activeInvite])).form_config.length,6);
  const valid={name:'Other Client',email:'other@test.invalid',dob:{month:'Jan',day:'2',year:'2000'},height:"5'10",'daily-macros':{protein:'120',carbs:'150',fat:'50'},'current-goal':['General fitness']};
  let revision=0;
  for(const invalid of [{...valid,name:''},{...valid,email:'bad'},{...valid,dob:{month:'Feb',day:'30',year:'2000'}},{...valid,height:"5'99"},{...valid,'daily-macros':{protein:'NaN',carbs:'2',fat:'3'}},{...valid,'current-goal':['Unknown']},{...valid,name:'X'.repeat(101)}]) {
    await save(stranger,draft.id,revision,invalid); revision++;
    await assert.rejects(complete(stranger,draft.id,id(40),revision));
    assert.equal((await db.query('SELECT coach_id FROM profiles WHERE id=$1',[stranger])).rows[0].coach_id,null);
  }
  await assert.rejects(save(stranger,draft.id,revision,{name:'x'.repeat(4001)}),/oversized/);
  await save(stranger,draft.id,revision,valid); revision++;
  // A reused receipt ID from another client must roll back relationship/name writes.
  await assert.rejects(complete(stranger,draft.id,id(21),revision),/unique constraint/);
  assert.equal((await db.query('SELECT coach_id FROM profiles WHERE id=$1',[stranger])).rows[0].coach_id,null);
  await asUser(stranger,()=>db.query('SELECT claim_coach_by_id($1)',[other]));
  await assert.rejects(complete(stranger,draft.id,id(41),revision),/different coach/);
});
