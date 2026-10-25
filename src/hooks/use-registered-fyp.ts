'use client';
import { useEffect, useState } from 'react';
import type { SaoVietPersonalRow } from '@/lib/contest-registered-fyp';
let cached: {at:number;rows:SaoVietPersonalRow[]} | null = null;
let pending: Promise<SaoVietPersonalRow[]> | null = null;
function loadRows(): Promise<SaoVietPersonalRow[]> {
  if (cached && Date.now()-cached.at<60_000) return Promise.resolve(cached.rows);
  if (!pending) pending = fetch('/api/saoviet-data?program=ca-nhan',{cache:'no-store'}).then(async r=>{
    if(!r.ok)throw Error('Không tải được FYP Sao Việt toàn chặng cá nhân.');
    const rows=await r.json();if(!Array.isArray(rows))throw Error('Nguồn FYP Sao Việt không hợp lệ.');
    cached={at:Date.now(),rows};return rows;
  }).finally(()=>{pending=null;});
  return pending;
}
export function useRegisteredFyp(enabled=true) {
  const [state,setState]=useState<{rows:SaoVietPersonalRow[]|null;loading:boolean;error:string}>({rows:null,loading:enabled,error:''});
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    const refresh=()=>{setState(s=>({...s,loading:true}));void loadRows().then(rows=>{if(active)setState({rows,loading:false,error:''});}).catch(e=>{if(active)setState({rows:null,loading:false,error:String((e as Error).message)});});};
    refresh();const timer=setInterval(refresh,60_000);return()=>{active=false;clearInterval(timer);};
  },[enabled]);
  return state;
}
