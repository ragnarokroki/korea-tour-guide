/* ═══════════════════════════════════════════
   feature-daily.js
   ① 오늘의 제주 (날짜 시드 랜덤 추천)
   ② 하루 코스 자동 생성기 (즐겨찾기 기반)
═══════════════════════════════════════════ */

(function(){
  /* ─── ① 오늘의 제주 ─────────────────────── */
  function getDailySpot(){
    const today = new Date();
    const seed = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
    const idx = seed % PLACES.length;
    return PLACES[idx];
  }

  function renderDailySpot(){
    const p = getDailySpot();
    const c = RC[p.region] || '#2D6A4F';
    const banner = document.getElementById('daily-spot-banner');
    if(!banner) return;
    banner.innerHTML = `
      <div class="daily-inner" onclick="openModal(${p.no})" role="button" tabindex="0"
           aria-label="오늘의 제주: ${p.name} 클릭하면 상세 보기">
        <div class="daily-label">
          <span class="daily-icon">🎲</span> 오늘의 제주
          <span class="daily-date">${new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric'})}</span>
        </div>
        <div class="daily-name" style="color:${c}">${p.name}</div>
        <div class="daily-region">
          <span class="daily-region-dot" style="background:${c}"></span>
          ${p.region} · ${p.category}
          ${p.fee==='무료'||p.fee==='무료 이용가능'?'<span class="daily-free-badge">무료</span>':''}
        </div>
        <div class="daily-desc">${p.desc.slice(0,80)}…</div>
        <div class="daily-cta">자세히 보기 →</div>
      </div>`;
    banner.addEventListener('keydown', e=>{
      if(e.key==='Enter'||e.key===' ') openModal(p.no);
    });
  }

  /* ─── ② 하루 코스 생성기 ───────────────── */
  function generateCourse(){
    if(typeof FAV === 'undefined' || FAV.size === 0){
      showToast('즐겨찾기한 장소가 없습니다. 먼저 ☆ 버튼으로 장소를 추가하세요.');
      return;
    }
    const favPlaces = [...FAV].map(no=>PLACES.find(x=>x.no===no)).filter(Boolean);
    // 위도 기준 정렬 (북→남 동선 최적화)
    const sorted = [...favPlaces].sort((a,b)=>{
      const latDiff = (b.lat||0) - (a.lat||0);
      if(Math.abs(latDiff)>0.01) return latDiff;
      return (a.lng||0)-(b.lng||0);
    });
    const slots = [
      { label:'오전', emoji:'🌅', items:[] },
      { label:'점심 이후', emoji:'☀️', items:[] },
      { label:'오후', emoji:'🌇', items:[] },
    ];
    sorted.forEach((p,i)=> slots[i%3].items.push(p));

    const modal = document.getElementById('course-modal');
    const body  = document.getElementById('course-body');
    if(!modal||!body) return;

    let html = `<div class="course-header-info">📍 즐겨찾기 ${favPlaces.length}곳 기반 · 위치 동선 최적화</div>`;
    slots.forEach(slot=>{
      if(!slot.items.length) return;
      html += `<div class="course-slot">
        <div class="course-slot-label">${slot.emoji} ${slot.label}</div>
        <div class="course-slot-items">`;
      slot.items.forEach(p=>{
        const c=RC[p.region]||'#2D6A4F';
        html += `<div class="course-item" onclick="document.getElementById('course-modal').classList.remove('open');document.body.style.overflow='';openModal(${p.no})">
          <span class="course-item-num" style="background:${c}">${p.no}</span>
          <div class="course-item-info">
            <div class="course-item-name">${p.name}</div>
            <div class="course-item-meta">${p.region} · ${p.category}${p.hours?'<br>'+p.hours.slice(0,30):''}
            </div>
          </div>
          <span class="course-item-arrow">›</span>
        </div>`;
      });
      html += `</div></div>`;
    });
    html += `<div class="course-tip">💡 장소 클릭 시 상세 정보로 이동합니다.</div>`;
    body.innerHTML = html;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /* ─── DOM 주입 ──────────────────────────── */
  function injectDailyCSS(){
    const style = document.createElement('style');
    style.textContent = `
      #daily-spot-banner{margin:0 auto;max-width:1200px;padding:0 20px 12px;}
      .daily-inner{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid #6ee7b7;
        border-radius:16px;padding:16px 20px;cursor:pointer;transition:box-shadow .2s;
        position:relative;overflow:hidden;}
      .daily-inner:hover{box-shadow:0 6px 20px rgba(0,0,0,0.1);}
      .daily-inner::before{content:'';position:absolute;right:-20px;top:-20px;
        width:100px;height:100px;background:radial-gradient(circle,rgba(110,231,183,0.3),transparent);
        border-radius:50%;}
      .daily-label{font-size:11px;font-weight:600;color:#059669;letter-spacing:1px;
        text-transform:uppercase;display:flex;align-items:center;gap:6px;margin-bottom:6px;}
      .daily-date{margin-left:auto;color:#6b7280;font-weight:400;letter-spacing:0;}
      .daily-icon{font-size:14px;}
      .daily-name{font-family:'Noto Serif KR',serif;font-size:1.2rem;font-weight:700;margin-bottom:4px;}
      .daily-region{font-size:12px;color:#6b7280;display:flex;align-items:center;gap:5px;margin-bottom:8px;}
      .daily-region-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
      .daily-free-badge{background:#FEF3C7;color:#92400E;font-size:10px;font-weight:600;
        padding:1px 6px;border-radius:4px;}
      .daily-desc{font-size:13px;color:#4b5563;line-height:1.6;margin-bottom:10px;}
      .daily-cta{font-size:12px;color:#059669;font-weight:600;}

      /* 코스 모달 */
      #course-modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;
        display:none;align-items:center;justify-content:center;padding:20px;}
      #course-modal.open{display:flex;}
      .course-box{background:#fff;border-radius:20px;max-width:500px;width:100%;
        max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.2);}
      .course-box-header{padding:20px 24px 16px;border-bottom:1px solid #f3f4f6;
        display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;}
      .course-box-title{font-family:'Noto Serif KR',serif;font-size:1.1rem;font-weight:700;}
      .course-close{background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af;}
      .course-body{padding:16px 24px 24px;}
      .course-header-info{font-size:12px;color:#6b7280;background:#f9fafb;
        border-radius:8px;padding:8px 12px;margin-bottom:14px;}
      .course-slot{margin-bottom:18px;}
      .course-slot-label{font-size:12px;font-weight:700;color:#374151;letter-spacing:.5px;
        margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f3f4f6;}
      .course-slot-items{display:flex;flex-direction:column;gap:8px;}
      .course-item{display:flex;align-items:center;gap:10px;padding:10px 12px;
        border-radius:12px;border:1px solid #f3f4f6;cursor:pointer;transition:background .15s;}
      .course-item:hover{background:#f9fafb;}
      .course-item-num{min-width:28px;height:22px;border-radius:6px;display:flex;
        align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;}
      .course-item-info{flex:1;min-width:0;}
      .course-item-name{font-size:13px;font-weight:600;margin-bottom:2px;}
      .course-item-meta{font-size:11px;color:#9ca3af;line-height:1.5;}
      .course-item-arrow{color:#d1d5db;font-size:18px;}
      .course-tip{font-size:11px;color:#9ca3af;text-align:center;margin-top:8px;}
      #course-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
        border-radius:20px;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:500;
        border:1.5px solid #10b981;background:#f0fdf4;cursor:pointer;color:#059669;
        transition:all .2s;white-space:nowrap;}
      #course-btn:hover{background:#059669;color:#fff;}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    // 히어로 아래 / 툴바 위에 배너 삽입
    const toolbar = document.querySelector('.toolbar');
    if(toolbar){
      const banner = document.createElement('div');
      banner.id = 'daily-spot-banner';
      toolbar.before(banner);
    }

    // 코스 모달 추가
    const courseModal = document.createElement('div');
    courseModal.id = 'course-modal';
    courseModal.setAttribute('role','dialog');
    courseModal.setAttribute('aria-modal','true');
    courseModal.setAttribute('aria-label','하루 코스');
    courseModal.innerHTML = `
      <div class="course-box">
        <div class="course-box-header">
          <div class="course-box-title">🗓️ 나의 하루 코스</div>
          <button class="course-close" aria-label="닫기"
            onclick="document.getElementById('course-modal').classList.remove('open');document.body.style.overflow=''">×</button>
        </div>
        <div class="course-body" id="course-body"></div>
      </div>`;
    document.body.appendChild(courseModal);
    courseModal.addEventListener('click', e=>{
      if(e.target===courseModal){
        courseModal.classList.remove('open');
        document.body.style.overflow='';
      }
    });

    // 즐겨찾기 버튼 옆에 코스 버튼 추가
    const favBtn = document.getElementById('fav-toggle-btn');
    if(favBtn){
      const courseBtn = document.createElement('button');
      courseBtn.id = 'course-btn';
      courseBtn.setAttribute('aria-label','즐겨찾기 기반 하루 코스 만들기');
      courseBtn.innerHTML = '🗓️ 코스 만들기';
      courseBtn.addEventListener('click', generateCourse);
      favBtn.after(courseBtn);
    }
  }

  function init(){
    injectDailyCSS();
    injectHTML();
    renderDailySpot();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
