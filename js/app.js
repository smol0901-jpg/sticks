// Sticks - Main Application
class App {
  constructor() {
    this.db = null;
    this.router = null;
    this.ai = window.aiModule;
    this.currentPage = '';
  }

  async init() {
    console.log('Sticks v1.0.1 initializing...');
    
    // Initialize database
    this.db = new Database();
    await this.db.init();
    
    // Initialize AI
    if (this.ai) await this.ai.init();
    
    // Initialize router
    this.router = new Router();
    this.setupRoutes();
    this.router.init();
    
    console.log('Sticks initialized');
  }

  setupRoutes() {
    this.router
      .add('/', this.renderHome.bind(this), 'home')
      .add('/templates', this.renderTemplates.bind(this), 'templates')
      .add('/templates/:id', this.renderTemplateEdit.bind(this), 'template-edit')
      .add('/products', this.renderProducts.bind(this), 'products')
      .add('/products/:id', this.renderProductEdit.bind(this), 'product-edit')
      .add('/print', this.renderPrint.bind(this), 'print')
      .add('/print/:templateId', this.renderPrint.bind(this), 'print-template')
      .add('/ai', this.renderAI.bind(this), 'ai')
      .add('/parser', this.renderParser.bind(this), 'parser')
      .add('/map', this.renderMap.bind(this), 'map')
      .add('/settings', this.renderSettings.bind(this), 'settings')
      .add('*', this.renderNotFound.bind(this), 'not-found');
  }

  updateHeader(title) {
    document.querySelector('.header-title').textContent = title;
  }

  render(content) {
    document.getElementById('content').innerHTML = content;
  }

  async renderHome() {
    this.updateHeader('Главная');
    
    const stats = {
      templates: await this.db.count('templates'),
      products: await this.db.count('products'),
      prints: await this.db.count('prints')
    };

    this.render(`
      <div class="welcome-section">
        <h1>Добро пожаловать в Sticks</h1>
        <p>Система печати этикеток с ИИ</p>
        
        <div class="grid grid-3">
          <div class="card stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-value">${stats.templates}</div>
            <div class="stat-label">Шаблонов</div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">🏷️</div>
            <div class="stat-value">${stats.products}</div>
            <div class="stat-label">Товаров</div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">🖨️</div>
            <div class="stat-value">${stats.prints}</div>
            <div class="stat-label">Печатей</div>
          </div>
        </div>
        
        <div class="quick-actions">
          <h2>Быстрые действия</h2>
          <div class="grid grid-2">
            <a href="#/templates" class="card action-card" data-link>
              <div class="action-icon">📋</div>
              <div class="action-title">Новый шаблон</div>
              <div class="action-desc">Создать этикетку</div>
            </a>
            <a href="#/products" class="card action-card" data-link>
              <div class="action-icon">🏷️</div>
              <div class="action-title">Добавить товар</div>
              <div class="action-desc">Заполнить карточку</div>
            </a>
            <a href="#/print" class="card action-card" data-link>
              <div class="action-icon">🖨️</div>
              <div class="action-title">Печать</div>
              <div class="action-desc">Напечатать этикетки</div>
            </a>
            <a href="#/ai" class="card action-card" data-link>
              <div class="action-icon">🤖</div>
              <div class="action-title">ИИ Помощник</div>
              <div class="action-desc">Спросить ИИ</div>
            </a>
          </div>
        </div>
      </div>
    `);
  }

  async renderTemplates() {
    this.updateHeader('Шаблоны');
    const templates = await this.db.getAll('templates');

    this.render(`
      <div class="page-header">
        <h1>Шаблоны этикеток</h1>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="app.importData()">📥 Импорт</button>
          <button class="btn btn-primary" onclick="app.createTemplate()">+ Новый</button>
        </div>
      </div>
      
      ${templates.length ? `
        <div class="grid grid-3">
          ${templates.map(t => `
            <div class="card">
              <div class="label-canvas" style="width: 150px; height: 100px; margin: 0 auto 16px;">
                ${this.renderLabelPreview(t)}
              </div>
              <h3>${t.name}</h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">${t.width}×${t.height}мм</p>
              <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button class="btn btn-secondary" onclick="app.editTemplate('${t.id}')">Изменить</button>
                <button class="btn btn-secondary" onclick="app.duplicateTemplate('${t.id}')">Копировать</button>
                <button class="btn btn-secondary" onclick="app.deleteTemplate('${t.id}')" style="color: #ff4757;">Удалить</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <p>Шаблонов пока нет</p>
          <button class="btn btn-primary" onclick="app.createTemplate()" style="margin-top: 16px;">Создать первый</button>
        </div>
      `}
    `);
  }

  renderLabelPreview(template) {
    if (!template.elements) return '';
    return template.elements.map(el => {
      const style = `position: absolute; left: ${el.x}%; top: ${el.y}%; width: ${el.width}%; font-size: ${el.fontSize || 12}px;`;
      return `<div style="${style}">${el.content || ''}</div>`;
    }).join('');
  }

  async createTemplate() {
    const template = {
      id: 'tpl_' + Date.now(),
      name: 'Новый шаблон',
      width: 50,
      height: 30,
      elements: [
        { type: 'text', content: 'Название', x: 5, y: 10, fontSize: 14, fontWeight: 'bold' },
        { type: 'text', content: 'Артикул: SKU001', x: 5, y: 40, fontSize: 10 },
        { type: 'text', content: '100 ₽', x: 60, y: 70, fontSize: 18, fontWeight: 'bold' }
      ],
      createdAt: new Date().toISOString()
    };
    
    await this.db.add('templates', template);
    this.router.navigate('/templates/' + template.id);
  }

  async editTemplate(id) {
    this.router.navigate('/templates/' + id);
  }

  async duplicateTemplate(id) {
    const original = await this.db.get('templates', id);
    const copy = {
      ...original,
      id: 'tpl_' + Date.now(),
      name: original.name + ' (копия)',
      createdAt: new Date().toISOString()
    };
    await this.db.add('templates', copy);
    this.showToast('Шаблон скопирован', 'success');
    this.renderTemplates();
  }

  async deleteTemplate(id) {
    if (confirm('Удалить шаблон?')) {
      await this.db.delete('templates', id);
      this.showToast('Шаблон удалён', 'success');
      this.renderTemplates();
    }
  }

  async renderTemplateEdit(params) {
    const template = await this.db.get('templates', params.id);
    this.updateHeader(template?.name || 'Редактор шаблона');

    if (!template) {
      this.render(`<div class="empty-state"><p>Шаблон не найден</p></div>`);
      return;
    }

    this.render(`
      <div class="template-editor">
        <div class="editor-sidebar">
          <h3>Свойства</h3>
          <div class="form-group">
            <label class="form-label">Название</label>
            <input type="text" class="form-input" id="templateName" value="${template.name}" onchange="app.saveTemplate('${template.id}')">
          </div>
          <div class="form-group">
            <label class="form-label">Ширина (мм)</label>
            <input type="number" class="form-input" id="templateWidth" value="${template.width}" onchange="app.saveTemplate('${template.id}')">
          </div>
          <div class="form-group">
            <label class="form-label">Высота (мм)</label>
            <input type="number" class="form-input" id="templateHeight" value="${template.height}" onchange="app.saveTemplate('${template.id}')">
          </div>
          
          <h3 style="margin-top: 24px;">Элементы</h3>
          <div class="elements-list">
            ${template.elements.map((el, i) => `
              <button class="btn btn-secondary element-btn" onclick="app.selectElement('${template.id}', ${i})">
                ${el.type}: ${el.content?.substring(0, 20) || 'элемент'}
              </button>
            `).join('')}
            <button class="btn btn-primary element-btn" onclick="app.addElement('${template.id}')">+ Добавить</button>
          </div>
          
          <button class="btn btn-primary" style="width: 100%; margin-top: 24px;" onclick="window.print()">🖨️ Печать</button>
        </div>
        
        <div class="editor-canvas">
          <div class="label-canvas" style="width: ${template.width * 3}px; height: ${template.height * 3}px;">
            ${this.renderLabelPreview(template)}
          </div>
        </div>
      </div>
    `);
  }

  async saveTemplate(id) {
    const template = await this.db.get('templates', id);
    if (!template) return;
    
    template.name = document.getElementById('templateName')?.value || template.name;
    template.width = parseInt(document.getElementById('templateWidth')?.value) || template.width;
    template.height = parseInt(document.getElementById('templateHeight')?.value) || template.height;
    
    await this.db.put('templates', template);
    this.showToast('Сохранено', 'success');
  }

  async addElement(templateId) {
    const template = await this.db.get('templates', templateId);
    template.elements.push({
      type: 'text',
      content: 'Новый элемент',
      x: 10,
      y: 50,
      fontSize: 12
    });
    await this.db.put('templates', template);
    this.renderTemplateEdit({ id: templateId });
  }

  selectElement(templateId, index) {
    this.showToast('Редактирование элемента ' + index, 'info');
  }

  async renderProducts() {
    this.updateHeader('Товары');
    const products = await this.db.getAll('products');

    this.render(`
      <div class="page-header">
        <h1>Товары</h1>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="app.showImportModal()">📥 Импорт</button>
          <button class="btn btn-primary" onclick="app.createProduct()">+ Добавить</button>
        </div>
      </div>
      
      ${products.length ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Штрихкод</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.sku}</td>
                <td>${p.name}</td>
                <td>${p.price} ₽</td>
                <td>${p.barcode || '-'}</td>
                <td>
                  <button class="btn btn-secondary" onclick="app.editProduct('${p.id}')">Изменить</button>
                  <button class="btn btn-secondary" onclick="app.printProduct('${p.id}')">Печать</button>
                  <button class="btn btn-secondary" onclick="app.deleteProduct('${p.id}')" style="color: #ff4757;">Удалить</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="empty-state">
          <p>Товаров пока нет</p>
          <button class="btn btn-primary" onclick="app.createProduct()" style="margin-top: 16px;">Добавить первый</button>
        </div>
      `}
    `);
  }

  async createProduct() {
    const product = {
      id: 'prod_' + Date.now(),
      sku: 'SKU' + Date.now().toString().slice(-6),
      name: 'Новый товар',
      price: 0,
      barcode: '',
      description: '',
      createdAt: new Date().toISOString()
    };
    
    await this.db.add('products', product);
    this.router.navigate('/products/' + product.id);
  }

  async editProduct(id) {
    this.router.navigate('/products/' + id);
  }

  async printProduct(id) {
    const product = await this.db.get('products', id);
    this.router.navigate('/print?product=' + id);
  }

  async deleteProduct(id) {
    if (confirm('Удалить товар?')) {
      await this.db.delete('products', id);
      this.showToast('Товар удалён', 'success');
      this.renderProducts();
    }
  }

  async renderProductEdit(params) {
    const product = await this.db.get('products', params.id);
    this.updateHeader(product?.name || 'Редактирование');

    if (!product) {
      this.render(`<div class="empty-state"><p>Товар не найден</p></div>`);
      return;
    }

    this.render(`
      <div class="card">
        <h3>Карточка товара</h3>
        <div class="form-group">
          <label class="form-label">Артикул</label>
          <input type="text" class="form-input" id="productSku" value="${product.sku}" onchange="app.saveProduct('${product.id}')">
        </div>
        <div class="form-group">
          <label class="form-label">Название</label>
          <input type="text" class="form-input" id="productName" value="${product.name}" onchange="app.saveProduct('${product.id}')">
        </div>
        <div class="form-group">
          <label class="form-label">Цена (₽)</label>
          <input type="number" class="form-input" id="productPrice" value="${product.price}" onchange="app.saveProduct('${product.id}')">
        </div>
        <div class="form-group">
          <label class="form-label">Штрихкод</label>
          <input type="text" class="form-input" id="productBarcode" value="${product.barcode || ''}" onchange="app.saveProduct('${product.id}')">
        </div>
        <div class="form-group">
          <label class="form-label">Описание</label>
          <textarea class="form-input" id="productDesc" rows="3" onchange="app.saveProduct('${product.id}')">${product.description || ''}</textarea>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn btn-primary" onclick="app.printProduct('${product.id}')">🖨️ Печать</button>
          <button class="btn btn-secondary" onclick="app.router.navigate('/products')">Назад</button>
        </div>
      </div>
    `);
  }

  async saveProduct(id) {
    const product = await this.db.get('products', id);
    if (!product) return;
    
    product.sku = document.getElementById('productSku')?.value || product.sku;
    product.name = document.getElementById('productName')?.value || product.name;
    product.price = parseInt(document.getElementById('productPrice')?.value) || 0;
    product.barcode = document.getElementById('productBarcode')?.value || '';
    product.description = document.getElementById('productDesc')?.value || '';
    
    await this.db.put('products', product);
    this.showToast('Сохранено', 'success');
  }

  async renderPrint() {
    this.updateHeader('Печать');
    const templates = await this.db.getAll('templates');
    const products = await this.db.getAll('products');
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const selectedProduct = urlParams.get('product');

    this.render(`
      <div class="page-header">
        <h1>Печать этикеток</h1>
      </div>
      
      <div class="grid grid-2" style="gap: 24px;">
        <div class="card">
          <h3>1. Выберите шаблон</h3>
          <div class="form-group">
            <select class="form-input" id="printTemplate" onchange="app.updatePrintPreview()">
              <option value="">-- Выберите шаблон --</option>
              ${templates.map(t => `<option value="${t.id}">${t.name} (${t.width}×${t.height}мм)</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div class="card">
          <h3>2. Выберите товар</h3>
          <div class="form-group">
            <select class="form-input" id="printProduct" onchange="app.updatePrintPreview()">
              <option value="">-- Выберите товар --</option>
              ${products.map(p => `<option value="${p.id}" ${selectedProduct === p.id ? 'selected' : ''}>${p.sku} - ${p.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      
      <div class="card" style="margin-top: 24px;">
        <h3>3. Предпросмотр</h3>
        <div class="print-preview" id="printPreview">
          <p style="color: #666;">Выберите шаблон и товар</p>
        </div>
      </div>
      
      <div style="margin-top: 24px; display: flex; gap: 8px;">
        <div class="form-group" style="width: 100px;">
          <label class="form-label">Количество</label>
          <input type="number" class="form-input" id="printQty" value="1" min="1" max="100">
        </div>
        <button class="btn btn-primary" style="align-self: flex-end;" onclick="app.doPrint()">🖨️ Печатать</button>
      </div>
    `);
  }

  async updatePrintPreview() {
    const templateId = document.getElementById('printTemplate')?.value;
    const productId = document.getElementById('printProduct')?.value;
    
    if (!templateId || !productId) {
      document.getElementById('printPreview').innerHTML = '<p style="color: #666;">Выберите шаблон и товар</p>';
      return;
    }
    
    const template = await this.db.get('templates', templateId);
    const product = await this.db.get('products', productId);
    
    if (!template || !product) return;
    
    // Replace placeholders
    let content = JSON.stringify(template.elements);
    content = content.replace(/\"Название\"/g, `"${product.name}"`);
    content = content.replace(/\"Артикул: SKU001\"/g, `"Артикул: ${product.sku}"`);
    content = content.replace(/\"100 ₽\"/g, `"${product.price} ₽"`);
    
    const elements = JSON.parse(content);
    const previewEl = document.getElementById('printPreview');
    previewEl.innerHTML = `<div class="label-preview" style="width: ${template.width * 3}px; height: ${template.height * 3}px;">
      ${elements.map(el => `<div style="position: absolute; left: ${el.x}%; top: ${el.y}%; font-size: ${el.fontSize || 12}px; font-weight: ${el.fontWeight || 'normal'};">${el.content}</div>`).join('')}
    </div>`;
  }

  async doPrint() {
    const templateId = document.getElementById('printTemplate')?.value;
    const productId = document.getElementById('printProduct')?.value;
    const qty = parseInt(document.getElementById('printQty')?.value) || 1;
    
    if (!templateId || !productId) {
      this.showToast('Выберите шаблон и товар', 'error');
      return;
    }
    
    // Record print job
    await this.db.add('prints', {
      templateId,
      productId,
      qty,
      printedAt: new Date().toISOString()
    });
    
    // Print
    window.print();
    this.showToast(`Отправлено на печать ${qty} этикеток`, 'success');
  }

  async renderAI() {
    this.updateHeader('ИИ Модуль');
    const hasOpenAI = await this.ai?.hasApiKey('openai');
    const hasAnthropic = await this.ai?.hasApiKey('anthropic');
    const hasGemini = await this.ai?.hasApiKey('gemini');

    this.render(`
      <div class="page-header">
        <h1>ИИ Помощник</h1>
      </div>
      
      <div class="card" style="margin-bottom: 24px;">
        <h3>Настройка API ключей</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">Введите свои API ключи для работы с ИИ</p>
        
        <div class="form-group">
          <label class="form-label">OpenAI API Key</label>
          <input type="password" class="form-input" id="openaiKey" placeholder="sk-..." value="" onchange="app.saveApiKey('openai')">
          ${hasOpenAI ? '<span class="badge badge-success" style="margin-left: 8px;">Настроен</span>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">Anthropic (Claude) API Key</label>
          <input type="password" class="form-input" id="anthropicKey" placeholder="sk-ant-..." value="" onchange="app.saveApiKey('anthropic')">
          ${hasAnthropic ? '<span class="badge badge-success" style="margin-left: 8px;">Настроен</span>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">Google Gemini API Key</label>
          <input type="password" class="form-input" id="geminiKey" placeholder="AI..." value="" onchange="app.saveApiKey('gemini')">
          ${hasGemini ? '<span class="badge badge-success" style="margin-left: 8px;">Настроен</span>' : ''}
        </div>
      </div>
      
      <div class="card">
        <h3>Чат с ИИ</h3>
        <div class="ai-chat">
          <div class="ai-messages" id="aiMessages">
            <p style="color: var(--text-secondary);">Задайте вопрос о печати этикеток или товарах</p>
          </div>
          <div class="ai-input">
            <input type="text" class="form-input" id="aiInput" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter')app.sendAI()">
            <button class="btn btn-primary" onclick="app.sendAI()">Отправить</button>
          </div>
        </div>
      </div>
    `);
  }

  async saveApiKey(provider) {
    const key = document.getElementById(provider + 'Key')?.value;
    if (key) {
      await this.ai.setApiKey(provider, key);
      this.renderAI();
    }
  }

  async sendAI() {
    const input = document.getElementById('aiInput');
    const message = input?.value?.trim();
    if (!message) return;

    const messagesEl = document.getElementById('aiMessages');
    messagesEl.innerHTML += `<div class="ai-message user"><div class="message-content">${message}</div></div>`;
    input.value = '';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Show loading
    messagesEl.innerHTML += `<div class="ai-message"><div class="message-content"><div class="spinner"></div></div></div>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const response = await this.ai.sendMessage(message);
    
    // Remove loading
    messagesEl.querySelector('.spinner')?.closest('.ai-message')?.remove();
    
    if (response.error) {
      messagesEl.innerHTML += `<div class="ai-message"><div class="message-content" style="color: #ff4757;">${response.error}</div></div>`;
    } else {
      messagesEl.innerHTML += `<div class="ai-message"><div class="message-content">${response.content}</div></div>`;
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async renderParser() {
    this.updateHeader('Парсинг');

    this.render(`
      <div class="page-header">
        <h1>Парсинг данных</h1>
      </div>
      
      <div class="card">
        <h3>Импорт из текста</h3>
        <div class="form-group">
          <label class="form-label">Вставьте текст с данными о товарах</label>
          <textarea class="form-input" id="parseText" rows="10" placeholder="SKU001 Товар1 100&#10;SKU002 Товар2 200"></textarea>
        </div>
        <button class="btn btn-primary" onclick="app.parseText()">📥 Парсить</button>
      </div>
      
      <div class="card">
        <h3>Импорт из файла</h3>
        <input type="file" id="importFile" accept=".json,.csv,.txt" style="display: none;">
        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">📁 Выбрать файл</button>
      </div>
    `);
  }

  async parseText() {
    const text = document.getElementById('parseText')?.value;
    if (!text) return;

    const result = await this.ai.parseData(text);
    
    if (result.error) {
      this.showToast(result.error, 'error');
      return;
    }

    if (result.data && Array.isArray(result.data)) {
      for (const item of result.data) {
        await this.db.add('products', {
          id: 'prod_' + Date.now() + Math.random(),
          sku: item.sku || 'SKU' + Date.now().toString().slice(-4),
          name: item.name || 'Товар',
          price: parseInt(item.price) || 0,
          barcode: item.barcode || '',
          description: item.description || '',
          createdAt: new Date().toISOString()
        });
      }
      this.showToast(`Добавлено ${result.data.length} товаров`, 'success');
      this.router.navigate('/products');
    } else {
      this.showToast('Не удалось распарсить данные', 'error');
    }
  }

  showImportModal() {
    document.getElementById('importFile').click();
  }

  async importData() {
    this.router.navigate('/parser');
  }

  async renderMap() {
    this.updateHeader('Карта');

    this.render(`
      <div class="page-header">
        <h1>Карта складов</h1>
      </div>
      
      <div class="card">
        <div class="map-container" id="map">
          <p style="text-align: center; padding: 40px; color: var(--text-secondary);">Загрузка карты...</p>
        </div>
      </div>
    `);

    // Initialize map when Leaflet loads
    setTimeout(() => {
      if (typeof L !== 'undefined') {
        const map = L.map('map').setView([55.75, 37.62], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        this.showToast('Карта загружена', 'success');
      }
    }, 1000);
  }

  async renderSettings() {
    this.updateHeader('Настройки');
    const settings = await this.db.getAll('settings');

    this.render(`
      <div class="page-header">
        <h1>Настройки</h1>
      </div>
      
      <div class="card">
        <h3>Приложение</h3>
        <div class="form-group">
          <label class="form-label">Версия</label>
          <input type="text" class="form-input" value="1.0.1" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Режим</label>
          <input type="text" class="form-input" value="${window.electronAPI ? 'Electron' : (window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Web')}" disabled>
        </div>
      </div>
      
      <div class="card">
        <h3>Данные</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="app.exportData()">📤 Экспорт</button>
          <button class="btn btn-secondary" onclick="app.clearData()">🗑️ Очистить</button>
        </div>
      </div>
      
      <div class="card">
        <h3>О приложении</h3>
        <p style="color: var(--text-secondary);">
          <strong>Sticks</strong> - система печати этикеток с поддержкой ИИ.<br>
          С��зд��но с ❤️
        </p>
      </div>
    `);
  }

  async exportData() {
    const data = {
      templates: await this.db.getAll('templates'),
      products: await this.db.getAll('products'),
      prints: await this.db.getAll('prints'),
      settings: await this.db.getAll('settings'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sticks-export-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Данные экспортированы', 'success');
  }

  async clearData() {
    if (confirm('Очистить все данные? Это действие необратимо.')) {
      await this.db.clear();
      this.showToast('Данные очищены', 'success');
      this.router.navigate('/');
    }
  }

  renderNotFound() {
    this.updateHeader('404');
    this.render(`
      <div class="empty-state">
        <h1>404</h1>
        <p>Страница не найдена</p>
        <button class="btn btn-primary" onclick="window.location.hash = '#/'" style="margin-top: 16px;">На главную</button>
      </div>
    `);
  }

  showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

// Global app instance
window.app = new App();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => window.app.init());