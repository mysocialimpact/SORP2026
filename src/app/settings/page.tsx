import type {Metadata} from "next";
import {AccountSettings} from "@/components/account-settings";

export const metadata:Metadata={title:"My Account | My SORP2026",robots:{index:false,follow:false}};

export default function SettingsPage(){return <main id="main" className="gateway settings-page"><div className="gateway-width"><AccountSettings/></div></main>;}
