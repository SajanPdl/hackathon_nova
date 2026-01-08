(function () {
  // Resolve base path (script file location)
  const scriptEl = document.currentScript;
  const base = scriptEl ? scriptEl.src.replace(/content-loader\.js$/, '') : './assets/';

  async function load() {
    try {
      const res = await fetch(base + 'content.json');
      if (!res.ok) throw new Error('Failed to fetch content.json');
      const data = await res.json();

      // NAV
      const navLogo = document.getElementById('nav-logo');
      if (navLogo && data.nav && data.nav.logo) navLogo.src = base + data.nav.logo;

      const navBrand = document.getElementById('nav-brand-name');
      if (navBrand && data.nav && data.nav.brand) navBrand.textContent = data.nav.brand.name || navBrand.textContent;
      const navSubtitle = document.getElementById('nav-brand-subtitle');
      if (navSubtitle && data.nav && data.nav.brand) navSubtitle.textContent = data.nav.brand.subtitle || navSubtitle.textContent;

      const navLinks = document.getElementById('nav-links');
      if (navLinks && data.nav && Array.isArray(data.nav.links)) {
        navLinks.innerHTML = data.nav.links
          .map(l => `<a href="${l.href}" class="text-gray-300 hover:text-cyan-400 transition">${l.label}</a>`)
          .join('\n');
      }

      const navCta = document.getElementById('nav-cta');
      if (navCta && data.nav && data.nav.cta) {
        navCta.innerHTML = `<a href="${data.nav.cta.href}" class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition">${data.nav.cta.label}</a>`;
      }

      // HERO
      if (data.hero) {
        const d = document.getElementById('hero-date'); if (d) d.textContent = data.hero.date || '';
        const t1 = document.getElementById('hero-title-line1'); if (t1) t1.textContent = data.hero.title.line1 || '';
        const t2 = document.getElementById('hero-title-line2'); if (t2) t2.textContent = data.hero.title.line2 || '';
        const sub = document.getElementById('hero-subtitle'); if (sub) sub.textContent = data.hero.subtitle || '';
        const loc = document.getElementById('hero-location'); if (loc) loc.textContent = data.hero.location || '';

        // CTA buttons
        if (Array.isArray(data.hero.ctas)) {
          const c1 = document.getElementById('hero-cta-1');
          const c2 = document.getElementById('hero-cta-2');
          if (c1 && data.hero.ctas[0]) { c1.href = data.hero.ctas[0].href; c1.innerHTML = data.hero.ctas[0].label + ' <i class="fas fa-arrow-right ml-2"></i>'; }
          if (c2 && data.hero.ctas[1]) { c2.href = data.hero.ctas[1].href; c2.innerHTML = data.hero.ctas[1].label + ' <i class="fas fa-book ml-2"></i>'; }
        }
      }

      // ABOUT
      if (data.about) {
        const ah = document.getElementById('about-heading'); if (ah) ah.textContent = data.about.heading;
        const ash = document.getElementById('about-subheading'); if (ash) ash.textContent = data.about.subheading;
        const ap1 = document.getElementById('about-paragraph-1'); if (ap1) ap1.textContent = (data.about.paragraphs && data.about.paragraphs[0]) || '';
        const ap2 = document.getElementById('about-paragraph-2'); if (ap2) ap2.textContent = (data.about.paragraphs && data.about.paragraphs[1]) || '';
        const who = document.getElementById('about-who-list'); if (who && Array.isArray(data.about.who)) {
          who.innerHTML = data.about.who.map(i => `<li><i class=\"fas fa-check text-cyan-400 mr-2\"></i>${i}</li>`).join('\n');
        }
      }

      // FOOTER / CONTACT
      const cemail = document.getElementById('footer-contact-email'); if (cemail && data.contact) cemail.href = 'mailto:' + data.contact.email, cemail.textContent = data.contact.email;
      const fc = document.getElementById('footer-copyright'); if (fc && data.footer) fc.textContent = data.footer.copyright;

      // SPONSORS - Now loaded from database, skip JSON loading
      // Sponsors are loaded from Supabase database via script in index.html
      // This section is kept for backward compatibility but disabled
      /*
      if (data.sponsors) {
        const renderLogos = (arr, containerId, cardClass) => {
          const el = document.getElementById(containerId);
          if (!el || !Array.isArray(arr)) return;
          el.innerHTML = arr
            .map(s => {
              const href = s.href ? `href="${s.href}" target="_blank" rel="noopener noreferrer"` : '';
              const src = base + (s.img || '');
              return `
                <div class="${cardClass}">
                  <a ${href} class="flex items-center justify-center h-full">
                    <img src="${src}" alt="${s.name || ''}" class="w-full h-full object-contain" onerror="this.style.display='none'; this.parentElement.parentElement.classList.add('hidden');" />
                  </a>
                </div>
              `;
            })
            .join('\n');
        };

        // title uses a larger card style (centered, taller)
        renderLogos(data.sponsors.title, 'sponsors-title', 'bg-gradient-to-br from-yellow-500/10 to-transparent border-2 border-yellow-500/50 rounded-2xl p-4 w-full max-w-md mx-auto h-48 md:h-64 flex items-center justify-center hover:shadow-2xl hover:shadow-yellow-500/30 transition');

        // Gold sponsors: medium cards with balanced padding
        renderLogos(data.sponsors.gold, 'sponsors-gold', 'bg-gradient-to-br from-gray-300/10 to-transparent border border-gray-700 rounded-xl p-4 hover:shadow-xl hover:shadow-gray-400/20 transition h-32 md:h-40 flex items-center justify-center');

        // Silver sponsors: slightly smaller cards
        renderLogos(data.sponsors.silver, 'sponsors-silver', 'bg-gradient-to-br from-orange-400/5 to-transparent border border-gray-800 rounded-lg p-3 hover:shadow-lg hover:shadow-orange-400/10 transition h-28 md:h-32 flex items-center justify-center');

        // Community partners: compact cards
        renderLogos(data.sponsors.communityPartners, 'sponsors-community', 'bg-gradient-to-br from-cyan-400/5 to-transparent border border-gray-800 rounded-lg p-3 hover:shadow-lg hover:shadow-cyan-400/10 transition h-20 md:h-24 flex items-center justify-center');

        // Media partners: compact cards
        renderLogos(data.sponsors.mediaPartners, 'sponsors-media', 'bg-gradient-to-br from-blue-400/5 to-transparent border border-gray-800 rounded-lg p-3 hover:shadow-lg hover:shadow-blue-400/10 transition h-20 md:h-24 flex items-center justify-center');
      }
      */

      // PAGE SPECIFIC
      const page = document.body.getAttribute('data-page');
      if (page && data.pages && data.pages[page]) {
        const p = data.pages[page];
        const pt = document.getElementById('page-title'); if (pt && p.title) pt.textContent = p.title;
        const pd = document.getElementById('page-description'); if (pd && p.description) pd.textContent = p.description;
        const pc = document.getElementById('page-content'); if (pc && p.content) pc.innerHTML = p.content;

        // update meta description if present
        const meta = document.querySelector('meta[name="description"]'); if (meta && p.description) meta.content = p.description;
      }

    } catch (err) {
      // Graceful fallback: nothing to do — page already has default content
      console.warn('Content loader error:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
