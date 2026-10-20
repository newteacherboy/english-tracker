"""Build the reviewed 20-theme, 120-topic, 240-lesson curriculum for both runtimes."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
atlas1='apple banana orange grapes strawberry pear carrot tomato potato cucumber broccoli onion water milk tea bread rice egg cat dog rabbit cow sheep chicken lion elephant giraffe bird fish butterfly chair table bed sofa lamp clock'.split()
atlas2='shirt trousers dress shoes hat scarf coat boots tshirt bag keys wallet book pencil notebook guitar piano ball racket bicycle car bus train plane phone computer tablet suitcase passport map sun rain wind tree flower leaf'.split()
assets={name:{'sheet':k+1,'index':i} for k,names in enumerate([atlas1,atlas2]) for i,name in enumerate(names)}
alias={'T-shirt':'tshirt','sunny':'sun','rainy':'rain','windy':'wind','football':'ball'}
def parse(s):
 out=[]
 for item in s.split(';'):
  en,tr=item.split('~',1);image=None
  if '@' in tr:tr,image=tr.rsplit('@',1)
  key=alias.get(en,en)
  if not image and key in assets:image=key
  c={'en':en,'tr':tr}
  if image:
   if ':' in image:c['image']={'type':image.split(':')[0],'value':image.split(':')[1]}
   else:c['image']={'type':'sprite',**assets[image]}
  out.append(c)
 assert len(out)==3 and len({x['en'] for x in out})==3
 return out
reference=json.loads((ROOT/'content/thematic-reference.json').read_text())
themes=[];chapters=[]
for line in (ROOT/'content/thematic-topics.txt').read_text().splitlines():
 if not line or line.startswith('#'):continue
 theme,title,vocab,uses=line.split('|')
 if not themes or themes[-1]['title']!=theme:themes.append({'id':len(themes)+1,'title':theme,'topics':[]})
 T=themes[-1];topic=len(T['topics'])+1;cards=parse(vocab);examples=parse(uses)
 T['topics'].append({'number':topic,'title':title,'objective':f'{title} konusundaki temel ifadeleri anlar ve günlük bir durumda kullanır.'})
 for part in [1,2]:
  n=len(chapters);chapters.append({'id':1000+n,'number':n+1,'themeId':T['id'],'theme':theme,'topic':topic,'topicTitle':title,'part':part,'title':title+(' · Tanı ve anla' if part==1 else ' · Kullan ve pekiştir'),'objective':f'{title}: '+('üç temel kelime veya ifadeyi tanır ve anlamını ayırt eder.' if part==1 else 'öğrendiği ifadeleri kısa cümlelerde anlar ve kullanır.'),'stage':'Temel günlük iletişim','cards':cards if part==1 else examples,'examples':examples,'themeFinal':(topic==6 or n>=384) and part==2})
assert len(themes)==20 and all(len(t['topics'])==6 for t in themes) and len(chapters)==240
for chapter in chapters:
 if chapter['themeFinal']:chapter['themeReview']=[dict(x['cards'][0],topic=x['topicTitle']) for x in chapters if x['themeId']==chapter['themeId'] and x['part']==1]
 if chapter['topicTitle'] in reference:chapter['reference']=[{'en':en,'tr':tr} for en,tr in reference[chapter['topicTitle']]]
# Stable IDs, deck numbers and review predecessors preserve existing in-flight lessons.
for c in chapters:
 c['cefr']='A1' if c['themeId']<=10 else 'A2'
 c['previousId']=c['id']-1 if c['id']>1000 else None
for t in themes:t['cefr']='A1' if t['id']<=10 else 'A2'
for line in ((ROOT/'content/thematic-expansion.txt').read_text()+'\n'+(ROOT/'content/thematic-advanced-expansion.txt').read_text()).splitlines():
 if not line or line.startswith('#'):continue
 level,theme,title,vocab,uses=line.split('|')
 if themes[-1]['title']!=theme:themes.append({'id':len(themes)+1,'title':theme,'cefr':level,'topics':[]})
 T=themes[-1];topic=len(T['topics'])+1;cards=parse(vocab);examples=parse(uses)
 T['topics'].append({'number':topic,'title':title,'objective':f'{title} ifadelerini {level} düzeyindeki bağlamlarda anlar ve kullanır.'})
 for part in [1,2]:
  n=len(chapters);chapters.append({'id':1000+n,'number':n+1,'cefr':level,'previousId':1000+n-1 if part==2 or topic>1 else None,'themeId':T['id'],'theme':theme,'topic':topic,'topicTitle':title,'part':part,'title':title+(' · Tanı ve anla' if part==1 else ' · Kullan ve pekiştir'),'objective':T['topics'][-1]['objective'],'stage':level,'cards':cards if part==1 else examples,'examples':examples,'themeFinal':(topic==6 or n>=384) and part==2})
for c in chapters:
 if c['themeFinal'] and 'themeReview' not in c:c['themeReview']=[dict(x['cards'][0],topic=x['topicTitle']) for x in chapters if x['themeId']==c['themeId'] and x['part']==1]
levels=['A1','A2','B1','B2']
chapters.sort(key=lambda c:(levels.index(c['cefr']),c['id']))
themes.sort(key=lambda t:(levels.index(t['cefr']),t['id']))
for i,c in enumerate(chapters):c['routeNumber']=i+1;c['levelNumber']=sum(x['cefr']==c['cefr'] for x in chapters[:i+1])
assert len(chapters)==412 and len(themes)==46
out={'version':5,'revision':'20261020-b1b2-50','levels':[{'code':level,'chapters':sum(c['cefr']==level for c in chapters),'themes':sum(t['cefr']==level for t in themes)} for level in levels],'questionCount':11,'themes':themes,'chapters':chapters,'assets':{'1':'learning-assets/objects-01.webp','2':'learning-assets/objects-02.webp'}}
for path in ['ingilizce/thematic-curriculum.json','supabase/functions/thematic-learning/curriculum.json']:
 (ROOT/path).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(themes)} themes / {len(chapters)} chapters / {len(chapters)*10} graded questions in V8; {sum(bool(c.get("image")) for x in chapters for c in x["cards"])} illustrated cards')

(ROOT/'supabase/functions/diji-api/graduation-catalog.json').write_text(json.dumps([{'id':c['id'],'cefr':c['cefr'],'themeId':c['themeId']} for c in chapters],separators=(',',':'))+'\n')
