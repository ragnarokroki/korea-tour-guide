/* ═══════════════════════════════════════════
   feature-weather.js
   ⑧ 실시간 날씨 연동 (Open-Meteo 무료 API)
      히어로 영역 날씨 표시 + 우천 시 실내 CTA
═══════════════════════════════════════════ */

(function(){
  const JEJU_LAT = 33.4996;
  const JEJU_LNG = 126.5312;
  const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${JEJU_LAT}&longitude=${JEJU_LNG}&current_weather=true&hourly=precipitation_probability&timezone=Asia%2FSeoul&forecast_days=1`;

  const WMO_MAP = {
    0:  { label:'맑음',        icon:'☀️',  rain:false },
    1:  { label:'대체로 맑음',  icon:'🌤️',  rain:false },
    2:  { label:'구름 조금',   icon:'⛅',  rain:false },
    3:  { label:'흐림',        icon:'☁️',  rain:false },
    45: { label:'안개',        icon:'🌫️',  rain:false },
    48: { label:'안개',        icon:'🌫️',  rain:false },
    51: { label:'가벼운 이슬비', icon:'🌧️', rain:true  },
    53: { label:'이슬비',       icon:'🌧️', rain:true  },
    55: { label:'짙은 이슬비',  icon:'🌧️', rain:true  },
    61: { label:'가벼운 비',    icon:'🌧️', rain:true  },
    63: { label:'비',           icon:'🌧️', rain:true  },
    65: { label:'폭우',         icon:'⛈️', rain:true  },
    71: { label:'눈',           icon:'❄️', rain:false },
    73: { label:'눈',           icon:'❄️', rain:false },
    80: { label:'소나기',       icon:'🌦️', rain:true  },
    81: { label:'소나기',       icon:'🌦️', rain:true  },
    82: { label:'강한 소나기',  icon:'⛈️', rain:true  },
    95: { label:'뇌우',         icon:'⛈️', rain:true  },
    99: { label:'강한 뇌우',    icon:'⛈️', rain:true  },
  };

  function getWeatherInfo(code){
    return WMO_MAP[code] || { label:'날씨 정보 없음', icon:'🌡️', rain:false };
  }

  function applyRainFilter(){
    // 테마 필터가 있으면 indoor 활성화
    const indoorBtn = document.querySelector('.theme-btn[data-theme="indoor"]');
    if(indoorBtn){
      indoorBtn.click();
      showToast('비 오는 날 실내 명소만 표시합니다. ☔');
    }
  }

  function renderWeather(data){
    const widget = document.getElementById('weather-widget');
    if(!widget) return;

    const current = data.current_weather;
    if(!current){ widget.style.display='none'; return; }

    const temp = Math.round(current.temperature);
    const info = getWeatherInfo(current.weathercode);
    // 현재 시간의 강수 확률
    const now  = new Date();
    const hour = now.getHours();
    const precipArr = data.hourly?.precipitation_probability;
    const precipPct = precipArr ? precipArr[hour] : null;

    let html = `
      <div class="weather-inner">
        <span class="weather-icon">${info.icon}</span>
        <div class="weather-info">
          <div class="weather-temp">${temp}°C</div>
          <div class="weather-label">${info.label}</div>
        </div>
        ${precipPct!==null?`<div class="weather-precip">💧 ${precipPct}%</div>`:''}
      </div>`;

    if(info.rain){
      html += `<button class="weather-rain-cta" id="weather-rain-cta"
        aria-label="우천 시 실내 명소 보기">
        ☔ 실내 명소만 보기
      </button>`;
    }

    widget.innerHTML = html;
    widget.style.display = 'flex';

    const rainBtn = document.getElementById('weather-rain-cta');
    if(rainBtn) rainBtn.addEventListener('click', applyRainFilter);
  }

  async function fetchWeather(){
    const widget = document.getElementById('weather-widget');
    if(!widget) return;
    widget.innerHTML = '<span class="weather-loading">날씨 불러오는 중…</span>';
    widget.style.display = 'flex';
    try{
      const res = await fetch(API_URL);
      if(!res.ok) throw new Error('fetch fail');
      const data = await res.json();
      renderWeather(data);
    }catch(e){
      widget.style.display = 'none';
    }
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      #weather-widget{
        display:none;align-items:center;gap:10px;flex-wrap:wrap;
        padding:10px 16px;border-radius:12px;
        background:rgba(255,255,255,0.15);
        backdrop-filter:blur(6px);
        border:1px solid rgba(255,255,255,0.3);
        position:relative;z-index:2;
        max-width:fit-content;margin:0 auto 12px;
      }
      .weather-inner{display:flex;align-items:center;gap:8px;}
      .weather-icon{font-size:24px;line-height:1;}
      .weather-info{line-height:1.3;}
      .weather-temp{font-size:18px;font-weight:700;color:#fff;}
      .weather-label{font-size:12px;color:rgba(255,255,255,0.85);}
      .weather-precip{font-size:12px;color:rgba(255,255,255,0.85);
        background:rgba(0,0,0,0.15);padding:3px 8px;border-radius:8px;}
      .weather-rain-cta{
        padding:6px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,0.6);
        background:rgba(255,255,255,0.2);color:#fff;font-size:12px;font-weight:600;
        cursor:pointer;transition:background .2s;white-space:nowrap;
        font-family:'DM Sans',sans-serif;
      }
      .weather-rain-cta:hover{background:rgba(255,255,255,0.35);}
      .weather-loading{font-size:12px;color:rgba(255,255,255,0.7);}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    const hero = document.querySelector('.hero');
    if(!hero) return;
    const widget = document.createElement('div');
    widget.id = 'weather-widget';
    widget.setAttribute('aria-live','polite');
    widget.setAttribute('aria-label','제주 현재 날씨');
    // 히어로 통계 위에 삽입
    const stats = hero.querySelector('.hero-stats');
    if(stats) stats.before(widget);
    else hero.appendChild(widget);
  }

  function init(){
    injectCSS();
    injectHTML();
    fetchWeather();
    // 30분마다 갱신
    setInterval(fetchWeather, 30*60*1000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
