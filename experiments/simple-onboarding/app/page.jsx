import {Suspense} from 'react';
import {Onboarding} from '../../../src/features/onboarding/onboarding';
export default function Page(){return <><aside style={{padding:'10px',textAlign:'center',background:'#fff3d5',fontSize:13}}>ISOLATED PREVIEW · Use synthetic details and an email ending .invalid. Accounts are mock accounts; no production sign-in or research.</aside><Suspense fallback={<p>Opening your introduction…</p>}><Onboarding isolatedPreview /></Suspense></>}
