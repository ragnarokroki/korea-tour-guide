/* ═══════════════════════════════════════════
   feature-theme.js
   ③ 테마 필터 확장
      혼자여행 / 커플 / 아이동반 / 반려동물 / 우천시(실내)
═══════════════════════════════════════════ */

(function(){
  // 장소 no → tags 매핑 (카테고리·desc 키워드 기반 자동 태깅)
  const THEME_RULES = {
    solo:   { label:'혼자 여행', emoji:'🧍', keywords:['산책','오름','전망대','등대','포구','계곡','올레','갤러리','도서관','서점','박물관','기념관','미술관'] },
    couple: { label:'커플', emoji:'💑', keywords:['일몰','노을','야경','전망','낭만','해변','카페','포토','데이트','야외','수국','동백','벚꽃','유채'] },
    kids:   { label:'아이 동반', emoji:'👧', keywords:['체험','놀이','공원','동물','수족관','아쿠아','박물관','테마파크','에코','자연','유아','어린이'] },
    pet:    { label:'반려동물', emoji:'🐾', keywords:['반려동물','반려견','펫','애견','잔디','야외','공원','해안','산책','오름'] },
    indoor: { label:'우천 시', emoji:'☔', keywords:['박물관','미술관','문화시설','실내','동굴','아쿠아','갤러리','전시','공연','도서관','체험관'] },
  };

  let activeTheme = null;

  function getTagsForPlace(p){
    const text = (p.name + p.desc + p.category).toLowerCase();
    const tags = new Set();
    Object.entries(THEME_RULES).forEach(([key, rule])=>{
      if(rule.keywords.some(kw => text.includes(kw))) tags.add(key);
    });
    // 카테고리 '문화시설'은 indoor 무조건 포함
    if(p.category==='문화시설') tags.add('indoor');
    return tags;
  }

  // filtered() 함수를 감싸는 훅
  function patchFiltered(){
    const orig = window.filtered;
    window.filtered = function(){
      let result = orig();
      if(activeTheme){
        result = result.filter(p => getTagsForPlace(p).has(activeTheme));
      }
      return result;
    };
  }

  function setTheme(key){
    if(activeTheme === key){
      activeTheme = null;
    } else {
      activeTheme = key;
    }
    // 버튼 상태 업데이트
    document.querySelectorAll('.theme-btn').forEach(b=>{
      const active = b.dataset.theme === activeTheme;
      b.classList.toggle('theme-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    // 카운트 배지 표시
    const countEl = document.getElementById('theme-count');
    if(countEl){
      if(activeTheme){
        const n = window.filtered ? window.filtered().length : 0;
        countEl.textContent = `${THEME_RULES[activeTheme].label} ${n}곳`;
        countEl.style.display='inline';
      } else {
        countEl.style.display='none';
      }
    }
    window.curPage = 1;
    if(window.render) window.render(true);
    // 카운트 배지 재계산 (render 후)
    if(activeTheme && countEl){
      const n = window.filtered ? window.filtered().length : 0;
      countEl.textContent = `${THEME_RULES[activeTheme].label} ${n}곳`;
    }
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      #theme-filter-row{
        display:flex;align-items:center;gap:8px;padding:10px 20px;
        max-width:1200px;margin:0 auto;flex-wrap:wrap;
      }
      .theme-label{font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:1px;
        text-transform:uppercase;white-space:nowrap;}
      .theme-btn{
        display:inline-flex;align-items:center;gap:4px;
        padding:5px 12px;border-radius:20px;font-size:12px;
        font-family:'DM Sans',sans-serif;font-weight:500;
        border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;
        color:#6b7280;transition:all .18s;white-space:nowrap;
      }
      .theme-btn:hover{border-color:#6ee7b7;color:#059669;}
      .theme-btn.theme-active{
        background:#f0fdf4;border-color:#10b981;color:#059669;font-weight:600;
      }
      #theme-count{
        font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;
        background:#d1fae5;color:#065f46;display:none;margin-left:4px;
      }
      @media(max-width:600px){
        #theme-filter-row{padding:8px 12px;gap:6px;}
        .theme-btn{font-size:11px;padding:4px 9px;}
      }
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    const toolbar = document.querySelector('.toolbar');
    if(!toolbar) return;

    const row = document.createElement('div');
    row.id = 'theme-filter-row';
    row.setAttribute('role','group');
    row.setAttribute('aria-label','테마 필터');

    let html = '<span class="theme-label">테마</span>';
    Object.entries(THEME_RULES).forEach(([key, rule])=>{
      html += `<button class="theme-btn" data-theme="${key}"
        aria-pressed="false" aria-label="${rule.label} 테마 필터">
        ${rule.emoji} ${rule.label}
      </button>`;
    });
    html += `<span id="theme-count"></span>`;
    row.innerHTML = html;

    // 툴바 아래에 삽입
    toolbar.after(row);

    row.querySelectorAll('.theme-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> setTheme(btn.dataset.theme));
    });
  }

  function init(){
    injectCSS();
    injectHTML();
    patchFiltered();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
