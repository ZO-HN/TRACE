import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from '../../scripts/schema.mjs';
let db;
const id=n=>`83000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),coach=id(2),other=id(3);
const rows=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function as(user,fn,role='authenticated'){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec(`SET ROLE ${role}`);try{return await fn();}finally{await db.exec('RESET ROLE');}}
const register=(op,kind='progress-photo',type='image/jpeg',size=100,user=owner)=>as(null,()=>rows('SELECT register_media_upload($1,$2,$3,$4,$5) AS key',[user,id(op),kind,type,size]),'service_role').then(r=>r[0].key);
const ready=(key,canonical=key,size=100,type='image/jpeg',etag='"verified"')=>as(null,()=>rows('SELECT mark_media_ready($1,$2,$3,$4,$5) AS key',[key,canonical,size,type,etag]),'service_role').then(r=>r[0].key);
before(async()=>{
  db=await createSchema();for(const [uid,email] of [[owner,'final-owner'],[coach,'final-coach'],[other,'final-other']])await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[uid,`${email}@test.invalid`]);
  await db.query("UPDATE profiles SET role='coach' WHERE id=$1",[coach]);await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[coach,owner]);
},{timeout:90000});after(async()=>db?.close());
test('service-issued V2 manifests replay exactly and clients cannot register, verify or read raw objects',async()=>{
  const key=await register(10);assert.equal(await register(10),key);await assert.rejects(register(10,'progress-photo','image/jpeg',101),/different content/);
  await assert.rejects(register(11,'progress-photo','application/pdf'),/Invalid media/);await assert.rejects(register(12,'progress-photo','image/jpeg',11*1024*1024),/Invalid media/);
  await as(owner,async()=>{
    await assert.rejects(db.query('SELECT register_media_upload($1,$2,$3,$4,$5)',[owner,id(13),'progress-photo','image/jpeg',100]),/permission denied/);
    await assert.rejects(db.query('SELECT mark_media_ready($1,$1,100,$2,$3)',[key,'image/jpeg','"fake"']),/permission denied/);
    await assert.rejects(db.query('UPDATE media_objects SET state=\'ready\''),/permission denied/);
    assert.equal((await rows('SELECT can_access_media_identity($1) AS allowed',[key]))[0].allowed,true);
    assert.equal((await rows('SELECT can_view_media($1) AS allowed',[key]))[0].allowed,false);
    await assert.rejects(db.query('INSERT INTO progress_photos(id,user_id,taken_date,photo_s3_key) VALUES($1,$2,$3,$4)',[id(14),owner,'2026-11-08',key]),/Verify or reupload/);
  });
});
test('readiness binds actual type/size/canonical identity and immutable verified metadata before attachment',async()=>{
  const key=await register(20);for(const [canonical,size,type] of [[`${key}other`,100,'image/jpeg'],[key,99,'image/jpeg'],[key,100,'image/png']])await assert.rejects(ready(key,canonical,size,type),/does not match/);
  assert.equal(await ready(key),key);assert.equal(await ready(key),key);await assert.rejects(ready(key,key,100,'image/jpeg','"changed"'),/cannot be rebound/);
  await as(owner,async()=>{
    await db.query('INSERT INTO progress_photos(id,user_id,taken_date,photo_s3_key) VALUES($1,$2,$3,$4)',[id(21),owner,'2026-11-08',key]);
    assert.equal((await rows('SELECT can_view_media($1) AS allowed',[key]))[0].allowed,true);
  });
  for(const user of [coach,other])await as(user,async()=>assert.equal((await rows('SELECT can_view_media($1) AS allowed',[key]))[0].allowed,false));
  const foreign=await register(22,'progress-photo','image/jpeg',100,other);await ready(foreign);
  await as(owner,()=>assert.rejects(db.query('UPDATE progress_photos SET photo_s3_key=$1 WHERE id=$2',[foreign,id(21)]),/Media is unregistered or unavailable/));
});
test('issued V1 references remain compatible but require a deterministic sealed copy to view; legacy unknown ownership remains denied',async()=>{
  const key=`coach-image/${owner}/old.png`;
  await as(null,()=>db.query('INSERT INTO media_objects(object_key,owner_id,kind,content_type,declared_size_bytes) VALUES($1,$2,$3,$4,100)',[key,owner,'coach-image','image/png']),'service_role');
  await as(owner,async()=>{
    await db.query('UPDATE profiles SET avatar_key=$1 WHERE id=$2',[key,owner]);
    assert.equal((await rows('SELECT can_access_media_identity($1) AS allowed',[key]))[0].allowed,true);
    assert.equal((await rows('SELECT can_view_media($1) AS allowed',[key]))[0].allowed,false);
  });
  await assert.rejects(ready(key,key,100,'image/png'),/does not match/);
  const sealed=(await rows("SELECT 'sealed/'||encode(sha256(convert_to($1,'UTF8')),'hex') AS key",[key]))[0].key;
  assert.equal(await ready(key,sealed,100,'image/png'),sealed);
  await as(owner,async()=>{assert.equal((await rows('SELECT can_view_media($1) AS allowed',[key]))[0].allowed,true);
    assert.equal((await rows('SELECT can_access_media_identity($1) AS allowed',[`coach-image/${owner}/unregistered.png`]))[0].allowed,false);
    assert.equal((await rows('SELECT can_view_media($1) AS allowed',[`coach-image/${owner}/unregistered.png`]))[0].allowed,false);});
});

test('photo receipts recover exactly without duplicating or reverting corrections, and do not resurrect removed rows',async()=>{
  const key=await register(30);await ready(key);
  const save=()=>rows('SELECT save_progress_photo($1,$2,$3,$4) AS id',[id(31),owner,key,'2026-11-08']);
  await as(other,()=>assert.rejects(save(),/owning trainee/));
  await as(owner,async()=>{
    assert.equal((await save())[0].id,id(31));assert.equal((await save())[0].id,id(31));
    await assert.rejects(rows('SELECT save_progress_photo($1,$2,$3,$4)',[id(31),owner,key,'2026-11-09']),/different content/);
    assert.equal((await rows('SELECT count(*)::int AS n FROM progress_photos WHERE id=$1',[id(31)]))[0].n,1);
  });
  await db.query('UPDATE progress_photos SET taken_date=$1,note=$2 WHERE id=$3',['2026-11-07','Corrected',id(31)]);
  await as(owner,save);assert.equal((await rows('SELECT note FROM progress_photos WHERE id=$1',[id(31)]))[0].note,'Corrected');
  await db.query('DELETE FROM progress_photos WHERE id=$1',[id(31)]);
  await as(owner,()=>assert.rejects(save(),/will not be recreated/));
});

test('form submission receipts preserve review and identity, reject forged replacement and permit exercise FK cleanup',async()=>{
  const key=await register(40,'form-video','video/mp4');await ready(key,key,100,'video/mp4');
  const unattached=await register(41,'form-video','video/mp4');await ready(unattached,unattached,100,'video/mp4');
  await db.query("INSERT INTO exercises(id,name,target_muscle_group) VALUES($1,'Review squat','Quads')",[id(42)]);
  const submit=()=>rows('SELECT submit_form_check($1,$2,$3,$4) AS id',[id(43),owner,key,id(42)]);
  await as(owner,submit);
  await as(coach,()=>db.query("UPDATE form_checks SET coach_notes='Keep the brace',status='reviewed' WHERE id=$1",[id(43)]));
  await as(owner,submit);
  assert.equal((await rows('SELECT coach_notes FROM form_checks WHERE id=$1',[id(43)]))[0].coach_notes,'Keep the brace');
  // Even if a future grant broadens UPDATE, the identity guard still rejects substitution.
  await db.exec('GRANT UPDATE(video_key,exercise_id) ON form_checks TO authenticated');
  await as(coach,()=>assert.rejects(db.query('UPDATE form_checks SET video_key=$1 WHERE id=$2',[unattached,id(43)]),/immutable/));
  await as(coach,()=>assert.rejects(db.query('UPDATE form_checks SET exercise_id=NULL WHERE id=$1',[id(43)]),/immutable/));
  await as(coach,()=>db.query('DELETE FROM exercises WHERE id=$1',[id(42)]));
  // Delete is RLS-scoped; superuser fixture cleanup exercises the FK path with an authenticated actor.
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[coach]);await db.query('DELETE FROM exercises WHERE id=$1',[id(42)]);
  assert.equal((await rows('SELECT exercise_id FROM form_checks WHERE id=$1',[id(43)]))[0].exercise_id,null);
  await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  await db.query('DELETE FROM form_checks WHERE id=$1',[id(43)]);
  await as(owner,()=>assert.rejects(submit(),/will not be recreated/));
  await db.exec('REVOKE UPDATE(video_key,exercise_id) ON form_checks FROM authenticated');
});

test('avatar receipts and expected-current checks prevent lost responses from overwriting a later avatar',async()=>{
  const a=await register(50,'coach-image'),b=await register(51,'coach-image'),c=await register(52,'coach-image');
  await ready(a);await ready(b);await ready(c);
  const old=(await rows('SELECT avatar_key FROM profiles WHERE id=$1',[owner]))[0].avatar_key;
  const apply=(op,key,expected)=>rows('SELECT set_verified_avatar($1,$2,$3,$4) AS id',[id(op),owner,key,expected]);
  await as(other,()=>assert.rejects(apply(53,a,old),/another account/));
  await as(owner,async()=>{
    await apply(53,a,old);await apply(54,b,a);await apply(53,a,old);
    assert.equal((await rows('SELECT avatar_key FROM profiles WHERE id=$1',[owner]))[0].avatar_key,b);
    await assert.rejects(apply(55,c,a),/Avatar changed/);
    await assert.rejects(apply(53,c,old),/different content/);
    await apply(55,c,b);
  });
});

test('check-in files require owning attachments and only the audited current coach gets new links',async()=>{
  const key=await register(60,'file');await ready(key);
  const hidden=await register(61,'file');await ready(hidden);
  await as(owner,()=>db.query('INSERT INTO check_ins(id,client_id,status,scheduled_for,responses) VALUES($1,$2,$3,$4,$5)',[id(62),owner,'submitted','2026-11-08',JSON.stringify({photo:{key}})]));
  await as(coach,async()=>{
    assert.equal((await rows('SELECT can_view_media($1) AS yes',[key]))[0].yes,true);
    assert.equal((await rows('SELECT can_view_media($1) AS yes',[hidden]))[0].yes,false);
    await db.query("UPDATE check_ins SET status='reviewed',coach_notes='Reviewed photo' WHERE id=$1",[id(62)]);
  });
  await db.exec('GRANT UPDATE(responses) ON check_ins TO authenticated');
  await as(coach,()=>assert.rejects(db.query('UPDATE check_ins SET responses=$1 WHERE id=$2',[JSON.stringify({photo:{key:hidden}}),id(62)]),/owning trainee/));
  await db.exec('REVOKE UPDATE(responses) ON check_ins FROM authenticated');
  await db.query("UPDATE profiles SET role='coach' WHERE id=$1",[other]);await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[other,owner]);
  for(const user of [coach,other])await as(user,async()=>assert.equal((await rows('SELECT can_view_media($1) AS yes',[key]))[0].yes,false));
  await as(owner,async()=>assert.equal((await rows('SELECT can_view_media($1) AS yes',[key]))[0].yes,true));
  await db.query('UPDATE profiles SET coach_id=$1 WHERE id=$2',[coach,owner]);
});
