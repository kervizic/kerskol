#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit LECTURE (retour #7) : comparer, pour 2 dictees, deux facons de RALENTIR
« Lis avec moi » :
  - playbackRate (ralenti global, deforme la voix) ;
  - pauses entre les mots (mots a vitesse naturelle + silences allonges, via le
    calage au mot).
Page autonome avec un curseur mots/min (50, 70, 90, 120) modifiable en direct
(Web Audio). A lancer sur le PC APRES l'alignement. Hors repo.

Usage : python kit_lecture.py --out C:\\kerskol-tts\\sortie --html C:\\kerskol-tts\\kit_lecture.html [--ids 1,104]
"""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--html", required=True)
    ap.add_argument("--ids", default="1,104")
    a = ap.parse_args()

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    vdir = out / man["voice"]
    aln = {}
    ap_aln = out / "alignement.json"
    if ap_aln.exists():
        aln = json.loads(ap_aln.read_text(encoding="utf-8")).get("clips", {})

    ids = [int(x) for x in a.ids.split(",") if x.strip()]
    dictees = []
    for did in ids:
        cles = sorted([k for k in man["keys"] if k.startswith(f"dictee:{did}:s")],
                      key=lambda k: int(k.rsplit("s", 1)[1]))
        phrases = []
        for cle in cles:
            cid = man["keys"][cle]
            mp3 = vdir / f"{cid}.mp3"
            if not mp3.exists():
                continue
            b64 = base64.b64encode(mp3.read_bytes()).decode("ascii")
            al = aln.get(cid, {})
            phrases.append({"b64": b64, "words": al.get("words", []),
                            "align_ok": al.get("align_ok", False),
                            "dur_ms": al.get("dur_ms", 0)})
        if phrases:
            dictees.append({"id": did, "phrases": phrases})

    data = json.dumps(dictees, ensure_ascii=False)
    page = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kit lecture - ralenti vs pauses</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;max-width:900px}
button{font-size:1rem;padding:8px 14px;margin:4px;border-radius:8px;border:1px solid #888;cursor:pointer}
.card{border:1px solid #ccc;border-radius:10px;padding:14px;margin:14px 0}
label{display:block;margin:10px 0}</style></head><body>
<h1>« Lis avec moi » : ralenti vs pauses entre les mots</h1>
<p>Regle la vitesse puis compare, pour chaque dictee, <b>ralenti (playbackRate)</b>
— la voix se deforme — et <b>pauses entre les mots</b> — mots a vitesse naturelle,
silences allonges grace au calage au mot. Le ralenti est borne a 0,8x minimum.</p>
<label>Vitesse : <input type="range" id="wpm" min="50" max="160" step="10" value="90">
<span id="wpmv">90</span> mots/min</label>
<div id="cards"></div>
<script>
const DICTEES = __DATA__;
const ctx = new (window.AudioContext||window.webkitAudioContext)();
const cache = new Map();
async function buf(b64){ if(cache.has(b64)) return cache.get(b64);
  const bin=atob(b64), arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  const b=await ctx.decodeAudioData(arr.buffer); cache.set(b64,b); return b; }
let stopFlag=0;
function stopAll(){ stopFlag++; }
function wpm(){ return +document.getElementById('wpm').value; }

// Ralenti global : playbackRate = max(0.8, naturalWpm/cibleWpm) par phrase.
async function jouerRalenti(d){ stopAll(); const mon=stopFlag; let t=ctx.currentTime+0.05;
  for(const p of d.phrases){ const b=await buf(p.b64); if(mon!==stopFlag)return;
    const nMots=p.words.length||1; const natWpm=nMots/(b.duration/60);
    const rate=Math.max(0.8, Math.min(1, cibleRate(natWpm)));
    const s=ctx.createBufferSource(); s.buffer=b; s.playbackRate.value=rate;
    s.connect(ctx.destination); s.start(t); t+=b.duration/rate+0.25; } }
function cibleRate(natWpm){ return wpm()/natWpm; }

// Pauses entre les mots : chaque mot joue a vitesse NATURELLE (slice s..e),
// silence apres pour tenir la cible. Repli : phrase entiere si pas d'alignement.
async function jouerPauses(d){ stopAll(); const mon=stopFlag; let t=ctx.currentTime+0.05;
  const perMs=60000/wpm();
  for(const p of d.phrases){ const b=await buf(p.b64); if(mon!==stopFlag)return;
    if(!p.align_ok||!p.words.length){ const s=ctx.createBufferSource(); s.buffer=b;
      s.connect(ctx.destination); s.start(t); t+=b.duration+perMs/1000; continue; }
    for(const w of p.words){ const s=ctx.createBufferSource(); s.buffer=b;
      const off=w.s/1000, dur=Math.max(0.03,(w.e-w.s)/1000);
      s.connect(ctx.destination); s.start(t, off, dur);
      const pause=Math.max(0, perMs/1000 - dur); t+=dur+pause; } } }

document.getElementById('wpm').oninput=e=>document.getElementById('wpmv').textContent=e.target.value;
const cards=document.getElementById('cards');
DICTEES.forEach((d,i)=>{ const el=document.createElement('div'); el.className='card';
  el.innerHTML=`<h2>Dictee #${d.id} (${d.phrases.length} phrases, aligne: ${d.phrases.every(p=>p.align_ok)})</h2>`;
  const b1=document.createElement('button'); b1.textContent='▶ Ralenti (playbackRate)'; b1.onclick=()=>{ctx.resume();jouerRalenti(d);};
  const b2=document.createElement('button'); b2.textContent='▶ Pauses entre les mots'; b2.onclick=()=>{ctx.resume();jouerPauses(d);};
  const b3=document.createElement('button'); b3.textContent='■ Stop'; b3.onclick=stopAll;
  el.append(b1,b2,b3); cards.append(el); });
</script></body></html>"""
    page = page.replace("__DATA__", data)
    Path(a.html).write_text(page, encoding="utf-8")
    print(f"kit lecture ecrit : {a.html} ({len(dictees)} dictees)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
