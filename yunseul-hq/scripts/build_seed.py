#!/usr/bin/env python3
"""윤슬 HQ 익명 시드 생성.

입력: data/source/매장_통합.csv, 리뷰_통합.csv, old_pocha_seed.json (실명 원자료, 커밋하지 않음)
출력: data/seed/{brand,stores,reviews,standards,knowledge,virtual_after}.json (실명·주소·place id 0건)
실행: yunseul-hq 폴더에서 `python3 -I scripts/build_seed.py` (표준 라이브러리만 쓴다)
"""
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'source'
OUT = ROOT / 'data' / 'seed'

BRAND = '역전할머니맥주'
BRANDS = ['역전할머니맥주', '투다리', '생활맥주', '봉구비어', '한신포차', '용용선생', '인쌩맥주']
# 실명이 필요한 값(타깃 원자료 매장명, 주소 없는 매장의 시군구)은 커밋하지 않는 data/source/seed_config.json에 둔다.
_CFG = json.loads((SRC / 'seed_config.json').read_text(encoding='utf-8'))
TARGET_SOURCE_NAME = _CFG['targetSourceName']  # 원자료에서 타깃을 찾는 데만 쓴다. 시드에는 들어가지 않는다.
TARGET_NAME = '강남 윤슬점'
VERSION = 'v1.0 (가상)'
DATA_AS_OF = '2026-11-18'

# 불만 유형 정규식 12종 (원자료 build_csv.py와 같은 규칙)
CATS = [
    ('이용시간제한', r'2\s*시간|두\s*시간|시간\s*제한|시간제|나가\s*(라|달라|래)|퇴장|쫓겨|쫓아'),
    ('좌석·인원', r'자리\s*(를\s*)?(옮|이동|바꿔)|테이블\s*(을\s*)?(옮|이동|바꿔)|[12]\s*(인|명)\s*(은|이라|손님)?\s*(안|못)\s*받|혼자\s*(는|라)?\s*(안|못)|인원|합석|가려\s*받|골라\s*받'),
    ('최소주문', r'최소\s*주문|기본\s*주문|인당\s*\d|1\s*인\s*1|주문\s*금액'),
    ('규칙 미고지·말바꿈', r'미리\s*(말|안내|고지)|사전\s*(고지|안내|공지)|고지|그제서야|처음부터|말\s*(도\s*)?안\s*(하|해)|안내\s*(도\s*)?(없|안)|말이\s*달|다르게\s*말|번복'),
    ('직원 태도', r'불친절|싸가지|무례|태도|짜증|눈치|반말|소리\s*(를\s*)?(지르|질러)|표정|퉁명|기분\s*(이\s*)?나쁘|욕\s*(을|하)|응대'),
    ('품절·대체', r'품절|재료\s*(가\s*)?(소진|없)|다른\s*(안주|메뉴)\s*(로|를)|대체|떨어졌'),
    ('결제·계산', r'계산|결제|영수증|금액|더\s*(찍|나왔)|잘못\s*(찍|계산|결제)|중간\s*정산'),
    ('신분증', r'신분증|민증|면허증|주민등록|모바일\s*(신분|면허)'),
    ('위생', r'머리카락|벌레|바퀴|더럽|위생|끈적|냄새|이물|청소'),
    ('대기·서빙지연', r'안\s*나와|늦게\s*나|오래\s*걸|한참|서빙\s*(이\s*)?늦|주문\s*(이\s*)?누락|까먹'),
    ('맛·품질', r'맛\s*(이\s*)?없|미지근|식어|식었|비린|짜요|짜고|싱거|맛\s*(이\s*)?별로|양\s*(이\s*)?적'),
    ('다른 지점 비교', r'다른\s*(지점|매장|역할맥|할맥|곳은)|타\s*지점|본사'),
]
CRX = [(n, re.compile(p)) for n, p in CATS]
COMPLAINT_TYPES = [n for n, _ in CATS]


def tag(text):
    return [n for n, rx in CRX if rx.search(text or '')]


# ----------------------------------------------------------------------
# 원자료 읽기
# ----------------------------------------------------------------------

def read_csv(name):
    with open(SRC / name, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def num(v):
    v = (v or '').strip().replace(',', '')
    if not v:
        return None
    x = float(v)
    return int(x) if x.is_integer() else x


def pct(v):
    v = (v or '').strip().rstrip('%')
    return None if not v else round(float(v) / 100, 4)


def stem_of(name):
    """매장명에서 브랜드 단어를 뺀 지점명 ('역전할머니맥주 서울사당점' → '서울사당점')."""
    for b in BRANDS:
        if name.startswith(b):
            return name[len(b):].strip()
    return name.strip()


# ----------------------------------------------------------------------
# 매장: 시군구, 상권, 익명 이름
# ----------------------------------------------------------------------

REGION_SHORT = [('통합특별시', ''), ('특별자치도', ''), ('특별자치시', ''), ('특별시', ''), ('광역시', '')]
# 주소가 비어 있는 매장의 시군구(원자료에 도로명주소 없음). 지점명 앞부분으로 정했다.
DISTRICT_FALLBACK = _CFG['districtFallback']


def region_short(r):
    for a, b in REGION_SHORT:
        r = r.replace(a, b)
    return r


def parse_district(addr, stem):
    p = (addr or '').split()
    if len(p) >= 3 and p[1].endswith('시') and re.search('[구군]$', p[2]):
        return f'{p[1]} {p[2]}'
    if len(p) >= 2:
        return p[1]
    for k, v in DISTRICT_FALLBACK.items():
        if stem.startswith(k):
            return v
    return '미상'


def district_short(d):
    """'강남구' → '강남', '수원시 팔달구' → '수원 팔달', '중구'처럼 한 글자면 그대로."""
    parts = d.split()
    if len(parts) == 2:
        city, gu = parts
        g = gu[:-1] if len(gu) > 2 else gu
        return f'{city[:-1]} {g}'
    if len(d) > 2 and d[-1] in '구군시':
        return d[:-1]
    return d


AREA_RULES = [
    ('대학가', r'대학|대입구|대학로|여대|건대|교대|캠퍼스|학교'),
    ('관광지', r'해운대|광안리|해수욕장|해변|관광|한옥마을|황리단|중문|애월|협재|남포|속초|경포|오션|비치'),
    ('번화가', r'홍대|신촌|강남|이태원|서면|종각|종로|을지로|명동|신림|압구정|가로수길|연남|성수|익선|잠실|신천|왕십리|동성로|둔산|구월|인계|상무|충장로|은행동|로데오|번화|중앙|시내|문화의거리|먹자'),
    ('주거지', r'신도시|아파트|단지|마을|지구|택지|미사|위례|동탄|광교|배곧|송도|청라|검단|운정|다산|별내|옥정|산본|평촌|일산|[가-힣]동$'),
]


def area_of(stem, addr):
    core = stem[:-1] if stem.endswith('점') else stem
    if re.search(r'[가-힣A-Za-z0-9]역', core):
        return '역세권'
    for area, rx in AREA_RULES:
        if re.search(rx, core):
            return area
    if re.search(r'군\s', addr or ''):
        return '주거지'
    return '기타'


def letters():
    i = 0
    while True:
        n, s = i, ''
        while True:
            s = chr(65 + n % 26) + s
            n = n // 26 - 1
            if n < 0:
                break
        yield s
        i += 1


def build_stores(rows):
    yj = [r for r in rows if r['브랜드'] == BRAND]
    yj = sorted(enumerate(yj), key=lambda t: (-(num(t[1]['카카오_별점수']) or 0), t[0]))
    yj = [r for _, r in yj]
    if not any(r['매장명'] == TARGET_SOURCE_NAME for r in yj):
        raise SystemExit('타깃 매장을 원자료에서 찾지 못했어요')

    info = []
    for r in yj:
        stem = stem_of(r['매장명'])
        district = parse_district(r['도로명주소'], stem)
        info.append((r, stem, district, area_of(stem, r['도로명주소'])))

    # 같은 약칭이 여러 시도에 있거나 한 글자 구(중구·동구…)면 시도를 앞에 붙인다
    keys_by_short = defaultdict(set)
    for r, _, d, _ in info:
        keys_by_short[district_short(d)].add((r['시도'], d))

    def prefix(region, d):
        s = district_short(d)
        if len(keys_by_short[s]) > 1 or len(d) <= 2:
            return f'{region_short(region)} {s}'
        return s

    gen = defaultdict(letters)
    stores, id_by_pid = [], {}
    for i, (r, stem, district, area) in enumerate(info, 1):
        sid = f'S{i:03d}'
        is_target = r['매장명'] == TARGET_SOURCE_NAME
        if is_target:
            name = TARGET_NAME
        else:
            key = (r['시도'], district)
            while True:
                letter = next(gen[key])
                if '윤슬' not in letter:
                    break
            name = f'{prefix(r["시도"], district)} {letter}점'
        note = r['비고'].strip()
        excluded = None
        if '폭탄' in note:
            excluded = '리뷰 폭탄(2024-09-29 하루 1점 11건)'
        elif '협찬' in note:
            excluded = '협찬 리뷰 다수(평점 부풀림)'
        elif note or r['분석제외'].strip():
            excluded = '분석 제외(평점 왜곡)'
        s = {
            'id': sid,
            'name': name,
            'region': r['시도'],
            'district': district,
            'area': area,
            'isTarget': is_target,
            'kakao': {
                'rating': num(r['카카오_별점평균']),
                'count': num(r['카카오_별점수']) or 0,
                'lowShare': pct(r['카카오_2점이하_비율']),
                'recentMean': num(r['카카오_2025이후_평균']),
            },
            'naver': {
                'matched': r['네이버_매칭'] == 'matched',
                'visitorReviews': num(r['네이버_방문자리뷰수']),
                'pageMean': num(r['네이버_첫페이지_평균']),
                'pageN': num(r['네이버_첫페이지_건수']) or 0,
                'pageLow': num(r['네이버_첫페이지_2점이하']) or 0,
                'kindShare': pct(r['네이버_친절해요_비율']),
            },
            'cross': r['교차판정'],
        }
        if excluded:
            s['excluded'] = excluded
        stores.append(s)
        id_by_pid[r['카카오_place_id']] = sid
    names = [s['name'] for s in stores]
    assert len(names) == len(set(names)), '익명 매장명이 겹쳐요'
    return stores, id_by_pid, yj


# ----------------------------------------------------------------------
# 리뷰 본문 익명화
# ----------------------------------------------------------------------

# 지점명처럼 보여도 가리지 않는 일반 낱말
COMMON_JEOM = set("""단점 장점 시점 관점 요점 강점 약점 초점 허점 논점 문제점 차이점 공통점 만점 별점 평점 득점 실점 편의점 음식점
체인점 본점 지점 매장점 분점 직영점 가맹점 백화점 상점 개점 폐점 정점 반점 중점 방점 오점 쟁점 거점 판매점 대리점 최고점 최저점
아쉬운점 좋은점 나쁜점 불편한점 이점 한점 두점 세점 네점 감점 맛점 술점 빵점 영점 꿀점 학점 의문점 개선점 주점 장단점""".split())
COMMON_SUFFIX = ('지점', '주점', '음식점', '편의점', '백화점', '체인점', '가맹점', '직영점', '대리점', '판매점', '문제점', '차이점',
                 '공통점', '장단점', '아쉬운점', '좋은점', '나쁜점', '불편한점')
JEOM_TAIL = r'(?!심|수|원|장|포|주|검|차|점|프|퍼|선|령|자|토|성|등|멸|화|액|잖|막|박|묘|안|용|유|철)'
BRAND_ALIAS = r'(?:역전\s?할머니\s?맥주|역전\s?할머니|역전\s?할매|역할맥|할맥|역할\s?맥주)'
PLACE_WORD = (r'(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|수원|성남|용인|고양|하남|안산|안양'
              r'|부천|화성|평택|시흥|김포|파주|의정부|남양주|천안|청주|전주|창원|김해|포항|구미|\d{2,4})')
RX_BRAND_BRANCH = re.compile(BRAND_ALIAS + r"(\s*['’>]?\s*)((?:" + PLACE_WORD + r'\s)?([가-힣A-Za-z0-9]{2,12})점)' + JEOM_TAIL)
RX_STATION = re.compile(r'[가-힣A-Za-z0-9]{1,8}역\s?점' + JEOM_TAIL)
RX_PHONE = re.compile(r'(?<![\d,])(?:01[016789]|02|0[3-6][1-5]|070)[-. )]?\d{3,4}[-. ]?\d{4}(?![\d,])')
RX_ROAD = re.compile(r'(?:[가-힣]+(?:시|군|구)\s)+[가-힣0-9]+(?:로|길)(?:\s?\d+번?길)?\s?\d{1,4}(?:-\d{1,4})?(?![\d가-힣])')

# 직원 인상착의: 외모 표현 뒤에 성별이나 직원 호칭이 올 때만 '[직원]'으로 바꾼다('마른안주'·'20대 친구'는 그대로).
LOOK = (r'(?:(?:노란|빨간|파란|하얀|금발|탈색|단발|짧은|긴)\s*머리|(?:앞|뒷)?머리\s*(?:가\s*|를\s*)?(?:긴|길고|길은|짧은|짧고|묶은|묶고|노란|노랗고|염색한|염색하고|빨간|파란|탈색한)'
        r'|안경\s*(?:을\s*)?(?:쓴|쓰고|낀|끼고|착용한)|마른|마르고|뚱뚱한|뚱뚱하고|통통한|통통하고|살찐|덩치\s*(?:가\s*)?(?:큰|크고)'
        r'|키\s*(?:가\s*)?(?:큰|크고|작은|작고)|문신\s*(?:한|하고|있는|많은)|문신충|대머리|피어싱\s*(?:한|있는)'
        r'|수염\s*(?:난|있는|기른)|콧수염|포니테일\s*(?:한|머리)?)')
AGE = r'(?:(?:[2-6]0?\s*[-~,]\s*)?[2-6]0대(?:\s*(?:초반|중반|후반|초중반))?(?:\s*(?:로|으로)\s*보이는)?)'
GENDER = r'(?:남자|여자|남성|여성)'
STAFF = r'(?:직원분|직원|알바생|알바분|알바|종업원|서버|매니저|사장님|사장|주인장|주인|아저씨|아주머니|아줌마|이모님|이모|삼촌)'
RX_LOOK = re.compile(r'(?:' + LOOK + r'[\s,?]*)+(?:' + GENDER + r'(?:\s*' + STAFF + r')?(?!\s*손님)|' + STAFF + r')')
RX_AGE = re.compile(AGE + r'\s*(?:' + GENDER + r'\s*)?' + STAFF)


def build_branch_tokens(all_rows, protected):
    """모든 브랜드 매장명에서 지점 토큰과 그 변형('서울사당점' → '사당점')을 만든다. 긴 것부터.
    '점'으로 끝나지 않는 지점명은 역전할머니맥주 것만 넣는다(다른 브랜드의 '본사'·'마차' 같은 낱말 오탐 방지)."""
    sido = {r['시도'] for r in all_rows} | {region_short(r['시도']) for r in all_rows} | {
        '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'}
    toks = {t for t in protected if len(t) >= 2}
    for r in all_rows:
        st = stem_of(r['매장명'])
        if len(st) < 3 or not st.endswith('점'):
            continue
        core = st[:-1]
        variants = {core}
        for s in sido:
            if core.startswith(s) and len(core) - len(s) >= 2:
                variants.add(core[len(s):])
        if len(core) >= 4:
            variants.add(core[2:])  # '군포산본' → '산본'
        for v in list(variants):
            if v.endswith('역') and len(v) >= 3:
                variants.add(v[:-1])
            elif len(v) >= 2:
                variants.add(v + '역')
        for v in variants:
            t = v + '점'
            if len(v) >= 2 and t not in COMMON_JEOM:
                toks.add(t)
    return sorted(toks, key=len, reverse=True)


class Anonymizer:
    def __init__(self, tokens, protected, addresses):
        self.tokens = tokens
        self.protected = set(protected)
        self.addresses = sorted({a for a in addresses if a}, key=len, reverse=True)
        # 실제 지점 토큰을 띄어 쓴 경우('하남 미사신도시점')
        spaced = sorted((t for t in protected if len(t) >= 4), key=len, reverse=True)
        self.rx_spaced = re.compile('|'.join(r'\s?'.join(map(re.escape, t)) for t in spaced))
        self.stats = Counter()

    def _token_sub(self, tok, t):
        mask = '○○점' if tok.endswith('점') else '○○'

        def fn(m):
            word = m.group(0)  # 토큰 앞에 붙은 글자까지 한 낱말로 본다('신논현점' 안의 '논현점')
            if tok not in self.protected and (word in COMMON_JEOM or word.endswith(COMMON_SUFFIX)):
                return word
            return mask
        return re.sub(r'[가-힣A-Za-z0-9]*' + re.escape(tok), fn, t)

    def __call__(self, text):
        t = text or ''
        if not t:
            return t
        steps = []
        for a in self.addresses:
            if a in t:
                t = t.replace(a, '[주소]')
        steps.append(('address', RX_ROAD, lambda m: '[주소]'))
        steps.append(('phone', RX_PHONE, lambda m: '[전화번호]'))
        steps.append(('brand_branch', RX_BRAND_BRANCH, self._brand_sub))
        steps.append(('station', RX_STATION, lambda m: '○○점'))
        for key, rx, fn in steps:
            t2 = rx.sub(fn, t)
            self.stats[key] += t2 != t
            t = t2
        before = t
        for tok in self.tokens:
            if tok in t:
                t = self._token_sub(tok, t)
        t = self.rx_spaced.sub(lambda m: '○○점' if m.group(0).endswith('점') else '○○', t)
        t = re.sub(r'○○점(\s*○○점)+', '○○점', t)
        self.stats['branch_token'] += t != before
        before = t
        t = RX_LOOK.sub('[직원]', t)
        t = RX_AGE.sub('[직원]', t)
        self.stats['appearance'] += t != before
        return t

    @staticmethod
    def _brand_sub(m):
        last = m.group(3) + '점'
        if last in COMMON_JEOM or last.endswith(COMMON_SUFFIX):
            return m.group(0)
        return m.group(0)[: m.start(2) - m.start(0)] + '○○점'


def build_reviews(review_rows, id_by_pid, anon):
    order = {sid: i for i, sid in enumerate(sorted(set(id_by_pid.values())))}
    rows = [r for r in review_rows if r['브랜드'] == BRAND]
    out = []
    # 매장 id → 카카오·네이버 → 최신순
    grouped = defaultdict(list)
    for r in rows:
        grouped[(id_by_pid[r['카카오_place_id']], r['플랫폼'])].append(r)
    keys = sorted(grouped, key=lambda k: (order[k[0]], 0 if k[1] == '카카오' else 1))
    for k in keys:
        for r in sorted(grouped[k], key=lambda r: r['작성일'], reverse=True):
            tags = [x for x in (r['불만유형_자동분류'] or '').split('|') if x]
            assert all(x in COMPLAINT_TYPES for x in tags), tags
            out.append({
                'id': f'R{len(out) + 1:06d}',
                'storeId': k[0],
                'platform': r['플랫폼'],
                'star': num(r['리뷰_별점']),
                'date': r['작성일'][:10],
                'text': anon(r['본문'].strip()),
                'tags': tags,
                'tagVia': 'rules',
            })
    return out


# ----------------------------------------------------------------------
# 가상 본사 표준
# ----------------------------------------------------------------------

STANDARDS = [
    dict(id='H01', topic='이용시간', title='이용시간은 입장할 때 먼저 안내한다',
         rule='입장할 때 이용시간 기준을 반드시 안내한다. 2시간 이용 제한은 매장 밖에 웨이팅이 있을 때만 적용한다. 연장 가능 여부와 종료는 끝나기 10분 전에 한 번 안내한다.',
         reason='이용시간을 앉은 뒤에 처음 들으면 손님은 쫓겨난다고 느낀다. 웨이팅이 없는데도 시간을 이유로 내보내면 회전 이득보다 재방문 손실이 크다.',
         customerNotice='웨이팅이 있을 때만 이용시간이 2시간이고, 끝나기 10분 전에 미리 말씀드릴게요.',
         complaints=['이용시간제한', '규칙 미고지·말바꿈'], tags=['이용시간', '2시간', '웨이팅', '퇴장', '사전 안내']),
    dict(id='H02', topic='좌석 배정', title='인원에 맞는 자리로 처음부터 안내한다',
         rule='입장 인원에 맞는 자리로 처음부터 안내한다. 착석한 뒤 자리 이동 요청은 최소화한다. 꼭 옮겨야 하면 이유를 먼저 설명하고 손님 동의를 받는다(한 방문에 한 번까지).',
         reason='앉아서 마시던 손님에게 자리를 옮겨 달라고 하면 손님은 덜 중요한 손님으로 취급받았다고 느낀다. 처음 안내가 정확하면 이동 요청 자체가 줄어든다.',
         customerNotice='인원에 맞는 자리로 안내해 드리고, 혹시 자리를 옮겨야 하면 이유를 먼저 말씀드릴게요.',
         complaints=['좌석·인원'], tags=['좌석', '자리 이동', '2인석', '단체석', '인원']),
    dict(id='H03', topic='최소주문', title='최소주문 금액을 두지 않는다',
         rule='최소주문 금액, 1인 1메뉴 같은 주문 하한을 두지 않는다. 매장 사정으로 예외가 필요하면 본사 승인을 받은 뒤 메뉴판과 입구에 표시한다.',
         reason='역전할머니맥주는 가볍게 한 잔 하러 오는 손님이 많은 브랜드다. 매장마다 주문 하한이 다르면 손님은 같은 간판에서 다른 대우를 받는다고 느낀다.',
         customerNotice='저희 매장은 최소주문 금액이 없으니 드시고 싶은 만큼 편하게 주문하세요.',
         complaints=['최소주문'], tags=['최소주문', '주문 금액', '1인 1메뉴']),
    dict(id='H04', topic='품절·대체', title='품절은 주문받을 때 먼저 알리고 대체는 동의 후에',
         rule='주문을 받을 때 품절 메뉴를 먼저 알린다. 품절은 바로 태블릿과 POS에 반영한다. 대체 메뉴는 손님이 동의한 뒤에만 내고, 가격이나 양이 다르면 차이를 말한다.',
         reason='품절을 주문 뒤에 알리거나 말없이 다른 메뉴를 내면 손님은 속았다고 느낀다. 먼저 말하면 대부분 다른 메뉴를 고른다.',
         customerNotice='오늘 품절된 메뉴는 주문받을 때 먼저 알려 드릴게요.',
         complaints=['품절·대체'], tags=['품절', '대체', '주문', '메뉴']),
    dict(id='H05', topic='결제·계산', title='중간결제는 내역을 함께 확인하고 영수증을 드린다',
         rule='중간결제나 나눠 결제할 때는 결제 전에 테이블 번호와 주문 내역을 손님과 함께 확인한다. 결제 뒤에는 영수증이나 내역 화면을 드린다.',
         reason='중간결제는 다른 테이블 내역과 섞이기 쉽고, 틀리면 손님은 돈을 더 냈다고 느낀다. 결제 전에 같이 보면 다툼이 거의 생기지 않는다.',
         customerNotice='결제하실 때 주문 내역을 같이 확인하고 영수증을 드릴게요.',
         complaints=['결제·계산'], tags=['중간결제', '계산', '영수증', '내역', '나눠 결제']),
    dict(id='H06', topic='신분증', title='신분증은 실물과 모바일 신분증 앱만 인정한다',
         rule='첫 주문 전에 일행 전원의 신분증을 확인한다. 실물 신분증(주민등록증·운전면허증·여권)과 정부 모바일 신분증 앱 화면을 인정한다. 사진이나 캡처는 인정하지 않는다. 단골이어도 생략하지 않는다.',
         reason='청소년에게 술을 팔면 영업정지 처분을 받을 수 있다. 매장마다 인정 기준이 다르면 손님은 확인 자체를 트집으로 받아들인다.',
         customerNotice='첫 주문 전에 일행분 모두 신분증을 확인하고, 실물이나 모바일 신분증 앱 화면 모두 괜찮아요.',
         complaints=['신분증'], tags=['신분증', '모바일 신분증', '미성년자', '나이 확인']),
    dict(id='H07', topic='이물·위생', title='이물이 나오면 즉시 사과·교체하고 점장에게 보고한다',
         rule='음식이나 음료에서 이물이 나오면 즉시 사과하고 새로 내거나 값을 받지 않는다. 먹은 양을 이유로 결제를 요구하지 않는다. 사진과 시각을 남기고 그날 안에 점장에게 보고한다. 테이블은 손님이 앉기 전에 닦고 끈적임을 손으로 확인한다.',
         reason='이물 대응에서 변명이나 결제 요구가 나오면 한 건이 매장 전체의 위생 평판이 된다. 바로 사과하고 바꾸면 대부분 그 자리에서 끝난다.',
         customerNotice='음식에 불편한 점이 있으면 바로 말씀해 주세요, 곧바로 새로 드릴게요.',
         complaints=['위생'], tags=['이물', '머리카락', '벌레', '위생', '테이블', '사과']),
    dict(id='H08', topic='응대 기본', title='첫 인사와 호출 응답을 먼저 한다',
         rule='입장한 손님에게 먼저 인사한다. 호출 벨이나 손을 든 손님에게는 바로 눈을 맞추고 "곧 갈게요"라고 답한다. 바쁠 때도 응답을 먼저 하고, 반말·면박은 하지 않는다.',
         reason='저평점 리뷰에서 손님이 화를 내는 지점은 기다림 자체보다 무시당했다는 느낌이다. 응답만 먼저 해도 기다림은 참는다.',
         customerNotice='필요하신 게 있으면 벨을 눌러 주세요, 바로 대답하고 갈게요.',
         complaints=['직원 태도', '대기·서빙지연'], tags=['인사', '호출', '응대', '친절', '반말']),
]

BRAND_CARD_DETAIL = {
    'H01': dict(title='입장할 때 이용시간 먼저 안내하기',
                situation='손님이 입장해서 자리에 앉기 전, 또는 웨이팅이 생겨 이용시간 제한을 적용해야 할 때.',
                actions=['입구에서 인원을 확인하며 "웨이팅이 있을 때는 2시간 이용이에요"라고 먼저 말한다',
                         '웨이팅이 없으면 시간 제한을 적용하지 않는다',
                         '제한을 적용하는 날은 입장 시각을 주문서나 POS 메모에 적는다',
                         '끝나기 10분 전에 한 번 안내하고, 마지막 주문을 받을지 묻는다'],
                avoid='입장 때 말하지 않고 2시간이 지났다고 바로 나가 달라고 하지 않는다. 직원마다 다른 시간을 말하지 않는다.',
                escalateWhen='손님이 안내를 듣지 못했다며 항의하거나 웨이팅 판단이 애매할 때'),
    'H02': dict(title='인원에 맞는 자리로 처음부터 안내하기',
                situation='2인 손님이 들어왔는데 4인석만 비어 있거나, 뒤에 단체 손님이 올 것 같을 때.',
                actions=['입구에서 인원을 확인하고 그 인원에 맞는 자리로 안내한다',
                         '큰 자리에 안내할 수밖에 없으면 그 자리에서 "단체 손님이 오면 한 번 옮겨 주실 수 있을까요"라고 미리 묻는다',
                         '옮겨야 하면 이유를 설명하고 동의를 받은 뒤 그릇과 잔을 직원이 옮긴다'],
                avoid='앉아서 마시던 손님에게 이유 없이 자리를 옮겨 달라고 하지 않는다. 한 방문에 두 번 이상 옮기게 하지 않는다.',
                escalateWhen='손님이 이동을 거절하는데 단체 예약석과 겹칠 때'),
    'H03': dict(title='최소주문 금액 요구하지 않기',
                situation='한두 명이 맥주 한 잔이나 안주 하나만 주문할 때.',
                actions=['주문 금액과 상관없이 주문을 받는다',
                         '자리가 부족한 시간이면 최소주문이 아니라 이용시간 기준(H01)으로 안내한다'],
                avoid='"2만 원 이상 주문하셔야 해요"처럼 주문 하한을 말하지 않는다.',
                escalateWhen='매장 사정상 예외가 필요하다고 판단될 때(본사 승인 필요)'),
    'H04': dict(title='품절은 주문받을 때 먼저 알리기',
                situation='안주나 주류 일부가 떨어진 상태에서 주문을 받을 때.',
                actions=['근무 시작 때 품절 메뉴를 확인하고 태블릿·POS에 품절로 표시한다',
                         '주문받을 때 "오늘 ○○는 다 떨어졌어요"라고 먼저 말한다',
                         '대체 메뉴는 권하기만 하고, 손님이 고른 뒤에 바꾼다',
                         '가격이나 양이 다르면 차이를 말한다'],
                avoid='손님에게 묻지 않고 다른 메뉴를 내지 않는다.',
                escalateWhen='이미 나간 주문을 바꿔야 해서 손님이 항의할 때'),
    'H05': dict(title='중간결제 때 내역 함께 확인하기',
                situation='손님이 중간에 계산하거나 나눠서 결제하겠다고 할 때.',
                actions=['POS에서 테이블 번호를 소리 내어 확인한다',
                         '결제 전에 주문 내역 화면을 손님에게 보여 주고 확인받는다',
                         '결제 뒤 영수증이나 내역 화면을 드린다',
                         '다음 주문부터 새로 쌓인다는 것을 말한다'],
                avoid='내역 확인 없이 금액만 불러서 결제하지 않는다.',
                escalateWhen='결제한 내역이 다른 테이블 것과 섞였거나 금액이 맞지 않을 때'),
    'H06': dict(title='신분증은 실물과 모바일 신분증 앱만 인정하기',
                situation='어려 보이는 손님이 첫 주문을 할 때, 또는 일행 일부만 신분증을 보여 줄 때.',
                actions=['첫 주문 전에 일행 전원의 신분증을 확인한다',
                         '실물 신분증이나 정부 모바일 신분증 앱 화면에서 생년월일과 사진을 본다',
                         '사진이나 캡처는 받지 않는다',
                         '한 명이라도 확인이 안 되면 그 테이블에는 술을 내지 않는다'],
                avoid='단골이라거나 일행이 성인이라는 말만 믿고 넘어가지 않는다.',
                escalateWhen='위조가 의심되거나 손님이 확인을 거부하며 항의할 때'),
    'H07': dict(title='이물이 나오면 즉시 사과하고 교체하기',
                situation='손님이 음식이나 음료에서 머리카락·벌레 같은 이물이 나왔다고 할 때.',
                actions=['"죄송해요"라고 먼저 사과하고 그 메뉴를 바로 치운다',
                         '새로 내거나 그 메뉴 값을 받지 않는다',
                         '이물 사진과 시각을 남기고 그날 안에 점장에게 보고한다',
                         '같은 재료를 쓰는 메뉴를 한 번 더 점검한다'],
                avoid='"원래 그래요"처럼 변명하거나, 먹은 양만큼 결제하라고 하지 않는다.',
                escalateWhen='손님이 몸이 불편하다고 하거나 보상을 요구할 때'),
    'H08': dict(title='첫 인사와 호출 응답 먼저 하기',
                situation='손님이 들어오거나 벨을 누르고 손을 들 때, 특히 바빠서 바로 갈 수 없을 때.',
                actions=['입장한 손님에게 먼저 인사한다',
                         '호출이 오면 바로 눈을 맞추고 "곧 갈게요"라고 답한다',
                         '늦어지면 지나가며 "조금만 기다려 주세요"라고 한 번 더 말한다'],
                avoid='못 들은 척 지나가거나 반말·면박으로 답하지 않는다.',
                escalateWhen='손님이 직원 태도를 문제 삼아 언성이 높아질 때'),
}


def build_standards():
    return [{
        'id': s['id'], 'topic': s['topic'], 'title': s['title'], 'rule': s['rule'], 'reason': s['reason'],
        'customerNotice': s['customerNotice'], 'version': VERSION, 'virtual': True,
    } for s in STANDARDS]


# ----------------------------------------------------------------------
# 지식: 사람, 카드, 질문, 토픽 요약
# ----------------------------------------------------------------------

def build_knowledge(target_id):
    people = [
        {'id': 'P001', 'storeId': None, 'name': '한지민', 'role': 'SV', 'tenure': '본사 SV 4년차'},
        {'id': 'P002', 'storeId': target_id, 'name': '오세린', 'role': '점장', 'tenure': '5년차'},
        {'id': 'P003', 'storeId': target_id, 'name': '김민지', 'role': '숙련', 'tenure': '2년차'},
        {'id': 'P004', 'storeId': target_id, 'name': '박준호', 'role': '숙련', 'tenure': '1년 6개월'},
        {'id': 'P005', 'storeId': target_id, 'name': '이지우', 'role': '신입', 'tenure': '1주차'},
        {'id': 'P006', 'storeId': target_id, 'name': '최도윤', 'role': '신입', 'tenure': '3일차'},
    ]

    cards = []
    brand_usage = {'H01': (3, 2, 0), 'H02': (1, 1, 0), 'H03': (0, 0, 0), 'H04': (4, 3, 0),
                   'H05': (2, 1, 1), 'H06': (9, 8, 0), 'H07': (2, 2, 0), 'H08': (5, 3, 1)}
    for i, s in enumerate(STANDARDS, 1):
        d = BRAND_CARD_DETAIL[s['id']]
        uses, helpful, nothelpful = brand_usage[s['id']]
        cards.append({
            'id': f'B{i:02d}', 'storeId': None, 'scope': 'brand', 'title': d['title'], 'topic': s['topic'],
            'situation': d['situation'], 'reason': s['reason'], 'actions': d['actions'], 'avoid': d['avoid'],
            'escalateWhen': d['escalateWhen'], 'customerNotice': s['customerNotice'], 'source': '본사 표준',
            'authorId': 'P001', 'status': 'approved', 'origin': '시드', 'created': '2026-10-01', 'updated': '2026-10-01',
            'expires': '2027-09-30', 'tags': s['tags'], 'uses': uses, 'helpful': helpful, 'notHelpful': nothelpful,
            'standardId': s['id'], 'complaintTypes': s['complaints'],
        })

    old = json.loads((SRC / 'old_pocha_seed.json').read_text(encoding='utf-8'))
    author_map = {'P001': 'P002', 'P002': 'P003', 'P003': 'P004', 'P004': 'P003'}
    topic_map = {'신분증 확인': '신분증', '결제·POS': '결제·계산'}
    # 포차 달빛 카드 → 강남 윤슬점 카드. 날짜는 2026-09~11로 옮기고, 주점 맥락에 맞게 상황 문장을 고친다.
    overrides = {
        'C001': dict(situation='주말 밤에 20대 초반 손님이 많고, 미성년자처럼 보이는 손님이 술을 주문함.',
                     created='2026-09-01', updated='2026-10-02', expires='2027-09-30',
                     standardId='H06', complaintTypes=['신분증']),
        'C002': dict(situation='매주 오는 단골 테이블이 와서 바로 생맥주를 시킴.', created='2026-09-20',
                     updated='2026-09-20', expires='2027-03-20', complaintTypes=['신분증']),
        'C003': dict(created='2026-09-03', updated='2026-10-15', expires='2027-04-15'),
        'C004': dict(situation='금요일 밤에 살얼음 생맥주 케그가 바닥났고 여분 케그도 없음.',
                     created='2026-09-05', updated='2026-10-15', expires='2027-04-15',
                     standardId='H04', complaintTypes=['품절·대체']),
        'C005': dict(created='2026-09-08', updated='2026-10-15', expires='2027-04-15',
                     standardId='H04', complaintTypes=['품절·대체']),
        'C006': dict(created='2026-09-10', updated='2026-10-20', expires='2027-04-20'),
        'C007': dict(created='2026-09-01', updated='2026-10-02', expires='2027-09-30', complaintTypes=['결제·계산']),
        'C008': dict(situation='회식 손님 8명이 각자 카드로 나눠 내겠다고 함.', created='2026-09-12',
                     updated='2026-10-20', expires='2027-04-20', complaintTypes=['결제·계산']),
        'C009': dict(created='2026-05-14', updated='2026-09-15', expires='2026-11-10', complaintTypes=['결제·계산']),
        'C010': dict(created='2026-09-01', updated='2026-10-02', expires='2027-09-30'),
        'C011': dict(title='12월 회식 시즌엔 생맥주·소주를 평소의 1.5배로',
                     situation='12월 평일 저녁에는 근처 회사 회식 2차 손님이 밤 9시 이후 한꺼번에 몰림.',
                     reason='작년 12월 둘째 주 금요일 밤 10시쯤 생맥 케그가 바닥나 병맥주로 돌렸고 소주도 마감 전에 떨어졌다. 회식 시즌 금요일에는 평소 같은 요일보다 1.5배쯤 나갔다.',
                     actions=['12월 첫 주부터 금요일 전날까지 생맥 케그와 소주를 평소의 1.5배로 주문한다',
                              '여분 케그는 냉장 창고에 세워 둔다', '금요일 밤 8시에 남은 케그를 한 번 확인한다'],
                     avoid='회식이 몰린 당일에 추가 주문을 넣지 않는다. 주류 도매가 당일 배송을 못 한다.',
                     escalateWhen='연말 예약이 평소보다 크게 늘거나 줄 때',
                     tags=['회식', '연말', '주문', '생맥', '소주'],
                     created='2026-10-28', updated='2026-11-10', expires='2027-01-31'),
        'C012': dict(created='2026-10-05', updated='2026-10-05', expires='2027-04-05'),
        'C013': dict(created='2026-10-08', updated='2026-10-08', expires='2027-04-08'),
        'C014': dict(created='2026-11-07', updated='2026-11-07', expires='2027-03-07'),
    }
    usage = {'C001': (34, 30, 1), 'C002': (6, 3, 2), 'C003': (41, 37, 1), 'C004': (12, 11, 0), 'C005': (9, 8, 0),
             'C006': (22, 19, 1), 'C007': (5, 5, 0), 'C008': (17, 15, 0), 'C009': (8, 7, 0), 'C010': (4, 4, 0),
             'C011': (1, 1, 0), 'C012': (1, 1, 0), 'C013': (6, 6, 0), 'C014': (2, 2, 0)}
    for c in old['cards']:
        o = overrides.get(c['id'])
        if o is None:
            continue
        merged = {**c, **o}
        uses, helpful, nothelpful = usage[c['id']]
        card = {
            'id': c['id'], 'storeId': target_id, 'scope': 'store', 'title': merged['title'],
            'topic': topic_map.get(c['topic'], c['topic']), 'situation': merged['situation'], 'reason': merged['reason'],
            'actions': merged['actions'], 'avoid': merged['avoid'], 'escalateWhen': merged['escalateWhen'],
            'source': c['source'], 'authorId': author_map[c['authorId']], 'status': 'approved', 'origin': c['origin'],
            'created': merged['created'], 'updated': merged['updated'], 'expires': merged['expires'],
            'tags': merged['tags'], 'uses': uses, 'helpful': helpful, 'notHelpful': nothelpful,
        }
        for k in ('standardId', 'complaintTypes'):
            if k in o:
                card[k] = o[k]
        cards.append(card)

    questions = [
        {'id': 'Q001', 'storeId': target_id, 'text': '모바일 신분증 앱 화면으로 보여 줘도 되나요?', 'askerId': 'P006',
         'time': '2026-11-12T19:12:00', 'status': 'answered',
         'answer': '1. 돼요. 정부 모바일 신분증 앱 화면은 실물 신분증과 같이 인정해요 [B06]\n2. 화면에서 생년월일과 사진을 확인해요 [C001]\n3. 사진이나 캡처 화면은 받지 않아요 [B06]',
         'why': '청소년에게 술을 팔면 영업정지 처분을 받을 수 있어서, 본사 표준이 인정하는 신분증만 받아요.',
         'cited': ['B06', 'C001'], 'confidence': 'high', 'feedback': 'solved'},
        {'id': 'Q002', 'storeId': target_id, 'text': '생맥주가 거품만 나와요. 케그 바꿔야 하나요?', 'askerId': 'P005',
         'time': '2026-11-14T20:05:00', 'status': 'answered',
         'answer': '1. 케그를 들어 보고 가벼우면 빈 케그예요 [C003]\n2. 가스 밸브를 먼저 잠그고 커플러를 빼요 [C003]\n3. 새 케그는 흔들지 말고 연결하고, 처음 두세 잔은 버려요 [C003]',
         'why': '순서 없이 커플러를 빼면 남은 압력 때문에 맥주가 튀고, 흔들린 케그는 한동안 거품만 나와요.',
         'cited': ['C003'], 'confidence': 'high', 'feedback': 'solved'},
        {'id': 'Q003', 'storeId': target_id, 'text': '단골이라면서 신분증을 안 보여 주시는데 그냥 받아도 돼요?', 'askerId': 'P005',
         'time': '2026-11-16T21:30:00', 'status': 'resolved',
         'answer': '매장 카드 [C002]와 본사 표준 [B06]이 서로 달라서 점장님께 질문을 넘겼어요.',
         'why': '본사 표준은 단골이어도 신분증 확인을 생략하지 않는다고 정하고 있어요.',
         'cited': ['B06', 'C002'], 'confidence': 'low', 'feedback': 'solved',
         'managerAnswer': '단골이어도 신분증은 매번 확인해요. 본사 표준 B06이 우선이에요. C002 카드는 이번 주에 정리할게요.'},
    ]

    topic_summaries = {
        '이용시간': '본사 표준 카드 B01만 있어요. 강남 윤슬점 매장 카드는 아직 없어요.',
        '좌석 배정': '본사 표준 카드 B02만 있어요. 매장 카드는 아직 없어요.',
        '최소주문': '본사 표준 카드 B03(최소주문 없음)만 있어요.',
        '품절·대체': '본사 표준 B04와, 생맥주·소주가 떨어졌을 때 대신 권하는 매장 카드 C004·C005가 있어요.',
        '결제·계산': '본사 표준 B05와, 단체 나눠 결제(C008)·카드 승인 확인(C009) 매장 카드가 있어요. C009는 만료일이 지났어요. 중간결제 확인 매장 카드는 아직 없어요.',
        '신분증': '본사 표준 B06과 매장 카드 C001이 같은 기준이에요. C002(단골 생략)는 본사 표준과 달라 점검이 필요해요.',
        '이물·위생': '본사 표준 카드 B07만 있어요.',
        '응대 기본': '본사 표준 카드 B08만 있어요.',
        '주류·케그': '생맥주 케그 교체 순서(C003)가 있어요.',
        '취객·분쟁 응대': '만취 손님 추가 주문(C006)과 계산 없이 나가는 손님(C007) 카드가 있어요.',
        '단체 예약': '단체 예약 노쇼 처리(C010) 카드가 있어요.',
        '재고·발주': '회식 시즌·경기 날 주문량(C011·C012), 마감 실사(C013·C014) 카드가 있어요.',
    }
    topics = {c['topic'] for c in cards}
    assert topics <= set(topic_summaries), topics - set(topic_summaries)
    return {'people': people, 'cards': cards, 'questions': questions, 'topicSummaries': topic_summaries}


# ----------------------------------------------------------------------
# 처방 이후 가상 리뷰 (강남 윤슬점, 2026-11-19 ~ 2026-12-16)
# ----------------------------------------------------------------------

VIRTUAL_AFTER = [
    ('카카오', 4, '2026-11-19', '입구에서 이용 안내를 먼저 해 주셔서 마음 편하게 마셨어요. 살얼음 맥주는 여전히 시원하고 감자튀김도 바삭했어요.'),
    ('네이버', 4.5, '2026-11-20', '예전 리뷰 보고 걱정했는데 둘이 갔더니 바로 맞는 자리로 안내해 주시고, 끝날 때쯤 한 번만 알려 주셔서 괜찮았어요. 바지락탕 국물 맛있어요.'),
    ('카카오', 2, '2026-11-21', '금요일이라 그런지 안주가 한참 뒤에 나왔어요. 불러도 대답이 늦고요. 입장 안내는 해 주던데 서빙은 아직 별로예요.'),
    ('네이버', 3.5, '2026-11-22', '맥주는 맛있는데 테이블이 아직 좀 끈적해요. 직원분들은 전보다 친절해진 느낌이에요.'),
    ('카카오', 5, '2026-11-23', '중간에 정리할 때 주문 내역을 같이 확인해 주시고 내역서도 챙겨 주셨어요. 당연한 건데 여기서는 처음이라 좋았네요.'),
    ('카카오', 1, '2026-11-24', '남자 직원 한 명이 여전히 퉁명스러워요. 물어보면 대답도 제대로 안 하고 가 버리네요.'),
    ('네이버', 4, '2026-11-25', '주문할 때 오늘 먹태는 다 나갔다고 먼저 말해 줘서 다른 걸로 골랐어요. 하이볼 맛있었어요.'),
    ('카카오', 4, '2026-11-26', '웨이팅 있는 날이라 두 시간 이용이라고 들어갈 때 들었어요. 먼저 알려 주니까 불만은 없는데 음식이 조금 느렸어요.'),
    ('카카오', 4, '2026-11-28', '둘이 갔는데 들어가자마자 2인석으로 안내해 줘서 중간에 옮길 일 없었어요. 염통꼬치 추천해요.'),
    ('네이버', 2, '2026-11-29', '치킨에서 머리카락이 나왔어요. 바로 새로 해 주시긴 했는데 기분은 좀 그랬어요.'),
    ('카카오', 3, '2026-11-30', '사람이 많아서 정신없고 시끄러워요. 직원분들 바빠 보였지만 응대는 예전보다 나아졌다고 느꼈어요.'),
    ('네이버', 4, '2026-12-01', '가성비 좋고 맥주가 정말 시원해요. 입장할 때 안내를 꼼꼼하게 해 주셨어요.'),
    ('카카오', 1, '2026-12-02', '들어간 지 1시간 반 만에 웨이팅 있다고 나가 달라고 하더라고요. 입구에서 안내는 받았지만 생각보다 빨라서 당황했어요.'),
    ('네이버', 3.5, '2026-12-03', '안주 맛은 무난했어요. 다만 직원분이 주문을 한 번 까먹어서 다시 말했어요.'),
    ('카카오', 4, '2026-12-04', '신분증 확인을 첫 주문 전에 다 같이 해서 오히려 깔끔했어요. 모바일 신분증도 됐어요.'),
    ('카카오', 2, '2026-12-05', '바닥이 미끄럽고 화장실에서 냄새가 나요. 위생은 아직 손봐야 할 것 같아요.'),
    ('네이버', 5, '2026-12-06', '회식 2차로 여덟 명이 왔는데 바로 자리 잡아 주시고 친절했어요. 파인애플 맥주 최고예요.'),
    ('카카오', 4, '2026-12-08', '맥주는 좋은데 감자튀김이 식어서 나왔어요. 다시 데워 달라고 하니 바로 해 주셨어요.'),
    ('네이버', 4, '2026-12-09', '벨 누르자마자 대답해 주셔서 좋았어요. 바지락탕 양도 넉넉해요.'),
    ('카카오', 1, '2026-12-10', '알바생이 반말 섞어서 말하고 표정이 너무 안 좋았어요. 다른 건 몰라도 태도는 그대로네요.'),
    ('네이버', 4, '2026-12-11', '가격 대비 괜찮아요. 웨이팅 없으면 시간 신경 안 써도 된다고 해서 편하게 있다 왔어요.'),
    ('카카오', 4, '2026-12-13', '예전엔 2만 원 넘게 시켜야 한다고 들었는데 이번엔 그런 말 없었어요. 한 잔만 하고 가기 좋아요.'),
    ('네이버', 3, '2026-12-14', '테이블 간격이 좁고 시끄러워서 대화하기 힘들어요. 직원분은 친절했지만 매장이 너무 붐벼요.'),
    ('카카오', 4, '2026-12-16', '연말이라 붐볐는데도 들어갈 때 이용 안내랑 오늘 안 되는 메뉴를 먼저 알려 주셨어요. 하이볼 맛있었어요.'),
]


def build_virtual_after(target_id):
    return [{
        'id': f'V{i:03d}', 'storeId': target_id, 'platform': p, 'star': s, 'date': d, 'text': t,
        'tags': tag(t), 'tagVia': 'rules', 'virtual': True,
    } for i, (p, s, d, t) in enumerate(VIRTUAL_AFTER, 1)]


# ----------------------------------------------------------------------
# 쓰기와 점검
# ----------------------------------------------------------------------

def write_json(name, data, one_per_line=False):
    path = OUT / name
    if one_per_line:
        body = '[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False) for x in data) + '\n]\n'
    else:
        body = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    path.write_text(body, encoding='utf-8')


def leak_check(store_rows):
    yj = [r for r in store_rows if r['브랜드'] == BRAND]
    needles = {}
    for r in yj:
        needles[stem_of(r['매장명'])] = '지점명'
        if r['도로명주소'].strip():
            needles[r['도로명주소'].strip()] = '주소'
        for k in ('카카오_place_id', '네이버_place_id'):
            if r[k].strip():
                needles[r[k].strip()] = k
    hits = []
    for f in sorted(OUT.glob('*.json')):
        text = f.read_text(encoding='utf-8')
        for n, kind in needles.items():
            c = text.count(n)
            if c:
                hits.append((f.name, kind, n, c))
    return len(needles), hits


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    store_rows = read_csv('매장_통합.csv')
    review_rows = read_csv('리뷰_통합.csv')

    stores, id_by_pid, yj = build_stores(store_rows)
    target = next(s for s in stores if s['isTarget'])
    protected = [stem_of(r['매장명']) for r in yj]
    anon = Anonymizer(build_branch_tokens(store_rows, protected), protected, [r['도로명주소'].strip() for r in yj])
    reviews = build_reviews(review_rows, id_by_pid, anon)
    standards = build_standards()
    knowledge = build_knowledge(target['id'])
    after = build_virtual_after(target['id'])
    brand = {'id': 'yeokjeon', 'name': BRAND, 'storeCount': len(stores), 'ftcStoreCount': 968,
             'standardsVersion': VERSION, 'dataAsOf': DATA_AS_OF}

    write_json('brand.json', brand)
    write_json('stores.json', stores, one_per_line=True)
    write_json('reviews.json', reviews, one_per_line=True)
    write_json('standards.json', standards)
    write_json('knowledge.json', knowledge)
    write_json('virtual_after.json', after, one_per_line=True)

    # ---- 점검 출력 ----
    print('== 파일별 건수')
    print(f'brand.json        storeCount={brand["storeCount"]}')
    print(f'stores.json       {len(stores)}  (excluded {sum("excluded" in s for s in stores)}, area {dict(Counter(s["area"] for s in stores))})')
    print(f'reviews.json      {len(reviews)}  {dict(Counter(r["platform"] for r in reviews))}  빈 본문 {sum(not r["text"] for r in reviews)}')
    print(f'standards.json    {len(standards)}')
    k = knowledge
    print(f'knowledge.json    people {len(k["people"])}, cards {len(k["cards"])} '
          f'(brand {sum(c["scope"] == "brand" for c in k["cards"])}, store {sum(c["scope"] == "store" for c in k["cards"])}), '
          f'questions {len(k["questions"])}, topics {len(k["topicSummaries"])}')
    stars = [r['star'] for r in after]
    print(f'virtual_after.json {len(after)}  mean {sum(stars) / len(stars):.2f}  '
          f'low(≤2) {sum(s <= 2 for s in stars)}  tags {dict(Counter(t for r in after for t in r["tags"]))}')
    tr = [r for r in reviews if r['storeId'] == target['id']]
    print(f'== 타깃 매장 (리뷰 {len(tr)}건)')
    print(json.dumps(target, ensure_ascii=False))
    print('== 익명화 치환 건수(리뷰 단위)', dict(anon.stats))
    n, hits = leak_check(store_rows)
    print(f'== 실명 점검: 검사 문자열 {n}개, 남은 건수 {sum(h[3] for h in hits)}')
    for h in hits:
        print('  HIT', h)


if __name__ == '__main__':
    main()
