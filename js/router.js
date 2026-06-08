// Sticks - Router Module
class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.beforeHooks = [];
    this.afterHooks = [];
    
    window.addEventListener('popstate', () => this.handleRoute());
  }

  add(path, handler, name) {
    this.routes.push({ path, handler, name });
    return this;
  }

  before(fn) {
    this.beforeHooks.push(fn);
    return this;
  }

  after(fn) {
    this.afterHooks.push(fn);
    return this;
  }

  navigate(path, replace = false) {
    const url = path.startsWith('/') ? path : '/' + path;
    if (replace) {
      history.replaceState(null, '', url);
    } else {
      history.pushState(null, '', url);
    }
    this.handleRoute();
  }

  getPath() {
    const path = location.pathname;
    const hash = location.hash.slice(1);
    return hash || path || '/';
  }

  getParams() {
    const url = new URL(window.location.href);
    const params = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  match(path) {
    for (const route of this.routes) {
      const regex = this.pathToRegex(route.path);
      const match = path.match(regex);
      if (match) {
        return { route, params: this.extractParams(route.path, match) };
      }
    }
    return null;
  }

  pathToRegex(path) {
    const paramNames = [];
    const regexPath = path.replace(/\/:([^/]+)/g, (_, key) => {
      paramNames.push(key);
      return '/([^/]+)';
    });
    return new RegExp('^' + regexPath + '$');
  }

  extractParams(path, match) {
    const params = {};
    const paramNames = [];
    path.replace(/\/:([^/]+)/g, (_, key) => paramNames.push(key));
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
    return params;
  }

  async handleRoute() {
    const path = this.getPath();
    const match = this.match(path);
    
    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(path, match);
      if (result === false) return;
    }
    
    if (match) {
      this.currentRoute = match.route;
      await match.route.handler(match.params);
    } else {
      // 404 handler
      const notFound = this.routes.find(r => r.path === '*');
      if (notFound) {
        await notFound.handler({});
      }
    }
    
    // Run after hooks
    for (const hook of this.afterHooks) {
      await hook(path, match);
    }
    
    // Update active nav
    this.updateActiveNav();
  }

  updateActiveNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href && this.getPath().startsWith(href.replace('#', ''))) {
        item.classList.add('active');
      }
    });
  }

  init() {
    // Handle clicks on links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });
    
    this.handleRoute();
  }
}

window.Router = Router;