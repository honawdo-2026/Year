#!/usr/bin/env python3
"""
매주 월/수/금 새벽, GitHub Actions가 이 스크립트를 실행해서 index.html을 오늘자
내용으로 새로 만든다.

*** 완전 무료 버전 ***
- 재테크: Yahoo Finance / CoinGecko의 공개(키 불필요) 데이터를 실시간으로 가져와
  실제 오늘의 수치로 문장을 조립한다.
- 건강 / 소설쓰기 / 영어공부 / AI활용: 미리 써둔 여러 버전(POOL) 중 날짜 기준으로
  하나를 골라 보여준다 (매번 똑같지 않게 돌아가며 노출).
유료 API(예: Anthropic API) 사용 없음 — 필요한 Secrets도 전혀 없다.
"""

import os
from datetime import datetime, timedelta, timezone

import requests

KST = timezone(timedelta(hours=9))
now = datetime.now(KST)
TODAY_ISO = now.strftime("%Y-%m-%d")
WEEKDAYS_KO = ["월", "화", "수", "목", "금", "토", "일"]
WEEKDAY_LABEL = WEEKDAYS_KO[now.weekday()]
DATE_LABEL = f"{now.year}년 {now.month}월 {now.day}일 {WEEKDAY_LABEL}요일 브리핑"
DAY_OF_YEAR = now.timetuple().tm_yday

UA_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; briefing-bot/1.0)"}


# ---------------------------------------------------------------------------
# 재테크: 무료 공개 데이터로 실제 수치 조립
# ---------------------------------------------------------------------------
def fetch_yahoo(symbol):
    """Yahoo Finance 공개 chart API (키 불필요). 실패하면 None 반환."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    try:
        r = requests.get(
            url, headers=UA_HEADERS, params={"interval": "1d", "range": "5d"}, timeout=10
        )
        r.raise_for_status()
        meta = r.json()["chart"]["result"][0]["meta"]
        price = meta["regularMarketPrice"]
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        pct = (price - prev) / prev * 100
        return price, pct
    except Exception:
        return None


def fetch_btc():
    """CoinGecko 공개 API (키 불필요). 실패하면 None 반환."""
    try:
        r = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin", "vs_currencies": "usd", "include_24hr_change": "true"},
            headers=UA_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        d = r.json()["bitcoin"]
        return d["usd"], d["usd_24h_change"]
    except Exception:
        return None


def fmt_pct(pct):
    sign = "+" if pct >= 0 else ""
    word = "상승" if pct >= 0 else "하락"
    return f"{sign}{pct:.2f}%({word})"


def build_finance_card():
    kospi = fetch_yahoo("%5EKS11")
    kosdaq = fetch_yahoo("%5EKQ11")
    sp500 = fetch_yahoo("%5EGSPC")
    nasdaq = fetch_yahoo("%5EIXIC")
    dow = fetch_yahoo("%5EDJI")
    usdkrw = fetch_yahoo("KRW=X")
    btc = fetch_btc()

    parts = []

    if kospi and kosdaq:
        parts.append(
            f"코스피 <strong>{kospi[0]:,.2f}</strong>({fmt_pct(kospi[1])}), "
            f"코스닥 <strong>{kosdaq[0]:,.2f}</strong>({fmt_pct(kosdaq[1])})로 마감했어요."
        )
    elif kospi:
        parts.append(f"코스피는 <strong>{kospi[0]:,.2f}</strong>({fmt_pct(kospi[1])})로 마감했어요.")

    us_bits = []
    if dow:
        us_bits.append(f"다우 {fmt_pct(dow[1])}")
    if sp500:
        us_bits.append(f"S&P500 {fmt_pct(sp500[1])}")
    if nasdaq:
        us_bits.append(f"나스닥 {fmt_pct(nasdaq[1])}")
    if us_bits:
        parts.append("미국 증시는 " + ", ".join(us_bits) + "을 기록했어요.")

    if btc:
        parts.append(
            f"비트코인은 <strong>${btc[0]:,.0f}</strong>(24시간 {fmt_pct(btc[1])})예요."
        )

    if usdkrw:
        parts.append(f"원/달러 환율은 <strong>{usdkrw[0]:,.1f}원</strong>이에요.")

    if not parts:
        return (
            "오늘은 시세 데이터를 가져오지 못했어요. 네이버페이 증권이나 증권사 앱에서 "
            "코스피·코스닥·환율을 직접 확인해보세요. 📉"
        )

    return " ".join(parts)


# ---------------------------------------------------------------------------
# 건강 / 소설쓰기 / 영어공부 / AI활용: 미리 써둔 버전을 날짜 기준으로 순환
# ---------------------------------------------------------------------------
HEALTH_POOL = [
    "요즘 헬스 트렌드는 '고강도'보다 <strong>'지속 가능한 꾸준함'</strong>으로 무게 중심이 옮겨가고 있어요. 러닝·걷기·필라테스·요가 같은 저강도 운동을 매일 반복하는 방식이 뜨고 있죠. <strong>\"오늘 20분만 걸어도 이미 이긴 거예요.\"</strong> 🏃",
    "러닝 초보라면 페이스보다 <strong>착지 자세와 케이던스</strong>부터 다듬는 게 부상 예방에 훨씬 효과적이에요. 분당 170~180보 정도를 목표로 가볍게 뛰어보세요. <strong>\"완벽한 자세 하나가 무리한 페이스보다 낫습니다.\"</strong> 💪",
    "웨이트 트레이닝 초보자에게는 무게보다 <strong>정확한 가동범위</strong>가 우선이에요. 스쿼트·데드리프트·벤치프레스 3가지만 꾸준히 해도 기초 체력은 충분히 잡혀요. <strong>\"오늘도 바벨 앞에 섰다는 것 자체가 승리예요.\"</strong> 🏋️",
    "스트레칭을 15분만 투자해도 다음날 근육통이 확연히 줄어들어요. 특히 <strong>고관절과 흉추 회전</strong> 스트레칭은 자세 교정에도 큰 도움이 돼요. <strong>\"몸이 유연해지면 마음도 한결 가벼워져요.\"</strong> 🧘",
    "최근에는 '존2 트레이닝'(살짝 숨찬 정도의 저강도 유산소)이 지구력과 지방 연소에 좋다는 연구가 다시 주목받고 있어요. 대화하면서 뛸 수 있는 속도가 기준이에요. <strong>\"천천히, 하지만 꾸준히가 답이에요.\"</strong> 🏃‍♀️",
    "수면의 질이 곧 회복의 질이에요. 운동 후 <strong>7시간 이상의 수면</strong>을 확보하는 것만으로도 근육 회복 속도가 눈에 띄게 빨라져요. <strong>\"오늘 밤 일찍 자는 것도 훌륭한 운동이에요.\"</strong> 😴",
    "계단 오르기처럼 일상 속 자투리 운동(NEAT)을 늘리는 것만으로도 기초대사량에 큰 차이가 생겨요. 엘리베이터 대신 계단부터 시작해보세요. <strong>\"거창한 계획보다 오늘 당장 할 수 있는 한 걸음이 중요해요.\"</strong> 🚶",
    "단백질 섭취 타이밍보다 <strong>하루 총량</strong>이 훨씬 중요하다는 게 최근 연구들의 결론이에요. 체중 1kg당 1.2~1.6g 정도를 목표로 삼아보세요. <strong>\"완벽한 식단보다 꾸준한 식단이 이겨요.\"</strong> 🍗",
]

NOVEL_POOL = [
    "알고리즘 추천에 과몰입된 일상을 소재로: <strong>\"평생 알고리즘이 골라준 대로만 살아온 여자가, 어느 날 알고리즘이 통째로 사라진 하루를 맞는다. 그녀는 처음으로 스스로 무언가를 선택해야 했다.\"</strong>",
    "1인 가구 급증 현상을 소재로: <strong>\"혼자 사는 게 당연해진 도시에서, 한 남자는 십 년 만에 처음으로 이웃의 이름을 알게 된다. 그리고 그 이름이 그의 인생을 뒤흔든다.\"</strong>",
    "재택근무와 화상회의 피로를 소재로: <strong>\"매일 카메라를 끈 채로 회의에 참석하던 그녀는, 어느 날 실수로 켠 카메라 속에서 자신도 몰랐던 표정을 목격한다.\"</strong>",
    "AI 면접관이 늘어나는 채용 시장을 소재로: <strong>\"AI 면접에서 백 번째 탈락한 남자는, AI가 정확히 무엇을 원하는지 알아내기 위해 스스로 AI를 흉내 내기 시작한다.\"</strong>",
    "기후 위기와 폭염을 소재로: <strong>\"매일 최고기온 경신 뉴스를 보며 무뎌진 도시 사람들 사이에서, 한 소녀만이 여전히 더위에 진심으로 놀란다.\"</strong>",
    "SNS 인플루언서의 이중생활을 소재로: <strong>\"완벽한 일상을 연기하는 인플루언서가, 팔로워 중 단 한 명에게만 보내던 진짜 일기장을 실수로 전체 공개해버린다.\"</strong>",
    "저출산과 텅 빈 교실을 소재로: <strong>\"한 반에 학생이 세 명뿐인 학교의 마지막 담임교사는, 폐교를 앞두고 아이들에게 무엇을 가르쳐야 할지 다시 고민한다.\"</strong>",
    "무인 매장과 키오스크 확산을 소재로: <strong>\"평생 사람을 상대하던 가게 주인이 매장을 무인화한 뒤, 손님들이 남기고 간 흔적들 속에서 오히려 더 많은 사람을 만나게 된다.\"</strong>",
]

ENGLISH_POOL = [
    "외국인과 자유롭게 수다 떨기, 여행지에서 막힘없이 대화하기, 자막 없이 영화 보기 — 최근 다시 주목받는 방법은 <strong>쉐도잉(shadowing)</strong>이에요. 원어민 음성을 그대로 따라 말하며 억양과 리듬을 몸에 새기는 훈련법이죠. <strong>\"틀려도 괜찮아요. 완벽한 문장보다 용기 있는 한마디가 먼저예요. Just speak!\"</strong> 🗣",
    "여행 영어는 완벽한 문법보다 <strong>핵심 단어 + 손짓</strong>만으로도 충분히 통해요. \"Where is...\", \"How much...\" 두 문장만 자연스럽게 나와도 여행이 훨씬 편해져요. <strong>\"완벽하지 않아도 통하는 게 진짜 영어예요.\"</strong> ✈️",
    "자막 없이 미드를 즐기고 싶다면, 처음엔 <strong>이미 아는 에피소드</strong>를 영어 자막으로 다시 보는 것부터 시작해보세요. 내용을 알고 있으니 대사에 집중할 여유가 생겨요. <strong>\"익숙함이 자신감을 만들어요.\"</strong> 🎬",
    "요즘 강조되는 건 문법이 아니라 <strong>발음의 리듬(억양 패턴)</strong>이에요. 문장을 통째로 노래하듯 따라 하면 훨씬 자연스럽게 들려요. <strong>\"단어보다 리듬을 먼저 익혀보세요.\"</strong> 🎵",
    "외국인과의 스몰토크가 막막하다면 날씨·음식·주말 계획, 이 세 가지 주제만 준비해도 절반은 해결돼요. <strong>\"거창한 주제보다 편안한 스몰토크가 대화를 열어줘요.\"</strong> ☕",
    "영어 일기를 하루 세 문장만 써봐도 표현력이 눈에 띄게 늘어요. 문법이 틀려도 괜찮으니 오늘 있었던 일을 그대로 적어보세요. <strong>\"짧고 꾸준한 글쓰기가 유창함을 만들어요.\"</strong> ✍️",
    "실전 회화에서 가장 유용한 건 완벽한 문장이 아니라 <strong>되묻는 표현</strong>이에요. \"Could you say that again?\" 한마디만 있어도 대화가 끊기지 않아요. <strong>\"모르면 물어보는 것도 실력이에요.\"</strong> 💬",
    "좋아하는 팝송 가사를 따라 부르는 것만으로도 자연스러운 영어 리듬이 몸에 배요. 가사를 눈으로 읽으며 소리 내어 불러보세요. <strong>\"즐거움이 최고의 학습법이에요.\"</strong> 🎤",
]

AI_POOL = [
    "2026년 AI는 '단순 비서'에서 '해결사'로 진화 중이에요 — 질문에 답만 하는 게 아니라 계획부터 실행까지 스스로 끝내는 방향으로요. 💡 오늘의 제안: <strong>이번 주말 반나절 나들이 코스를 AI 에이전트에게 통째로 맡겨보기</strong>. 조건만 던지고 결과물을 받아보는 거예요.",
    "💡 오늘의 제안: <strong>옛날 흑백 가족사진을 AI로 컬러 복원</strong>해보는 건 어때요? 몇 장만 골라 색을 입혀보면, 생각보다 큰 감동이 있을 거예요.",
    "💡 오늘의 제안: 이번 주 저녁 메뉴 5개와 장보기 리스트를 <strong>AI에게 예산과 냉장고 재료를 알려주고 통째로 짜달라고</strong> 해보세요. 생각보다 훨씬 알뜰한 식단이 나올 수 있어요.",
    "💡 오늘의 제안: 읽고 싶었지만 미뤄둔 긴 글이나 논문을 AI에게 <strong>3줄 요약 + 핵심 질문 3개</strong>로 정리해달라고 해보세요. 읽을지 말지 판단하는 시간이 확 줄어들어요.",
    "💡 오늘의 제안: 어색한 이메일이나 카톡 답장 초안을 AI에게 <strong>세 가지 톤(정중하게/친근하게/단호하게)</strong>으로 각각 써달라고 해서 골라보세요.",
    "💡 오늘의 제안: 집 안 물건 사진 몇 장을 찍어서 AI에게 <strong>중고거래 판매 문구</strong>를 자동으로 써달라고 해보세요. 제목, 설명, 해시태그까지 한 번에 나와요.",
    "💡 오늘의 제안: 최근 본 영화나 책 감상을 AI에게 들려주고 <strong>비슷한 취향의 다음 추천작 5개</strong>를 받아보세요. 취향을 설명할수록 추천이 정교해져요.",
    "💡 오늘의 제안: 아이나 조카에게 들려줄 <strong>오늘 하루를 소재로 한 짧은 동화</strong>를 AI에게 즉석에서 만들어달라고 해보세요. 등장인물 이름만 알려줘도 충분해요.",
]


def pick(pool):
    return pool[DAY_OF_YEAR % len(pool)]


# ---------------------------------------------------------------------------
# HTML 조립
# ---------------------------------------------------------------------------
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "index_template.html")


def build_html(cards: dict) -> str:
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    replacements = {
        "__DATE_LABEL__": DATE_LABEL,
        "__TODAY_ISO__": TODAY_ISO,
        "__FINANCE__": cards["재테크"],
        "__HEALTH__": cards["건강"],
        "__NOVEL__": cards["소설쓰기"],
        "__ENGLISH__": cards["영어공부"],
        "__AI__": cards["AI활용"],
    }
    for token, value in replacements.items():
        html = html.replace(token, value)
    return html


def main():
    cards = {
        "재테크": build_finance_card(),
        "건강": pick(HEALTH_POOL),
        "소설쓰기": pick(NOVEL_POOL),
        "영어공부": pick(ENGLISH_POOL),
        "AI활용": pick(AI_POOL),
    }
    html = build_html(cards)
    out_path = os.path.join(os.path.dirname(__file__), "..", "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"index.html 생성 완료 ({TODAY_ISO})")


if __name__ == "__main__":
    main()
