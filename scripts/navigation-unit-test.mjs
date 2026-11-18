import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const directory=mkdtempSync(resolve('scripts/.navigation-unit-'));
try {
 const mocks=`export const state={};
 export const cookieOptions={}; export const hashToken=x=>x;
 export const cookies=async()=>({get:()=>({value:'fixture-token'})});
 export const quizLinkClosed=()=>false; export const gradeAttempt=async()=>({obtainedMarks:0,gradingPending:false});
 const tx={quizAttempt:{updateMany:async()=>({count:1}),findUnique:async()=>structuredClone(state.attempt),update:async({data})=>Object.assign(state.attempt,data)},question:{findFirst:async({where})=>state.questions.find(q=>q.id===where.id)||null},option:{findFirst:async()=>({id:'option'})},studentAnswer:{upsert:async({create})=>{state.saved.push(create)},deleteMany:async()=>({count:0})}};
 export const db={$transaction:async cb=>cb(tx)};`;
 writeFileSync(join(directory,'mocks.mjs'),mocks);
 const source=readFileSync('src/lib/attempt.ts','utf8').replaceAll('"next/headers"','"./mocks.mjs"').replaceAll('"./auth"','"./mocks.mjs"').replaceAll('"./db"','"./mocks.mjs"').replaceAll('"./grading"','"./mocks.mjs"').replaceAll('"./quiz-schedule"','"./mocks.mjs"');
 writeFileSync(join(directory,'attempt.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 const {applyEvent}=await import(pathToFileURL(join(directory,'attempt.mjs')));
 const {state}=await import(pathToFileURL(join(directory,'mocks.mjs')));
 for(const nextOnly of [true,false])for(const timed of [true,false]) {
  state.attempt={id:'attempt',quizId:'quiz',status:'IN_PROGRESS',endsAt:new Date(Date.now()+600000),questionOrder:JSON.stringify({order:['q1','q2','q3'],optionOrders:{q1:[],q2:[],q3:[]}}),quiz:{nextOnly}};
  state.questions=['q1','q2','q3'].map(id=>({id,type:'MCQ',durationSeconds:timed?60:null}));state.saved=[];
  const open=id=>applyEvent('attempt',{type:'QUESTION_OPEN',questionId:id});
  assert.equal((await open('q1')).status,'IN_PROGRESS');
  assert.equal(!!(await open('q3')).error,nextOnly);
  assert.equal((await open('q2')).status,'IN_PROGRESS');
  assert.equal(JSON.parse(state.attempt.questionOrder).navigationPosition??0,nextOnly?1:0);
  assert.equal(!!(await open('q1')).error,nextOnly);
  const answer=await applyEvent('attempt',{type:'ANSWER',questionId:'q1',optionId:'option'});
  assert.equal(!!answer.error,nextOnly);
  assert.equal(state.saved.length,nextOnly?0:1);
  assert.equal((await open('q3')).status,'IN_PROGRESS');
  if(timed)assert.ok(JSON.parse(state.attempt.questionOrder).deadlines.q3);
 }
 console.log('Passed actual server event logic: timed/untimed navigation, forward-only progression, skipped/previous-question rejection, old-answer protection, persisted position and question deadlines.');
}finally{
 if(!directory.startsWith(resolve('scripts')+sep))throw new Error('Unexpected test directory');
 rmSync(directory,{recursive:true,force:true});
}
