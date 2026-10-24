#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit d'ecoute cible (A3) : Whisper ne controle pas la PRONONCIATION.

Selectionne les clips a risque de prononciation et produit UNE page HTML
autonome (sons embarques en data: URI). A NE PAS committer ni deployer : la page
est deposee hors repo (defaut ~/Documents/Programmation/kerskol-kits).

Risques couverts : liaisons des nombres (« vingt et un », « cent un »,
« six cents », « dix-huit »...), homographes (plus, os, as, vis, couvent, est,
fils, sens, tous, plans), ligatures Œ/Æ, mots composes a trait d'union,
noms propres / majuscules isolees.

Usage (PC) : python kit_ecoute.py --out C:\\kerskol-tts\\sortie --html C:\\kerskol-tts\\kit_ecoute.html
"""
from __future__ import annotations

import argparse
import base64
import html
import json
import re
from pathlib import Path

HOMOGRAPHES = {"plus", "os", "as", "vis", "couvent", "est", "fils", "sens", "tous", "plans"}
# consonne finale muette frequente (retour d'ecoute Manu : « chat » lu « chate »)
CONSONNE_FINALE = {"chat", "chats", "petit", "petits", "tout", "tous", "gros", "nez",
                   "dos", "lit", "lits", "nuit", "nuits", "haut", "pied", "pieds",
                   "loup", "loups", "vent", "vents", "bout", "bouts", "sang", "plus",
                   "os", "fils", "rat", "rats", "pot", "pots", "mot", "mots", "temps"}
# nombres a liaison delicate
NOMBRES_RISQUE = set([18, 80, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
                     + [21, 31, 41, 51, 61, 71, 81, 91]
                     + [101, 201, 301, 601, 1001])


KC_MODULE = r'''<style id="kc-style">
.kc-bar{position:fixed;top:0;left:0;right:0;z-index:99999;background:#111;color:#fff;
 display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;font:14px/1.3 system-ui,sans-serif;
 box-shadow:0 2px 8px rgba(0,0,0,.3)}
.kc-bar .kc-title{font-weight:700}
.kc-bar .kc-count{background:#2b6;color:#042;border-radius:10px;padding:2px 10px;font-weight:600}
.kc-b{cursor:pointer;border:1px solid #888;background:#f4f4f4;border-radius:8px;padding:4px 10px;font:13px system-ui,sans-serif}
.kc-bar .kc-b{background:#333;color:#eee;border-color:#555}
.kc-bar .kc-b.on{background:#f7c948;color:#222;border-color:#f7c948}
.kc-row{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
.kc-row .kc-b.kc-up.on{background:#2e7d32;color:#fff;border-color:#2e7d32}
.kc-row .kc-b.kc-dn.on{background:#c62828;color:#fff;border-color:#c62828}
.kc-row .kc-b.kc-fav.on{background:#f7c948;color:#222;border-color:#f7c948}
.kc-heard{display:none;align-self:center;background:#e0f2e9;color:#1b5e20;border-radius:8px;padding:2px 8px;font:12px system-ui;}
.kc-note.kc-note{display:block;margin-top:4px;min-width:260px}
.kc-migr{background:#2b6;color:#042;border-radius:10px;padding:2px 10px;font-weight:600}
</style>
<script id="kc-enhance">
/* KERSKOL - module d'enregistrement des choix de voix (ajoute, n'altere rien).
   Compatible avec les gabarits .chk / .chk-ret / .chk-exc / .note (data-eid|data-name).
   Tout en try/catch, sauvegarde localStorage par page + export/import JSON. */
(function(){
  "use strict";
  try{
  var KEY='kerskol_choix_v1::'+((location.pathname||'').split('/').pop()||'page');
  var state;
  function load(){
    try{var r=localStorage.getItem(KEY);state=r?JSON.parse(r):null;}catch(e){state=null;}
    if(!state||typeof state!=='object')state={up:{},down:{},fav:{},note:{},heard:{}};
    ['up','down','fav','note','heard'].forEach(function(k){if(!state[k])state[k]={};});
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}

  function container(a){
    var c=a;
    while(c.parentNode&&c.parentNode!==document.body&&c.parentNode.getElementsByTagName&&
          c.parentNode.getElementsByTagName('audio').length===1){c=c.parentNode;}
    return c;
  }
  function clipId(c,idx){
    try{
      if(c.getAttribute&&c.getAttribute('data-eid'))return c.getAttribute('data-eid');
      var e=c.querySelector('[data-eid]');if(e)return e.getAttribute('data-eid');
      if(c.getAttribute&&c.getAttribute('data-name'))return c.getAttribute('data-name');
      var n=c.querySelector('[data-name]');if(n)return n.getAttribute('data-name');
      if(c.getAttribute&&c.getAttribute('data-id'))return c.getAttribute('data-id');
      var i=c.querySelector('[data-id]');if(i)return i.getAttribute('data-id');
    }catch(e){}
    return 'clip_'+idx;
  }

  var clips=[]; // {id, c, audio, note, cret, cexc, row, badge}

  function noteEl(c){
    var n=c.querySelector('textarea.note, input.note, textarea.kc-note, input.kc-note');
    if(!n){
      n=document.createElement('input');n.type='text';n.className='note kc-note';
      n.setAttribute('placeholder','commentaire...');
    }
    return n;
  }

  function build(){
    var audios=document.getElementsByTagName('audio');
    var seen=[];
    for(var i=0;i<audios.length;i++){
      var a=audios[i],c=container(a);
      if(seen.indexOf(c)>=0)continue; seen.push(c);
      var id=clipId(c,i);
      var note=noteEl(c);
      if(!note.parentNode)c.appendChild(note);
      if(!note.getAttribute('data-kcid'))note.setAttribute('data-kcid',id);
      var cret=c.querySelector('.chk-ret')||c.querySelector('.chk');
      var cexc=c.querySelector('.chk-exc');
      var row=document.createElement('div');row.className='kc-row';
      var bUp=mkBtn('kc-up','👍 J’aime');
      var bDn=mkBtn('kc-dn','👎 Non');
      var bFav=mkBtn('kc-fav','⭐ Favori');
      var badge=document.createElement('span');badge.className='kc-heard';badge.textContent='✓ déjà écouté';
      row.appendChild(bUp);row.appendChild(bDn);row.appendChild(bFav);row.appendChild(badge);
      // placer la barre apres l'audio
      if(a.nextSibling)a.parentNode.insertBefore(row,a.nextSibling);else a.parentNode.appendChild(row);
      var obj={id:id,c:c,a:a,note:note,cret:cret,cexc:cexc,bUp:bUp,bDn:bDn,bFav:bFav,badge:badge};
      clips.push(obj);
      bind(obj);
    }
  }
  function mkBtn(cls,txt){var b=document.createElement('button');b.type='button';b.className='kc-b '+cls;b.textContent=txt;return b;}

  function mergeFromDom(){
    // recupere l'etat deja present (cases cochees, notes) si absent de notre state
    clips.forEach(function(o){
      if(o.cret&&o.cret.checked&&!state.down[o.id])state.up[o.id]=1;
      if(o.cexc&&o.cexc.checked)state.down[o.id]=1;
      if(o.note&&o.note.value&&state.note[o.id]===undefined)state.note[o.id]=o.note.value;
    });
  }

  function syncCheckbox(o){
    try{
      if(o.cret){var wantR=!!state.up[o.id];if(o.cret.checked!==wantR){o.cret.checked=wantR;fire(o.cret);}}
      if(o.cexc){var wantX=!!state.down[o.id];if(o.cexc.checked!==wantX){o.cexc.checked=wantX;fire(o.cexc);}}
    }catch(e){}
  }
  function fire(el){try{var ev=document.createEvent('HTMLEvents');ev.initEvent('change',true,true);el.dispatchEvent(ev);}catch(e){try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e2){}}}

  function render(o){
    o.bUp.classList.toggle('on',!!state.up[o.id]);
    o.bDn.classList.toggle('on',!!state.down[o.id]);
    o.bFav.classList.toggle('on',!!state.fav[o.id]);
    o.badge.style.display=state.heard[o.id]?'inline-block':'none';
    if(o.note&&state.note[o.id]!==undefined&&o.note.value!==state.note[o.id])o.note.value=state.note[o.id];
  }
  function renderAll(){clips.forEach(render);refresh();}

  function bind(o){
    o.bUp.addEventListener('click',function(){if(state.up[o.id]){delete state.up[o.id];}else{state.up[o.id]=1;delete state.down[o.id];}syncCheckbox(o);save();render(o);refresh();});
    o.bDn.addEventListener('click',function(){if(state.down[o.id]){delete state.down[o.id];}else{state.down[o.id]=1;delete state.up[o.id];}syncCheckbox(o);save();render(o);refresh();});
    o.bFav.addEventListener('click',function(){if(state.fav[o.id]){delete state.fav[o.id];}else{state.fav[o.id]=1;}save();render(o);refresh();});
    if(o.note)o.note.addEventListener('input',function(){if(o.note.value)state.note[o.id]=o.note.value;else delete state.note[o.id];save();refresh();});
    o.a.addEventListener('ended',function(){state.heard[o.id]=1;save();render(o);refresh();});
    // si l'utilisateur coche directement la case native
    if(o.cret)o.cret.addEventListener('change',function(){if(o.cret.checked){state.up[o.id]=1;delete state.down[o.id];}else{delete state.up[o.id];}save();render(o);refresh();});
    if(o.cexc)o.cexc.addEventListener('change',function(){if(o.cexc.checked){state.down[o.id]=1;delete state.up[o.id];}else{delete state.down[o.id];}save();render(o);refresh();});
  }

  // ---- barre d'outils ----
  var bar,lblCount,favOnly=false;
  function refresh(){
    if(!lblCount)return;
    var n=clips.length,heard=0,noted=0,fav=0;
    clips.forEach(function(o){
      if(state.heard[o.id])heard++;
      if(state.up[o.id]||state.down[o.id]||state.fav[o.id]||state.note[o.id])noted++;
      if(state.fav[o.id])fav++;
    });
    lblCount.textContent=heard+' écoutés / '+n+' audios · '+noted+' notés · '+fav+' favoris';
  }
  function applyFilter(){
    clips.forEach(function(o){o.c.style.display=(favOnly&&!state.fav[o.id])?'none':'';});
  }
  function buildBar(){
    bar=document.createElement('div');bar.className='kc-bar';
    var t=document.createElement('span');t.className='kc-title';t.textContent='Mes choix';
    lblCount=document.createElement('span');lblCount.className='kc-count';
    var bFav=mkBtn('kc-ftog','⭐ favoris seulement');
    bFav.addEventListener('click',function(){favOnly=!favOnly;bFav.classList.toggle('on',favOnly);applyFilter();});
    var bExp=mkBtn('kc-exp','⬇ Exporter mes choix');
    bExp.addEventListener('click',doExport);
    var bImp=mkBtn('kc-imp','⬆ Importer');
    var fin=document.createElement('input');fin.type='file';fin.accept='.json,application/json';fin.style.display='none';
    bImp.addEventListener('click',function(){fin.click();});
    fin.addEventListener('change',function(){if(fin.files&&fin.files[0])doImport(fin.files[0]);});
    bar.appendChild(t);bar.appendChild(lblCount);bar.appendChild(bFav);bar.appendChild(bExp);bar.appendChild(bImp);bar.appendChild(fin);
    document.body.insertBefore(bar,document.body.firstChild);
    document.body.style.paddingTop=(bar.offsetHeight+8)+'px';
  }
  function stamp(){
    try{var d=new Date();function p(x){return(x<10?'0':'')+x;}
      return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
    catch(e){return 'export';}
  }
  function doExport(){
    try{
      var page=(location.pathname||'').split('/').pop()||'page';
      var rows=[];
      clips.forEach(function(o){
        var up=!!state.up[o.id],dn=!!state.down[o.id],fav=!!state.fav[o.id],c=state.note[o.id]||'';
        if(up||dn||fav||c||state.heard[o.id]){
          rows.push({id:o.id,vote:up?'j_aime':(dn?'non':''),favori:fav,commentaire:c,ecoute:!!state.heard[o.id]});
        }
      });
      var out={page:page,date:new Date().toISOString(),cle:KEY,nb:rows.length,choix:rows};
      var blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob);var a=document.createElement('a');
      a.href=url;a.download='choix_'+page.replace(/\.html$/,'')+'_'+stamp()+'.json';
      document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(url);a.remove();},0);
    }catch(e){alert('Export impossible : '+e);}
  }
  function doImport(file){
    try{
      var rd=new FileReader();
      rd.onload=function(){
        try{
          var data=JSON.parse(rd.result);var arr=(data&&data.choix)?data.choix:(Array.isArray(data)?data:[]);
          arr.forEach(function(r){
            if(!r||!r.id)return;
            if(r.vote==='j_aime'){state.up[r.id]=1;delete state.down[r.id];}
            else if(r.vote==='non'){state.down[r.id]=1;delete state.up[r.id];}
            if(r.favori)state.fav[r.id]=1;else delete state.fav[r.id];
            if(r.commentaire)state.note[r.id]=r.commentaire;
            if(r.ecoute)state.heard[r.id]=1;
          });
          save();
          clips.forEach(function(o){syncCheckbox(o);});
          renderAll();applyFilter();
          alert('Import OK ('+arr.length+' entrées).');
        }catch(e){alert('Fichier invalide : '+e);}
      };
      rd.readAsText(file);
    }catch(e){alert('Import impossible : '+e);}
  }

  function isEmpty(){
    return !Object.keys(state.up).length&&!Object.keys(state.down).length&&
           !Object.keys(state.fav).length&&!Object.keys(state.note).length&&
           !Object.keys(state.heard).length;
  }
  // Recupere les anciens choix enregistres par la page ORIGINALE (format natif {ret,exc,note}),
  // stockes sous une autre cle (location.pathname de l'original). Ne touche jamais la cle d'origine.
  function migrateFromOriginal(){
    try{
      var path=location.pathname||'';
      var origPath=path.replace('-avec-choix.html','.html');
      var origName=(origPath.split('/').pop())||origPath;
      if(origName===((path.split('/').pop())||path))return 0; // pas une copie
      var src=null;
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(!k||k===KEY)continue;
        if(k.indexOf(origName)<0&&k.indexOf(origPath)<0)continue;
        var v;try{v=JSON.parse(localStorage.getItem(k));}catch(e){continue;}
        if(!v||typeof v!=='object')continue;
        if(v.ret||v.exc||v.note){src=v;if(k.indexOf(origPath)>=0)break;}
      }
      if(!src)return 0;
      var touched={};
      if(src.ret)Object.keys(src.ret).forEach(function(id){if(src.ret[id]&&!state.up[id]&&!state.down[id]){state.up[id]=1;touched[id]=1;}});
      if(src.exc)Object.keys(src.exc).forEach(function(id){if(src.exc[id]&&!state.down[id]){state.down[id]=1;delete state.up[id];touched[id]=1;}});
      if(src.note)Object.keys(src.note).forEach(function(id){if(src.note[id]&&state.note[id]===undefined){state.note[id]=src.note[id];touched[id]=1;}});
      return Object.keys(touched).length;
    }catch(e){return 0;}
  }
  function showMigr(n){
    try{
      if(!bar)return;
      var s=document.createElement('span');s.className='kc-migr';
      s.textContent=n+' anciens choix récupérés';
      bar.appendChild(s);
      setTimeout(function(){try{s.style.transition='opacity .6s';s.style.opacity='0';}catch(e){}},6000);
    }catch(e){}
  }
  function init(){
    load();build();
    if(!clips.length)return;
    var migrated=0;
    if(isEmpty())migrated=migrateFromOriginal();
    mergeFromDom();
    buildBar();
    clips.forEach(function(o){syncCheckbox(o);});
    renderAll();applyFilter();
    save();
    if(migrated>0)showMigr(migrated);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  }catch(e){try{console.error('KC enhance',e);}catch(_){}}
})();
</script>'''


def _raisons(key: str, texte: str) -> list[str]:
    r = []
    low = texte.lower()
    mots = re.findall(r"[0-9a-zà-öø-ÿœæ]+", low)
    if key.startswith("num:"):
        try:
            n = int(key.split(":")[1])
            if n in NOMBRES_RISQUE:
                r.append("liaison nombre")
        except ValueError:
            pass
    if any(m in HOMOGRAPHES for m in mots):
        r.append("homographe")
    if any(m in CONSONNE_FINALE for m in mots):
        r.append("consonne finale muette")
    if "œ" in low or "æ" in low:
        r.append("ligature")
    if "-" in texte and not key.startswith("num:"):
        r.append("trait d'union")
    # majuscule en milieu de phrase (nom propre) hors 1er mot
    tokens = texte.split()
    for w in tokens[1:]:
        if w[:1].isupper():
            r.append("nom propre / majuscule")
            break
    return r


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--html", required=True)
    ap.add_argument("--max", type=int, default=80)
    a = ap.parse_args()

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    voice = man["voice"]
    vdir = out / voice
    cid2key = {}
    for k, cid in man["keys"].items():
        cid2key.setdefault(cid, k)

    selection = []
    for cid, info in man["clips"].items():
        key = cid2key.get(cid, cid)
        raisons = _raisons(key, info["text"])
        if raisons:
            selection.append((raisons, key, cid, info["text"]))
    # priorite : plusieurs raisons d'abord, puis non-nombres
    selection.sort(key=lambda x: (-len(x[0]), x[1].startswith("num:")))
    selection = selection[: a.max]

    lignes = []
    for raisons, key, cid, texte in selection:
        mp3 = vdir / f"{cid}.mp3"
        if not mp3.exists():
            continue
        b64 = base64.b64encode(mp3.read_bytes()).decode("ascii")
        lignes.append(
            f'<tr data-eid="{html.escape(key)}"><td>{html.escape(", ".join(raisons))}</td>'
            f'<td><code>{html.escape(key)}</code></td>'
            f'<td>{html.escape(texte)}</td>'
            f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{b64}"></audio></td></tr>')

    page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kit d'ecoute voix Kerskol ({voice})</title>
<style>
 body{{font-family:system-ui,sans-serif;margin:24px;max-width:1000px}}
 h1{{font-size:1.3rem}} table{{border-collapse:collapse;width:100%}}
 td,th{{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:middle}}
 code{{background:#f3f3f3;padding:1px 4px;border-radius:3px}}
 tr:nth-child(even){{background:#fafafa}} audio{{height:32px}}
</style></head><body>
<h1>Kit d'ecoute - {len(lignes)} clips a risque de prononciation ({voice})</h1>
<p>Ecoute chaque clip ; note ceux a corriger (graphie dans <code>texte_lu</code>,
jamais le texte affiche). Page autonome, hors site.</p>
<table><thead><tr><th>Risque</th><th>Cle</th><th>Texte</th><th>Son</th></tr></thead>
<tbody>
{chr(10).join(lignes)}
</tbody></table>""" + KC_MODULE + """</body></html>"""

    Path(a.html).write_text(page, encoding="utf-8")
    print(f"kit ecrit : {a.html} ({len(lignes)} clips)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
