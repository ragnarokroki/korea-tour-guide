/* ═══════════════════════════════════════════
   feature-ai-chat.js
   ⑨ AI 맞춤 코스 추천 챗 (Anthropic API)
      claude-haiku 기반 자연어 코스 추천
      추천된 장소 번호 클릭 시 모달 연동
═══════════════════════════════════════════ */

(function(){
  let chatOpen = false;
  let chatHistory = [];

  /* ─── 시스템 프롬프트 (PLACES 요약 포함) ── */
  function buildSystemPrompt(){
    // 대표 장소 샘플 (번호, 이름, 지역, 카테고리, 무료여부만 전달)
    const sample = PLACES.map(p=>
      `[${p.no}]${p.name}(${p.region},${p.category}${p.fee==='무료'||p.fee==='무료 이용가능'?',무료':''})`
    ).join(' | ');

    return `당신은 제주도 여행 전문 AI 가이드입니다.
아래 제주도 장소 데이터(총 ${PLACES.length}곳)를 기반으로 여행자 맞춤 코스를 추천합니다.

[장소 데이터]
${sample}

[규칙]
1. 추천 장소는 반드시 위 데이터에 있는 장소 번호([숫자])를 포함해 답변하세요.
2. 예: "성산일출봉[207]은 꼭 방문하세요."
3. 한국어로 친절하고 간결하게 답변하세요.
4. 일정별로 오전/오후/저녁으로 구분해 코스를 제안하세요.
5. 장소 번호를 반드시 [숫자] 형식으로 포함하세요 - 사용자가 클릭할 수 있습니다.
6. 무료 장소는 "(무료)" 표시를 추가하세요.
7. 답변은 400자 이내로 간결하게 작성하세요.`;
  }

  /* ─── Anthropic API 호출 ─────────────────── */
  async function callClaude(userMessage){
    chatHistory.push({ role:'user', content:userMessage });

    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:600,
        system: buildSystemPrompt(),
        messages: chatHistory,
      }),
    });

    if(!res.ok){
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error?.message || `API Error ${res.status}`);
    }

    const data = await res.json();
    const reply = data.content[0]?.text || '답변을 생성하지 못했습니다.';
    chatHistory.push({ role:'assistant', content:reply });
    return reply;
  }

  /* ─── 메시지 파싱 (장소 번호 링크화) ────── */
  function parseReply(text){
    // [숫자] → 클릭 가능한 스팬으로 변환
    return text.replace(/\[(\d+)\]/g, (match, no)=>{
      const n = parseInt(no);
      const p = PLACES.find(x=>x.no===n);
      if(!p) return match;
      return `<span class="ai-place-link" data-no="${n}"
        role="button" tabindex="0" title="${p.name} 상세 보기">[${no}]</span>`;
    });
  }

  function addMessage(role, text, isLoading=false){
    const log = document.getElementById('ai-chat-log');
    if(!log) return;
    const div = document.createElement('div');
    div.className = `ai-msg ai-msg-${role}${isLoading?' ai-loading':''}`;
    if(isLoading){
      div.innerHTML = '<span class="ai-dots"><span>.</span><span>.</span><span>.</span></span>';
    } else {
      div.innerHTML = role==='assistant'
        ? parseReply(text)
        : text.replace(/</g,'&lt;');
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;

    // 장소 링크 클릭 이벤트
    div.querySelectorAll('.ai-place-link').forEach(el=>{
      el.addEventListener('click', ()=>{
        const no = parseInt(el.dataset.no);
        openModal(no);
        if(window.innerWidth<600) closeChat();
      });
      el.addEventListener('keydown', e=>{
        if(e.key==='Enter'||e.key===' ') el.click();
      });
    });
    return div;
  }

  async function sendMessage(){
    const input = document.getElementById('ai-chat-input');
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;
    input.value = '';

    addMessage('user', text);
    const loadingEl = addMessage('assistant','', true);

    try{
      const reply = await callClaude(text);
      loadingEl?.remove();
      addMessage('assistant', reply);
    }catch(e){
      loadingEl?.remove();
      addMessage('assistant', `죄송합니다. 오류가 발생했습니다: ${e.message}`);
    }
  }

  function openChat(){
    chatOpen = true;
    const panel = document.getElementById('ai-chat-panel');
    if(panel) panel.classList.add('open');
    if(chatHistory.length===0){
      addMessage('assistant',
        '안녕하세요! 제주 여행 AI 가이드입니다. 😊\n\n어떤 여행을 원하시나요? 예를 들어:\n• "3박 4일, 아이 둘, 렌트카 있어요"\n• "혼자 여행, 오름 위주로 코스 추천해줘"\n• "우천 시 실내 명소 알려줘"');
    }
    setTimeout(()=> document.getElementById('ai-chat-input')?.focus(), 200);
  }

  function closeChat(){
    chatOpen = false;
    const panel = document.getElementById('ai-chat-panel');
    if(panel) panel.classList.remove('open');
  }

  function injectCSS(){
    const style = document.createElement('style');
    style.textContent = `
      #ai-fab{
        position:fixed;bottom:28px;right:28px;z-index:1500;
        width:52px;height:52px;border-radius:50%;border:none;
        background:linear-gradient(135deg,#7c3aed,#4f46e5);
        color:#fff;font-size:22px;cursor:pointer;
        box-shadow:0 4px 20px rgba(124,58,237,0.4);
        transition:transform .2s,box-shadow .2s;
        display:flex;align-items:center;justify-content:center;
      }
      #ai-fab:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(124,58,237,0.5);}
      #ai-fab .ai-fab-badge{
        position:absolute;top:-2px;right:-2px;
        width:16px;height:16px;border-radius:50%;
        background:#10b981;border:2px solid #fff;
        font-size:8px;display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:700;
      }

      #ai-chat-panel{
        position:fixed;bottom:92px;right:28px;z-index:1499;
        width:340px;max-height:520px;
        background:#fff;border-radius:20px;
        box-shadow:0 20px 60px rgba(0,0,0,0.18);
        display:none;flex-direction:column;
        animation:aiSlideIn .25s ease;
        overflow:hidden;
      }
      #ai-chat-panel.open{display:flex;}
      @keyframes aiSlideIn{
        from{opacity:0;transform:translateY(20px) scale(0.95);}
        to{opacity:1;transform:translateY(0) scale(1);}
      }
      @media(max-width:400px){
        #ai-chat-panel{width:calc(100vw - 32px);right:16px;bottom:80px;}
        #ai-fab{right:16px;bottom:16px;}
      }

      .ai-chat-header{
        padding:14px 16px;
        background:linear-gradient(135deg,#7c3aed,#4f46e5);
        color:#fff;display:flex;align-items:center;gap:8px;
      }
      .ai-chat-avatar{width:28px;height:28px;border-radius:50%;
        background:rgba(255,255,255,0.25);display:flex;align-items:center;
        justify-content:center;font-size:14px;}
      .ai-chat-title{flex:1;font-size:14px;font-weight:600;}
      .ai-chat-close{background:none;border:none;color:rgba(255,255,255,0.8);
        font-size:20px;cursor:pointer;line-height:1;padding:2px 4px;}
      .ai-chat-close:hover{color:#fff;}

      #ai-chat-log{
        flex:1;overflow-y:auto;padding:14px;
        display:flex;flex-direction:column;gap:10px;
        background:#f9fafb;
        max-height:340px;
      }
      .ai-msg{max-width:90%;padding:10px 13px;border-radius:14px;
        font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-word;}
      .ai-msg-user{
        align-self:flex-end;
        background:#4f46e5;color:#fff;
        border-bottom-right-radius:4px;
      }
      .ai-msg-assistant{
        align-self:flex-start;
        background:#fff;color:#374151;
        border:1px solid #e5e7eb;
        border-bottom-left-radius:4px;
      }
      .ai-place-link{
        display:inline-block;
        background:#eef2ff;color:#4f46e5;
        border-radius:4px;padding:0 4px;
        font-weight:700;cursor:pointer;
        border-bottom:1.5px solid #a5b4fc;
        transition:background .15s;
      }
      .ai-place-link:hover{background:#e0e7ff;}
      .ai-loading .ai-dots{display:inline-flex;gap:4px;align-items:center;}
      .ai-loading .ai-dots span{
        width:6px;height:6px;border-radius:50%;background:#9ca3af;
        animation:aiDot .9s infinite;display:inline-block;
      }
      .ai-loading .ai-dots span:nth-child(2){animation-delay:.15s;}
      .ai-loading .ai-dots span:nth-child(3){animation-delay:.3s;}
      @keyframes aiDot{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-4px);}}

      .ai-chat-input-row{
        display:flex;gap:6px;padding:10px 12px;
        border-top:1px solid #e5e7eb;background:#fff;
      }
      #ai-chat-input{
        flex:1;border:1.5px solid #e5e7eb;border-radius:10px;
        padding:8px 10px;font-size:13px;font-family:'DM Sans',sans-serif;
        resize:none;height:36px;line-height:1.4;
        transition:border-color .15s;
      }
      #ai-chat-input:focus{outline:none;border-color:#7c3aed;}
      #ai-chat-send{
        padding:0 14px;border-radius:10px;border:none;
        background:#4f46e5;color:#fff;font-size:15px;cursor:pointer;
        transition:background .15s;
      }
      #ai-chat-send:hover{background:#4338ca;}
      .ai-suggestion-chips{
        display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;
        background:#fff;
      }
      .ai-chip{
        font-size:11px;padding:4px 10px;border-radius:12px;
        border:1px solid #e5e7eb;background:#f9fafb;cursor:pointer;
        color:#6b7280;transition:all .15s;
      }
      .ai-chip:hover{border-color:#7c3aed;color:#7c3aed;background:#faf5ff;}
    `;
    document.head.appendChild(style);
  }

  function injectHTML(){
    // FAB 버튼
    const fab = document.createElement('button');
    fab.id = 'ai-fab';
    fab.setAttribute('aria-label','AI 코스 추천 챗 열기');
    fab.innerHTML = `🤖<span class="ai-fab-badge">AI</span>`;
    fab.addEventListener('click', ()=> chatOpen ? closeChat() : openChat());
    document.body.appendChild(fab);

    // 채팅 패널
    const panel = document.createElement('div');
    panel.id = 'ai-chat-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','false');
    panel.setAttribute('aria-label','AI 제주 여행 가이드');
    panel.innerHTML = `
      <div class="ai-chat-header">
        <div class="ai-chat-avatar">🤖</div>
        <div class="ai-chat-title">AI 제주 가이드</div>
        <button class="ai-chat-close" id="ai-chat-close" aria-label="채팅 닫기">×</button>
      </div>
      <div id="ai-chat-log" role="log" aria-live="polite"></div>
      <div class="ai-suggestion-chips">
        <button class="ai-chip" data-q="3박 4일 가족여행 코스 추천해줘">👨‍👩‍👧 가족여행</button>
        <button class="ai-chip" data-q="커플 여행 로맨틱 코스 알려줘">💑 커플여행</button>
        <button class="ai-chip" data-q="무료 명소 위주로 코스 짜줘">🎫 무료 명소</button>
        <button class="ai-chip" data-q="비 오는 날 실내 관광지 추천해줘">☔ 우천 시</button>
      </div>
      <div class="ai-chat-input-row">
        <input id="ai-chat-input" placeholder="예: 2박3일, 렌트카 있어요…" aria-label="여행 조건 입력">
        <button id="ai-chat-send" aria-label="전송">➤</button>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('ai-chat-close').addEventListener('click', closeChat);

    document.getElementById('ai-chat-send').addEventListener('click', sendMessage);

    document.getElementById('ai-chat-input').addEventListener('keydown', e=>{
      if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
    });

    panel.querySelectorAll('.ai-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        const input = document.getElementById('ai-chat-input');
        if(input){ input.value = chip.dataset.q; sendMessage(); }
      });
    });
  }

  function init(){
    injectCSS();
    injectHTML();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
