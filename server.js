// Minimal Express proxy to forward chat messages to OpenAI
// Usage: set OPENAI_API_KEY in .env or environment, then `npm install` and `node server.js`

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({limit: '5mb'}));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if(!OPENAI_KEY){
  console.warn('OPENAI_API_KEY is not set. Add it to a .env file or your environment.');
}

app.post('/api/chat', async (req, res) => {
  try{
    const { message, image } = req.body;
    if(!message) return res.status(400).json({ error: 'Missing message' });

    // If identity / attribution question, answer directly to ensure consistent identity reply
    const tl = (message || '').toLowerCase();
    if(/\b(who (are you|r you)|what(?:'| i)?s your name|what is your name|your name|who made you|who created you|who built you)\b/.test(tl)){
      return res.json({ reply: 'I am HridayAi and I was created by Hriday.' });
    }

    // If an image is attached, note it in the prompt. (This server does not perform image understanding.)
    const userContent = image ? `${message}\n\n[User attached an image: ${image.name || 'image'}]` : message;

    // System prompt enforces assistant identity/persona
    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are HridayAi, a friendly assistant. If asked who you are or who created you, reply: "I am HridayAi and I was created by Hriday."' },
        { role: 'user', content: userContent }
      ],
      max_tokens: 500
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : JSON.stringify(data);
    res.json({ reply });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`HridayAi proxy (built by Hriday) listening on http://localhost:${port}`));
