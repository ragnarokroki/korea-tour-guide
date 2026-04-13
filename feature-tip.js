/* ═══════════════════════════════════════════
   feature-tip.js
   ④ 모달 내 방문 팁 · 혼잡도 블록
      desc/hours 키워드 분석으로 자동 생성
═══════════════════════════════════════════ */

(function(){

  // 장소 특성에 따른 팁 데이터베이스
  const TIP_DB = {
    beach:  {
      keywords:['해수욕장','해변','해안'],
      bestTime:'오전 9시 이전 또는 오후 5시 이후',
      crowded:'7~8월 성수기 매우 혼잡',
      tip:'물놀이 용품은 미리 준비하세요. 자외선 차단제 필수.',
      icon:'🏖️'
    },
    oreum: {
      keywords:['오름'],
      bestTime:'이른 오전 (일출 직후)',
      crowded:'주말 오전 10시~12시 혼잡',
      tip:'등산화 착용 권장. 기상 변화가 빠르니 여벌 옷을 챙기세요.',
      icon:'⛰️'
    },
    museum:{
      keywords:['박물관','미술관','전시','갤러리','문화시설'],
      bestTime:'평일 오전 개장 직후',
      crowded:'주말·공휴일 오후 2~4시 혼잡',
      tip:'오디오 가이드나 해설 프로그램을 활용하면 더욱 풍부한 관람이 가능합니다.',
      icon:'🏛️'
    },
    cave:  {
      keywords:['동굴','굴'],
      bestTime:'연중 쾌적 (동굴 내 17~18°C)',
      crowded:'여름 성수기·주말 오전 11시~오후 2시',
      tip:'동굴 내부는 서늘하니 얇은 겉옷을 챙기세요.',
      icon:'🕳️'
    },
    forest:{
      keywords:['숲','수목원','산책로','휴양림','곶자왈'],
      bestTime:'이른 아침 (피톤치드 농도 최고)',
      crowded:'주말 오전 10시~12시',
      tip:'모기 기피제와 편한 운동화를 준비하세요.',
      icon:'🌲'
    },
    waterfall:{
      keywords:['폭포'],
      bestTime:'비 온 뒤 수량이 풍부할 때',
      crowded:'오후 2~4시 가장 혼잡',
      tip:'폭포 주변은 미끄럽습니다. 미끄럼 방지 신발 필수.',
      icon:'💧'
    },
    sunrise:{
      keywords:['일출','성산일출봉'],
      bestTime:'일출 30분 전 도착 추천',
      crowded:'연말연시·맑은 날 새벽 매우 혼잡',
      tip:'계절별 일출 시간을 미리 확인하세요. 방한복 필수.',
      icon:'🌅'
    },
    park:  {
      keywords:['공원','광장','테마파크'],
      bestTime:'평일 오전 개장 직후',
      crowded:'주말·연휴 오후 1~3시 혼잡',
      tip:'주차 공간이 협소할 수 있으니 대중교통 이용을 고려하세요.',
      icon:'🌿'
    },
    port:  {
      keywords:['포구','항','선착장'],
      bestTime:'이른 아침 (어선 귀항 시간)',
      crowded:'성수기 낚시철 주말',
      tip:'조수간만 시간을 확인하면 더 아름다운 포구 풍경을 감상할 수 있습니다.',
      icon:'⚓'
    },
    temple:{
      keywords:['사찰','절','사'],
      bestTime:'이른 아침 예불 시간',
      crowded:'봄·가을 주말 오전 10시~12시',
      tip:'조용하고 차분한 복장을 갖추세요. 사진 촬영 전 안내문을 확인하세요.',
      icon:'🛕'
    },
  };

  function getTipForPlace(p){
    const text = (p.name + p.desc + p.category).toLowerCase();
    for(const [key, data] of Object.entries(TIP_DB)){
      if(data.keywords.some(kw=>text.includes(kw))){
        return data;
      }
    }
    // 기본값
    return {
      bestTime:'평일 오전 방문을 권장',
      crowded:'주말·공휴일 오후 혼잡할 수 있음',
      tip:'방문 전 운영시간을 공식 채널에서 재확인하세요.',
      icon:'📍'
    };
  }

  function getCrowdLevel(tip){
    if(!tip.crowded) return { level:2, label:'보통' };
    const text = tip.crowded;
    if(text.includes('매우 혼잡')) return { level:3, label:'매우 혼잡' };
    if(text.includes('혼잡')) return { level:2, label:'혼잡' };
    return { level:1, label:'쾌적' };
  }

  function renderTipBlock(no){
    const p = PLACES.find(x=>x.no===no);
    if(!p) return;
    const tip = getTipForPlace(p);
    const crowd = getCrowdLevel(tip);
    const crowdColors = ['','#10b981','#f59e0b','#ef4444'];
    const crowdBg     = ['','#d1fae5','#fef3c7','#fee2e2'];
    const crowdDots   = crowd.level;

    const existing = document.getElementById('modal-tip-block');
    if(existing) existing.remove();

    const block = document.createElement('div');
    block.id = 'modal-tip-block';
    block.innerHTML = `
      <div class="tip-block">
        <div class="tip-title">${tip.icon || '📍'} 방문 가이드</div>
        <div class="tip-row">
          <span class="tip-icon">⏰</span>
          <div>
            <div class="tip-label">베스트 방문 시간</div>
            <div class="tip-val">${tip.bestTime}</div>
          </div>
        </div>
        <div class="tip-row">
          <span class="tip-icon">👥</span>
          <div style="flex:1">
            <div class="tip-label">혼잡도</div>
            <div class="tip-crowd">
              <div class="crowd-dots">
                ${[1,2,3].map(i=>`<span class="crowd-dot" style="background:${i<=crowdDots?crowdColors[crowd.level]:'#e5e7eb'}"></span>`).join('')}
              </div>
              <span class="crowd-label" style="background:${crowdBg[crowd.level]};color:${crowdColors[crowd.level]}">${crowd.label}</span>
            </div>
            <div class="tip-val" style="margin-top:2px;font-size:11px;color:#9ca3af">${tip.crowded}</div>
          </div>
        </div>
        <div class="tip-row">
          <span class="tip-icon">💡</span>
          <div>
            <div class="tip-label">방문 팁</div>
            <div class="tip-val">${tip.tip}</div>
          </div>
        </div>
      </div>`;

    // 모달 이미지 섹션 앞에 삽입
    const imgSection = document.getElementById('m-images');
    if(imgSection) imgSection.before(block);
    else document.getElementById('m-info').after(block);
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      .tip-block{
        margin-top:16px;padding:14px 16px;border-radius:12px;
        background:#fafafa;border:1px solid #f3f4f6;
      }
      .tip-title{font-size:12px;font-weight:700;color:#374151;letter-spacing:.5px;
        margin-bottom:12px;text-transform:uppercase;}
      .tip-row{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;}
      .tip-row:last-child{margin-bottom:0;}
      .tip-icon{font-size:15px;width:20px;flex-shrink:0;margin-top:1px;}
      .tip-label{font-size:10px;font-weight:600;color:#9ca3af;letter-spacing:.5px;
        text-transform:uppercase;margin-bottom:2px;}
      .tip-val{font-size:12.5px;color:#374151;line-height:1.6;}
      .tip-crowd{display:flex;align-items:center;gap:6px;margin-bottom:2px;}
      .crowd-dots{display:flex;gap:3px;}
      .crowd-dot{width:10px;height:10px;border-radius:50%;}
      .crowd-label{font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;}
    `;
    document.head.appendChild(style);
  }

  // openModal 함수를 가로채서 팁 렌더링 추가
  function patchOpenModal(){
    const orig = window.openModal;
    window.openModal = function(no){
      orig(no);
      // 모달이 DOM에 그려진 직후 팁 블록 삽입
      setTimeout(()=> renderTipBlock(no), 0);
    };
  }

  function init(){
    injectCSS();
    patchOpenModal();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
