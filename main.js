document.addEventListener('DOMContentLoaded', function () {
  const darkToggle = document.getElementById('darkToggle');
  const body = document.body;

  // Initialize from saved preference (if any)
  try {
    const saved = localStorage.getItem('hriday-dark');
    if (saved === '1') {
      body.classList.add('dark');
      if (darkToggle) darkToggle.checked = true;
    }
  } catch (e) {}

  if (darkToggle) {
    darkToggle.addEventListener('change', function () {
      if (darkToggle.checked) {
        body.classList.add('dark');
        try { localStorage.setItem('hriday-dark', '1'); } catch (e) {}
      } else {
        body.classList.remove('dark');
        try { localStorage.setItem('hriday-dark', '0'); } catch (e) {}
      }
    });
  }
});
// main.js — UI logic for the HridayAi demo
(function(){
  const chat = document.getElementById('chat');
  const promptInput = document.getElementById('prompt');
  const sendBtn = document.getElementById('send');
  const clearBtn = document.getElementById('clear');
  const attachBtn = document.getElementById('attach');
  const fileInput = document.getElementById('fileInput');
  const friendlyToggle = document.getElementById('friendlyToggle');
  const darkToggle = document.getElementById('darkToggle');
  const providerSelect = document.getElementById('providerSelect');
  let currentAttachment = null;
  let expectingName = false;
  const storageKey = 'hridayai_name';

  function appendMessage(text, role = 'ai'){
    const el = document.createElement('div');
    el.className = `message ${role}`;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  function appendImageMessage(dataUrl, role = 'ai', name){
    const el = document.createElement('div');
    el.className = `message ${role}`;
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = name || 'attached image';
    img.style.maxWidth = '280px';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    el.appendChild(img);
    if(name){
      const caption = document.createElement('div');
      caption.className = 'small muted';
      caption.textContent = name;
      caption.style.marginTop = '6px';
      el.appendChild(caption);
    }
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  function mockAiReply(userText){
    const useFriendly = friendlyToggle && friendlyToggle.checked;
    const name = localStorage.getItem(storageKey);
    const t = (userText || '').trim();
    const tl = t.toLowerCase();

    // Identity questions — always answer with HridayAi attribution
    if(/\b(who (are you|r you)|what(?:'| i)?s your name|what is your name|your name|who made you|who created you|who built you)\b/.test(tl)){
      return 'I am HridayAi and I was created by Hriday.';
    }

    if(/^(hi|hello|hey|yo|greetings)\b/.test(tl)){
      return useFriendly ? (name ? `Hey ${name}! ` : 'Hey! ') + "Nice to see you — how can I help?" : 'Hello — how can I assist you?';
    }

    if(/\b(time|date)\b/.test(tl)){
      const now = new Date();
      return useFriendly ? `It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.` : `Current time: ${now.toLocaleTimeString()}`;
    }

    if(/^[0-9+\-*/().\s]+$/.test(tl) && tl.length < 200){
      try{ const val = Function(`"use strict"; return (${t})`)(); return useFriendly ? `That comes out to ${val}.` : `Result: ${val}`; }
      catch(e){ return useFriendly ? "I couldn't calculate that — can you check the expression?" : "Unable to calculate expression."; }
    }

    if(/\b(help|how to|how do i|how can i)\b/.test(tl)){
      return useFriendly ? "I can help — tell me a bit more about what you want to do and I'll walk you through it." : "Please provide more details about the task.";
    }

    if(/\b(defin(e|ition)|what is|who is|explain)\b/.test(tl)){
      return useFriendly ? `I can explain that — do you mean: "${t}"? Give me a specific term or context.` : `Please clarify what you mean by: "${t}".`;
    }

    if(/\b(weather|forecast)\b/.test(tl)){
      return useFriendly ? "I can't fetch live weather from here, but tell me your city and I can suggest how to check it." : "Cannot fetch live weather in demo mode.";
    }

    if(t.length > 0) return useFriendly ? `I heard you ask: "${t}" — can you give a little more detail so I can answer better?` : `I didn't understand fully: "${t}". Please rephrase.`;

    return useFriendly ? "Hey — what would you like to talk about today?" : "Hi — how can I help?";
  }

  async function send(){
    try{
      const text = promptInput.value.trim();
      // If no text and no attachment, do nothing
      if(!text && !currentAttachment) return;

      // Identity override: always answer identity questions locally
      const tl = (text || '').toLowerCase();
      if(/\b(who (are you|r you)|what(?:'| i)?s your name|what is your name|your name|who made you|who created you|who built you)\b/.test(tl)){
        appendMessage('I am HridayAi and I was created by Hriday.', 'ai');
        promptInput.value = '';
        return;
      }

      if(text) appendMessage(text, 'user');
      const imageToSend = currentAttachment;
      // clear attachment after capturing
      currentAttachment = null;
      promptInput.value = '';

      const typing = document.createElement('div');
      typing.className = 'message ai';
      typing.textContent = 'AI is typing…';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      // simulate latency
      await new Promise(r => setTimeout(r, 600 + Math.random()*800));

      // decide provider
      const provider = providerSelect ? providerSelect.value : 'mock';

      // remove typing indicator early; we'll append actual reply afterwards
      typing.remove();

      // name capture flow (same for mock or remote)
      const storedName = localStorage.getItem(storageKey);
      if(!storedName && expectingName && text){
        const name = text.split(' ')[0];
        localStorage.setItem(storageKey, name);
        expectingName = false;
        appendMessage(`Lovely to meet you, ${name}! I'm HridayAi — your friendly assistant. How can I help today?`, 'ai');
        return;
      }

      if(provider === 'mock'){
        const reply = mockAiReply(text || '');
        const name = localStorage.getItem(storageKey);
        const greeting = name ? `Hey ${name}, ` : '';
        appendMessage(greeting + reply, 'ai');
        return;
      }

      // provider is a remote adapter (GPT-4o adapter at localhost:3001)
      try{
        const model = 'gpt-4o-mini';
        const res = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text || '', model })
        });
        if(!res.ok){
          const t = await res.text();
          throw new Error('Adapter error: ' + t);
        }
        const data = await res.json();
        if(data && data.reply){
          appendMessage(data.reply, 'ai');
        } else {
          appendMessage('No reply from adapter — falling back to mock.', 'debug');
          appendMessage(mockAiReply(text || ''), 'ai');
        }
      }catch(err){
        console.error('Adapter call failed', err);
        appendMessage('Adapter error: ' + (err && err.message ? err.message : String(err)), 'debug');
        appendMessage(mockAiReply(text || ''), 'ai');
      }
    }catch(err){
      console.error('send error', err);
      appendMessage('Error sending message: ' + (err && err.message ? err.message : String(err)), 'debug');
    }
  }

  sendBtn.addEventListener('click', send);
  promptInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') send(); });
  clearBtn.addEventListener('click', ()=>{ chat.innerHTML = ''; promptInput.focus(); });

  // Attachments
  attachBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      currentAttachment = { name: f.name, dataUrl: reader.result };
      appendImageMessage(currentAttachment.dataUrl, 'user', currentAttachment.name);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  });

  // Friendly greeting on load
  window.addEventListener('load', ()=>{
    promptInput.focus();
    const name = localStorage.getItem(storageKey);
    const useFriendly = friendlyToggle && friendlyToggle.checked;
    // apply saved dark mode
    try{
      const dark = localStorage.getItem('hridayai_dark') === '1';
      if(dark){ document.documentElement.classList.add('dark'); if(darkToggle) darkToggle.checked = true; }
    }catch(e){ }
    if(useFriendly){
      if(!name){ appendMessage("Hi! I'm HridayAi — your friendly assistant. What's your name?", 'ai'); expectingName = true; }
      else appendMessage(`Hey ${name}! I'm here — what's on your mind today?`, 'ai');
    } else {
      if(!name) appendMessage('Hello — how can I help?', 'ai');
      else appendMessage(`Hello ${name}. How can I assist you?`, 'ai');
    }
  });

  // Debug indicator removed

  // Global error handlers
  window.onerror = function(msg, src, line, col, err){ try{ appendMessage('Error: ' + (msg || String(err || 'unknown')), 'debug'); console.error('window.onerror', msg, src, line, col, err); }catch(e){} };
  window.onunhandledrejection = function(ev){ try{ const reason = ev && (ev.reason || ev.detail) ? (ev.reason || ev.detail) : String(ev); appendMessage('Promise rejection: ' + reason, 'debug'); console.error('unhandledrejection', ev); }catch(e){} };

  // Dark mode toggle handler
  if(darkToggle){
    darkToggle.addEventListener('change', (e)=>{
      try{
        if(e.target.checked){ document.documentElement.classList.add('dark'); localStorage.setItem('hridayai_dark','1'); }
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('hridayai_dark','0'); }
      }catch(err){ console.error('darkToggle handler', err); }
    });
  }
})();
