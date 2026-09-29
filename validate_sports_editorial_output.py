#!/usr/bin/env python3
import json,re,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
FILES=[ROOT/"public"/"latest_report.json",ROOT/"latest_report.json"]
BAD=[r"the result should be read through",r"should be read through",r"quarterback efficiency.*trench play",r"coaching decisions.*injury fallout",r"whether the outcome changes",r"roster narratives?"]

def clean(v):
    return re.sub(r"\s+"," ",str(v or "")).strip()

def bad(v):
    t=clean(v)
    return bool(t and any(re.search(p,t,re.I) for p in BAD))

def headline(x):
    return clean(x.get("source_headline") or x.get("original_headline") or x.get("title") or x.get("headline"))

def url(x):
    return clean(x.get("canonical_url") or x.get("url"))

def summary(x):
    return clean(x.get("summary") or x.get("snapshot") or x.get("description"))

def key(v):
    return re.sub(r"[^a-z0-9]+"," ",clean(v).lower()).strip()

def validate_list(items,where,errors):
    seen_h=set(); seen_u=set(); seen_e=set()
    for i,x in enumerate(items):
        if not isinstance(x,dict): continue
        h=headline(x); u=url(x); s=summary(x)
        if bad(h): errors.append(f"{where}[{i}] synthetic headline: {h}")
        if bad(s): errors.append(f"{where}[{i}] synthetic summary: {s}")
        if h and not u: errors.append(f"{where}[{i}] headline without original URL: {h}")
        hk=key(h); uk=clean(u).lower().split("?")[0].rstrip("/")
        ev=clean(x.get("event_id") or x.get("game_id")).lower()
        if hk and hk in seen_h: errors.append(f"{where} duplicate headline: {h}")
        if uk and uk in seen_u: errors.append(f"{where} duplicate URL: {u}")
        if ev and ev in seen_e: errors.append(f"{where} duplicate event/game: {ev}")
        if hk: seen_h.add(hk)
        if uk: seen_u.add(uk)
        if ev: seen_e.add(ev)

def walk(node,where,errors):
    if isinstance(node,dict):
        h=headline(node); s=summary(node)
        if bad(h): errors.append(f"{where} synthetic headline: {h}")
        if bad(s): errors.append(f"{where} synthetic summary: {s}")
        for k,v in node.items():
            if k in ("homepage_cards","live_newsroom","stories","cards") and isinstance(v,list): validate_list(v,f"{where}.{k}",errors)
            walk(v,f"{where}.{k}",errors)
    elif isinstance(node,list):
        for i,v in enumerate(node): walk(v,f"{where}[{i}]",errors)

def main():
    p=next((x for x in FILES if x.exists()),None)
    if not p: print("STOP: no latest_report.json found"); return 1
    try: data=json.loads(p.read_text(encoding="utf-8"))
    except Exception as e: print(f"STOP: invalid Sports JSON: {e}"); return 1
    errors=[]; walk(data,"root",errors)
    if errors:
        print("EDITORIAL VALIDATION FAILED")
        for e in errors[:100]: print("-",e)
        return 1
    print("EDITORIAL VALIDATION PASSED")
    return 0

if __name__=="__main__": raise SystemExit(main())
