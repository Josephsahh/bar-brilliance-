from pathlib import Path
s = Path('src/pages/POSPage.tsx').read_text(encoding='utf-8')
pairs = [('(',')'), ('{','}'), ('[',']')]
for o,c in pairs:
    d=0
    for i,ch in enumerate(s):
        if ch == o:
            d += 1
        elif ch == c:
            d -= 1
        if d < 0:
            print('unmatched', c, 'at', i)
            break
    print(o,c,'depth',d)
