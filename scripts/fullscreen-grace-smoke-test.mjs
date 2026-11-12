import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
assert.equal(process.env.DATABASE_URL,'file:./dev.db');
const db=new PrismaClient();const origin='http://127.0.0.1:3018';const tag=randomUUID();let admin,quiz;const students=[];
async function call(path,body,cookie){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return {value,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
admin=await db.admin.create({data:{email:tag+'@example.test',passwordHash:'fixture',verifiedAt:new Date()}});
quiz=await db.quiz.create({data:{adminId:admin.id,title:'Fullscreen grace fixture',course:'Test',semester:'3',description:'',instructions:'',durationMinutes:10,totalMarks:1,published:true,requireFullscreen:true,detectTabSwitch:false,terminateOnTabSwitch:false,questions:{create:{text:'Select',marks:1,position:0,options:{create:{text:'Yes',correct:true,position:0}}}}},include:{questions:{include:{options:true}}}});
async function join(suffix){const roll=tag+suffix;students.push(roll);const joined=await call('/api/join/'+quiz.code,{name:'Grace test',rollNumber:roll,semester:'3'});return {path:'/api/attempt/'+joined.value.id,id:joined.value.id,cookie:joined.cookie};}
const a=await join('a');const question=quiz.questions[0];
await call(a.path,{type:'ANSWER',questionId:question.id,optionId:question.options[0].id},a.cookie);
const first=(await call(a.path,{type:'FULLSCREEN_EXIT'},a.cookie)).value;
assert.equal(first.status,'IN_PROGRESS');assert.ok(first.fullscreenDeadline>Date.now());
assert.equal((await call(a.path,{type:'FULLSCREEN_EXIT'},a.cookie)).value.fullscreenDeadline,first.fullscreenDeadline);
assert.equal((await call(a.path,undefined,a.cookie)).value.fullscreenDeadline,first.fullscreenDeadline);
assert.equal((await call(a.path,{type:'FULLSCREEN_RESTORED'},a.cookie)).value.status,'IN_PROGRESS');
assert.equal((await call(a.path,undefined,a.cookie)).value.fullscreenDeadline,null);
await call(a.path,{type:'FULLSCREEN_EXIT'},a.cookie);
assert.equal((await call(a.path,{type:'TAB_SWITCH'},a.cookie)).value.status,'TAB_SWITCH');
assert.equal((await db.quizAttempt.findUniqueOrThrow({where:{id:a.id}})).obtainedMarks,1);
const b=await join('b');await call(b.path,{type:'FULLSCREEN_EXIT'},b.cookie);
const stored=await db.quizAttempt.findUniqueOrThrow({where:{id:b.id}});const order=JSON.parse(stored.questionOrder);order.fullscreenDeadline=Date.now()-1;
await db.quizAttempt.update({where:{id:b.id},data:{questionOrder:JSON.stringify(order)}});
assert.equal((await call(b.path,{type:'FULLSCREEN_RESTORED'},b.cookie)).value.status,'FULLSCREEN_EXIT');
assert.equal((await call(b.path,undefined,b.cookie)).value.phase,'closed');
console.log('Passed: five-second grace, unchanged deadline on repeat/refresh, recovery, forced tab-switch termination, deadline expiry, and score preservation.');
}finally{
if(quiz){await db.studentAnswer.deleteMany({where:{attempt:{quizId:quiz.id}}});await db.violation.deleteMany({where:{attempt:{quizId:quiz.id}}});await db.quizAttempt.deleteMany({where:{quizId:quiz.id}});await db.quiz.delete({where:{id:quiz.id}});}
await db.student.deleteMany({where:{rollNumber:{in:students.map(s=>s.toUpperCase())}}});if(admin)await db.admin.delete({where:{id:admin.id}});await db.$disconnect();}
