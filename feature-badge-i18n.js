/* ═══════════════════════════════════════════
   feature-badge-i18n.js  (버그수정: 다녀왔어요 중복 버튼)
   ⑩ 방문 인증 & 뱃지 시스템 (localStorage)
   ⑪ 다국어 전환 EN · JP · ZH
═══════════════════════════════════════════ */

(function(){

  const VISIT_KEY = 'jeju_visits';
  const BADGE_DEFS = [
    { id:'first',   icon:'🎉', name:'첫 방문',      desc:'처음으로 장소를 방문했어요!',  cond:v=> v.size>=1 },
    { id:'five',    icon:'⭐', name:'탐험가 5',      desc:'5곳을 방문했어요!',            cond:v=> v.size>=5 },
    { id:'ten',     icon:'🏅', name:'탐험가 10',     desc:'10곳을 방문했어요!',           cond:v=> v.size>=10 },
    { id:'twenty',  icon:'🥇', name:'제주 마니아',   desc:'20곳을 방문했어요!',           cond:v=> v.size>=20 },
    { id:'fifty',   icon:'🏆', name:'제주 정복자',   desc:'50곳을 방문했어요!',           cond:v=> v.size>=50 },
    { id:'jeju_si', icon:'🔵', name:'제주시 마스터', desc:'제주시 10곳 이상 방문',
      cond:(v)=> countRegionVisit(v,'제주시')>=10 },
    { id:'south',   icon:'🔴', name:'남부 탐험가',   desc:'남부 10곳 이상 방문',
      cond:(v)=> countRegionVisit(v,'남부')>=10 },
    { id:'free',    icon:'🎫', name:'무료 마스터',   desc:'무료 명소 10곳 이상 방문',
      cond:(v)=> countFreeVisit(v)>=10 },
    { id:'culture', icon:'🏛️', name:'문화 애호가',   desc:'문화시설 5곳 이상 방문',
      cond:(v)=> countCatVisit(v,'문화시설')>=5 },
    { id:'oreum',   icon:'⛰️', name:'오름 탐험가',   desc:'오름 5곳 이상 방문',
      cond:(v)=> countKeywordVisit(v,'오름')>=5 },
  ];

  function getVisits(){
    try{ return new Set(JSON.parse(localStorage.getItem(VISIT_KEY)||'[]')); }
    catch(e){ return new Set(); }
  }
  function saveVisits(v){
    localStorage.setItem(VISIT_KEY, JSON.stringify([...v]));
  }
  function countRegionVisit(v, region){
    return [...v].filter(no=>{const p=PLACES.find(x=>x.no===no);return p&&p.region===region;}).length;
  }
  function countFreeVisit(v){
    return [...v].filter(no=>{const p=PLACES.find(x=>x.no===no);
      return p&&(p.fee==='무료'||p.fee==='무료 이용가능');}).length;
  }
  function countCatVisit(v, cat){
    return [...v].filter(no=>{const p=PLACES.find(x=>x.no===no);return p&&p.category===cat;}).length;
  }
  function countKeywordVisit(v, kw){
    return [...v].filter(no=>{const p=PLACES.find(x=>x.no===no);
      return p&&(p.name+p.desc).includes(kw);}).length;
  }
  function getEarnedBadges(v){
    return BADGE_DEFS.filter(b=> b.cond(v));
  }

  function markVisit(no){
    const v = getVisits();
    if(v.has(no)){
      v.delete(no);
      saveVisits(v);
      showToast('방문 기록을 취소했습니다.');
      updateVisitBtn(no, false);
    } else {
      v.add(no);
      saveVisits(v);
      checkNewBadge(v);
      showToast('방문을 인증했습니다! ✅');
      updateVisitBtn(no, true);
    }
    updateHeroStats(v);
  }

  function checkNewBadge(v){
    const prevStr = localStorage.getItem('jeju_badges_seen') || '[]';
    const seen = new Set(JSON.parse(prevStr));
    const earned = getEarnedBadges(v);
    earned.filter(b=>!seen.has(b.id)).forEach(b=>{
      seen.add(b.id);
      setTimeout(()=> showBadgeToast(b), 500);
    });
    localStorage.setItem('jeju_badges_seen', JSON.stringify([...seen]));
  }

  function showBadgeToast(badge){
    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.innerHTML = `<span class="badge-toast-icon">${badge.icon}</span>
      <div><div class="badge-toast-name">뱃지 획득! ${badge.name}</div>
      <div class="badge-toast-desc">${badge.desc}</div></div>`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.classList.add('show'),100);
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),400);},3500);
  }

  function updateVisitBtn(no, visited){
    const btn = document.getElementById(`visit-btn-${no}`);
    if(!btn) return;
    btn.textContent = visited ? '✅ 다녀왔어요' : '📍 다녀왔어요';
    btn.classList.toggle('visited', visited);
  }

  function updateHeroStats(v){
    const el = document.getElementById('stat-visits');
    if(el) el.textContent = v.size;
  }

  function renderVisitBtn(no){
    // ★ 버그 수정 핵심:
    //   기존 코드는 getElementById(`visit-btn-${no}`)로 현재 no 버튼만 제거했음.
    //   모달을 닫지 않고 다른 카드를 클릭하면 no가 바뀌어서
    //   이전 장소의 버튼이 제거되지 않고 누적됨.
    //   → querySelectorAll('.visit-btn')으로 모든 버튼을 한번에 제거해서 해결.
    document.querySelectorAll('.visit-btn').forEach(b => b.remove());

    const v = getVisits();
    const visited = v.has(no);

    const btn = document.createElement('button');
    btn.id = `visit-btn-${no}`;
    btn.className = `visit-btn${visited?' visited':''}`;
    btn.textContent = visited ? '✅ 다녀왔어요' : '📍 다녀왔어요';
    btn.setAttribute('aria-label', visited ? '방문 취소' : '방문 인증');
    btn.addEventListener('click', ()=> markVisit(no));

    // ★ getElementById('m-fav-btn')?.parentElement 대신
    //    클래스명으로 직접 탐색 (더 안정적)
    const actionBar = document.querySelector('.modal-action-bar');
    if(actionBar) actionBar.appendChild(btn);
  }

  function showBadgePanel(){
    const v = getVisits();
    const earned = getEarnedBadges(v);
    const panel = document.getElementById('badge-panel');
    if(!panel) return;
    panel.innerHTML = `
      <div class="badge-panel-title">🏅 내 뱃지 (${earned.length}/${BADGE_DEFS.length})</div>
      <div class="badge-grid">
        ${BADGE_DEFS.map(b=>{
          const got = earned.find(e=>e.id===b.id);
          return `<div class="badge-item${got?'':' badge-locked'}">
            <span class="badge-icon">${b.icon}</span>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${b.desc}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="badge-visit-count">총 방문: ${v.size}곳</div>`;
    const modal = document.getElementById('badge-modal');
    if(modal){ modal.classList.add('open'); document.body.style.overflow='hidden'; }
  }

  /* ═══════════════════════════════════════
     ⑪ 다국어 전환
  ═══════════════════════════════════════ */
  const LANGS = {
    ko:{ label:'KO', flag:'🇰🇷' },
    en:{ label:'EN', flag:'🇺🇸' },
    ja:{ label:'JP', flag:'🇯🇵' },
    zh:{ label:'ZH', flag:'🇨🇳' },
  };
  const I18N = {
    ko:{
      search:'장소명 검색...',
      all:'전체', cat_spot:'관광지', cat_culture:'문화시설',
      free:'🎫 무료입장', fav:'⭐ 즐겨찾기',
      hero_sub:'관광지부터 문화시설까지, 제주의 모든 것을 담았습니다',
    },
    en:{
      search:'Search places...',
      all:'All', cat_spot:'Attractions', cat_culture:'Cultural',
      free:'🎫 Free', fav:'⭐ Favorites',
      hero_sub:'From attractions to cultural spots, everything in Jeju.',
    },
    ja:{
      search:'場所を検索...',
      all:'全体', cat_spot:'観光地', cat_culture:'文化施設',
      free:'🎫 無料', fav:'⭐ お気に入り',
      hero_sub:'観光地から文化施設まで、済州のすべてが揃っています。',
    },
    zh:{
      search:'搜索地点...',
      all:'全部', cat_spot:'景点', cat_culture:'文化设施',
      free:'🎫 免费', fav:'⭐ 收藏',
      hero_sub:'从旅游景点到文化设施，尽在济州岛。',
    },
  };

  function applyLang(lang){
    const t = I18N[lang];
    if(!t) return;
    const searchInput = document.getElementById('search');
    if(searchInput) searchInput.placeholder = t.search;
    const allBtn = document.querySelector('.filter-btn[data-region="전체"]');
    if(allBtn) allBtn.textContent = t.all;
    const spotBtn = document.querySelector('.filter-btn[data-cat="관광지"]');
    if(spotBtn) spotBtn.textContent = t.cat_spot;
    const cultureBtn = document.querySelector('.filter-btn[data-cat="문화시설"]');
    if(cultureBtn) cultureBtn.textContent = t.cat_culture;
    const freeBtn = document.querySelector('.filter-btn[data-free]');
    if(freeBtn) freeBtn.textContent = t.free;
    const favBtn = document.getElementById('fav-toggle-btn');
    if(favBtn) favBtn.childNodes[0].textContent = t.fav + ' ';
    const heroSub = document.querySelector('.hero-sub');
    if(heroSub) heroSub.textContent = t.hero_sub;
    document.querySelectorAll('.lang-btn').forEach(b=>{
      b.classList.toggle('lang-active', b.dataset.lang===lang);
    });
    localStorage.setItem('jeju_lang', lang);
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      .visit-btn{
        display:inline-flex;align-items:center;gap:6px;
        padding:8px 16px;border-radius:8px;
        background:#f3f4f6;border:1px solid #e5e7eb;
        color:#374151;font-size:13px;font-weight:500;cursor:pointer;
        font-family:'DM Sans',sans-serif;transition:all .2s;
      }
      .visit-btn:hover{background:#e5e7eb;}
      .visit-btn.visited{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
      .badge-toast{
        position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-80px);
        background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:16px;
        z-index:4000;display:flex;align-items:center;gap:12px;
        opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;
        min-width:240px;
      }
      .badge-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
      .badge-toast-icon{font-size:28px;}
      .badge-toast-name{font-size:13px;font-weight:700;}
      .badge-toast-desc{font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;}
      #badge-modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:400;
        display:none;align-items:center;justify-content:center;padding:20px;}
      #badge-modal.open{display:flex;}
      .badge-box{background:#fff;border-radius:20px;max-width:480px;width:100%;
        max-height:80vh;overflow-y:auto;padding:24px;
        box-shadow:0 24px 64px rgba(0,0,0,0.2);}
      .badge-panel-title{font-family:'Noto Serif KR',serif;font-size:1.1rem;
        font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;}
      .badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
      .badge-item{background:#f9fafb;border-radius:12px;padding:12px;text-align:center;
        border:1.5px solid #e5e7eb;transition:transform .15s;}
      .badge-item:not(.badge-locked):hover{transform:translateY(-2px);}
      .badge-locked{opacity:.35;filter:grayscale(1);}
      .badge-icon{font-size:26px;display:block;margin-bottom:6px;}
      .badge-name{font-size:12px;font-weight:700;color:#374151;margin-bottom:3px;}
      .badge-desc{font-size:10px;color:#9ca3af;line-height:1.4;}
      .badge-visit-count{margin-top:14px;text-align:center;font-size:13px;color:#6b7280;}
      #badge-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
        border-radius:20px;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:500;
        border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;
        color:#6b7280;transition:all .2s;white-space:nowrap;}
      #badge-btn:hover{border-color:#f59e0b;color:#92400e;}
      .lang-btn{padding:3px 8px;border-radius:6px;border:1.5px solid #e5e7eb;
        background:#fff;font-size:11px;font-weight:600;cursor:pointer;
        color:#6b7280;transition:all .15s;font-family:'DM Sans',sans-serif;}
      .lang-btn:hover{border-color:#374151;color:#374151;}
      .lang-btn.lang-active{background:#374151;color:#fff;border-color:#374151;}
      #lang-area{display:flex;align-items:center;gap:8px;
        padding:6px 20px;max-width:1200px;margin:0 auto;justify-content:flex-end;}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    const toolbar = document.querySelector('.toolbar');
    if(toolbar){
      const langArea = document.createElement('div');
      langArea.id = 'lang-area';
      langArea.setAttribute('aria-label','언어 선택');
      let langHtml = '<span style="font-size:11px;color:#9ca3af">🌐</span>';
      Object.entries(LANGS).forEach(([lang,info])=>{
        langHtml += `<button class="lang-btn${lang==='ko'?' lang-active':''}"
          data-lang="${lang}" aria-label="${info.label} 언어 선택">${info.flag} ${info.label}</button>`;
      });
      langArea.innerHTML = langHtml;
      toolbar.before(langArea);
      langArea.querySelectorAll('.lang-btn').forEach(btn=>{
        btn.addEventListener('click', ()=> applyLang(btn.dataset.lang));
      });
    }

    const favBtn = document.getElementById('fav-toggle-btn');
    if(favBtn){
      const btn = document.createElement('button');
      btn.id = 'badge-btn';
      btn.setAttribute('aria-label','나의 뱃지 보기');
      btn.textContent = '🏅 뱃지';
      btn.addEventListener('click', showBadgePanel);
      favBtn.after(btn);
    }

    const badgeModal = document.createElement('div');
    badgeModal.id = 'badge-modal';
    badgeModal.setAttribute('role','dialog');
    badgeModal.setAttribute('aria-modal','true');
    badgeModal.innerHTML = `
      <div class="badge-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div class="badge-panel-title">🏅 나의 뱃지</div>
          <button style="background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af"
            onclick="document.getElementById('badge-modal').classList.remove('open');document.body.style.overflow=''">×</button>
        </div>
        <div id="badge-panel"></div>
      </div>`;
    document.body.appendChild(badgeModal);
    badgeModal.addEventListener('click', e=>{
      if(e.target===badgeModal){
        badgeModal.classList.remove('open');
        document.body.style.overflow='';
      }
    });

    const heroStats = document.querySelector('.hero-stats');
    if(heroStats){
      const v = getVisits();
      const statDiv = document.createElement('div');
      statDiv.className = 'stat';
      statDiv.innerHTML = `<div class="stat-num" id="stat-visits">${v.size}</div><div class="stat-label">방문 인증</div>`;
      heroStats.appendChild(statDiv);
    }
  }

  function patchOpenModal(){
    const orig = window.openModal;
    window.openModal = function(no){
      orig(no);
      setTimeout(()=> renderVisitBtn(no), 15);
    };
  }

  function init(){
    injectCSS();
    injectHTML();
    patchOpenModal();
    const savedLang = localStorage.getItem('jeju_lang');
    if(savedLang && LANGS[savedLang] && savedLang!=='ko') applyLang(savedLang);
    else {
      const browserLang = navigator.language.toLowerCase();
      if(browserLang.startsWith('ja')) applyLang('ja');
      else if(browserLang.startsWith('zh')) applyLang('zh');
      else if(browserLang.startsWith('en')) applyLang('en');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
