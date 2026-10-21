"""Validate normalized cached NBA team-game rosters and atomically emit a graph artifact.
Input JSON rows: {gameId,date,team,season,players:[{id,name}, ...]}. Raw source acquisition is deliberately separate.
"""
import hashlib, json, os, sys, tempfile
from collections import defaultdict
def main(source, output):
    rows=json.load(open(source, encoding="utf-8")); players={}; edges=defaultdict(list)
    for row in rows:
        roster=row.get("players", [])
        if not row.get("gameId") or len(roster)<2: raise ValueError("invalid game roster")
        for p in roster:
            if not p.get("id") or not p.get("name"): raise ValueError("player id/name required")
            players[p["id"]]=p
        for i,a in enumerate(roster):
            for b in roster[i+1:]:
                key=tuple(sorted((a["id"],b["id"])))
                evidence={k:row[k] for k in ("team","season","gameId","date")}
                if evidence not in edges[key]: edges[key].append(evidence)
    artifact={"players":players,"edges":[{"a":a,"b":b,"evidence":v} for (a,b),v in sorted(edges.items())]}
    payload=json.dumps(artifact,sort_keys=True,separators=(",",":")).encode(); artifact["sha256"]=hashlib.sha256(payload).hexdigest()
    directory=os.path.dirname(output) or "."; os.makedirs(directory,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=directory,suffix=".tmp"); os.close(fd)
    with open(tmp,"w",encoding="utf-8") as f: json.dump(artifact,f,indent=2)
    os.replace(tmp,output); print(f"wrote {output}: {len(players)} players, {len(edges)} edges")
if __name__=="__main__": main(sys.argv[1],sys.argv[2])
