// Sticks - AI Module with API key support
class AIModule {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
        defaultModel: 'gpt-4o-mini',
        apiUrl: 'https://api.openai.com/v1/chat/completions'
      },
      anthropic: {
        name: 'Anthropic (Claude)',
        models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
        defaultModel: 'claude-3-haiku-20240307',
        apiUrl: 'https://api.anthropic.com/v1/messages'
      },
      gemini: {
        name: 'Google Gemini',
        models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
        defaultModel: 'gemini-1.5-flash',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
      }
    };
    
    this.currentProvider = 'openai';
    this.conversation = [];
    this.systemPrompt = `Ты - помощник для системы печати этикеток "Sticks".
Ты можешь помочь с:
- Созданием дизайна этикеток
- Подбором цветов и шрифтов
- Заполнением данных о товарах
- Генерацией описаний
- Ответами на вопросы о печати

Отвечай кратко и по делу.`;
  }

  async init() {
    console.log('AI Module init');
  }

  async setApiKey(provider, key) {
    if (window.app && window.app.db) {
      await window.app.db.setSetting(`ai_${provider}_key`, key);
    }
  }

  async getApiKey(provider) {
    if (window.app && window.app.db) {
      return await window.app.db.getSetting(`ai_${provider}_key`, '');
    }
    return '';
  }

  async hasApiKey(provider) {
    const key = await this.getApiKey(provider);
    return key && key.length > 0;
  }

  async sendMessage(message, context = {}) {
    const provider = this.currentProvider;
    const hasKey = await this.hasApiKey(provider);
    
    if (!hasKey) {
      return { error: 'API ключ не настроен. Перейдите в Настройки → ИИ для настройки.' };
    }

    this.conversation.push({ role: 'user', content: message });


    try {
      let response;
      
      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(message, context);
          break;
        case 'anthropic':
          response = await this.callAnthropic(message, context);
          break;
        case 'gemini':
          response = await this.callGemini(message, context);
          break;
        default:
          response = { error: 'Неизвестный провайдер' };
      }

      if (response.error) {
        this.conversation.pop();
        return response;
      }

      this.conversation.push({ role: 'assistant', content: response.content });
      
      if (window.app && window.app.db) {
        await window.app.db.add('aiData', {
          id: 'ai_' + Date.now(),
          type: 'conversation',
          input: message,
          output: response.content,
          provider,
          timestamp: new Date().toISOString()
        });
      }

      return response;
    } catch (error) {
      this.conversation.pop();
      return { error: error.message };
    }
  }

  async callOpenAI(message, context) {
    const apiKey = await this.getApiKey('openai');
    const model = 'gpt-4o-mini';
    
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversation.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await fetch(this.providers.openai.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return { content: data.choices[0].message.content };
  }

  async callAnthropic(message, context) {
    const apiKey = await this.getApiKey('anthropic');
    const model = 'claude-3-haiku-20240307';
    
    const messages = [
      ...this.conversation.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch(this.providers.anthropic.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: this.systemPrompt,
        messages,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return { content: data.content[0].text };
  }

  async callGemini(message, context) {
    const apiKey = await this.getApiKey('gemini');
    const model = 'gemini-1.5-flash';
    
    const contents = this.conversation.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(`${this.providers.gemini.apiUrl}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: this.systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return { content: data.candidates[0].content.parts[0].text };
  }

  async generateLabelDesign(product, style = 'modern') {
    const prompt = `Создай дизайн этикетки для товара: ${product.name}
Артикул: ${product.sku}
Цена: ${product.price} руб.
Стиль: ${style}

Опиши структуру этикетки: какие элементы нужны, их расположение, цвета, шрифты. Ответь в JSON формате:
{"elements": [{"type": "text|barcode|qrcode|image|rect", "content": "...", "x": 0, "y": 0, "width": 100, "height": 50, "style": {...}}]}`;
    const result = await this.sendMessage(prompt);
    
    if (result.error) return result;

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { design: JSON.parse(jsonMatch[0]) };
      }
      return { design: null, raw: result.content };
    } catch (e) {
      return { error: 'Не удалось распарсить ответ ИИ' };
    }
  }

  async generateDescription(product) {
    const prompt = `Создай краткое описание для товара: ${product.name}
Артикул: ${product.sku}
Цена: ${product.price} руб.

Опиш�� товар в 2-3 предложениях для этикетки.`;
    return this.sendMessage(prompt);
  }

  async parseData(text, format = 'auto') {
    const prompt = `Распарси следующий текст и извлеки данные о товарах. 
Формат: ${format}
Текст:
${text}

Ответь в JSON массиве товаров с полями: sku, name, barcode, price, description`;

    const result = await this.sendMessage(prompt);
    
    if (result.error) return result;

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return { data: JSON.parse(jsonMatch[0]) };
      }
      return { error: 'Не удалось извлечь данные' };
    } catch (e) {
      return { error: 'Ошибка парсинга: ' + e.message };
    }
  }

  async suggestImprovements(template) {
    const prompt = `Проанализируй шаблон этикетки и предложи улучшения:
${JSON.stringify(template)}

Ответь списком конкретных улучшений.`;
    return this.sendMessage(prompt);
  }

  clearConversation() {
    this.conversation = [];
  }
}

window.aiModule = new AIModule();