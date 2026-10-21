"""Download NBA Stats player-game appearances with team identity into a local CSV.

This is an offline collection step. Review source terms before public deployment.
It does not overwrite output unless --overwrite is passed, and stops on the
first source/shape failure so an incomplete run is never treated as complete.
"""
from __future__ import annotations
import argparse, csv, json, time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ENDPOINT = "https://stats.nba.com/stats/leaguegamelog"
HEADERS = {"Accept":"application/json, text/plain, */*", "Accept-Language":"en-US,en;q=0.9", "Origin":"https://www.nba.com", "Referer":"https://www.nba.com/", "User-Agent":"Mozilla/5.0"}
COLUMNS = ("PLAYER_ID","PLAYER_NAME","TEAM_ID","TEAM_ABBREVIATION","TEAM_NAME","GAME_ID","GAME_DATE","SEASON","SEASON_TYPE","MIN")

def seasons(start: int, end: int):
    if start > end: raise ValueError("start season must not exceed end season")
    return [f"{year}-{(year + 1) % 100:02d}" for year in range(start, end + 1)]

def fetch(season: str, season_type: str, retries: int, timeout: int):
    parameters={"Counter":"0","DateFrom":"","DateTo":"","Direction":"ASC","LeagueID":"00","PlayerOrTeam":"P","Season":season,"SeasonType":season_type,"Sorter":"DATE"}
    req=Request(f"{ENDPOINT}?{urlencode(parameters)}",headers=HEADERS); last=None
    for attempt in range(retries + 1):
        try:
            with urlopen(req,timeout=timeout) as response: return json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            last=error; time.sleep(2 ** attempt)
    raise RuntimeError(f"{season} {season_type}: {last}")

def rows(payload, season: str, season_type: str):
    sets=payload.get("resultSets") or payload.get("resultSet"); table=sets[0] if isinstance(sets,list) else sets
    headers=table.get("headers",[]); values=table.get("rowSet",[]); index={str(key).upper():i for i,key in enumerate(headers)}
    missing=[key for key in COLUMNS if key not in index and key not in {"SEASON","SEASON_TYPE"}]
    if missing: raise RuntimeError("source omitted required columns: " + ", ".join(missing))
    result=[]
    for value in values:
        row={key:str(value[index[key]]) if value[index[key]] is not None else "" for key in COLUMNS if key not in {"SEASON","SEASON_TYPE"}}
        row["SEASON"],row["SEASON_TYPE"]=season,season_type
        if not all(row[key] for key in ("PLAYER_ID","TEAM_ID","GAME_ID","GAME_DATE")): raise RuntimeError("source returned incomplete identity")
        result.append(row)
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument("--start",type=int,required=True); parser.add_argument("--end",type=int,required=True); parser.add_argument("--output",type=Path,required=True); parser.add_argument("--delay",type=float,default=1.25); parser.add_argument("--retries",type=int,default=3); parser.add_argument("--timeout",type=int,default=45); parser.add_argument("--overwrite",action="store_true"); args=parser.parse_args()
    if args.output.exists() and not args.overwrite: parser.error(f"refusing to overwrite {args.output}")
    data=[]
    try:
        for season in seasons(args.start,args.end):
            for game_type in ("Regular Season","Playoffs"):
                print(f"{season} {game_type}",flush=True); data.extend(rows(fetch(season,game_type,args.retries,args.timeout),season,game_type)); time.sleep(args.delay)
    except (RuntimeError,ValueError) as error: parser.error(str(error))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open("w",encoding="utf-8",newline="") as handle:
        writer=csv.DictWriter(handle,fieldnames=COLUMNS); writer.writeheader(); writer.writerows(data)
    print(f"wrote {len(data):,} player-game rows to {args.output}")
if __name__ == "__main__": main()
