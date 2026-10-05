import { useEffect, useState } from 'react';
import api, { API_URL } from '../api/axios';

const CACHE_KEY = 'site_name';

function resolveImageUrl(url) {
  if (!url) return url;
  return url.startsWith('http') || url.startsWith('data:') ? url : `${API_URL}${url}`;
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

// Icône de secours : initiale du nom de la boutique sur la couleur principale
function letterFavicon(name, color) {
  const raw = (name || 'S').trim().charAt(0).toUpperCase() || 'S';
  const letter = XML_ESCAPES[raw] || raw;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' rx='14' fill='${color || '#F68B1E'}'/>` +
    `<text x='32' y='46' font-size='38' font-family='Arial,sans-serif' font-weight='700' ` +
    `text-anchor='middle' fill='white'>${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Applique le nom (titre de l'onglet) et l'icône de l'onglet
export function applySiteIdentity(settings) {
  if (!settings) return;

  if (settings.nom_site) {
    document.title = settings.nom_site;
    try { localStorage.setItem(CACHE_KEY, settings.nom_site); } catch { /* ignore */ }
  }

  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  // Le type figé dans index.html (svg) empêcherait l'affichage d'un logo png/jpg
  link.removeAttribute('type');
  link.href = settings.logo_url
    ? resolveImageUrl(settings.logo_url)
    : letterFavicon(settings.nom_site, settings.primary_color);
}

// Renvoie le nom de la boutique (dynamique, mis à jour depuis les paramètres admin)
export function useSiteName() {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY) || ''; } catch { return ''; }
  });

  useEffect(() => {
    let active = true;
    api.get('/api/settings')
      .then((res) => {
        if (active && res.data?.nom_site) setName(res.data.nom_site);
      })
      .catch(() => {});

    const onChange = (e) => {
      if (e?.detail?.nom_site) setName(e.detail.nom_site);
    };
    window.addEventListener('settings-changed', onChange);
    return () => {
      active = false;
      window.removeEventListener('settings-changed', onChange);
    };
  }, []);

  return name;
}