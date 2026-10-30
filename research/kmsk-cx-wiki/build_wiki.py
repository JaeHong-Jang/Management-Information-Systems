from pathlib import Path
import csv, json, html, re
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parent
def write(path, text):
    p=ROOT/path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text.strip()+'\n',encoding='utf-8')

# Findings are concise paraphrases of the linked scholarly records, not full-text reproductions.
rows = [
('P01','A Dynamic Theory of Organizational Knowledge Creation','Ikujiro Nonaka',1994,'Organization Science 5(1), 14–37','10.1287/orsc.5.1.14','https://pubsonline.informs.org/doi/abs/10.1287/orsc.5.1.14','이론','출판사 초록','암묵지와 형식지의 상호작용을 통해 조직 지식이 만들어지는 과정을 설명한다.','현장 직원의 예외 처리 이유를 기록하고 다른 직원이 재사용하는 구조의 이론적 근거.','이론 논문이며 AI 서비스의 효과를 실증한 연구가 아니다.','I02 I04'),
('P02','Review: Knowledge Management and Knowledge Management Systems: Conceptual Foundations and Research Issues','Maryam Alavi; Dorothy E. Leidner',2001,'MIS Quarterly 25(1), 107–136','10.2307/3250961','https://www.cs.unibo.it/gaspari/www/teaching/14_KM_KMsystems_Alavi_MISQ.pdf','문헌 검토','공개 원문 검색 발췌·서지','지식경영과 이를 지원하는 정보시스템의 개념 및 연구 이슈를 정리한다.','고객 정보를 저장하는 단계와 실제 업무에 지식을 적용하는 단계를 구분하는 설계 틀.','원문 전체를 정독하지 않았으며 최신 LLM에 대한 성능 근거는 아니다.','I01 I02 I04'),
('P03','Five Styles of Customer Knowledge Management, and How Smart Companies Use Them To Create Value','Michael Gibbert; Marius Leibold; Gilbert Probst',2002,'European Management Journal 20(5), 459–469','','https://search.usi.ch/index.php/publications/5067/five-styles-of-customer-knowledge-management-and-how-smart-companies-use-them-to-create-value','개념·사례','저자 소속기관 서지 및 공개 초록','고객을 정보의 대상뿐 아니라 지식을 가진 참여자로 보는 고객지식경영을 제안한다.','고객이 직접 인계 정보를 수정하거나 해결 경험을 남기는 설계의 출발점.','개념·사례 근거이며 고객 참여 기능의 인과적 효과는 별도 검증해야 한다.','I01 I04 I07'),
('P04','Understanding Customer Experience Throughout the Customer Journey','Katherine N. Lemon; Peter C. Verhoef',2016,'Journal of Marketing 80(6)','10.1509/jm.15.0420','https://doi.org/10.1509/jm.15.0420','문헌 검토','출판사 초록·기관 공개 원문 발췌','고객 경험을 여러 채널과 접점이 연결된 시간적 여정으로 다룬다.','접점 하나의 응답 속도뿐 아니라 문의부터 해결까지의 전체 노력을 측정.','고객 여정 이론은 특정 인계 기능의 효과 크기를 보장하지 않는다.','I01 I03 I05 I06'),
('P05','Service Blueprinting: A Practical Technique for Service Innovation','Mary Jo Bitner; Amy L. Ostrom; Felicia N. Morgan',2008,'California Management Review 50(3), 66–94','10.2307/41166446','https://csl.wpcarey.asu.edu/service-blueprinting-a-practical-technique-for-service-innovation','방법·사례','저자 소속기관 연구 소개','고객 경험, 직원 활동, 내부 지원 프로세스의 연결을 시각화하는 서비스 블루프린트를 제시한다.','고객 화면과 담당자·지식 관리자 업무를 한 장에 연결해 설계.','방법론의 유용성과 제안 서비스의 실제 성과는 구별해야 한다.','I01 I02 I03 I05'),
('P06','Customer Evaluations of Service Complaint Experiences: Implications for Relationship Marketing','Stephen S. Tax; Stephen W. Brown; Murali Chandrashekaran',1998,'Journal of Marketing 62(2)','10.1177/002224299806200205','https://doi.org/10.1177/002224299806200205','실증','출판사 초록','불만 처리를 결과·절차·대인적 대우의 공정성으로 평가하며 처리 만족과 신뢰·몰입의 관계를 다룬다.','보상 금액 외에 설명, 선택권, 처리 절차의 일관성을 평가 지표에 포함.','오래된 일반 서비스 연구로 생성형 AI의 효과를 직접 검증하지 않았다.','I01 I04 I05'),
('P07','Generative AI at Work','Erik Brynjolfsson; Danielle Li; Lindsey Raymond',2025,'The Quarterly Journal of Economics 140(2), 889–942','10.1093/qje/qjae044','https://doi.org/10.1093/qje/qjae044','현장 도입 분석','출판사 초록·공개 본문 일부','고객지원 직원 5,172명의 단계적 도입 자료에서 시간당 해결 건수가 평균 15% 증가했다. 경험·숙련도에 따라 효과가 달랐다.','숙련자의 지식을 초보 직원에게 전달하는 지원 도구를 우선 검증할 이유.','단일 조직 맥락의 결과를 국내 소상공인이나 완전 자동 상담 성과로 일반화할 수 없다. 구판의 14% 수치와 혼용 금지.','I01 I02'),
('P08','Experimental evidence on the productivity effects of generative artificial intelligence','Shakked Noy; Whitney Zhang',2023,'Science 381(6654), 187–192','10.1126/science.adh2586','https://doi.org/10.1126/science.adh2586','무작위 실험','출판사·PubMed 초록','전문직 453명의 글쓰기 실험에서 AI 제공 집단은 평균 소요 시간이 40% 줄고 산출물 품질은 18% 높았다.','답변 초안·업무 기록 작성 시간을 측정할 근거.','글쓰기 실험이므로 고객 만족, 실제 문제 해결, 장기 학습 성과로 바꾸어 인용하면 안 된다.','I02 I04'),
('P09','Blame the Bot: Anthropomorphism and Anger in Customer–Chatbot Interactions','Cammy Crolic; Felipe Thomaz; Rhonda Hadi; Andrew T. Stephen',2022,'Journal of Marketing 86(1), 132–148','10.1177/00222429211045687','https://www.ama.org/blame-the-bot-anthropomorphism-and-anger-in-customer-chatbot-interactions/','현장자료·실험','학회 소개·저자 기관 공개 원문 발췌','5개 연구에서 화가 난 상태의 고객에게 챗봇 의인화가 만족·기업 평가 등에 부정적 영향을 보였다.','감정이 격한 고객에게 과한 친근함보다 빠른 사람 연결과 문제 해결 정보를 제공.','모든 고객에게 인간형 인터페이스가 나쁘다는 결론은 아니다. 온라인 선게재 2021년, 권호 2022년.','I01 I04'),
('P10','Artificial Intelligence in Utilitarian vs. Hedonic Contexts: The “Word-of-Machine” Effect','Chiara Longoni; Luca Cian',2022,'Journal of Marketing 86(1), 91–108','10.1177/0022242920957347','https://journals.sagepub.com/doi/10.1177/0022242920957347','다중 실험','출판사 초록','실용적·쾌락적 속성의 중요성과 AI 추천 선호의 관계를 검증하며 개인의 고유 취향 등 경계조건을 제시한다.','사실 확인과 취향 판단을 구분하고 고객이 추천 근거와 담당 주체를 선택하게 한다.','분야별 사람·AI 선호가 고정되어 있다는 뜻은 아니다. 선게재 2020년, 권호 2022년.','I06 I07'),
('P11','When combinations of humans and AI are useful: A systematic review and meta-analysis','Michelle Vaccaro; Abdullah Almaatouq; Thomas Malone',2024,'Nature Human Behaviour 8, 2293–2303','10.1038/s41562-024-02024-1','https://www.nature.com/articles/s41562-024-02024-1','체계적 문헌고찰·메타분석','공개 본문 결과·방법 일부','106개 실험, 370개 효과크기 분석에서 인간-AI 조합은 평균적으로 인간 단독보다 좋았지만 인간·AI 중 더 나은 단독 기준보다 낮았다.','인간 단독·AI 단독·협업을 모두 비교하고 검수자의 과신도 측정.','연구 간 이질성이 크며 포함 실험의 발표 기간은 2020년부터 2023년 6월까지다.','I01 I02 I08'),
('P12','Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks','Patrick Lewis et al.',2020,'NeurIPS 2020','10.48550/arXiv.2005.11401','https://arxiv.org/abs/2005.11401','기술 실험','저자 공개 초록','외부 검색 메모리와 생성 모델을 결합해 지식 집약 과제를 수행한다.','규정과 승인된 사례를 검색하고 출처를 붙이는 상담 지원의 기술적 기초.','초기 RAG의 과제 성능이 최신 서비스의 무환각·정책 준수를 보장하지 않는다.','I01 I02 I05 I08'),
('P13','Lost in the Middle: How Language Models Use Long Contexts','Nelson F. Liu et al.',2024,'Transactions of the Association for Computational Linguistics 12, 157–173','10.1162/tacl_a_00638','https://aclanthology.org/2024.tacl-1.9/','기술 실험','학회 초록·공개 원문 발췌','관련 정보가 긴 입력의 어디에 놓이는지에 따라 모델 성능이 변하는 현상을 검증했다.','상담 기록 전체를 붙이는 방법과 구조화된 인계 카드를 비교.','연구 당시 모델 결과이며 현재 모든 모델이 같은 정도로 실패한다고 단정할 수 없다.','I01 I08'),
('P14','τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains','Shunyu Yao; Noah Shinn; Pedram Razavi; Karthik Narasimhan',2024,'arXiv 연구보고서','10.48550/arXiv.2406.12045','https://arxiv.org/abs/2406.12045','벤치마크','저자 공개 초록','도구·정책·사용자 상호작용을 결합하고 최종 데이터베이스 상태 및 반복 성공의 일관성을 평가한다.','답변이 그럴듯한지를 넘어 환불·변경의 최종 상태가 맞는지 평가.','이번 조사에서는 arXiv 공개본 기준. 시뮬레이션 성과는 실제 고객 만족과 별개.','I01 I08'),
('P15','τ²-Bench: Evaluating Conversational Agents in a Dual-Control Environment','Victor Barres; Honghua Dong; Soham Ray; Xujie Si; Karthik Narasimhan',2025,'arXiv 연구보고서','10.48550/arXiv.2506.07982','https://arxiv.org/abs/2506.07982','벤치마크','저자 공개 초록','고객과 에이전트가 함께 환경을 바꾸는 기술지원 과제를 도입하고 추론과 소통·조정 실패를 구분한다.','시니어 안내나 기기 문제 해결에서 사용자가 실제 단계를 수행했는지 확인.','이번 조사에서는 arXiv 공개본 기준. 시뮬레이션 사용자와 실제 시니어는 다르다.','I03 I08'),
('P16','생성형 AI는 인간 관리자를 대체할 수 있는가? 자동 생성된 관리자 응답이 고객에 미치는 영향','박예은; 안현철',2023,'지식경영연구 24(4), 153–176','10.15813/kmr.2023.24.4.008','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003028527','실험·설문','KCI 초록','음식 배달 리뷰 맥락에서 긍정 리뷰와 달리 부정 리뷰는 인간 관리자의 개입이 더 바람직하다고 보고했다.','부정적 경험 처리 시 담당자 검토와 이관 기능의 직접적인 국내 근거.','초록 확인 범위이며 표본·자극물·세부 효과크기는 원문 확인 전 확정하지 않는다.','I01 I04'),
('P17','디지털 트랜스포메이션 시대, 시니어 소비자의 디지털 소비여건 신뢰 형성 요인 연구','전미나; 김미예; 한정수',2022,'지식경영연구 23(4), 91–112','10.15813/kmr.2022.23.4.005','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002912987','2차 자료 실증','KCI 초록','60대 이상 1,703명의 자료에서 소비 역량·기업책임인식·문제해결 창구 인식과 디지털 신뢰의 관계를 확인했다.','도움 요청 경로를 눈에 보이게 하고 스스로 처리할 수 있다는 경험을 제공.','관찰자료의 관련성을 UI 개편의 인과적 효과로 해석하지 않는다.','I03'),
('P18','BERTopic 모델을 이용한 항공사 서비스에서 지각된 고객가치가 고객 만족도에 미치는 영향 분석','정의주; 이병현; LI QINGLONG; 김재경',2023,'지식경영연구 24(3), 95–125','10.15813/kmr.2023.24.3.006','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002999768','리뷰 데이터 분석','KCI 초록','Skytrax 리뷰·평점에서 9개 고객가치 요소를 도출하고 6개 요소와 만족도의 관련성을 보고했다.','리뷰를 문제 유형별로 묶고 개선 작업과 연결하는 분석 출발점.','리뷰 작성자 편향과 상관관계의 한계가 있다. 항공사의 요인 체계를 카페에 그대로 적용하지 않는다.','I04 I06'),
('P19','지식 기반 QA개선을 위한 Advanced RAG 시스템 구현 방법: Graph Agent 활용','정천수',2024,'지식경영연구 25(3), 99–119','10.15813/kmr.2024.25.3.005','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003120450','시스템 구현','KCI 초록','LangGraph를 이용해 검색 정보의 신뢰성을 평가하고 종합하는 구현 방법을 제시했다.','검색·근거 확인·재검색·사람 검토를 분리하는 흐름 설계.','초록만으로 비교 성능을 확정할 수 없다. LangGraph 제어 흐름과 지식그래프를 혼동하지 않는다.','I01 I02 I08'),
('P20','생성형 AI에 대한 신뢰와 구매의도: 촉진과 억제요인 중심으로','박대성; 김헌준; 장혜원; 박일수',2025,'지식경영연구 26(3), 175–202','10.15813/kmr.2025.26.3.009','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003248276','설문·PLS-SEM','KCI 초록','사용자 376명의 자료에서 정보품질의 촉진 효과와 프라이버시 염려를 통한 억제 경로를 보고했다.','도움이 되는 정보량과 고객이 허용한 공유 범위를 함께 설계.','자기보고 구매의도를 실제 구매나 보안 수준으로 동일시하지 않는다.','I01 I07'),
('P21','생성형 AI에 대한 감정요인이 AI 리터러시와 프라이버시 우려에 미치는 영향','김현정; 노환호; 문지원; 이정현; 김범수',2024,'지식경영연구 25(4), 1–30','10.15813/kmr.2024.25.4.001','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003157393','설문·PLS-SEM','KCI 초록','성인 사용자 500명 자료에서 AI 리터러시와 프라이버시 우려의 관계 등을 분석했다.','교육만 늘리면 개인정보 우려가 사라진다고 가정하지 않고 공유 통제를 제공.','횡단 설문이므로 교육 개입의 인과 효과로 해석하지 않는다.','I03 I07'),
('P22','대규모 언어 모델(LLM) 환경의 프라이버시 리스크 대응을 위한 개념 모델 제안','장재영; 김범수; 이중엽',2025,'지식경영연구 26(2), 23–42','10.15813/kmr.2025.26.2.002','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003213984','개념 모델','KCI 초록','수집부터 학습·서비스 제공까지 개인정보 생애주기의 위험을 정보주체 관점에서 다룬다.','개인별 상담 기록과 재사용용 지식 카드를 분리하고 수정·삭제 경로를 설계.','법률 준수 인증이나 실제 시스템의 보호 성능을 입증한 연구는 아니다.','I01 I02 I07'),
('P23','지각된 신뢰성의 역할: 인간과 AI 에이전트 선택에서 서비스 영역의 상호작용 효과','임가영; 김애경',2025,'지식경영연구 26(3), 151–174','10.15813/kmr.2025.26.3.008','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003248132','실증','KCI 초록·권호 페이지','의료·금융 맥락의 인간·AI 선호 차이와 지각된 신뢰성의 매개 역할을 분석했다.','서비스 영역과 고객의 사람 연결 선택을 설계 변수로 둔다.','실제 진료·금융 성과 검증이 아니며 해당 영역의 자동 의사결정을 정당화하지 않는다.','I01 I05 I06'),
('P24','온라인 쇼핑몰 챗봇 사용자의 활용의도에 영향을 미치는 요인에 대한 실증 연구','김태하 외',2020,'지식경영연구 21(4), 211–225','10.15813/kmr.2020.21.4.011','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002668293','설문·회귀분석','KCI 초록·서지','300부 설문에서 개인화·지능성·사회적 실재감·개인정보 위험과 활용 의도의 관계를 분석했다. 응대 정확성은 축소·포기 의도와 관련됐다.','사용 의향뿐 아니라 포기·이탈과 정확성을 평가.','생성형 AI 이전 챗봇 연구이며 전체 공저자 표기는 제출용 원문에서 추가 확인.','I01 I03 I07'),
('P25','의료서비스 실패 유형에 따른 서비스 회복 공정성이 고객 만족 및 장기 관계 지향성에 미치는 영향: 다중집단분석을 활용하여','조성찬; 이훈영',2017,'의료경영학연구 11(2), 27–39','10.18014/hsmr.2017.11.2.27','https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002239935','실증 연구','KCI 초록','의료서비스 실패 유형, 회복 공정성, 고객 만족 및 장기 관계 지향성의 관계를 연구한다.','병원 행정 안내를 다룰 경우 대우·절차의 공정성을 평가하는 보조 문헌.','확인한 초록에 세부 계수와 표본이 없어 특정 효과가 입증됐다고 쓰지 않는다.','I05'),
]
keys=['id','title','authors','year','venue','doi','url','method','access','finding','application','limitation','ideas']
papers=[dict(zip(keys,r)) for r in rows]
write('papers.json',json.dumps(papers,ensure_ascii=False,indent=2))
with (ROOT/'papers.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(papers)
for p in papers:
    related=' · '.join(f'[{i}](../ideas/{i}.md)' for i in p['ideas'].split())
    write(f"papers/{p['id']}.md",f"""# {p['id']} · {p['title']}

[위키 홈](../README.md) · [논문 목록](../literature.md)

| 항목 | 내용 |
|---|---|
| 저자 | {p['authors']} |
| 발행연도 | {p['year']} |
| 학술지·공개처 | {p['venue']} |
| DOI | {p['doi'] or '이번 조사에서 미기입'} |
| 연구 방식 | {p['method']} |
| 실제 확인 범위 | {p['access']} |
| 확인일 | 2026-10-31 |

## 확인한 내용

{p['finding']} [출처 확인]({p['url']})

## 아이디어에 적용할 점 — 조사자의 해석

{p['application']}

## 한계와 원문 확인 사항

{p['limitation']} 표본 모집, 측정 문항, 효과크기, 통계표를 확인하지 않은 경우 제출 문서에 만들어 넣지 않는다.

## 연결된 아이디어

{related}
""")

write('literature.md','''# 논문 지도

[위키 홈](README.md) · [검색 방법과 한계](research-log.md) · [CSV 다운로드](papers.csv)

국내 10편(지식경영연구 9편 포함), 해외 15편의 선별 문헌 지도다. 전수 수집이나 25편 전체 원문 정독을 뜻하지 않는다. 해외 문헌에는 arXiv 공개 연구보고서가 포함된다. 논문 카드에서 실제 확인 범위를 확인할 수 있다.

먼저 읽을 순서: **P16 → P07 → P09 → P04 → P01 → P11 → P19**. 고객 문제, 현장 효과, 반례, 고객 여정, 지식경영, 협업 검증, 구현 순서다.

| ID | 논문 | 연도 | 연구 방식 | 연결 |
|---|---|---:|---|---|
'''+ '\n'.join(f"| [{p['id']}](papers/{p['id']}.md) | {p['title']} | {p['year']} | {p['method']} | {p['ideas']} |" for p in papers))

ideas=[
('I01','다시 설명하지 않아도 되는 고객 상담','고객 확인형 인계 카드와 서비스 회복 지식 위키','환불·교환 상담 중 챗봇, 직원, 다른 부서로 이동하며 사정을 반복하는 고객.','이미 한 시도와 원하는 해결을 한 번 확인하면 다음 담당자가 이어서 해결한다.','고객이 문의 → AI가 사실·시도·미해결·요청을 구분 → 고객이 수정·공유 선택 → 사람이 처리 → 확인된 해결 사례만 지식 위키에 반영.','고객 확인·수정이 가능한 인계 카드, 원문 근거 연결, 정책 버전, 실패한 조치, 해결 여부를 같이 기록한다.','상담 이관·요약·사람 검토는 Intercom 등에 이미 있다. 차별화 가설은 고객의 인계 정보 통제와 예외 처리 지식의 품질 관리가 추가로 도움이 되는지다.','가상의 온라인 학회 굿즈숍에서 주문 오류·교환·배송 지연 3유형, 정책 10개, 사례 30개로 데모. 실제 결제 없이 처리 상태만 변경.','일반 이관 / 자동 요약 / 고객 확인형 구조화 인계 3조건. 같은 문의 난이도로 재설명 횟수·오류·고객 노력·해결 시간을 비교.','반복 설명 수, 핵심 정보 누락률, 정책 오류율, 해결 성공률, 총 처리 시간, 고객 노력.','국내 소규모 쇼핑몰 고객지원팀에 월 구독을 받는 B2B 가설. 비용 절감은 상담량×절약 시간×인건비로 추정하되 실측 전 수치를 매출처럼 제시하지 않는다.','고객 확인 단계가 더 번거로울 수 있고 오류가 인계되면 피해가 확대된다. 확인은 핵심 항목만, 원문 링크·정정 이력·즉시 사람 연결을 제공.','P04 P06 P07 P09 P11 P12 P13 P16 P19 P20 P22 P23 P24'),
('I02','알바가 바뀌어도 서비스는 이어진다','숙련 직원의 예외 처리 노하우를 남기는 매장 위키','점장이나 오래 일한 직원만 품절·쿠폰 오류·불만 고객 대응을 알고 있는 동네 매장.','신입 직원도 상황에 맞는 처리 이유와 가능한 대안을 바로 찾는다.','사건 발생 → 직원이 대응 이유 기록 → 점장 승인 → 다음 직원이 상황 검색 → 결과 피드백으로 사례 수정.','기존 매뉴얼에 없는 예외·실패·적용 금지 조건을 저장한다. 문서 수보다 재사용 후 해결률을 본다.','KCS의 지식 재사용은 기존 방법이다. 소상공인 업무 흐름에 맞춘 짧은 기록과 신입 학습 전이를 검증하는 것이 과제.','학교 앞 카페 1곳 또는 모의 매장. 메뉴·운영 규정과 점장 인터뷰로 사례 30개. 종이 매뉴얼, 검색 위키, 근거형 AI를 비교.','신입 역할 참가자에게 초기 과제와 AI 없이 푸는 지연 과제를 제공해 단기 속도와 실제 학습을 구분.','정답률, 승인 요청 횟수, 탐색 시간, AI 제거 후 유지 성과, 점장의 기록 부담.','프랜차이즈·소규모 다점포 운영사 대상 가설. 점포 단위 구독과 초기 지식 구축 지원.','점장의 잘못된 관행도 복제될 수 있다. 공식 규정과 관행을 분리하고 승인·만료일을 둔다.','P01 P02 P05 P07 P08 P11 P12 P19 P22'),
('I03','시니어가 끝까지 직접 처리하는 주문','단계별 안내와 도움 연결을 결합한 디지털 이용 지원','주문·예약 화면에서 막힌 뒤 포기하거나 주변 사람에게 기기를 넘기는 이용자.','큰 글씨, 다음 한 단계 설명, 되돌리기와 사람 도움으로 스스로 완료한다.','목표 선택 → 한 단계 실행 → 실행 결과 확인 → 막히면 도움 요청 → 막힌 단계와 해결 설명을 익명 사례로 축적.','쉽게 만든 화면에 더해 도움을 요청한 이유와 효과적인 설명을 지식화한다. 연령만으로 어려움을 추정하지 않는다.','접근성 화면은 이미 보편적인 설계 방향이다. 독립 완료율과 다음 사용의 학습 유지로 추가 가치를 확인.','결제 없는 카페 주문 모형. 실제 대상자와 공동 설계하며 음성·문자·직원 호출을 제공.','기본 화면 / 접근성 화면 / 접근성+단계 안내 조건. 디지털 숙련도를 기록하고 순서 효과를 통제.','독립 완료율, 오류 회복률, 도움 횟수, 부담감, 일주일 뒤 재수행 성공률.','매장·복지관·공공시설 운영자 대상 도입 가설. 하드웨어 교체보다 기존 안내 보완부터 검토.','시니어 모집과 현장 접근이 필요하다. 대학생 대리 실험만으로 시니어 효과를 주장하지 않는다.','P04 P05 P15 P17 P21 P24'),
('I04','리뷰가 실제 개선으로 이어지는 매장','고객 불만을 개선 작업과 결과로 연결하는 위키','리뷰에 매번 사과하지만 같은 문제가 반복되는 매장과 고객.','불만 제기 후 무엇이 바뀌었는지 확인하고 다음 방문에서 개선을 경험한다.','리뷰·직접 제보 → 문제 유형 분류 → 담당자·개선안 지정 → 실행 증거 → 재발 여부 → 검증된 사례 축적.','토픽 분석에서 끝내지 않고 문제-조치-결과를 연결한다. 반박 사례와 실패한 개선도 보존.','리뷰 분석·답글 생성은 흔하다. 개선 작업 완료와 재발 감소를 추적하는 운영 연결이 핵심 가설.','협력 매장의 허락 받은 후기 또는 직접 인터뷰 100건 내외를 수작업 코딩과 비교.','분류 정확도는 사람 코딩 기준으로 평가. 현장 성과는 기간·방문량·계절 영향을 통제해 관찰하고 인과 주장은 제한.','동일 문제 재발률, 개선 완료율, 사람 검토 시간, 잘못된 문제 병합률.','매장 운영자 B2B. 다점포 본사가 반복 문제를 찾는 경우 확장 가능.','불만 리뷰만으로 전체 고객을 대표할 수 없다. 만족 고객·이탈 고객 인터뷰도 포함.','P01 P02 P03 P06 P08 P09 P16 P18'),
('I05','창구를 돌지 않는 서류·예약 안내','학교 행정부터 검증하는 규정 출처형 안내','필요 서류를 빠뜨리거나 부서마다 다른 안내를 받는 학생·방문자.','방문 전에 준비물을 확인하고 담당 부서에 상황이 전달된다.','상황 입력 → 유효한 공지 검색 → 준비물 확인 → 담당자 연결 → 안내 오류를 정정 지식으로 축적.','유효기간과 담당 부서를 가진 지식 카드, 불확실한 경우의 명확한 연결.','FAQ와 RAG만으로는 약하다. 규정 충돌·오래된 공지·부서 이관의 해결 능력이 검증 대상.','자신의 학교 장학·증명서 등 공개 안내 중 1영역. 실제 민원·개인정보 없이 시나리오로 검증.','일반 검색과 비교해 준비물 정답률·잘못된 부서 추천·재방문 예상 횟수를 측정.','출처 정확성, 오래된 규정 사용률, 준비 완료율, 담당 부서 연결 정확도.','대학·시설 운영자 대상 가설. 병원 확장은 행정 안내로 한정하고 별도 현장 검증.','규정의 갱신 책임자가 없으면 정확성을 유지하기 어렵다. 병원 진료 판단까지 범위를 넓히지 않는다.','P04 P05 P06 P12 P23 P25'),
('I06','조건을 지키는 여행 추천','좋아 보이는 추천보다 실제 이용 가능한 선택지','유모차·이동 제약·시간 제약 때문에 추천받은 장소를 실제 이용하지 못하는 여행자.','필수 조건과 정보의 확인 시점을 보고 선택하며 틀린 정보를 수정한다.','필수 조건 입력 → 검증된 시설 정보 필터 → 후보와 제외 이유 → 이용 후 오류 제보 → 검토 후 지식 수정.','사실 조건과 취향을 구분하고 이용 불가 사유·정보 신선도를 관리.','일반 여행 챗봇과 차별성이 약하다. 한 지역·한 고객 집단의 검증된 접근 조건에 집중.','학교 주변 시설 20곳을 직접 확인해 데이터 구축. 실시간 예약 없이 조건 충족 후보만 제안.','일반 추천과 조건 기반 추천을 비교해 필수 제약 위반률과 검증 시간을 측정.','제약 위반률, 정보 갱신 비용, 실제 방문 가능률, 선택 만족.','관광지 운영자나 여행업체 대상 가설이나 지불 의사는 미확인.','실시간 접근성 정보 확보가 어려우며 잘못된 접근 안내의 영향이 크다. 확인 날짜와 미확인 표시 필수.','P04 P10 P18 P23'),
('I07','내가 정하는 개인화 기억','고객이 기억 범위와 삭제를 정하는 서비스 카드','개인화는 원하지만 회사가 무엇을 기억하는지 모르는 고객.','이번 문의만 쓸 정보와 다음에도 기억할 선호를 직접 정한다.','정보 제안 → 목적별 공유 선택 → 개인화 적용 → 기억 목록 확인·수정 → 삭제 상태 확인.','민감한 원문을 모으는 대신 필요한 선호만 분리하고 사용 근거를 보여준다.','개인화·동의 관리와 유사하다. 통제감 상승이 실제 사용 부담을 상쇄하는지 검증해야 한다.','가상의 쇼핑 추천에서 사이즈·예산·색상 선호만 사용하고 실명 데이터는 받지 않는다.','일괄 기억 / 항목별 선택 / 문의 후 만료 조건을 비교해 통제감·입력 부담·추천 유용성을 측정.','선택 이해도, 정보 제공 의향, 삭제 성공, 추천 유용성, 설정 시간.','고객지원·커머스 솔루션의 기능으로 제안. 독립 서비스의 구매자는 불명확.','복잡한 설정으로 피로가 늘 수 있다. 삭제가 검색 인덱스와 파생 기록에도 반영되는지 확인.','P03 P10 P20 P21 P22 P24'),
('I08','고객지원 AI의 실패를 먼저 찾는 실험실','한국어 예외 상황과 사용자 행동을 포함한 평가 위키','평범한 질문에는 답하지만 복잡한 변경·이관에서 실패하는 고객지원 AI를 운영하는 팀.','출시 전에 실패 상황을 발견해 실제 고객의 잘못된 안내를 줄인다.','규정·시나리오 입력 → 반복 대화 → 상태·근거·권한 평가 → 실패 분류 → 회귀 시험에 추가.','동일 질문 반복 성공, 규정 버전, 고객의 실제 단계 실행과 인계 오류를 함께 기록.','τ-bench 계열과 중복된다. 한국어·국내 특정 서비스 정책·직접 수집한 예외를 검증해야 차별화 가능.','가상 매장 정책과 40개 시나리오. 10개는 개발 중 보지 않는 평가 세트로 보관.','정확도뿐 아니라 정책 위반·누락·반복 성공률과 수정 뒤 회귀를 측정.','상태 정답률, 정책 위반률, 반복 성공률, 평가자 간 일치도.','고객지원 솔루션 운영사 대상 B2B 가설. 기술 구현 역량이 큰 경우 적합.','시뮬레이션 고객만으로 실제 CX 개선을 주장할 수 없다. 사람 평가 표본을 별도로 둔다.','P11 P12 P13 P14 P15 P19'),
]
for r in ideas:
    i,title,subtitle,problem,experience,journey,km,diff,mvp,test,kpi,business,risk,refs=r
    links=' · '.join(f'[{p}](../papers/{p}.md)' for p in refs.split())
    write(f'ideas/{i}.md',f'''# {i} · {title}

{subtitle}

[위키 홈](../README.md) · [후보 비교](ideas.md) · [검증 계획](../validation.md)

## 고객과 해결할 문제

{problem}

## 만들고 싶은 고객 경험

{experience}

## 고객 여정

{journey}

## 지식경영 기여

{km}

## 기존 서비스와의 차이 — 검증 전 가설

{diff}

## 학생 팀의 최소 구현

{mvp}

## 검증 실험과 지표

{test}

측정 지표: {kpi}

## 고객과 사업성 가설

{business}

## 취약점·중단 조건

{risk} 기존 방식보다 핵심 성과가 좋아지지 않거나 추가 운영 부담이 편익을 넘으면 범위를 줄이거나 다른 후보를 선택한다.

## 논문 근거

{links}

위 논문들은 문제와 설계의 근거다. 이 아이디어의 성과나 독창성을 이미 입증한 것은 아니다.
''')

write('ideas/ideas.md','''# 후보 비교와 선택 기준

[위키 홈](../README.md) · [논문 지도](../literature.md)

대회 공식 심사표를 확보하지 못했으므로 아래는 조사자의 상대적 판단이다. 시장 검증 결과나 수상 확률이 아니다. 학생 팀이 3~4주 동안 시제품과 소규모 사용자 검증을 수행한다는 가정이다.

| 후보 | 고객 가치 | 학회 연결 | 학생 실행성 | 가장 큰 제약 | 판단 |
|---|---|---|---|---|---|
| [I01 상담 인계](I01.md) | 반복 설명·미해결 감소 | 고객 지식·조직 기억 | 높음: 모의 상담 가능 | 상용 이관 기능과 차별화 | 종합 추천 |
| [I02 매장 노하우](I02.md) | 직원별 서비스 편차 감소 | 암묵지 전환·공유 | 높음: 협력 매장 필요 | 점장의 기록 참여 | 현장 협력 가능 시 1순위 |
| [I03 시니어 지원](I03.md) | 스스로 이용 완료 | 설명 지식·디지털 신뢰 | 중간 | 실제 대상자 모집 | 사회적 가치 중심 추천 |
| [I04 리뷰→개선](I04.md) | 같은 불편 재발 감소 | 고객 지식→조직 학습 | 높음 | 장기 개선 효과 관찰 | 데이터 분석 중심 대안 |
| [I05 행정 안내](I05.md) | 누락·헛걸음 감소 | 규정 지식의 최신성 | 높음: 교내 범위 | 일반 FAQ와 유사 | 학교 협력 시 대안 |
| [I06 조건형 여행](I06.md) | 이용 불가 추천 감소 | 맥락·현장 지식 | 중간 이하 | 최신 시설 정보 | 후순위 |
| [I07 선택형 기억](I07.md) | 통제감 있는 개인화 | 고객 지식의 관리 | 중간 | 설정 부담·구매자 불명확 | I01의 기능으로 결합 |
| [I08 AI 평가](I08.md) | 서비스 실패 사전 발견 | 실패 지식 재사용 | 개발 역량에 좌우 | 기존 벤치마크와 차이 | 기술 중심 대안 |

## 권장 제출 제목

**고객 확인형 인계 카드와 서비스 회복 지식 재사용이 고객 노력 및 해결 성과에 미치는 영향**

서비스 이름은 ‘이어봄’ 같은 간단한 가칭을 써도 되지만, 제목에는 검증할 효과와 지식경영 요소를 넣는 편이 낫다. 신규성은 아직 확정되지 않았다.

## 주제가 바뀌면

- 고객 경험 중심이면 I01·I03을 우선 검토한다.
- 조직 혁신·지식 공유 중심이면 I02·I04가 더 직접적이다.
- Agentic AI·안전한 지식 중심이면 I01의 근거·권한·인계 검증 또는 I08이 적합하다.
- 사업화 중심이면 실제 매장 협력과 구매자 인터뷰가 있는 I02를 우선한다.

이 분기는 공지의 주제를 추정한 것이 아니라, 원문을 받은 후 선택을 조정하는 기준이다.
''')

write('README.md','''# 한국지식경영학회 × 고객 경험 아이디어 연구 위키

조사 기준일: **2026-10-31** · 논문 25편 · 아이디어 8개 · 추천안 3개

**추천은 ‘고객이 다시 설명하지 않아도 되는 상담’이다.** 고객이 확인한 인계 정보를 다음 담당자에게 전달하고, 해결된 예외 사례를 검토해 조직의 지식으로 남긴다. 현장 매장과 협력할 수 있으면 ‘알바가 바뀌어도 서비스는 이어지는 매장 위키’가 실행 면에서 더 유리할 수 있다.

사용자가 준 [공지 원문](http://www.kmsk.or.kr/Notice/view.asp?Key=212)은 접속 실패로 내용을 확인하지 못했다. **정확한 행사명·연도·주제·마감·자격·심사 기준은 미확인**이다. 이 위키는 학회 연구 범위와 관련 논문에 맞춘 탐색 결과이며 공모요강 적합성 확정본이 아니다.

## 바로 읽기

1. [공지 확인 상태와 학회 적합성](brief.md)
2. [8개 아이디어 비교](ideas/ideas.md)
3. [1순위: 고객 확인형 상담 인계](ideas/I01.md)
4. [현장형: 매장 노하우 공유](ideas/I02.md)
5. [포용형: 시니어 디지털 이용 지원](ideas/I03.md)
6. [고객 경험 사례와 기존 서비스 비교](cases.md)
7. [논문 25편 지도와 읽기 순서](literature.md)
8. [추천안의 실험·인터뷰·실행 계획](validation.md)
9. [검색 범위·한계·추가 조사](research-log.md)

## 조사에서 얻은 판단

고객에게 보이는 편리함과 내부 지식 흐름을 함께 설계하는 편이 이 학회와 연결하기 쉽다. 현장 AI 지원의 긍정적 결과([P07](papers/P07.md))와 부정 리뷰에서 인간 개입이 필요하다는 결과([P16](papers/P16.md))를 함께 고려했다. 협업이 항상 가장 좋은 성과를 내지는 않는다는 반례([P11](papers/P11.md))도 실험에 반영했다.

‘AI가 잘 답한다’에서 한 걸음 더 나아가 **어떤 고객 상황을 누가 확인하고, 어떤 근거로 해결하고, 다음 담당자가 무엇을 재사용하는가**를 보여주는 것이 이 위키의 제안이다.

## 자료 사용법

각 논문 카드에는 서지·출처·실제 열람 범위·발견·적용·한계가 있다. ‘확인한 내용’은 출처의 주장이고 ‘적용’은 조사자의 제안이다. 링크된 원문을 확보해 통계표와 측정 문항을 확인한 뒤 제출 문서에 인용한다.

검색 가능한 오프라인 열람판은 [index.html](index.html), 표 자료는 [papers.csv](papers.csv)다. 이 위키는 로컬 파일이며 외부 사이트에 게시되지 않았다.
''')

write('brief.md','''# 공지 확인 상태와 학회 적합성

[위키 홈](README.md)

## 확인한 것과 확인하지 못한 것

| 항목 | 상태 |
|---|---|
| 사용자 제공 링크 | http://www.kmsk.or.kr/Notice/view.asp?Key=212 |
| 링크의 본문 | HTTP/HTTPS 및 www 유무를 바꿔도 확인 실패 |
| 행사명·연도·마감·자격·주제·배점 | 미확인 |
| 기관 | KCI 기관 정보에서 kmsk.or.kr을 한국지식경영학회 홈페이지로 확인 |
| 학회 관심 범위 | 지식경영 관련 경험적·개념적 연구 및 기업 사례 |
| 조사 판단 | 고객 경험과 지식 생성·공유·활용을 결합하는 방향이 적합할 가능성 |

기관 및 학술지 범위의 출처: [KCI 학회 정보](https://www.kci.go.kr/kciportal/po/search/poInsiSearSoceView.kci?insiGeneInfoBean.insiId=INS000002048).

## 학회와 직접 연결되는 연구 축

| 연구 축 | 이 위키의 연결 | 학회 논문 |
|---|---|---|
| 고객서비스의 인간·AI 역할 | 부정 경험 이관, 사람이 판단할 구간 | [P16](papers/P16.md), [P23](papers/P23.md) |
| 고객 지식과 분석 | 후기에서 문제를 찾아 개선 실행 | [P18](papers/P18.md) |
| 디지털 포용과 신뢰 | 시니어가 도움 경로를 아는 경험 | [P17](papers/P17.md) |
| 지식 검색과 생성 | 근거형 답변과 검색 평가 | [P19](papers/P19.md) |
| 정보 품질·프라이버시 | 고객이 기억과 전달 범위를 선택 | [P20](papers/P20.md), [P22](papers/P22.md) |

## 과거 행사에서 얻을 수 있는 제한적 단서

2023년 공모전은 생성 AI 시대 지식경영 혁신을 주제로 진행됐다는 대학 공식 기록이 있다. 그 해 가상 심리상담 서비스의 수상 사례도 확인된다. 이미 비슷한 제안이 있었으므로 일반적인 ‘AI 상담’만으로 독창성을 주장하기 어렵다. [한국기술교육대학교 기록](https://www.koreatech.ac.kr/gallery.es?act=view&bid=0018&list_no=35094&mid=a10701020000), [국민대학교 기록](https://www.kookmin.ac.kr/comm/board/user/be8e117863cfd580d7ed5931a799207c/view.do?dataSeq=1075036).

2025년 추계학술대회 주제는 ‘Agentic AI 시대, 안전한 정보와 지식’이었다는 공식 보도자료가 있다. 이는 과거 행사 정보이며 사용자가 준 Key=212 공지와 동일한 행사라는 근거는 없다. [한국재정정보원 보도자료](https://fis.kr/ko/notification/press_release?articleSeq=4704).

## 공지 확보 후 확인할 체크포인트

행사 주제와 연도, 참가 자격, 팀 인원, 실제 구현 필수 여부, 논문·사업계획서 형식, 데이터 사용 조건, 제출 마감, 심사 배점을 확인한다. 발표용 제안서의 분량과 일정은 그 뒤 확정한다.
''')

write('cases.md','''# 고객 경험 사례에서 가져올 설계 원칙

[위키 홈](README.md) · [아이디어 비교](ideas/ideas.md)

기업 공식 문서는 기능 존재를 확인하는 자료다. 독립적으로 검증한 만족도 상승이나 투자수익의 증거로 취급하지 않는다.

| 사례 | 공식 자료에서 확인한 경험 | 가져올 원칙 | 관련 후보 |
|---|---|---|---|
| Hilton Digital Key | 앱에서 디지털 키를 받고 객실 등에 접근. 물리 키 선택도 가능하며 신원 확인을 위해 프런트 방문이 필요할 수 있음 | 전체 여정의 수고를 줄이되 예외와 사람 경로를 보존 | I01·I05·I06 |
| Starbucks Inclusive Spaces Framework | 입구·이동 동선·주문 접점·감각 환경을 함께 고려하는 포용 설계 | 화면 크기뿐 아니라 이용 과정 전체와 도움 접근을 설계 | I03 |
| Intercom Fin | 상담 이관 조건과 전달 방식 설정, 일부 흐름에서 사람의 입력·승인을 받는 기능 | 인계·사람 검토만으로는 새롭지 않음. 추가 가치의 실험 필요 | I01·I08 |
| KCS | 업무에서 지식을 재사용·개선하고 필요할 때 기록하며 반복 패턴으로 조직 개선 | 문서 축적량보다 해결 과정에서의 재사용과 품질을 관리 | I02·I04 |

출처: [Hilton 도움말](https://www.hilton.com/en/help-center/check-in-and-check-out/how-to-use-your-digital-key/), [Starbucks 2024 공식 자료](https://about.starbucks.com/uploads/2024/02/SBX20240215_Inclusive-Stores-One-Pager.pdf), [Intercom 이관 문서](https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules), [Intercom 사람 입력 기능](https://www.intercom.com/help/en/articles/16198358-ask-a-teammate-for-help-with-fin-s-replies-human-in-the-loop), [KCS 실무 원칙](https://library.serviceinnovation.org/KCS/Knowledge-Centered_Success_Practices_Guide/402-Purpose_Behind_the_Practices).

## 아직 검증하지 않은 고객 경험 가설

| 원하는 경험 | 지금 가정하는 불편 | 고객 인터뷰에서 확인할 것 |
|---|---|---|
| 다시 설명하지 않는다 | 상담 이관 시 맥락 유실 | 최근 사례에서 실제 몇 번 설명했고 무엇이 빠졌는가 |
| 담당자가 바뀌어도 기준이 같다 | 예외 처리 노하우가 개인에게 집중 | 규정과 직원 경험 중 무엇에 의존했는가 |
| 막혀도 스스로 이어간다 | 잘못 누른 뒤 복구·도움 경로가 불명확 | 어느 화면에서 포기했고 어떤 도움이 유효했는가 |
| 내 불만이 개선으로 이어진다 | 사과 후 같은 불편 반복 | 실행된 개선을 확인한 경험과 재발 여부 |
| 나에 대한 기억을 통제한다 | 개인화에 쓰인 정보가 불명확 | 기억시키고 싶은 항목과 지우고 싶은 항목 |

이 표는 인터뷰에서 이미 확인한 사실이 아니다. 실제 사례를 모집해 빈도·심각도·대안 비용을 확인해야 한다.

## 1순위 아이디어의 서비스 블루프린트

| 단계 | 고객 행동 | 고객에게 보이는 응대 | 내부 업무 | 남는 지식 |
|---|---|---|---|---|
| 문의 | 문제·원하는 결과 입력 | 접수 확인 | 규정과 사례 검색 | 아직 개인별 사건 기록 |
| 확인 | 핵심 사실 수정·공유 선택 | 사실/추정 구분 카드 | 누락 검증 | 확인된 인계 정보 |
| 연결 | 담당자에게 이어서 요청 | 이미 확인한 내용 제시 | 담당·권한 확인 | 인계 사유 |
| 해결 | 대안 선택·결과 확인 | 근거와 처리 상태 | 정책 범위 내 처리 | 조치와 결과 |
| 학습 | 선택적 후기 | 개선 반영 여부 | 개인정보 제거·관리자 검토 | 재사용 가능한 예외 사례 |

블루프린트 방식의 근거는 [P05](papers/P05.md). 위 흐름 자체는 이번 조사의 제안이다.
''')

write('validation.md','''# 추천안 검증과 실행 계획

[위키 홈](README.md) · [I01 상세](ideas/I01.md)

아래 수량과 일정은 제안이며 실제 수행 결과가 아니다. 팀 규모·마감을 모르는 상태에서 3~4주 학생 프로젝트를 가정했다.

## 연구 질문과 가설

RQ1. 자동 요약만 제공할 때보다 고객 확인형 인계 카드가 반복 설명과 정보 누락을 줄이는가?

RQ2. 검토된 예외 처리 지식을 제공하면 초보 담당자의 해결 정확도가 높아지는가?

RQ3. 확인·검토에 드는 시간이 전체 처리 시간과 고객 노력을 오히려 늘리지는 않는가?

이를 하나의 실험에 모두 넣으면 원인을 분리하기 어렵다. 첫 실험은 인계 카드 효과에 집중하고, 지식 재사용 효과는 후속 실험으로 분리한다. 이 구분은 [P11](papers/P11.md)의 협업 효과 이질성과 [P07](papers/P07.md)의 숙련도 차이를 고려한 설계다.

## 1단계: 문제 인터뷰

고객 6~10명, 상담·매장 업무 경험자 3~5명을 탐색적으로 인터뷰한다. 모집 가능성에 따라 조정하며 대표성 있는 시장조사로 주장하지 않는다.

1. 가장 최근에 문의를 두 번 이상 설명한 상황을 처음부터 이야기해 달라.
2. 어떤 정보가 다음 담당자에게 전달되지 않았는가?
3. 원하는 결과와 실제 받은 해결은 무엇이었는가?
4. 미리 작성된 요약 중 직접 고치고 싶은 항목은 무엇인가?
5. 다른 직원에게 공유하지 않았으면 하는 정보는 무엇인가?
6. 직원에게: 예외 처리를 판단할 때 매뉴얼·동료·기억 중 무엇을 썼는가?
7. 직원에게: 그 사례를 남기는 데 어느 정도 시간이 들면 지속할 수 있는가?

‘이 앱이 있으면 쓰겠어요?’보다 실제 사건과 비용을 묻는다. 인터뷰 기록에는 가명만 쓰고 재사용에 동의한 범위만 보관한다.

## 2단계: 작은 사용성 파일럿

12~18명 수준으로 카드 이해·과제 난이도·측정 가능성을 먼저 확인한다. 이 수는 효능을 입증하기 위한 검정력 계산 결과가 아니다. 본 실험 표본은 파일럿 분산과 최소 의미 있는 효과를 정한 뒤 산정한다.

| 조건 | 제공 내용 | 통제할 것 |
|---|---|---|
| A | 원문 대화와 일반 이관 | 동일 정책·담당자 역할·과제 난이도 |
| B | 원문 + 자동 요약 | 같은 모델·검색 자료 |
| C | 원문 + 고객 확인형 구조화 인계 | B와 같은 정보·모델, 확인 단계만 다르게 |

조건별 과제 배정은 무작위화하고, 반복 참여라면 과제·조건 순서를 균형 배치한다. 평가자는 가능하면 조건을 모르게 하고, 동일 실패 사건을 모든 조건에서 풀게 하지 않아 기억 효과를 줄인다. 참가자의 고객 역할과 상담 역할을 구분해 분석한다.

## 측정 정의

| 지표 | 조작적 정의 |
|---|---|
| 해결 성공률 | 시나리오의 정답 상태에 도달한 과제 수 / 전체 과제 수 |
| 재설명 횟수 | 이미 제공한 핵심 사실을 다시 요청해 고객이 반복한 횟수 |
| 핵심 정보 누락률 | 사람이 만든 필수 사실 목록에서 인계에 빠진 항목 수 / 전체 필수 항목 |
| 정책 오류율 | 정책과 모순되는 안내·처리 수 / 전체 평가 안내·처리 수 |
| 총 처리 시간 | 최초 문의부터 완료까지, 카드 확인 시간과 재작업을 포함 |
| 고객 노력 | ‘문제를 해결하기 위해 많은 노력이 필요했다’ 등 탐색 문항을 일관된 척도로 측정 |
| 검토 부담 | 담당자가 요약·지식 카드를 확인·수정한 시간 |

고객 노력 문항은 이 단계에서는 탐색용이며 검증된 척도를 그대로 사용했다고 표현하지 않는다. 정식 연구에서는 원척도·한국어 번역 절차·신뢰도를 확인한다. 만족도만 높고 해결 정확도가 낮은 경우를 성공으로 분류하지 않는다.

## 두 번째 실험: 지식 재사용

인계 방식을 고정한 뒤 일반 매뉴얼과 승인된 예외 사례 위키를 비교한다. 초보·경험자 수준을 기록하고, 위키 작성에 사용하지 않은 신규 시나리오를 평가한다. AI 도움을 제거한 후속 과제를 넣으면 학습인지 단기 의존인지 구별할 수 있다.

## 시제품의 최소 데이터 구조

| 자료 | 필수 필드 | 공개 범위 |
|---|---|---|
| 인계 카드 | 문제, 고객 확인 사실, 이미 시도한 것, 미해결 사항, 원하는 결과, 원문 위치, 공유 선택 | 해당 사건 담당자 |
| 정책 카드 | 정책 ID, 적용 조건, 예외, 담당자, 유효기간, 출처, 버전 | 승인된 서비스 범위 |
| 해결 지식 | 익명 상황, 적용 정책 버전, 시도, 실패 이유, 성공 조치, 적용 금지 조건, 검토자, 검토일 | 권한 있는 운영자 |
| 평가 기록 | 시나리오 ID, 조건, 최종 상태, 오류 유형, 시간, 평가자 | 연구팀 |

개인 사건을 그대로 공용 위키에 복사하지 않는다. RAG와 검토 흐름은 [P12](papers/P12.md)·[P19](papers/P19.md), 최종 상태와 반복 평가 개념은 [P14](papers/P14.md)·[P15](papers/P15.md)를 참고한다.

## 4주 실행 예시

| 주차 | 결과물 |
|---|---|
| 1 | 공지 확인, 핵심 논문 원문 확인, 인터뷰, 한 업종으로 범위 확정 |
| 2 | 정책 10개·사례 30개·평가 과제 구축, 인계 카드 프로토타입 |
| 3 | 파일럿과 오류 수정, 조건별 비교 실행 |
| 4 | 결과·실패 사례 분석, 사업 가설 인터뷰, 발표 자료 작성 |

## 발표에서 보여줄 것

실제 고객 문제 한 장, 기존 방식과 개선 흐름 한 장, 논문 근거와 반례 한 장, 지식 흐름 한 장, 비교 실험과 결과 한 장, 경쟁 기능과 차이 한 장, 구매자와 운영 비용 한 장을 기본으로 잡는다. 실제 결과가 없으면 ‘기대 효과’와 ‘검증 계획’으로 명시한다.

## 계속할지 결정하는 기준

고객 확인이 누락·오류·노력을 줄이는지, 추가 시간이 감당 가능한지, 직원이 지식을 실제로 재사용하는지 확인한다. 개선이 없으면 카드 항목을 줄이거나 I02처럼 직원 측 문제로 범위를 바꾼다. 수치 기준은 파일럿 전에 팀이 정하고 결과를 본 뒤 유리하게 바꾸지 않는다.
''')

write('research-log.md','''# 검색 방법·범위·한계

[위키 홈](README.md) · [논문 목록](literature.md)

## 무엇을 수행했는가

2026-10-31에 공개 웹 검색, 출판사·학회·KCI 논문 페이지, 저자 소속기관 자료, 공개 arXiv·ACL 자료를 교차 탐색했다. 학회와 고객 경험의 접점을 찾기 위한 심층 탐색형 문헌 조사다. 별도 Deep Research 전용 제품을 실행한 것이 아니며 PRISMA 전수 검색·체계적 문헌고찰을 완료했다고 주장하지 않는다.

‘논문들 다 찾아봐’라는 요청은 관련 축을 넓게 찾는 것으로 해석했다. 모든 데이터베이스의 관련 논문을 빠짐없이 확보한 것은 아니다. 최종 선정은 25편이며 국내 10편 중 9편이 지식경영연구다. 전체 검색 결과의 중복 제거 전 건수를 완전한 로그로 보존하지 않았으므로 검색 총 건수·탈락률을 제시하지 않는다.

## 검색 축과 실제 사용한 대표 검색어

| 축 | 검색어 예시 | 채택 기준 |
|---|---|---|
| 공지 식별 | kmsk.or.kr 212 Notice; 한국지식경영학회 2026 공모전 | 공식 원문·대학 기록 우선 |
| 학회 직접 문헌 | site:kci.go.kr 지식경영연구 챗봇 신뢰; 고객경험; 생성형 AI 서비스 | 고객·직원·지식 관리 연결 |
| 고객 여정 | Understanding Customer Experience Throughout the Customer Journey | 널리 쓰이는 개념 틀 |
| 현장 AI 효과 | Generative AI at Work; Experimental evidence productivity generative AI | 실증 맥락과 측정 가능한 성과 |
| 부정 경험·반례 | Blame the Bot; human AI combinations meta analysis | 아이디어가 실패할 조건 |
| 지식경영 | Nonaka dynamic theory; Alavi Leidner knowledge management; customer knowledge management Gibbert | 기록→공유→활용의 이론 |
| 포용·신뢰 | 지식경영연구 시니어; 프라이버시; 인간 AI 에이전트 | 대상자·신뢰의 국내 근거 |
| 구현·평가 | RAG; Lost in the Middle; tau-bench; tau2-bench | 근거 검색·상태 검증·실패 평가 |
| 기존 사례 | KCS; Intercom Fin handoff; Hilton Digital Key; Starbucks Inclusive Spaces | 기능 중복과 운영 원칙 |

## 포함·제외 원칙

서지와 관련 내용을 확인할 수 있고 후보의 문제·메커니즘·구현·반례를 뒷받침하는 문헌을 포함했다. 검색에 나온 블로그·재판매 페이지·일반 AI 동향은 핵심 논문 근거에서 제외했다. 공개 전문을 내려받지 못한 자료는 초록 수준으로 표시했다. 논문 원문 파일의 일괄 다운로드는 하지 않았다.

출판 연도는 검색엔진의 ‘몇 개월 전’ 표시보다 권호·DOI 기록을 우선했다. P09와 P10은 선게재 연도와 권호 연도가 다르다. P07은 최종 출판본의 5,172명·15%를 사용했다. 2026년 문헌도 탐색했지만 추천안을 직접 뒷받침하는 2020~2025년 연구와 고전 이론을 우선 선정했다. 최신 연구를 망라했다는 의미는 아니다.

## 근거의 강도

- 현장 도입·무작위 실험: 해당 업무와 표본에서의 효과 근거. 다른 업종으로의 전이는 가설이다.
- 설문·리뷰 분석: 관련성과 인식의 근거. 제품 도입의 인과적 효과는 아니다.
- 개념·리뷰: 설계와 연구 질문을 정리하는 틀. 성능 보장은 아니다.
- 기술 벤치마크: 재현 가능한 기술 평가 아이디어. 실제 고객 만족과 구별한다.
- 기업 문서: 기능·운영 방법의 존재 확인. 독립적인 효과 평가가 아니다.

## 남은 확인 과제

1. 공지 원문: 대회 조건을 확인하지 못한 상태다.
2. 핵심 원문: P16·P17·P19·P20·P23의 표본, 측정 문항, 통계표를 확인한다.
3. 추가 국내 문헌: ‘고객 노력 상담 이관’, ‘서비스 회복 지식 공유’, ‘인간-AI 협업 상담사 라포’ 등으로 RISS·KCI·학회지를 확장한다.
4. 신규성: I01의 고객 확인형 인계와 가장 가까운 논문·특허·경쟁 기능을 추가 비교한다. 세계 최초를 주장하지 않는다.
5. 데이터·시장: 협력 매장·상담조직, 실제 참여자, 지불 의사와 운영 부담을 확인한다.

## 위키 갱신 규칙

새 문헌은 DOI 또는 정확한 제목·저자로 중복 확인한다. 카드의 확인 범위와 확인일을 갱신하고, 원문에서 반대 결과가 발견되면 아이디어의 판단도 고친다. 검증 전 기대 효과와 실제 실험 결과를 같은 문장에 섞지 않는다.
''')

# Build a self-contained, searchable local reader without external scripts or hosting.
md=MarkdownIt('commonmark',{'html':False}).enable('table')
pages=[]
for path in sorted(ROOT.rglob('*.md')):
    raw=path.read_text(encoding='utf-8');rel=path.relative_to(ROOT).as_posix()
    rendered=md.render(raw)
    def fix(m):
        href=m.group(1)
        if href.startswith(('http:','https:','#')):return m.group(0)
        target=(path.parent/href).resolve()
        if href.endswith('.md') and target.is_relative_to(ROOT):
            return 'href="#'+target.relative_to(ROOT).as_posix()+'"'
        return 'href="'+html.escape(target.relative_to(ROOT).as_posix(),quote=True)+'"'
    rendered=re.sub(r'href="([^"]+)"',fix,rendered)
    pages.append({'id':rel,'title':raw.splitlines()[0].lstrip('# '),'text':raw,'html':rendered})
payload=json.dumps(pages,ensure_ascii=False).replace('<','\\u003c')
write('index.html','''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KMSK 고객 경험 연구 위키</title>
<style>:root{font-family:system-ui,sans-serif;color:#16253a;background:#f5f7fa}body{margin:0;display:grid;grid-template-columns:290px 1fr}aside{height:100vh;position:sticky;top:0;box-sizing:border-box;overflow:auto;background:#11263b;color:white;padding:24px}aside a{color:#cce4f5;display:block;padding:8px 0;text-decoration:none;font-size:14px}input{box-sizing:border-box;width:100%;padding:12px;border-radius:6px;border:0;margin:16px 0}main{max-width:1000px;padding:36px 5vw;min-width:0;line-height:1.8}h1{font-size:30px;line-height:1.4}h2{margin-top:36px;font-size:22px}a{color:#096c99}table{border-collapse:collapse;width:100%;font-size:14px;display:block;overflow:auto}td,th{padding:12px;border:1px solid #d8e1e9;text-align:left;min-width:70px}th{background:#e8f0f6}td{background:white}li{margin:8px 0}#count{font-size:12px;color:#acc2d3}button{cursor:pointer;padding:8px 12px;border:0;border-radius:4px;background:#e1eef6;color:#11263b}@media(max-width:800px){body{display:block}aside{position:relative;height:auto;max-height:330px}main{padding:20px}h1{font-size:24px}}@media print{aside{display:none}body{display:block}main{padding:0;max-width:none}}</style>
<aside><strong>고객 경험 × 지식경영</strong><p>논문 25편 · 아이디어 8개<br>2026.10.31 조사</p><input id="q" aria-label="위키 전체 검색" placeholder="논문·아이디어·키워드 검색"><div id="count"></div><nav id="nav"></nav></aside><main id="content"></main>
<script>const pages='''+payload+''';const nav=document.getElementById('nav'),q=document.getElementById('q');
function list(){const s=q.value.trim().toLowerCase();const selected=pages.filter(p=>!s||p.text.toLowerCase().includes(s));nav.replaceChildren();document.getElementById('count').textContent=selected.length+'개 문서';selected.sort((a,b)=>(a.id==='README.md'?-1:b.id==='README.md'?1:a.id.localeCompare(b.id))).forEach(p=>{const a=document.createElement('a');a.href='#'+p.id;a.textContent=p.title;nav.append(a)})}
function show(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{id='README.md'}const p=pages.find(p=>p.id===id)||pages.find(p=>p.id==='README.md');document.getElementById('content').innerHTML=p.html;document.title=p.title+' | KMSK 연구 위키';window.scrollTo(0,0)}q.addEventListener('input',list);addEventListener('hashchange',show);list();show();</script></html>''')
print(f'Built {len(papers)} paper cards, {len(ideas)} idea cards, {len(pages)} searchable pages.')
