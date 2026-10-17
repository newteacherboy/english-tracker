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
  n=len(chapters);chapters.append({'id':1000+n,'number':n+1,'themeId':T['id'],'theme':theme,'topic':topic,'topicTitle':title,'part':part,'title':title+(' · Tanı ve anla' if part==1 else ' · Kullan ve pekiştir'),'objective':f'{title}: '+('üç temel kelime veya ifadeyi tanır ve anlamını ayırt eder.' if part==1 else 'öğrendiği ifadeleri kısa cümlelerde anlar ve kullanır.'),'stage':'Temel günlük iletişim','cards':cards if part==1 else examples,'examples':examples,'themeFinal':topic==6 and part==2})
assert len(themes)==20 and all(len(t['topics'])==6 for t in themes) and len(chapters)==240
for chapter in chapters:
 if chapter['themeFinal']:chapter['themeReview']=[dict(x['cards'][0],topic=x['topicTitle']) for x in chapters if x['themeId']==chapter['themeId'] and x['part']==1]
 if chapter['topicTitle'] in reference:chapter['reference']=[{'en':en,'tr':tr} for en,tr in reference[chapter['topicTitle']]]
out={'version':5,'questionCount':10,'themes':themes,'chapters':chapters,'assets':{'1':'learning-assets/objects-01.png','2':'learning-assets/objects-02.png'}}
for path in ['ingilizce/thematic-curriculum.json','supabase/functions/thematic-learning/curriculum.json']:
 (ROOT/path).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(themes)} themes / {len(chapters)} chapters / {len(chapters)*9} questions; {sum(bool(c.get("image")) for x in chapters for c in x["cards"])} illustrated cards')
