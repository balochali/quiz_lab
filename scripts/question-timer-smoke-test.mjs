import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
assert.equal(process.env.DATABASE_URL, 'file:./dev.db', 'Use only the local test database');
const db = new PrismaClient();
const origin = 'http://127.0.0.1:3018';
const tag = randomUUID();
let admin, quiz, studentId;
try {
 admin = await db.admin.create({data:{email:tag+'@example.test',passwordHash:'fixture',verifiedAt:new Date()}});
 quiz = await db.quiz.create({data:{adminId:admin.id,title:'Timer fixture',course:'Test',semester:'1',description:'',instructions:'',durationMinutes:10,totalMarks:2,published:true,questions:{create:[{text:'Timed',marks:1,position:0,durationSeconds:2,options:{create:{text:'Yes',correct:true,position:0}}},{text:'Legacy',marks:1,position:1,options:{create:{text:'Yes',correct:true,position:0}}}]}},include:{questions:{orderBy:{position:'asc'},include:{options:true}}}});
 const join=await fetch(origin+'/api/join/'+quiz.code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Timer',rollNumber:tag,semester:'3'})});
 assert.equal(join.status,200);const {id}=await join.json();const cookie=join.headers.get('set-cookie').split(';')[0];
 studentId=(await db.quizAttempt.findUniqueOrThrow({where:{id}})).studentId;
 async function send(body){const r=await fetch(origin+'/api/attempt/'+id,{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json();}
 const q=quiz.questions[0];const answer={type:'ANSWER',questionId:q.id,optionId:q.options[0].id};
 assert.match((await send(answer)).error,/locked/);
 const opened=await send({type:'QUESTION_OPEN',questionId:q.id});assert.ok(opened.deadline);
 assert.equal((await send(answer)).status,'IN_PROGRESS');
 assert.equal((await send({type:'QUESTION_OPEN',questionId:q.id})).deadline,opened.deadline);
 await new Promise(resolve=>setTimeout(resolve,2200));
 assert.match((await send(answer)).error,/locked/);
 const legacy=quiz.questions[1];assert.equal((await send({type:'ANSWER',questionId:legacy.id,optionId:legacy.options[0].id})).status,'IN_PROGRESS');
 assert.equal(await db.studentAnswer.count({where:{attemptId:id}}),2);
 console.log('Passed: unopened rejection, timed saving, immutable deadline, late-answer lock, saved-answer preservation, legacy untimed answers.');
} finally {
 if(quiz){const where={attempt:{quizId:quiz.id}};await db.studentAnswer.deleteMany({where});await db.violation.deleteMany({where});await db.quizAttempt.deleteMany({where:{quizId:quiz.id}});await db.quiz.delete({where:{id:quiz.id}});}
 if(studentId)await db.student.delete({where:{id:studentId}});
 if(admin)await db.admin.delete({where:{id:admin.id}});
 await db.$disconnect();
}
