'use client';
import { useEffect, useState } from 'react';
import { RegisteredTargetResults } from '@/components/registered-target-contest';
import { defaultRegisteredProgram } from '@/lib/contest-registered-targets';
import { parseContestConfig, type Contract } from '@/lib/contest-calculator';
const program = { ...defaultRegisteredProgram(), hideNotAchieved: true, rows: ['A','B','C'].map((code,i)=>({code,name:['Mẫu đã đạt','Mẫu chờ Sao Việt','Mẫu chưa đạt'][i],group:'Nhóm mẫu',stt:String(i+1),position:'',target:100_000_000,classification:(i+1) as 1|2|3})), tiers:[1,2,3].map(classification=>({id:String(classification),classification:classification as 1|2|3,minPercent:100,type:'money' as const,amount:1_000_000,text:''})) };
const contracts = ['A','B','C'].map((agentCode,i)=>({id:agentCode,contractNumber:agentCode,agentCode,agentName:agentCode,effectiveDate:'2026-10-10',issueDate:'2026-10-10',pdt10DT:[120_000_000,100_000_000,50_000_000][i],afyp:0})) as Contract[];
export default function QA() {
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const original=window.fetch;
    const read=()=>JSON.parse(sessionStorage.getItem('qa-approvals')||'["A"]');
    window.fetch=async(input,init)=>{
      const url=String(input);
      if(url.includes('/api/admin/session'))return Response.json({authenticated:true});
      if(url.includes('/api/saoviet-data'))return Response.json(['A','B','C'].map(agentCode=>({agentCode,fyp:400_000_000})));
      if(url.includes('/api/contest-approvals')){
        if(init?.method==='PATCH'){const body=JSON.parse(String(init.body));const codes=read().filter((code:string)=>code!==body.code);if(body.approved)codes.push(body.code);sessionStorage.setItem('qa-approvals',JSON.stringify(codes));return Response.json(body);}
        return Response.json({approvedCodes:read()});
      }
      if(url.startsWith('/api/'))return Response.json(url.includes('settings')?{}:[]);
      return original(input,init);
    };
    setReady(true);return()=>{window.fetch=original;};
  },[]);
  return ready?<main className="relative z-10 p-4"><RegisteredTargetResults program={program} contracts={contracts} config={parseContestConfig({id:'qa-fixture',startDate:'2026-10-01',endDate:'2026-10-31'})} title="KIỂM TRA BẢNG MỤC TIÊU — DỮ LIỆU MẪU"/></main>:null;
}
