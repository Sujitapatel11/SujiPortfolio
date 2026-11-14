import React, { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import CompanionPairingPanel from "./CompanionPairingPanel";

export default function PersonalAssistantOrb() {
  const [open, setOpen] = useState(false);
  return <div className="fixed bottom-6 left-6 z-[71]">
    <section className={`mb-4 w-[min(94vw,390px)] rounded-3xl border border-violet-400/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl ${open ? "" : "hidden"}`}>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot size={20}/><div><p className="text-sm font-semibold">SUJI · PERSONAL OPERATOR</p><p className="text-[10px] text-violet-200">VOICE · BROWSER · DEVICE</p></div></div>
        <button onClick={()=>setOpen(false)} aria-label="Close assistant"><X size={18}/></button>
      </header>
      <CompanionPairingPanel/>
    </section>
    <button onClick={()=>setOpen(v=>!v)} aria-label="Open personal operator" className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-200/50 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-xl">
      {open?<X size={22}/>:<Sparkles size={24}/>}
    </button>
  </div>;
}
