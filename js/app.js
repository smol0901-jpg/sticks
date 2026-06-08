// Sticks - Main App Controller
class App {
  constructor() {
    this.db = new SticksDB();
    this.router = new Router();
    this.modules = {};
    this.initialized = false;
  }

  async init() {
    try {
      // Initialize database
      await this.db.init();
      console.log('Database initialized');
      
      // Initialize router
      this.setupRoutes();
      this.router.init();
      
      // Initialize modules
      await this.initModules();
      
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered'))
          .catch(err => console.log('SW registration failed:', err));
      }
      
      this.initialized = true;
      console.log('Sticks app initialized');
      
    } catch (error) {
      console.error('App initialization failed:', error);
      this.showToast('Ошибка инициализации: ' + error.message, 'error');
    }
  }

  setupRoutes() {
    this.router
      .add('/', () => this.renderHome(), 'home')
      .add('/templates', () => this.renderTemplates(), 'templates')
      .add('/templates/:id', (params) => this.renderTemplateEdit(params.id), 'template-edit')
      .add('/print', () => this.renderPrint(), 'print')
      .add('/products', () => this.renderProducts(), 'products')
      .add('/ai', () => this.renderAI(), 'ai')
      .add('/parser', () => this.renderParser(), 'parser')
      .add('/map', () => this.renderMap(), 'map')
      .add('/settings', () => this.renderSettings(), 'settings')
      .add('*', () => this.render404(), '404');
  }

  async initModules() {
    // Lazy load modules as needed
    this.modules.print = null;
    this.modules.template = null;
    this.modules.ai = null;
    this.modules.parser = null;
    this.modules.map = null;
  }

  async loadModule(name) {
    if (this.modules[name]) return this.modules[name];
    
    const scripts = {
      print: '/js/modules/print.js',
      template: '/js/modules/template.js',
      ai: '/js/ai.js',
      parser: '/js/parser.js',
      map: '/js/map.js'
    };
    
    if (scripts[name]) {
      await import(scripts[name]);
    }
    
    return this.modules[name];
  }

  async renderHome() {
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="welcome-section">
        <h1>Добро пожаловать в Sticks</h1>
        <p>Универсальная система печати этикеток</p>
        
        <div class="grid grid-4">
          <div class="card stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-value">${await this.getStat('templates')}</div>
            <div class="stat-label">Шаблонов</div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">🏷️</div>
            <div class="stat-value">${await this.getStat('products')}</div>
            <div class="stat-label">Товаров</div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">🖨️</div>
            <div class="stat-value">${await this.getStat('printJobs')}</div>
            <div class="stat-label">Печатей</div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">🤖</div>
            <div class="stat-value">${await this.getStat('aiData')}</div>
            <div class="stat-label">ИИ данных</div>
          </div>
        </div>
        
        <div class="quick-actions">
          <h2>Быстрые действия</h2>
          <div class="grid grid-3">
            <a href="#/templates" class="card action-card">
              <div class="action-icon">➕</div>
              <div class="action-title">Новый шаблон</div>
              <div class="action-desc">Создать этикетку с нуля</div>
            </a>
            <a href="#/print" class="card action-card">
              <div class="action-icon">🖨️</div>
              <div class="action-title">Печать</div>
              <div class="action-desc">Печать этикеток</div>
            </a>
            <a href="#/parser" class="card action-card">
              <div class="action-icon">📥</div>
              <div class="action-title">Импорт</div>
              <div class="action-desc">Загрузить данные</div>
            </a>
          </div>
        </div>
      </div>
    `;
    
    this.updateHeader('Главная');
  }

  async getStat(store) {
    try {
      const items = await this.db.getAll(store);
      return items.length;
    } catch {
      return 0;
    }
  }

  async renderTemplates() {
    const content = document.getElementById('content');
    const templates = await this.db.getAll('templates');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Шаблоны этикеток</h1>
        <button class="btn btn-primary" onclick="app.router.navigate('/templates/new')">
          ➕ Новый шаблон
        </button>
      </div>
      
      ${templates.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>Нет шаблонов</h3>
          <p>Создайте первый шаблон этикетки</p>
          <button class="btn btn-primary" onclick="app.router.navigate('/templates/new')">
            Создать шаблон
          </button>
        </div>
      ` : `
        <div class="templates-grid grid grid-3">
          ${templates.map(t => `
            <div class="card template-card" onclick="app.router.navigate('/templates/${t.id}')">
              <div class="template-preview">
                <div class="preview-label" style="width: ${t.width || 100}mm; height: ${t.height || 50}mm;"></div>
              </div>
              <div class="template-info">
                <div class="template-name">${t.name || 'Без названия'}</div>
                <div class="template-size">${t.width || 100}×${t.height || 50} мм</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    
    this.updateHeader('Шаблоны');
  }

  async renderTemplateEdit(id) {
    const content = document.getElementById('content');
    let template = null;
    
    if (id !== 'new' && id) {
      template = await this.db.get('templates', parseInt(id));
    }
    
    content.innerHTML = `
      <div class="page-header">
        <button class="btn btn-secondary" onclick="app.router.navigate('/templates')">← Назад</button>
        <h1>${template ? 'Редактор шаблона' : 'Новый шаблон'}</h1>
        <button class="btn btn-primary" onclick="app.saveTemplate()">💾 Сохранить</button>
      </div>
      
      <div class="template-editor">
        <div class="editor-sidebar">
          <div class="form-group">
            <label class="form-label">Название</label>
            <input type="text" class="form-input" id="templateName" value="${template?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Ширина (мм)</label>
            <input type="number" class="form-input" id="templateWidth" value="${template?.width || 100}">
          </div>
          <div class="form-group">
            <label class="form-label">Высота (мм)</label>
            <input type="number" class="form-input" id="templateHeight" value="${template?.height || 50}">
          </div>
          
          <h3>Элементы</h3>
          <div class="elements-list">
            <button class="btn btn-secondary element-btn" data-type="text">📝 Текст</button>
            <button class="btn btn-secondary element-btn" data-type="barcode">📊 Штрихкод</button>
            <button class="btn btn-secondary element-btn" data-type="qrcode">📱 QR-код</button>
            <button class="btn btn-secondary element-btn" data-type="image">🖼️ Изображение</button>
            <button class="btn btn-secondary element-btn" data-type="line">➖ Линия</button>
            <button class="btn btn-secondary element-btn" data-type="rect">⬜ Прямоугольник</button>
          </div>
        </div>
        
        <div class="editor-canvas">
          <div class="label-canvas" id="labelCanvas" style="width: ${(template?.width || 100) * 3.78}px; height: ${(template?.height || 50) * 3.78}px;">
            ${template?.elements ? template.elements.map(el => this.renderElement(el)).join('') : ''}
          </div>
        </div>
      </div>
    `;
    
    this.updateHeader(template ? template.name : 'Новый шаблон');
    this.initLabelEditor();
  }

  renderElement(el) {
    const styles = `left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;`;
    
    switch (el.type) {
      case 'text':
        return `<div class="label-element" data-id="${el.id}" style="${styles} font-size: ${el.fontSize || 12}px;">${el.content || 'Текст'}</div>`;
      case 'barcode':
        return `<div class="label-element" data-id="${el.id}" style="${styles}">📊</div>`;
      case 'qrcode':
        return `<div class="label-element" data-id="${el.id}" style="${styles}">📱</div>`;
      case 'image':
        return `<div class="label-element" data-id="${el.id}" style="${styles}">🖼️</div>`;
      case 'line':
        return `<div class="label-element" data-id="${el.id}" style="${styles}; border-bottom: 2px solid black;"></div>`;
      case 'rect':
        return `<div class="label-element" data-id="${el.id}" style="${styles}; border: 1px solid black;"></div>`;
      default:
        return '';
    }
  }

  initLabelEditor() {
    const canvas = document.getElementById('labelCanvas');
    if (!canvas) return;
    
    // Add element buttons
    document.querySelectorAll('.element-btn').forEach(btn => {
      btn.addEventListener('click', () => this.addElement(btn.dataset.type));
    });
    
    // Drag and drop
    canvas.addEventListener('mousedown', (e) => this.handleElementDrag(e));
  }

  addElement(type) {
    const canvas = document.getElementById('labelCanvas');
    const id = Date.now();
    const element = {
      id,
      type,
      x: 20,
      y: 20,
      width: type === 'text' ? 100 : 50,
      height: type === 'text' ? 30 : 50,
      content: type === 'text' ? 'Текст' : ''
    };
    
    canvas.insertAdjacentHTML('beforeend', this.renderElement(element));
  }

  handleElementDrag(e) {
    const element = e.target.closest('.label-element');
    if (!element) return;
    
    e.preventDefault();
    const canvas = document.getElementById('labelCanvas');
    const rect = canvas.getBoundingClientRect();
    
    let startX = e.clientX;
    let startY = e.clientY;
    let elemX = parseInt(element.style.left);
    let elemY = parseInt(element.style.top);
    
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = (elemX + dx) + 'px';
      element.style.top = (elemY + dy) + 'px';
    };
    
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  async saveTemplate() {
    const name = document.getElementById('templateName')?.value || 'Без названия';
    const width = parseInt(document.getElementById('templateWidth')?.value || 100);
    const height = parseInt(document.getElementById('templateHeight')?.value || 50);
    
    const elements = [];
    document.querySelectorAll('.label-element').forEach(el => {
      elements.push({
        id: el.dataset.id,
        type: el.dataset.type,
        x: parseInt(el.style.left) || 0,
        y: parseInt(el.style.top) || 0,
        width: parseInt(el.style.width) || 50,
        height: parseInt(el.style.height) || 30
      });
    });
    
    const template = { name, width, height, elements, updatedAt: new Date().toISOString() };
    
    await this.db.put('templates', template);
    this.showToast('Шаблон сохранён', 'success');
    this.router.navigate('/templates');
  }

  async renderPrint() {
    const content = document.getElementById('content');
    const templates = await this.db.getAll('templates');
    const settings = {
      printer: await this.db.getSetting('printer', ''),
      copies: await this.db.getSetting('copies', 1)
    };
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Печать этикеток</h1>
      </div>
      
      <div class="grid grid-2">
        <div class="card">
          <h3>Настройки печати</h3>
          <div class="form-group">
            <label class="form-label">Принтер</label>
            <select class="form-input form-select" id="printPrinter">
              <option value="">Системный принтер</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Количество копий</label>
            <input type="number" class="form-input" id="printCopies" value="${settings.copies}" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Отступы (мм)</label>
            <input type="number" class="form-input" id="printMargin" value="0" min="0">
          </div>
        </div>
        
        <div class="card">
          <h3>Выбор шаблона</h3>
          <div class="form-group">
            <label class="form-label">Шаблон</label>
            <select class="form-input form-select" id="printTemplate">
              <option value="">Выберите шаблон</option>
              ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Данные для печати</label>
            <textarea class="form-input" id="printData" rows="6" placeholder="Введите данные (JSON или построчно)"></textarea>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>Предпросмотр</h3>
        <div class="print-preview" id="printPreview">
          <div class="preview-placeholder">Выберите шаблон для предпросмотра</div>
        </div>
      </div>
      
      <div class="print-actions">
        <button class="btn btn-primary btn-lg" onclick="app.doPrint()">🖨️ Печать</button>
      </div>
    `;
    
    this.updateHeader('Печать');
    
    // Preview update
    document.getElementById('printTemplate')?.addEventListener('change', (e) => this.updatePrintPreview(e.target.value));
  }

  async updatePrintPreview(templateId) {
    const preview = document.getElementById('printPreview');
    if (!templateId) {
      preview.innerHTML = '<div class="preview-placeholder">Выберите шаблон</div>';
      return;
    }
    
    const template = await this.db.get('templates', parseInt(templateId));
    if (!template) return;
    
    preview.innerHTML = `
      <div class="label-preview" style="width: ${template.width}mm; height: ${template.height}mm;">
        ${template.elements?.map(el => this.renderElement(el)).join('') || ''}
      </div>
    `;
  }

  async doPrint() {
    const templateId = document.getElementById('printTemplate')?.value;
    const copies = parseInt(document.getElementById('printCopies')?.value || 1);
    
    if (!templateId) {
      this.showToast('Выберите шаблон', 'error');
      return;
    }
    
    // Save settings
    await this.db.setSetting('copies', copies);
    
    // Print via browser
    window.print();
    
    // Log print job
    await this.db.add('printJobs', {
      templateId: parseInt(templateId),
      copies,
      date: new Date().toISOString(),
      status: 'completed'
    });
    
    this.showToast('Отправлено на печать', 'success');
  }

  async renderProducts() {
    const content = document.getElementById('content');
    const products = await this.db.getAll('products');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Товары</h1>
        <button class="btn btn-primary" onclick="app.showProductModal()">➕ Добавить товар</button>
      </div>
      
      ${products.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🏷️</div>
          <h3>Нет товаров</h3>
          <p>Добавьте товары для печати этикеток</p>
        </div>
      ` : `
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Артикул</th>
                <th>Название</th>
                <th>Штрихкод</th>
                <th>Цена</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.sku || '-'}</td>
                  <td>${p.name || '-'}</td>
                  <td>${p.barcode || '-'}</td>
                  <td>${p.price ? p.price + ' ₽' : '-'}</td>
                  <td>
                    <button class="btn btn-secondary btn-icon" onclick="app.editProduct(${p.id})">✏️</button>
                    <button class="btn btn-secondary btn-icon" onclick="app.deleteProduct(${p.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
    
    this.updateHeader('Товары');
  }

  showProductModal(product = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${product ? 'Редактировать' : 'Добавить'} товар</h2>
          <button class="btn btn-icon" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Артикул</label>
            <input type="text" class="form-input" id="productSku" value="${product?.sku || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Название</label>
            <input type="text" class="form-input" id="productName" value="${product?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Штрихкод</label>
            <input type="text" class="form-input" id="productBarcode" value="${product?.barcode || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Цена</label>
            <input type="number" class="form-input" id="productPrice" value="${product?.price || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Описание</label>
            <textarea class="form-input" id="productDesc" rows="3">${product?.description || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
          <button class="btn btn-primary" onclick="app.saveProduct(${product?.id || null})">Сохранить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async saveProduct(id) {
    const product = {
      sku: document.getElementById('productSku')?.value,
      name: document.getElementById('productName')?.value,
      barcode: document.getElementById('productBarcode')?.value,
      price: parseFloat(document.getElementById('productPrice')?.value) || 0,
      description: document.getElementById('productDesc')?.value,
      updatedAt: new Date().toISOString()
    };
    
    if (id) product.id = id;
    
    await this.db.put('products', product);
    this.showToast('Товар сохранён', 'success');
    document.querySelector('.modal-overlay')?.remove();
    this.router.navigate('/products', true);
  }

  async deleteProduct(id) {
    if (confirm('Удалить товар?')) {
      await this.db.delete('products', id);
      this.showToast('Товар удалён', 'success');
      this.router.navigate('/products', true);
    }
  }

  async renderAI() {
    const content = document.getElementById('content');
    const aiData = await this.db.getAll('aiData');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>ИИ Модуль</h1>
      </div>
      
      <div class="grid grid-2">
        <div class="card">
          <h3>Обучение</h3>
          <p>Обучите ИИ на ваших данных для автоматического заполнения этикеток</p>
          <div class="form-group">
            <label class="form-label">Тип данных</label>
            <select class="form-input form-select" id="aiDataType">
              <option value="products">Товары</option>
              <option value="templates">Шаблоны</option>
              <option value="descriptions">Описания</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="app.trainAI()">🚀 Обучить</button>
        </div>
        
        <div class="card">
          <h3>Запрос к ИИ</h3>
          <div class="ai-chat">
            <div class="ai-messages" id="aiMessages">
              <div class="ai-message">
                <div class="message-content">Привет! Я могу помочь с созданием этикеток, подбором дизайна или заполнением данных. Просто спросите!</div>
              </div>
            </div>
            <div class="ai-input">
              <input type="text" class="form-input" id="aiInput" placeholder="Задайте вопрос...">
              <button class="btn btn-primary" onclick="app.sendAI()">➤</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>Обучающие данные (${aiData.length})</h3>
        ${aiData.length === 0 ? '<p>Нет данных для обучения</p>' : `
          <div class="ai-data-list">
            ${aiData.slice(0, 10).map(d => `
              <div class="ai-data-item">
                <span class="badge badge-success">${d.type}</span>
                ${d.content?.substring(0, 100)}...
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
    this.updateHeader('ИИ Модуль');
  }

  async trainAI() {
    const type = document.getElementById('aiDataType')?.value;
    const products = await this.db.getAll('products');
    
    for (const product of products) {
      await this.db.add('aiData', {
        type: 'products',
        content: JSON.stringify(product),
        timestamp: new Date().toISOString()
      });
    }
    
    this.showToast('ИИ обучен на ' + products.length + ' товарах', 'success');
    this.router.navigate('/ai', true);
  }

  async sendAI() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    if (!message) return;
    
    const messages = document.getElementById('aiMessages');
    messages.innerHTML += `
      <div class="ai-message user">
        <div class="message-content">${message}</div>
      </div>
    `;
    
    input.value = '';
    
    // Simulated AI response (replace with real API)
    setTimeout(() => {
      messages.innerHTML += `
        <div class="ai-message">
          <div class="message-content">Я получил ваш запрос: "${message}". Это демонстрация ИИ модуля. Подключите API (OpenAI, Claude) для реальной работы.</div>
        </div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }, 500);
  }

  async renderParser() {
    const content = document.getElementById('content');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Умный парсинг</h1>
      </div>
      
      <div class="grid grid-2">
        <div class="card">
          <h3>Импорт из файла</h3>
          <div class="form-group">
            <label class="form-label">Файл (CSV, JSON, Excel)</label>
            <input type="file" class="form-input" id="parserFile" accept=".csv,.json,.xlsx,.xls">
          </div>
          <div class="form-group">
            <label class="form-label">Разделитель (для CSV)</label>
            <select class="form-input form-select" id="parserDelimiter">
              <option value=",">Запятая (,)</option>
              <option value=";">Точка с запятой (;)</option>
              <option value="\t">Табуляция</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="app.parseFile()">📥 Импорт</button>
        </div>
        
        <div class="card">
          <h3>Парсинг с сайта</h3>
          <div class="form-group">
            <label class="form-label">URL</label>
            <input type="url" class="form-input" id="parserUrl" placeholder="https://...">
          </div>
          <div class="form-group">
            <label class="form-label">Селектор товара</label>
            <input type="text" class="form-input" id="parserSelector" placeholder=".product, .item">
          </div>
          <button class="btn btn-primary" onclick="app.parseUrl()">🌐 Парсить</button>
        </div>
      </div>
      
      <div class="card">
        <h3>Результат парсинга</h3>
        <div id="parserResult" class="parser-result">
          <p class="empty-state">Данные появятся здесь</p>
        </div>
      </div>
    `;
    
    this.updateHeader('Парсинг');
  }

  async parseFile() {
    const file = document.getElementById('parserFile')?.files[0];
    if (!file) {
      this.showToast('Выберите файл', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      let data = [];
      
      if (file.name.endsWith('.json')) {
        data = JSON.parse(content);
      } else if (file.name.endsWith('.csv')) {
        const delimiter = document.getElementById('parserDelimiter')?.value || ',';
        const lines = content.split('\n');
        const headers = lines[0].split(delimiter).map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(delimiter);
          const obj = {};
          headers.forEach((h, j) => obj[h] = values[j]?.trim());
          data.push(obj);
        }
      }
      
      this.showParseResult(data);
    };
    reader.readAsText(file);
  }

  async parseUrl() {
    const url = document.getElementById('parserUrl')?.value;
    if (!url) {
      this.showToast('Введите URL', 'error');
      return;
    }
    
    this.showToast('Парсинг URL требует серверной части (CORS)', 'error');
  }

  showParseResult(data) {
    const result = document.getElementById('parserResult');
    result.innerHTML = `
      <p>Найдено ${data.length} записей</p>
      <table class="data-table">
        <thead>
          <tr>${Object.keys(data[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.slice(0, 5).map(row => `
            <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
      <button class="btn btn-primary" onclick="app.importParsedData(${JSON.stringify(data).replace(/"/g, '&quot;')})">Импортировать в базу</button>
    `;
  }

  async importParsedData(data) {
    const items = typeof data === 'string' ? JSON.parse(data) : data;
    
    for (const item of items) {
      await this.db.add('products', {
        sku: item.sku || item.артикул || item.article || '',
        name: item.name || item.название || item.title || '',
        barcode: item.barcode || item.штрихкод || '',
        price: parseFloat(item.price || item.цена || 0),
        description: item.description || item.описание || ''
      });
    }
    
    this.showToast('Импортировано ' + items.length + ' товаров', 'success');
    this.router.navigate('/products');
  }

  async renderMap() {
    const content = document.getElementById('content');
    const locations = await this.db.getAll('locations');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Карта</h1>
        <button class="btn btn-primary" onclick="app.showLocationModal()">➕ Добавить точку</button>
      </div>
      
      <div class="card">
        <div class="map-container" id="mapContainer">
          <div class="map-placeholder">
            <p>Карта загружается...</p>
            <p>Подключите Leaflet для отображения карты</p>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>Точки (${locations.length})</h3>
        ${locations.length === 0 ? '<p>Нет точек</p>' : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Координаты</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${locations.map(l => `
                <tr>
                  <td>${l.name}</td>
                  <td><span class="badge badge-success">${l.type}</span></td>
                  <td>${l.lat?.toFixed(4)}, ${l.lng?.toFixed(4)}</td>
                  <td>
                    <button class="btn btn-secondary btn-icon" onclick="app.deleteLocation(${l.id})">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
    
    this.updateHeader('Карта');
  }

  showLocationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Добавить точку</h2>
          <button class="btn btn-icon" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Название</label>
            <input type="text" class="form-input" id="locationName">
          </div>
          <div class="form-group">
            <label class="form-label">Тип</label>
            <select class="form-input form-select" id="locationType">
              <option value="warehouse">Склад</option>
              <option value="store">Магазин</option>
              <option value="office">Офис</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Широта</label>
            <input type="number" step="any" class="form-input" id="locationLat">
          </div>
          <div class="form-group">
            <label class="form-label">Долгота</label>
            <input type="number" step="any" class="form-input" id="locationLng">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
          <button class="btn btn-primary" onclick="app.saveLocation()">Сохранить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async saveLocation() {
    const location = {
      name: document.getElementById('locationName')?.value,
      type: document.getElementById('locationType')?.value,
      lat: parseFloat(document.getElementById('locationLat')?.value),
      lng: parseFloat(document.getElementById('locationLng')?.value)
    };
    
    await this.db.add('locations', location);
    this.showToast('Точка добавлена', 'success');
    document.querySelector('.modal-overlay')?.remove();
    this.router.navigate('/map', true);
  }

  async deleteLocation(id) {
    if (confirm('Удалить точку?')) {
      await this.db.delete('locations', id);
      this.router.navigate('/map', true);
    }
  }

  async renderSettings() {
    const content = document.getElementById('content');
    
    content.innerHTML = `
      <div class="page-header">
        <h1>Настройки</h1>
      </div>
      
      <div class="grid grid-2">
        <div class="card">
          <h3>Общие</h3>
          <div class="form-group">
            <label class="form-label">Язык</label>
            <select class="form-input form-select" id="settingLang">
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Тема</label>
            <select class="form-input form-select" id="settingTheme">
              <option value="dark">Тёмная</option>
              <option value="light">Светлая</option>
            </select>
          </div>
        </div>
        
        <div class="card">
          <h3>Данные</h3>
          <button class="btn btn-secondary" onclick="app.exportData()">📤 Экспорт базы</button>
          <button class="btn btn-secondary" onclick="app.importData()">📥 Импорт базы</button>
          <input type="file" id="importFile" accept=".json" style="display: none;">
        </div>
      </div>
    `;
    
    this.updateHeader('Настройки');
  }

  async exportData() {
    const data = await this.db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sticks-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    this.showToast('Данные экспортированы', 'success');
  }

  importData() {
    document.getElementById('importFile')?.click();
  }

  render404() {
    document.getElementById('content').innerHTML = `
      <div class="empty-state">
        <h1>404</h1>
        <p>Страница не найдена</p>
        <button class="btn btn-primary" onclick="app.router.navigate('/')">На главную</button>
      </div>
    `;
  }

  updateHeader(title) {
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) headerTitle.textContent = title;
  }

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
}

// Initialize app
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());