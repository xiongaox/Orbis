"""ellipsis 截断检测：scrollWidth 对 text-overflow:ellipsis 不可靠（会返回 clientWidth），
   必须用 canvas 量文字自然宽度再与盒宽对比。这是本轮真实踩到的坑。"""
import subprocess, json, re, os, sys
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
f=sys.argv[1]
h=open(f).read()
probe = """
<script>
(async () => {
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 600));
  const cv = document.createElement('canvas').getContext('2d');
  const out = [];
  document.querySelectorAll('.shell .card').forEach((card, i) => {
    // .name 是设计上允许省略的长文本（text-overflow:ellipsis），不计入缺陷
    card.querySelectorAll('.date, .time, .pg, .age').forEach(n => {
      const cs = getComputedStyle(n);
      cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const natural = cv.measureText(n.textContent).width;
      const box = n.getBoundingClientRect().width;
      out.push({ i:i+1, cls:n.className, text:n.textContent.trim(),
                 natural:+natural.toFixed(1), box:+box.toFixed(1),
                 clipped: natural > box + 0.5 });
    });
  });
  document.title='T:'+JSON.stringify(out);
})();
</script>"""
open('_t.html','w').write(h.replace('</body>', probe+'</body>'))
dom = subprocess.run([CHROME,'--headless','--disable-gpu','--dump-dom','--virtual-time-budget=6000',
  'file://'+os.path.abspath('_t.html')],capture_output=True,text=True).stdout
os.remove('_t.html')
m = re.search(r'T:(\[.*?\])</title>', dom, re.S)
rows = json.loads(m.group(1))
bad = [r for r in rows if r['clipped']]
for r in bad:
    print(f"  ✗ 卡#{r['i']:2} .{r['cls']} 「{r['text']}」 需 {r['natural']}px / 只有 {r['box']}px（差 {round(r['box']-r['natural'],1)}px）")
print(f"  检测 {len(rows)} 个文本节点，会被省略号吃掉: {len(bad)}")
sys.exit(1 if bad else 0)
