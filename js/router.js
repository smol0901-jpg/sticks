// Sticks - Router Module (Hash-based for GitHub Pages)
class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.beforeHooks = [];
    this.afterHooks = [];
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
    const url = path.startsWith('#') ? path : '#' + path;
    if (replace) {
      history.replaceState(null, '', url);
    } else {
      history.pushState(null, '', url);
    }
    this.handleRoute();
  }

  getPath() {
    const hash = window.location.hash.slice(1);
    return hash || '/';
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
      const notFound = this.routes.find(r => r.path === '*');
      if (notFound) {
        await notFound.handler({});
      }
    }
    
    for (const hook of this.afterHooks) {
      await hook(path, match);
    }
    
    this.updateActiveNav();
    this.closeSidebar();
  }

  updateActiveNav() {
    const currentPath = this.getPath();
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href) {
        const navPath = href.replace('#', '');
        if (currentPath === navPath || (navPath !== '/' && currentPath.startsWith(navPath))) {
          item.classList.add('active');
        }
      }
    });
  }

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
  }

  init() {
    // Handle hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Handle clicks on links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href').replace('#', ''));
      }
    });
    
    // Initial route
    if (!window.location.hash) {
      this.navigate('/', true);
    } else {
      this.handleRoute();
    }
  }
}

window.Router = Router;