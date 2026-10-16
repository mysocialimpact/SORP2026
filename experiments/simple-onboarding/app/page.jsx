import {Suspense} from 'react';
import {Onboarding} from '../../../src/features/onboarding/onboarding';
export default function Page(){return <><aside style={{padding:'10px',textAlign:'center',background:'#fff3d5',fontSize:13}}>ISOLATED PREVIEW · Use your own details. Accounts are mocked; no account emails are sent and no production account is created.</aside><Suspense fallback={<p>Opening your introduction…</p>}><Onboarding isolatedPreview /></Suspense></>}
