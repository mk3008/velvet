"""Summarize downloaded phases-* artifacts; retain ranges, not only means."""
import json
import re
import statistics
import sys
from pathlib import Path

root = Path(sys.argv[1])
output = []
for path in sorted(root.rglob('phases-results.json')):
    report = json.loads(path.read_text())
    item = {k: report.get(k) for k in ['commit', 'mode', 'size', 'links', 'completed', 'differentialState', 'identityFailure']}
    item['engine'] = 'set-based-phases'  # raw mode name is inherited harness terminology
    item['nodePeakRSSBytes'] = max(r['peak']['rss'] for r in report['trials'])
    item['routes'] = {}
    for name in ['initial', 'all_no_op', 'mostly_no_op', 'correction']:
        rows = [r for r in report['trials'] if r['scenario'] == name]
        times = [r['elapsedMs'] for r in rows]
        item['routes'][name] = {
            'observations': len(rows), 'ms': times,
            'meanMs': statistics.mean(times), 'calls': sorted({r['calls'] for r in rows}),
            'maxRSSBytes': max(r['peak']['rss'] for r in rows),
            'walBytes': [r.get('walBytes') for r in rows],
            'databaseDelta': [r.get('databaseDelta') for r in rows],
        }
    recovery = report.get('recovery')
    if recovery:
        item['recovery'] = {k: v for k, v in recovery.items() if k not in ['neighbor', 'activity', 'otherRuns', 'timeline']}
        item['recovery']['primaryRunMs'] = [r['elapsedMs'] for r in report['trials'] if r['scenario'] in ['outage', 'catch_up', 'steady', 'bounded_correction']]
        item['recovery']['otherRunMs'] = [r['elapsedMs'] for r in recovery.get('otherRuns', [])]
        item['recovery']['neighbor'] = {}
        for phase in ['idle', 'outage', 'recovery', 'steady', 'correction']:
            values = sorted(r['ms'] for r in recovery['neighbor'] if r['phase'] == phase)
            if values:
                item['recovery']['neighbor'][phase] = {'n': len(values), 'medianMs': values[len(values)//2], 'p95Ms': values[int(len(values)*.95)], 'maxMs': max(values)}
        item['recovery']['lockWaitObservations'] = sum(r['n'] for sample in recovery['activity'] for r in sample['rows'] if r['wait_event_type'] == 'Lock')
    stats_path = path.with_name('phases-postgres.jsonl')
    stats = []
    if stats_path.exists():
        # Docker terminal refreshes contain ANSI frames; maxima tolerate repeated samples.
        for line in re.findall(r'\{[^{}\n]*\}', stats_path.read_text()):
            stats.append(json.loads(line))
    if stats:
        def memory_bytes(value):
            number, unit = re.match(r'([\d.]+)\s*([A-Za-z]+)', value.split('/')[0].strip()).groups()
            return float(number) * {'B': 1, 'kB': 1000, 'KB': 1000, 'KiB': 1024, 'MB': 10**6, 'MiB': 2**20, 'GB': 10**9, 'GiB': 2**30}[unit]
        item['container'] = {'observationsIncludingRefreshes': len(stats),
            'maxCPUPercent': max(float(r['CPUPerc'].rstrip('%')) for r in stats),
            'maxMemoryBytes': max(memory_bytes(r['MemUsage']) for r in stats)}
    output.append(item)
print(json.dumps(output, indent=2))
