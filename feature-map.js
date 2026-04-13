/* ═══════════════════════════════════════════
   feature-map.js
   ⑤ 미니 지도 뷰 전환 (Leaflet.js)
      카드 그리드 ↔ 지도 핀 뷰 토글
═══════════════════════════════════════════ */

(function(){
  let mapMode = false;
  let leafletMap = null;
  let markers = [];
  let mapLoaded = false;

  /* ─── Leaflet 동적 로드 ─────────────────── */
  function loadLeaflet(cb){
    if(mapLoaded){ cb(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = ()=>{ mapLoaded=true; cb(); };
    document.head.appendChild(script);
  }

  /* ─── 지도 초기화 ───────────────────────── */
  function initMap(){
    const container = document.getElementById('map-container');
    if(!container || leafletMap) return;
    leafletMap = L.map('map-container',{
      center:[33.3617, 126.5292],
      zoom:10,
      zoomControl:true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors',
      maxZoom:18,
    }).addTo(leafletMap);
  }

  /* ─── 마커 렌더 ─────────────────────────── */
  function renderMapMarkers(){
    // 기존 마커 제거
    markers.forEach(m=>m.remove());
    markers=[];
    const places = window.filtered ? window.filtered() : PLACES;
    const regionColors = {
      '제주시':'#1565C0','서부':'#2E7D32','남부':'#BF360C','동부':'#6A1B9A'
    };
    places.forEach(p=>{
      if(!p.lat||!p.lng) return;
      const c = regionColors[p.region]||'#2D6A4F';
      // SVG 커스텀 아이콘
      const svgIcon = L.divIcon({
        html:`<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${c};border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
          transform:rotate(-45deg);cursor:pointer;
        "></div>`,
        iconSize:[28,28],
        iconAnchor:[14,28],
        popupAnchor:[0,-30],
        className:'',
      });
      const marker = L.marker([p.lat,p.lng],{icon:svgIcon}).addTo(leafletMap);
      const freeBadge = (p.fee==='무료'||p.fee==='무료 이용가능')
        ? '<span style="background:#FEF3C7;color:#92400E;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600">무료</span>' : '';
      marker.bindPopup(`
        <div style="min-width:160px;font-family:'DM Sans',sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:6px">
            ${p.region} · ${p.category} ${freeBadge}
          </div>
          <button onclick="window._mapOpenModal(${p.no})"
            style="width:100%;padding:5px;border-radius:6px;border:none;
            background:${c};color:#fff;font-size:12px;cursor:pointer;font-weight:600">
            상세 보기
          </button>
        </div>
      `,{ maxWidth:200 });
      markers.push(marker);
    });
    // 마커가 있으면 전체 보이도록 bound 맞추기
    if(markers.length>0){
      const group = L.featureGroup(markers);
      leafletMap.fitBounds(group.getBounds().pad(0.1));
    }
  }

  window._mapOpenModal = function(no){
    if(window.leafletMap) leafletMap.closePopup();
    toggleMapView(); // 지도 닫기
    openModal(no);
  };

  /* ─── 지도/그리드 전환 ──────────────────── */
  function toggleMapView(){
    mapMode = !mapMode;
    const btn = document.getElementById('map-toggle-btn');
    const mainContent = document.getElementById('main-content');
    const mapContainer = document.getElementById('map-container');
    const themeRow = document.getElementById('theme-filter-row');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.querySelector('.pagination');

    if(mapMode){
      // 지도 모드
      mainContent.style.display = 'none';
      if(emptyState) emptyState.style.display='none';
      mapContainer.style.display = 'block';
      if(btn){ btn.textContent='☰ 목록 보기'; btn.classList.add('map-active'); }
      loadLeaflet(()=>{
        initMap();
        setTimeout(()=>{
          leafletMap.invalidateSize();
          renderMapMarkers();
        },100);
      });
    } else {
      // 목록 모드
      mainContent.style.display = '';
      mapContainer.style.display = 'none';
      if(btn){ btn.textContent='🗺️ 지도 보기'; btn.classList.remove('map-active'); }
      if(window.render) window.render(false);
    }
  }

  // filtered 변경 시 마커도 업데이트
  function watchFiltered(){
    const orig = window.render;
    window.render = function(scroll){
      orig(scroll);
      if(mapMode && leafletMap) renderMapMarkers();
    };
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      #map-container{
        display:none;
        height:calc(100vh - 160px);
        min-height:400px;
        max-width:1200px;
        margin:0 auto;
        padding:0 20px 20px;
      }
      #map-container .leaflet-container{
        height:100%;border-radius:16px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12);
      }
      #map-toggle-btn{
        display:inline-flex;align-items:center;gap:5px;
        padding:6px 12px;border-radius:20px;font-size:12px;
        font-family:'DM Sans',sans-serif;font-weight:500;
        border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;
        color:#6b7280;transition:all .2s;white-space:nowrap;
      }
      #map-toggle-btn:hover,#map-toggle-btn.map-active{
        border-color:#6366f1;color:#4f46e5;background:#eef2ff;
      }
      .leaflet-popup-content-wrapper{
        border-radius:12px !important;
        box-shadow:0 8px 24px rgba(0,0,0,0.15) !important;
      }
      .leaflet-popup-content{margin:12px 14px !important;}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    // 지도 컨테이너
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map-container';
    const mainContent = document.getElementById('main-content');
    if(mainContent) mainContent.after(mapDiv);

    // 툴바에 지도 버튼 추가
    const favBtn = document.getElementById('fav-toggle-btn');
    if(favBtn){
      const btn = document.createElement('button');
      btn.id = 'map-toggle-btn';
      btn.setAttribute('aria-label','지도 보기 전환');
      btn.textContent = '🗺️ 지도 보기';
      btn.addEventListener('click', toggleMapView);
      favBtn.before(btn);
    }
  }

  function init(){
    injectCSS();
    injectHTML();
    watchFiltered();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
