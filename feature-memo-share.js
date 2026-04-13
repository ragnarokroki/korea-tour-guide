/* ═══════════════════════════════════════════
   feature-memo-share.js
   ⑥ 장소별 개인 메모 (localStorage)
   ⑦ 즐겨찾기 URL 공유 링크 생성
═══════════════════════════════════════════ */

(function(){
  /* ═══════════════════════════════
     ⑥ 메모 기능
  ═══════════════════════════════ */
  const MEMO_KEY = 'jeju_memos';

  function getMemos(){
    try{ return JSON.parse(localStorage.getItem(MEMO_KEY)||'{}'); }
    catch(e){ return {}; }
  }
  function setMemo(no, text){
    const memos = getMemos();
    if(text.trim()) memos[String(no)] = text.trim();
    else delete memos[String(no)];
    localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
  }
  function getMemo(no){ return getMemos()[String(no)] || ''; }
  function hasMemo(no){ return !!getMemo(no); }

  function renderMemoBlock(no){
    const existing = document.getElementById('modal-memo-block');
    if(existing) existing.remove();

    const saved = getMemo(no);
    const block = document.createElement('div');
    block.id = 'modal-memo-block';
    block.innerHTML = `
      <div class="memo-block">
        <div class="memo-title">📝 나의 메모</div>
        <textarea id="memo-textarea" class="memo-textarea"
          placeholder="이 장소에 대한 메모를 남겨두세요. (입구 위치, 주차 팁, 방문 날짜 등)"
          aria-label="장소 메모 입력">${saved}</textarea>
        <div class="memo-actions">
          <span id="memo-char" class="memo-char">${saved.length}/200</span>
          <button id="memo-save-btn" class="memo-save-btn">저장</button>
          ${saved?`<button id="memo-del-btn" class="memo-del-btn">삭제</button>`:''}
        </div>
      </div>`;

    const mapLink = document.getElementById('m-map');
    if(mapLink) mapLink.after(block);

    const textarea = block.querySelector('#memo-textarea');
    const charEl   = block.querySelector('#memo-char');
    textarea.addEventListener('input', ()=>{
      const len = textarea.value.length;
      if(len>200) textarea.value=textarea.value.slice(0,200);
      charEl.textContent = `${Math.min(len,200)}/200`;
    });

    block.querySelector('#memo-save-btn').addEventListener('click',()=>{
      setMemo(no, textarea.value);
      showToast('메모가 저장되었습니다. 📝');
      updateMemoCardBadge(no);
      renderMemoBlock(no); // 재렌더(삭제 버튼 표시)
    });

    const delBtn = block.querySelector('#memo-del-btn');
    if(delBtn) delBtn.addEventListener('click',()=>{
      setMemo(no,'');
      textarea.value='';
      showToast('메모가 삭제되었습니다.');
      updateMemoCardBadge(no);
      renderMemoBlock(no);
    });
  }

  function updateMemoCardBadge(no){
    // 카드에 메모 배지 표시/숨김
    const card = document.querySelector(`[data-no="${no}"]`);
    if(!card) return;
    let badge = card.querySelector('.memo-card-badge');
    if(hasMemo(no)){
      if(!badge){
        badge = document.createElement('span');
        badge.className='memo-card-badge';
        badge.textContent='📝';
        badge.title='메모 있음';
        const header = card.querySelector('.card-header');
        if(header) header.appendChild(badge);
      }
    } else {
      if(badge) badge.remove();
    }
  }

  /* ═══════════════════════════════
     ⑦ 공유 링크 생성
  ═══════════════════════════════ */

  function buildShareUrl(){
    const ids = [...FAV].join(',');
    const url = new URL(location.href);
    url.searchParams.set('favs', ids);
    return url.toString();
  }

  function loadFromUrl(){
    const params = new URLSearchParams(location.search);
    const favs = params.get('favs');
    if(!favs) return;
    try{
      const ids = favs.split(',').map(Number).filter(n=>n>0&&n<=PLACES.length);
      ids.forEach(n=>FAV.add(n));
      localStorage.setItem('jeju_favs', JSON.stringify([...FAV]));
      if(window.updateFavBadge) updateFavBadge();
      if(ids.length>0) showToast(`공유 링크에서 즐겨찾기 ${ids.length}곳을 불러왔습니다! ⭐`);
      // URL 정리
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('favs');
      history.replaceState(null,'',cleanUrl.toString());
    }catch(e){}
  }

  function showShareModal(){
    if(!window.FAV || FAV.size===0){
      showToast('즐겨찾기한 장소가 없습니다. 먼저 ☆ 버튼으로 추가하세요.');
      return;
    }
    const url = buildShareUrl();
    const modal = document.getElementById('share-modal');
    const urlInput = document.getElementById('share-url-input');
    if(!modal||!urlInput) return;
    urlInput.value = url;
    modal.classList.add('open');
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      /* 메모 */
      .memo-block{margin-top:14px;padding:14px 16px;background:#fffbeb;
        border:1px solid #fde68a;border-radius:12px;}
      .memo-title{font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;
        letter-spacing:.5px;text-transform:uppercase;}
      .memo-textarea{width:100%;min-height:72px;resize:vertical;border:1px solid #fde68a;
        border-radius:8px;padding:8px 10px;font-size:13px;font-family:'DM Sans',sans-serif;
        background:#fffef5;color:#374151;line-height:1.6;box-sizing:border-box;
        transition:border-color .15s;}
      .memo-textarea:focus{outline:none;border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.1);}
      .memo-actions{display:flex;align-items:center;gap:8px;margin-top:6px;}
      .memo-char{font-size:11px;color:#9ca3af;margin-left:auto;}
      .memo-save-btn{padding:4px 14px;border-radius:8px;border:none;
        background:#f59e0b;color:#fff;font-size:12px;font-weight:600;cursor:pointer;
        transition:background .15s;}
      .memo-save-btn:hover{background:#d97706;}
      .memo-del-btn{padding:4px 14px;border-radius:8px;border:1px solid #fde68a;
        background:#fff;color:#92400e;font-size:12px;cursor:pointer;}
      .memo-card-badge{position:absolute;top:10px;left:10px;font-size:12px;
        pointer-events:none;z-index:1;}

      /* 공유 버튼 */
      #share-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
        border-radius:20px;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:500;
        border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;
        color:#6b7280;transition:all .2s;white-space:nowrap;}
      #share-btn:hover{border-color:#3b82f6;color:#2563eb;}

      /* 공유 모달 */
      #share-modal{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:300;
        display:none;align-items:center;justify-content:center;padding:20px;}
      #share-modal.open{display:flex;}
      .share-box{background:#fff;border-radius:20px;max-width:460px;width:100%;
        padding:28px;box-shadow:0 24px 64px rgba(0,0,0,0.18);}
      .share-box h3{font-family:'Noto Serif KR',serif;font-size:1.1rem;font-weight:700;
        margin-bottom:6px;}
      .share-desc{font-size:13px;color:#6b7280;margin-bottom:16px;line-height:1.6;}
      .share-fav-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;}
      .share-fav-chip{font-size:11px;padding:3px 8px;border-radius:12px;
        background:#f3f4f6;color:#374151;}
      .share-url-row{display:flex;gap:8px;}
      #share-url-input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;
        font-size:12px;color:#374151;background:#f9fafb;font-family:monospace;}
      .share-copy-btn{padding:8px 16px;border-radius:8px;border:none;
        background:#2563eb;color:#fff;font-size:13px;font-weight:600;cursor:pointer;
        transition:background .15s;white-space:nowrap;}
      .share-copy-btn:hover{background:#1d4ed8;}
      .share-close-row{margin-top:16px;text-align:right;}
      .share-close-btn{padding:6px 16px;border-radius:8px;border:1px solid #e5e7eb;
        background:#fff;font-size:13px;cursor:pointer;color:#6b7280;}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    // 공유 모달
    const shareModal = document.createElement('div');
    shareModal.id = 'share-modal';
    shareModal.setAttribute('role','dialog');
    shareModal.setAttribute('aria-modal','true');
    shareModal.setAttribute('aria-label','즐겨찾기 공유');
    shareModal.innerHTML = `
      <div class="share-box">
        <h3>📤 즐겨찾기 공유</h3>
        <p class="share-desc">
          아래 링크를 공유하면 상대방이 접속했을 때 같은 즐겨찾기 목록을 볼 수 있습니다.
        </p>
        <div class="share-fav-list" id="share-fav-list"></div>
        <div class="share-url-row">
          <input id="share-url-input" type="text" readonly>
          <button class="share-copy-btn" id="share-copy-btn">복사</button>
        </div>
        <div class="share-close-row">
          <button class="share-close-btn" id="share-close-btn">닫기</button>
        </div>
      </div>`;
    document.body.appendChild(shareModal);

    shareModal.addEventListener('click', e=>{
      if(e.target===shareModal) shareModal.classList.remove('open');
    });
    document.getElementById('share-close-btn').addEventListener('click',()=>{
      shareModal.classList.remove('open');
    });
    document.getElementById('share-copy-btn').addEventListener('click',()=>{
      const input = document.getElementById('share-url-input');
      navigator.clipboard.writeText(input.value).then(()=>{
        showToast('링크가 클립보드에 복사되었습니다! 📋');
        shareModal.classList.remove('open');
      }).catch(()=>{
        input.select();
        document.execCommand('copy');
        showToast('링크 복사 완료!');
      });
    });

    // 공유 모달 열 때 칩 목록 갱신
    const origShow = showShareModal;
    window.showShareModal = function(){
      origShow();
      const chipArea = document.getElementById('share-fav-list');
      if(chipArea && FAV){
        chipArea.innerHTML = [...FAV].map(no=>{
          const p = PLACES.find(x=>x.no===no);
          return p?`<span class="share-fav-chip">${p.name}</span>`:'';
        }).join('');
      }
    };

    // 즐겨찾기 패널 하단에 공유 버튼 추가
    const favList = document.getElementById('fav-list');
    if(favList){
      const shareArea = document.createElement('div');
      shareArea.style.cssText='margin-top:16px;padding-top:12px;border-top:1px solid #f3f4f6;text-align:center;';
      shareArea.innerHTML='<button id="share-btn" aria-label="즐겨찾기 공유 링크 생성">📤 공유 링크 만들기</button>';
      favList.after(shareArea);
      shareArea.querySelector('#share-btn').addEventListener('click', ()=> window.showShareModal());
    }
  }

  /* openModal 패치 - 메모 블록 추가 */
  function patchOpenModal(){
    const orig = window.openModal;
    window.openModal = function(no){
      orig(no);
      setTimeout(()=> renderMemoBlock(no), 10);
    };
  }

  function init(){
    injectCSS();
    injectHTML();
    patchOpenModal();
    // URL에서 즐겨찾기 복원 (공유 링크 처리)
    loadFromUrl();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
