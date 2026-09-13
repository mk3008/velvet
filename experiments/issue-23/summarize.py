"""Emit reviewable evidence into job logs as well as the complete artifact."""
import json
import re
from pathlib import Path

report=json.loads(Path('tmp/issue-23-results.json').read_text())
for trial in report.get('trials',[]):
    trial.pop('counts',None)
    trial.pop('timings',None)
recovery=report.get('recovery')
if recovery:
    activity=recovery.pop('activity',[])
    recovery['activitySummary']={
        'samples':len(activity),
        'lockWaitSamples':sum(any(r['wait_event_type']=='Lock' for r in s['rows']) for s in activity),
        'maxTransactionAgeSeconds':max((r['transaction_age_seconds'] or 0 for s in activity for r in s['rows']),default=0),
    }
    if recovery.get('catchupMs'):
        recovery['observedArrivalPerSecond']=recovery['arrivalsDuringCatchup']/(recovery['catchupMs']/1000)
stats=[]
for line in Path('tmp/issue-23-postgres-stats.jsonl').read_text().splitlines():
    try: stats.append(json.loads(line))
    except json.JSONDecodeError: pass
cpu=[float(s['CPUPerc'].rstrip('%')) for s in stats if s.get('CPUPerc')]
def memory_bytes(value):
    match=re.match(r'([0-9.]+)([A-Za-z]+)',value.split('/')[0].strip())
    if not match:return 0
    units={'B':1,'KiB':1024,'MiB':1024**2,'GiB':1024**3,'kB':1000,'MB':1000**2,'GB':1000**3}
    return float(match[1])*units.get(match[2],1)
report['postgresContainerSamples']={
    'count':len(cpu),'meanCpuPercent':sum(cpu)/len(cpu) if cpu else None,
    'maxCpuPercent':max(cpu,default=None),
    'peakMemoryBytes':max((memory_bytes(s.get('MemUsage','')) for s in stats),default=0),
    'lastSample':stats[-1] if stats else None,
}
print('VELVET_SUMMARY '+json.dumps(report,separators=(',',':')))
