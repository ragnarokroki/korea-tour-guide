/* ═══════════════════════════════════════════════════════
   feature-ai-translate.js
   AI 자동 번역 모듈 (Claude API 기반)

   동작 흐름:
   1. localStorage('korea_travel_lang') 읽기
   2. 'ko' 또는 미설정이면 번역 스킵
   3. 다른 언어면 번역 대상 텍스트 수집
   4. Claude API 호출 → JSON 번역 결과 수신
   5. DOM 적용 + sessionStorage 캐시 저장
   6. 이후 같은 페이지 재방문 시 캐시 사용 (API 재호출 없음)
════════════════════════════════════════════════════════ */

(function(){
  const LANG_KEY   = 'korea_travel_lang';
  const CACHE_PFX  = 'ktg_trans_';          // sessionStorage 캐시 prefix
  const MODEL      = 'claude-haiku-4-5-20251001';
  const MAX_TOKENS = 4096;

  const LANG_NAMES = { en:'English', ja:'Japanese', zh:'Chinese (Simplified)' };

  /* ── 번역 대상 selector 목록 ──────────────────────
     data-translate 속성으로 고유 키를 지정.
     숫자(stat-num 등)는 제외, 텍스트만 대상.
  ─────────────────────────────────────────────────── */
  const TARGET_SELECTORS = [
    // 히어로
    '.hero-badge',
    '.hero h1',
    '.hero-sub',
    '.stat-label',
    // 툴바 / 필터
    '.filter-btn',
    '#search',                // placeholder
    // 카드 텍스트 (desc, 운영시간, 입장료 라벨)
    '.card-desc',
    '.info-label',
    // 모달
    '#m-desc',
    '#m-info .info-label',
    '#m-info .info-val',
    '.modal-action-bar .map-link',
    // 즐겨찾기 패널
    '.fav-empty',
    // 테마 버튼 (feature-theme.js)
    '.theme-btn',
    // 코스 모달 (feature-daily.js)
    '.course-box-title',
    '.course-slot-label',
    '.course-tip',
    '.daily-label',
    '.daily-region',
    // 방문 팁 (feature-tip.js)
    '.tip-title',
    '.tip-label',
    '.tip-val',
    '.crowd-label',
    // 푸터
    'footer',
    // 페이지 타이틀
    'title',
    // index.html 지역 선택 카드
    '.card-name',
    '.card-desc',
    '.card-region-label',
    '.card-count',
    '.section-title',
    '.section-sub',
    '.hero h1',
    '.hero-sub',
    '.cta-section h2',
    '.cta-section p',
    '.site-logo',
    '.site-header-sub',
  ];

  /* ── 현재 언어 읽기 ──────────────────────────── */
  function getLang(){
    return localStorage.getItem(LANG_KEY) || 'ko';
  }

  /* ── 캐시 키 생성 ────────────────────────────── */
  function cacheKey(lang){
    // 페이지 경로 + 언어로 고유 키
    const path = location.pathname.split('/').pop() || 'index';
    return CACHE_PFX + path + '_' + lang;
  }

  /* ── DOM에서 번역 대상 수집 ──────────────────── */
  function collectTargets(){
    const items = [];   // { key, el, type, original }
    const seen  = new Set();

    TARGET_SELECTORS.forEach(sel => {
      let els;
      try { els = document.querySelectorAll(sel); } catch(e){ return; }
      els.forEach(el => {
        if(seen.has(el)) return;
        seen.add(el);

        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'){
          // placeholder 번역
          if(el.placeholder){
            items.push({ el, type:'placeholder', original: el.placeholder });
          }
          return;
        }
        if(el.tagName === 'TITLE'){
          items.push({ el, type:'title', original: document.title });
          return;
        }

        // 텍스트 노드만 추출 (자식 엘리먼트는 보존, 텍스트만 번역)
        const text = el.innerText?.trim();
        if(text && text.length > 0 && !/^\d+$/.test(text)){
          items.push({ el, type:'text', original: text });
        }
      });
    });

    return items;
  }

  /* ── Claude API 호출 ─────────────────────────── */
  async function callTranslate(texts, targetLang){
    const langName = LANG_NAMES[targetLang] || targetLang;

    const prompt = `Translate the following Korean UI texts to ${langName}.
Return ONLY a JSON array of translated strings in the exact same order.
Do NOT add explanations. Do NOT wrap in markdown code blocks.
Keep proper nouns (place names, brand names) as-is.
Keep special characters like ←, →, ⭐, 📍, ✅ as-is.

Texts to translate (JSON array):
${JSON.stringify(texts)}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || `API ${res.status}`);
    }

    const data = await res.json();
    const raw  = data.content?.[0]?.text || '[]';

    // JSON 파싱 (마크다운 펜스 제거)
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  /* ── DOM 적용 ────────────────────────────────── */
  function applyTranslations(items, translated){
    items.forEach((item, i) => {
      const t = translated[i];
      if(!t || typeof t !== 'string') return;

      if(item.type === 'placeholder'){
        item.el.placeholder = t;
      } else if(item.type === 'title'){
        document.title = t;
      } else {
        // 내부 HTML 구조(이모지, <em>, <span> 등) 보존하면서 텍스트 교체
        // innerText 직접 교체는 자식 엘리먼트를 날리므로 텍스트 노드만 교체
        replaceTextNodes(item.el, item.original, t);
      }
    });
  }

  /* ── 텍스트 노드만 교체 (자식 태그 보존) ──────── */
  function replaceTextNodes(el, original, translated){
    // 자식이 텍스트 노드만인 간단한 경우
    const childNodes = [...el.childNodes];
    const textNodes  = childNodes.filter(n => n.nodeType === Node.TEXT_NODE);

    if(textNodes.length > 0){
      // 첫 번째 텍스트 노드만 교체 (나머지 노드 보존)
      const joined = textNodes.map(n=>n.textContent).join('').trim();
      if(joined){
        textNodes[0].textContent = translated;
        // 나머지 텍스트 노드는 제거 (중복 방지)
        textNodes.slice(1).forEach(n => n.textContent = '');
      }
    } else if(el.children.length === 0){
      el.textContent = translated;
    }
    // 자식 엘리먼트가 있는 경우 innerText 전체 교체는 위험 → 스킵
  }

  /* ── 번역 오버레이 표시 ─────────────────────── */
  function showOverlay(lang){
    const langLabel = { en:'English', ja:'日本語', zh:'中文' }[lang] || lang;
    const ov = document.createElement('div');
    ov.id = 'translate-overlay';
    ov.innerHTML = `
      <div class="tov-box">
        <div class="tov-spinner"></div>
        <div class="tov-text">AI 번역 중… <span>${langLabel}</span></div>
        <div class="tov-sub">페이지 전체를 번역하고 있습니다</div>
      </div>`;
    document.body.appendChild(ov);

    const style = document.createElement('style');
    style.textContent = `
      #translate-overlay{
        position:fixed;inset:0;background:rgba(26,26,46,0.75);
        z-index:9999;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);
      }
      .tov-box{
        background:#fff;border-radius:20px;padding:36px 48px;text-align:center;
        box-shadow:0 24px 64px rgba(0,0,0,0.25);min-width:240px;
      }
      .tov-spinner{
        width:40px;height:40px;border:3px solid #e5e7eb;
        border-top-color:#6EE7B7;border-radius:50%;
        animation:tov-spin .8s linear infinite;margin:0 auto 16px;
      }
      @keyframes tov-spin{to{transform:rotate(360deg);}}
      .tov-text{font-size:15px;font-weight:600;color:#1a1a2e;margin-bottom:6px;}
      .tov-text span{color:#059669;}
      .tov-sub{font-size:12px;color:#9ca3af;}
    `;
    document.head.appendChild(style);
    return ov;
  }

  function removeOverlay(){
    document.getElementById('translate-overlay')?.remove();
  }

  /* ── 번역 실패 토스트 ────────────────────────── */
  function showError(msg){
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#ef4444;color:#fff;padding:10px 20px;border-radius:12px;
      z-index:9999;font-size:13px;font-weight:600;
      box-shadow:0 4px 20px rgba(239,68,68,0.4);
    `;
    t.textContent = '번역 실패: ' + msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 4000);
  }

  /* ── 언어 선택 바 (모든 페이지 우상단) ──────── */
  function injectLangBar(){
    const bar = document.createElement('div');
    bar.id = 'global-lang-bar';
    const currentLang = getLang();

    const LANGS = [
      { code:'ko', flag:'🇰🇷', label:'한국어' },
      { code:'en', flag:'🇺🇸', label:'English' },
      { code:'ja', flag:'🇯🇵', label:'日本語' },
      { code:'zh', flag:'🇨🇳', label:'中文' },
    ];

    bar.innerHTML = `
      <div class="glb-inner">
        <span class="glb-icon">🌐</span>
        ${LANGS.map(l=>`
          <button class="glb-btn${l.code===currentLang?' glb-active':''}"
            data-lang="${l.code}" title="${l.label}">
            ${l.flag} ${l.label}
          </button>`).join('')}
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      #global-lang-bar{
        position:fixed;bottom:24px;left:24px;z-index:1400;
      }
      .glb-inner{
        display:flex;gap:4px;align-items:center;
        background:rgba(26,26,46,0.92);
        backdrop-filter:blur(8px);
        border-radius:14px;padding:8px 12px;
        border:1px solid rgba(255,255,255,0.1);
        box-shadow:0 8px 24px rgba(0,0,0,0.3);
      }
      .glb-icon{font-size:14px;color:rgba(255,255,255,0.5);margin-right:4px;}
      .glb-btn{
        padding:4px 10px;border-radius:8px;border:1.5px solid transparent;
        background:transparent;color:rgba(255,255,255,0.6);
        font-size:11px;font-weight:600;cursor:pointer;
        font-family:'DM Sans',sans-serif;transition:all .15s;
        white-space:nowrap;
      }
      .glb-btn:hover{background:rgba(255,255,255,0.1);color:#fff;}
      .glb-btn.glb-active{
        background:#6EE7B7;color:#1a1a2e;border-color:#6EE7B7;
      }
      @media(max-width:480px){
        #global-lang-bar{bottom:80px;left:12px;}
        .glb-btn{font-size:10px;padding:3px 7px;}
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(bar);

    bar.querySelectorAll('.glb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        localStorage.setItem(LANG_KEY, lang);
        // 캐시 전체 초기화 (언어 변경 시)
        Object.keys(sessionStorage)
          .filter(k => k.startsWith(CACHE_PFX))
          .forEach(k => sessionStorage.removeItem(k));
        location.reload();
      });
    });
  }

  /* ── 메인 실행 ───────────────────────────────── */
  async function run(){
    const lang = getLang();
    injectLangBar();

    // 한국어면 번역 불필요
    if(lang === 'ko') return;

    // 캐시 확인
    const ck = cacheKey(lang);
    const cached = sessionStorage.getItem(ck);

    // DOM 준비 대기
    await new Promise(r => {
      if(document.readyState === 'complete') r();
      else window.addEventListener('load', r);
    });

    // feature 파일들이 DOM 주입을 마칠 시간 확보
    await new Promise(r => setTimeout(r, 600));

    const items = collectTargets();
    if(!items.length) return;

    const originals = items.map(i => i.original);

    if(cached){
      // 캐시 적용
      try{
        const translated = JSON.parse(cached);
        applyTranslations(items, translated);
      }catch(e){
        sessionStorage.removeItem(ck);
      }
      return;
    }

    // API 호출
    const overlay = showOverlay(lang);
    try{
      // 텍스트가 많으면 50개씩 분할 호출
      const CHUNK = 50;
      let allTranslated = [];
      for(let i = 0; i < originals.length; i += CHUNK){
        const chunk = originals.slice(i, i + CHUNK);
        const result = await callTranslate(chunk, lang);
        allTranslated = allTranslated.concat(result);
      }

      applyTranslations(items, allTranslated);
      // 캐시 저장
      sessionStorage.setItem(ck, JSON.stringify(allTranslated));
    }catch(e){
      showError(e.message);
    }finally{
      removeOverlay();
    }
  }

  // 실행 — DOMContentLoaded 이후 시작
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
