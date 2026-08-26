import { ApiService } from '../services/api';
import { getApiPath } from 'boot/api-config';

const apiUrl = getApiPath();

export async function fetchSeoData() {
  try {
    const response = await ApiService.get(`${apiUrl}seo`);
    const seo = response.data;

    if (seo.name) {
      document.title = seo.name;
    }

    if (seo.address) {
      updateMetaTag('description', seo.address);
    }

    if (seo.logo) {
      updateMetaTag('og:title', seo.name);
    }

    if (seo.logo) {
      setLogo(seo.logo);
    }

    return seo;
  } catch (error) {
    console.error('Failed to fetch SEO settings', error);
  }
}

function updateMetaTag(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLogo(faviconUrl) {
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}
