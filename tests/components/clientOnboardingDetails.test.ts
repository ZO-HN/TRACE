import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { HookHarness, cleanup, deferred, settle } from '../hooks/hookHarness';
import ClientOnboardingDetails from '../../src/components/coach/ClientOnboardingDetails';
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), ...(await import('../hooks/hookHarness')).reactHooks }));
vi.mock('../../src/components/ui/shadcn/dialog',()=>({Dialog:'dialog',DialogContent:'article',DialogHeader:'header',DialogTitle:'h1',DialogDescription:'p'}));
const api=vi.hoisted(()=>({read:vi.fn(),rpc:vi.fn(),eq:vi.fn(),range:vi.fn()}));
vi.mock('../../src/lib/supabase',()=>({supabase:{rpc:(...args:unknown[])=>api.rpc(...args),from:()=>{
  const q={select:()=>q,eq:(...args:unknown[])=>{api.eq(...args);return q;},order:()=>q,range:(...args:unknown[])=>{api.range(...args);return api.read();}};return q;
}}}));
type Element=ReactElement<Record<string,any>>;
function nodes(v:any):Element[]{return Array.isArray(v)?v.flatMap(nodes):v?.props?[v,...nodes(v.props.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v?.props?text(v.props.children):typeof v==='string'?v:'';}
function button(root:Element,label:string){return nodes(root).find(n=>n.type==='button'&&text(n).includes(label))!;}
const submission={id:'response',answers:{name:'Client','injuries':['None']},submitted_at:'2026-11-07T00:00:00Z',reviewed_at:null,reviewed_by:null};
beforeEach(()=>{api.read.mockReset().mockResolvedValue({data:[submission],error:null});api.rpc.mockReset().mockResolvedValue({data:'2026-11-07T01:00:00Z',error:null});api.eq.mockClear();api.range.mockClear();});
afterEach(cleanup);
it('loads only on open, scopes the client/coach, displays answers and marks reviewed once',async()=>{
  const hook=new HookHarness(()=>ClientOnboardingDetails({coachId:'coach',clientId:'client'}));await settle();expect(api.read).not.toHaveBeenCalled();
  button(hook.current,'Onboarding answers').props.onClick();await settle();
  expect(api.eq).toHaveBeenCalledWith('coach_id','coach');expect(api.eq).toHaveBeenCalledWith('trainee_id','client');expect(api.range).toHaveBeenCalledWith(0,19);
  expect(text(hook.current)).toContain('Client');expect(text(hook.current)).toContain('Injuries');
  const wait=deferred<{data:string,error:null}>();api.rpc.mockReturnValueOnce(wait.promise);
  const first=button(hook.current,'Mark reviewed').props.onClick();button(hook.current,'Mark reviewed').props.onClick();expect(api.rpc).toHaveBeenCalledTimes(1);
  wait.resolve({data:'2026-11-07T01:00:00Z',error:null});await first;await settle();expect(text(hook.current)).toContain('Reviewed');
});
it('retains a retryable read error and hides a late response after client change',async()=>{
  let clientId='client';const hook=new HookHarness(()=>ClientOnboardingDetails({coachId:'coach',clientId}));
  api.read.mockRejectedValueOnce(new Error('Offline'));button(hook.current,'Onboarding answers').props.onClick();await settle();expect(text(hook.current)).toContain('Offline');
  const wait=deferred<{data:unknown[],error:null}>();api.read.mockReturnValueOnce(wait.promise);button(hook.current,'Retry loading').props.onClick();await settle();
  clientId='other';api.read.mockResolvedValueOnce({data:[],error:null});hook.render();await settle();
  wait.resolve({data:[submission],error:null});await settle();expect(text(hook.current)).not.toContain('Submitted 11');expect(text(hook.current)).not.toContain('Mark reviewed');
});
