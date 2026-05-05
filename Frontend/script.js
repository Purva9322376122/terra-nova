/**
 * Terra Nova NGO — Main Script
 * Handles: Loader, Navigation, Scroll Reveals, Counters,
 *          Campaigns Filter, Donation UI, Volunteer Form,
 *          Stories Carousel, Newsletter, Parallax, Toast
 */

'use strict';

/* ═══════════════════════════════════════
   1. LOADER
═══════════════════════════════════════ */
(function initLoader() {
  const loader = document.getElementById('loader');
  document.body.classList.add('loading');

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.classList.remove('loading');
      document.querySelectorAll('.reveal-up').forEach(el => {
        el.style.animationPlayState = 'running';
      });
    }, 1800);
  });
})();


/* ═══════════════════════════════════════
   2. NAVIGATION
═══════════════════════════════════════ */
(function initNav() {
  const navbar   = document.getElementById('navbar');
  const burger   = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  let menuOpen = false;

  const onScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggleMenu = (state) => {
    menuOpen = typeof state === 'boolean' ? state : !menuOpen;
    burger.classList.toggle('open', menuOpen);
    mobileMenu.classList.toggle('open', menuOpen);
    mobileMenu.setAttribute('aria-hidden', !menuOpen);
    burger.setAttribute('aria-expanded', menuOpen);
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  };

  burger.addEventListener('click', () => toggleMenu());

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  document.addEventListener('click', (e) => {
    if (menuOpen && !navbar.contains(e.target)) toggleMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) toggleMenu(false);
  });

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const highlightNav = () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active-nav', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', highlightNav, { passive: true });
})();


/* ═══════════════════════════════════════
   3. SCROLL REVEAL OBSERVER
═══════════════════════════════════════ */
(function initScrollReveal() {
  const elements = document.querySelectorAll('.scroll-reveal');

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseFloat(el.dataset.delay || 0) * 1000;
        setTimeout(() => {
          el.classList.add('revealed');
          el.querySelectorAll('.cc-fill').forEach(bar => bar.classList.add('animated'));
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.cc-fill').forEach(bar => {
          setTimeout(() => bar.classList.add('animated'), 300);
        });
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.campaign-card').forEach(card => cardObserver.observe(card));
})();


/* ═══════════════════════════════════════
   4. ANIMATED COUNTERS
═══════════════════════════════════════ */
(function initCounters() {
  const counters = document.querySelectorAll('.counter-num');

  const formatNum = (val, target, suffix) => {
    if (suffix === 'M') {
      return (val / 1000000).toFixed(1) + 'M+';
    } else if (suffix === 'K') {
      return (val / 1000).toFixed(0) + 'K+';
    } else {
      return Math.round(val).toLocaleString();
    }
  };

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 2200;
    const startTime = performance.now();
    const startVal = 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      el.textContent = formatNum(current, target, suffix);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatNum(target, target, suffix);
    };
    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(el => animateCounter(el));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseFloat(el.closest('.counter-card')?.dataset.delay || 0) * 1000;
        setTimeout(() => animateCounter(el), delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();


/* ═══════════════════════════════════════
   5. CAMPAIGN FILTERS
═══════════════════════════════════════ */

// Campaign colors and emojis by category
const campaignColors = {
  environment: 'linear-gradient(135deg, #1a3a2e, #52b788)',
  water:       'linear-gradient(135deg, #1b4f72, #2e86c1)',
  education:   'linear-gradient(135deg, #4a1942, #8e44ad)',
  health:      'linear-gradient(135deg, #7b1e1e, #c0392b)',
  other:       'linear-gradient(135deg, #0d4f3a, #1a8c6c)',
};
const campaignEmojis = { environment:'🌿', water:'💧', education:'📚', health:'🏥', other:'🌍' };
const urgencyLabels  = { urgent:'🔥 Urgent', almost:'⚡ Almost Done', 'needs-help':'🌟 Needs Help', active:'✅ Active' };
const urgencyClasses = { urgent:'', almost:'almost-done', 'needs-help':'needs-help', active:'' };

let allCampaigns = [];

function renderCampaignCards(campaigns) {
  const grid = document.getElementById('campaignsGrid');
  if (!grid) return;

  if (!campaigns.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(245,240,232,0.5)"><div style="font-size:2.5rem;margin-bottom:12px">📣</div><p>No campaigns yet. NGOs are being verified.</p></div>';
    return;
  }

  grid.innerHTML = campaigns.slice(0, 6).map(c => {
    const pct     = c.goal > 0 ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
    const color   = campaignColors[c.category] || campaignColors.other;
    const emoji   = campaignEmojis[c.category] || '🌍';
    const urgency = urgencyLabels[c.urgency]  || '✅ Active';
    const urgCls  = urgencyClasses[c.urgency] || '';
    const raised  = c.raised >= 1000000 ? '₹' + (c.raised/1000000).toFixed(1) + 'M' : c.raised >= 1000 ? '₹' + (c.raised/1000).toFixed(0) + 'K' : '₹' + c.raised;
    const goal    = c.goal   >= 1000000 ? '₹' + (c.goal/1000000).toFixed(1)   + 'M' : c.goal   >= 1000 ? '₹' + (c.goal/1000).toFixed(0)   + 'K' : '₹' + c.goal;

    return `<article class="campaign-card" data-category="${c.category}" data-ngo-id="${c.ngoId}" data-campaign-id="${c._id}" tabindex="0">
      <div class="cc-media">
        <div class="cc-image" style="background:${c.imageUrl ? 'none' : color};${c.imageUrl ? `background-image:url(${API}${c.imageUrl});background-size:cover;background-position:center` : ''}">
          ${!c.imageUrl ? `<span class="cc-emoji">${emoji}</span>` : ''}
        </div>
        <div class="cc-tag ${c.category}">${c.category}</div>
        <div class="cc-urgency ${urgCls}">${urgency}</div>
      </div>
      <div class="cc-body">
        <h3>${c.title}</h3>
        <p style="font-size:0.78rem;color:rgba(245,240,232,0.55);margin-bottom:4px">by ${c.ngoName}</p>
        <p>${c.description || 'Supporting communities and ecosystems through impactful action.'}</p>
        <div class="cc-meta">
          <div class="cc-progress-wrap">
            <div class="cc-progress-header"><span>${raised} raised</span><span class="cc-goal">of ${goal}</span></div>
            <div class="cc-bar"><div class="cc-fill animated" style="--pct:${pct}%"></div></div>
            <div class="cc-progress-pct">${pct}% funded</div>
          </div>
          <div class="cc-stats">
            <span>⏱ ${c.daysLeft || 30} days left</span>
            <span>🙋 ${c.volunteers || 0} volunteers needed</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;align-items:stretch">
          <button class="btn-card" style="flex:1" onclick="openDonate('${c.title.replace(/'/g,"\\'")}', '${c.ngoId}', '${c._id}')">Support Campaign</button>
          <button onclick="toggleWishlist('${c.title.replace(/'/g,"\\'")}', this)" title="Save to Wishlist"
            style="padding:8px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;cursor:pointer;font-size:1rem;transition:all 0.2s;color:#e88080"
            data-campaign="${c.title.replace(/'/g,"\\'")}">❤️</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <a href="https://wa.me/?text=${encodeURIComponent('Support this campaign: ' + c.title + ' by ' + c.ngoName + ' — Donate at http://127.0.0.1:3000')}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px;background:#25D366;color:#fff;border-radius:8px;font-size:0.75rem;font-weight:600;text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.502-5.18-1.38l-.37-.22-3.762.895.952-3.67-.242-.38A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Support "' + c.title + '" by ' + c.ngoName + ' on Terra Nova 🌿')}&url=${encodeURIComponent('http://127.0.0.1:3000')}" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px;background:#000;color:#fff;border-radius:8px;font-size:0.75rem;font-weight:600;text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X / Twitter
          </a>
        </div>
      </div>
    </article>`;
  }).join('');

  // Update view all count
  const viewAll = document.getElementById('viewAllCampaigns');
  if (viewAll) viewAll.textContent = `View All ${campaigns.length} Campaign${campaigns.length !== 1 ? 's' : ''}`;
}

(function initCampaignFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Load campaigns from API
  fetch(API + '/api/campaigns')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        allCampaigns = data.data;
        renderCampaignCards(allCampaigns);
      }
    })
    .catch(() => {
      // API unavailable — show empty state
      const grid = document.getElementById('campaignsGrid');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(245,240,232,0.5)"><p>Could not load campaigns. Make sure the backend is running.</p></div>';
    });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? allCampaigns : allCampaigns.filter(c => c.category === filter);
      renderCampaignCards(filtered);
    });
  });
})();


/* ═══════════════════════════════════════
   6. DONATION UI
═══════════════════════════════════════ */
(function initDonation() {
  const amountBtns   = document.querySelectorAll('.amount-btn');
  const customInput  = document.getElementById('customAmount');
  const donateTotal  = document.getElementById('donateTotal');
  const donateBtnText= document.getElementById('donateBtnText');
  const donateFreqTabs = document.querySelectorAll('.donate-tab');
  const impactEq     = document.getElementById('impactEq');

  let selectedAmount = 500;   // default ₹500
  let selectedFreq   = 'once';

  // ── Rupee amounts & impact map ──────────────────────────────
  const impactMap = {
    100:  { icon: '💧', text: '₹100 provides clean water for a child for a month',  nums: ['1 month', '1 child', '1 village'] },
    250:  { icon: '🌳', text: '₹250 plants 5 trees in the Amazon Basin',             nums: ['5 trees', '2 acres', '1 zone'] },
    500:  { icon: '📚', text: '₹500 provides school supplies for 3 children',        nums: ['3 children', '1 classroom', '2 teachers'] },
    1000: { icon: '💧', text: '₹1000 brings clean water to an entire family',        nums: ['1 family', '5 people', '12 months'] },
    2500: { icon: '🏡', text: '₹2500 builds a solar-powered school kitchen',         nums: ['1 kitchen', '80 meals/day', '1 school'] },
    5000: { icon: '🌍', text: '₹5000 trains a community health worker',              nums: ['1 worker', '200 patients', '3 villages'] },
  };

  const freqMultipliers = { once: 1, monthly: 1, annual: 0.9 };
  const freqLabels      = { once: 'Now', monthly: '/mo', annual: '/yr' };

  // ── Format rupees ───────────────────────────────────────────
  const formatRupee = (amount) => {
    return '₹' + Number(amount).toLocaleString('en-IN');
  };

  const updateDisplay = () => {
    const multiplier = freqMultipliers[selectedFreq] || 1;
    const label      = freqLabels[selectedFreq];
    const display    = Math.round(selectedAmount * multiplier);

    donateTotal.textContent    = formatRupee(display);
    donateBtnText.textContent  = `Donate ${formatRupee(display)}${label === 'Now' ? '' : label}`;

    // Update impact equivalent
    const closest = Object.keys(impactMap).reduce((prev, curr) =>
      Math.abs(curr - selectedAmount) < Math.abs(prev - selectedAmount) ? curr : prev
    );
    const eq = impactMap[closest] || impactMap[500];
    if (impactEq) {
      impactEq.querySelector('.eq-icon').textContent = eq.icon;
      impactEq.querySelector('.eq-text').textContent = eq.text;
      impactEq.style.animation = 'none';
      void impactEq.offsetWidth;
      impactEq.style.animation = '';
    }
    // Update breakdown strip
    if (eq.nums) {
      const n1 = document.getElementById('ibNum1');
      const n2 = document.getElementById('ibNum2');
      const n3 = document.getElementById('ibNum3');
      const l1 = document.getElementById('ibLabel1');
      const l2 = document.getElementById('ibLabel2');
      const l3 = document.getElementById('ibLabel3');
      const parts = [
        { num: eq.nums[0].split(' ')[0], label: eq.nums[0].split(' ').slice(1).join(' ') },
        { num: eq.nums[1].split(' ')[0], label: eq.nums[1].split(' ').slice(1).join(' ') },
        { num: eq.nums[2].split(' ')[0], label: eq.nums[2].split(' ').slice(1).join(' ') },
      ];
      if (n1) { n1.textContent = parts[0].num; l1.textContent = parts[0].label; }
      if (n2) { n2.textContent = parts[1].num; l2.textContent = parts[1].label; }
      if (n3) { n3.textContent = parts[2].num; l3.textContent = parts[2].label; }
    }
  };

  // ── Amount buttons ──────────────────────────────────────────
  amountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      amountBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = parseInt(btn.dataset.amount, 10);
      customInput.value = '';
      updateDisplay();
    });
  });

  // ── Custom input ────────────────────────────────────────────
  customInput.addEventListener('input', () => {
    const val = parseFloat(customInput.value);
    if (val > 0) {
      amountBtns.forEach(b => b.classList.remove('active'));
      selectedAmount = val;
      updateDisplay();
    }
  });

  // ── Frequency tabs ──────────────────────────────────────────
  donateFreqTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      donateFreqTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedFreq = tab.dataset.freq;
      updateDisplay();
    });
  });

  updateDisplay();

  // ── Open donate from campaign cards ────────────────────────
  window.openDonate = (campaignName, ngoId, campaignId) => {
    // Store ngoId and campaignId for the donate button to use
    window._donateNgoId      = ngoId      || null;
    window._donateCampaignId = campaignId || null;
    window._donateCampaign   = campaignName;
    document.getElementById('donate').scrollIntoView({ behavior: 'smooth' });
  };
})();


/* ═══════════════════════════════════════
   7. HANDLE DONATE BUTTON
═══════════════════════════════════════ */

// Show donor login status bar in donate section
(function initDonorStatusBar() {
  const bar   = document.getElementById('donorStatusBar');
  if (!bar) return;
  const name  = localStorage.getItem('donor_name');
  const token = localStorage.getItem('donor_token');
  if (token && name) {
    bar.style.cssText = 'display:block;background:rgba(82,183,136,0.12);border:1px solid rgba(82,183,136,0.3);color:#1a3a2e;padding:10px 14px;border-radius:8px;font-size:0.8rem;margin-bottom:12px;';
    bar.innerHTML = `✅ Donating as <strong>${name}</strong> — tracked in your <a href="donor-dashboard.html" style="color:#2d6a4f;font-weight:600">dashboard</a>.`;
  } else {
    bar.style.cssText = 'display:block;background:rgba(212,168,83,0.1);border:1px solid rgba(212,168,83,0.3);color:#7a5c00;padding:10px 14px;border-radius:8px;font-size:0.8rem;margin-bottom:12px;';
    bar.innerHTML = `💡 <a href="donor-login.html" style="color:#7a5c00;font-weight:600">Log in or create a donor account</a> to track this donation in your history.`;
  }
})();

// ── WISHLIST TOGGLE ──────────────────────────────────────────
window.toggleWishlist = async function(campaignName, btn) {
  const token = localStorage.getItem('donor_token');
  if (!token) {
    // Not logged in — redirect to donor login
    alert('Please log in as a donor to save campaigns to your wishlist.');
    window.location.href = 'donor-login.html';
    return;
  }

  const isWishlisted = btn.dataset.wishlisted === 'true';

  try {
    if (isWishlisted) {
      // Remove from wishlist
      const res  = await fetch(`${API}/api/donor/wishlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ campaign: campaignName })
      });
      const data = await res.json();
      if (data.success) {
        btn.dataset.wishlisted = 'false';
        btn.textContent = '🤍';
        btn.title = 'Save to Wishlist';
        btn.style.background = 'rgba(255,255,255,0.06)';
      }
    } else {
      // Add to wishlist
      const res  = await fetch(`${API}/api/donor/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ campaign: campaignName })
      });
      const data = await res.json();
      if (data.success) {
        btn.dataset.wishlisted = 'true';
        btn.textContent = '❤️';
        btn.title = 'Remove from Wishlist';
        btn.style.background = 'rgba(232,128,128,0.15)';
        btn.style.borderColor = 'rgba(232,128,128,0.3)';
      }
    }
  } catch (e) {
    console.error('Wishlist error:', e);
  }
};

window.handleDonate = function() {
  const btn      = document.getElementById('donateNowBtn');
  const btnText  = document.getElementById('donateBtnText');
  const total    = document.getElementById('donateTotal').textContent;

  const amount    = parseFloat(total.replace('₹', '').replace(/,/g, ''));
  const frequency = document.querySelector('.donate-tab.active')?.dataset.freq || 'once';
  const campaignSelect = document.getElementById('campaignSelect');
  const campaign  = window._donateCampaign || campaignSelect?.value || 'General';
  // Get ngoId + campaignId from selected option data attributes if available
  const selectedOption = campaignSelect?.options[campaignSelect.selectedIndex];
  const ngoId      = window._donateNgoId      || selectedOption?.dataset.ngoId     || null;
  const campaignId = window._donateCampaignId || selectedOption?.dataset.campaignId || null;
  // Clear stored values after use
  window._donateNgoId = null; window._donateCampaignId = null; window._donateCampaign = null;

  if (!amount || amount <= 0) {
    showToast('Error', 'Please enter a valid donation amount.');
    return;
  }

  btn.classList.add('processing');
  const original = btnText.textContent;
  btnText.textContent = 'Processing…';

  const donorToken = localStorage.getItem('donor_token');
  const donorName  = localStorage.getItem('donor_name')  || '';
  const donorEmail = localStorage.getItem('donor_email') || '';

  // Step 1 — create Razorpay order on backend
  fetch(API + '/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'INR', campaign, frequency, ngoId, campaignId })
  })
  .then(res => res.json())
  .then(data => {
    btn.classList.remove('processing');
    btnText.textContent = original;

    if (!data.success) {
      showToast('Error', data.error || 'Could not initiate payment.');
      return;
    }

    // Step 2 — open Razorpay checkout popup
    const options = {
      key:         data.key,
      amount:      data.order.amount,
      currency:    'INR',
      name:        'Terra Nova NGO',
      description: campaign ? `Donation — ${campaign}` : 'General Donation',
      image:       'https://img.icons8.com/emoji/96/seedling.png',
      order_id:    data.order.id,
      prefill:     { name: donorName, email: donorEmail },
      notes:       { campaign: campaign || 'General', frequency: frequency },
      theme:       { color: '#2d6a4f', backdrop_color: 'rgba(26,58,46,0.6)' },
      handler: function(response) {
        // Step 3 — verify payment on backend
        btn.classList.add('processing');
        btnText.textContent = 'Verifying…';

        fetch(API + '/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            amount, campaign, frequency, currency: 'INR',
            donorToken: donorToken || null,
            ngoId, campaignId,
          })
        })
        .then(r => r.json())
        .then(result => {
          btn.classList.remove('processing');
          btnText.textContent = original;
          if (result.success) {
            showToast('Thank you! 💚', `Your ${total} donation is changing lives.`);
          } else {
            showToast('Error', result.error || 'Verification failed.');
          }
        })
        .catch(() => {
          btn.classList.remove('processing');
          btnText.textContent = original;
          showToast('Error', 'Could not verify payment.');
        });
      },
      modal: {
        ondismiss: function() {
          btn.classList.remove('processing');
          btnText.textContent = original;
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  })
  .catch(() => {
    btn.classList.remove('processing');
    btnText.textContent = original;
    showToast('Error', 'Could not connect to server.');
  });
};

function openPaymentModal(amount, totalDisplay, frequency, campaign) {
  // Remove existing modal if any
  const existing = document.getElementById('paymentModal');
  if (existing) existing.remove();

  const donorName  = localStorage.getItem('donor_name')  || '';
  const donorEmail = localStorage.getItem('donor_email') || '';
  const donorToken = localStorage.getItem('donor_token') || null;

  const modal = document.createElement('div');
  modal.id = 'paymentModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(10,20,15,0.7);backdrop-filter:blur(4px);
    padding:20px;font-family:'DM Sans',sans-serif;
  `;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.3);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a3a2e,#2d6a4f);padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🌿</div>
          <div>
            <div style="color:#fff;font-weight:700;font-size:0.95rem;">Terra Nova NGO</div>
            <div style="color:rgba(245,240,232,0.6);font-size:0.75rem;">Secure Donation</div>
          </div>
        </div>
        <button onclick="document.getElementById('paymentModal').remove()" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <!-- Amount display -->
      <div style="background:#f7f3ec;padding:16px 28px;border-bottom:1px solid #ede6d8;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:0.78rem;color:#5a7365;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Donation Amount</div>
        <div style="font-size:1.4rem;font-weight:700;color:#1a3a2e;">${totalDisplay}</div>
      </div>

      <!-- Form -->
      <div style="padding:24px 28px;">
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.75rem;font-weight:600;color:#1a3a2e;margin-bottom:5px;">Full Name</label>
          <input id="pm_name" type="text" value="${donorName}" placeholder="Your name" style="width:100%;padding:10px 13px;border:1.5px solid #d9d0bc;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;font-family:inherit;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.75rem;font-weight:600;color:#1a3a2e;margin-bottom:5px;">Email Address</label>
          <input id="pm_email" type="email" value="${donorEmail}" placeholder="you@example.com" style="width:100%;padding:10px 13px;border:1.5px solid #d9d0bc;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;font-family:inherit;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.75rem;font-weight:600;color:#1a3a2e;margin-bottom:5px;">Card Number</label>
          <input id="pm_card" type="text" placeholder="4111 1111 1111 1111" maxlength="19" style="width:100%;padding:10px 13px;border:1.5px solid #d9d0bc;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;font-family:inherit;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:#1a3a2e;margin-bottom:5px;">Expiry</label>
            <input id="pm_expiry" type="text" placeholder="MM/YY" maxlength="5" style="width:100%;padding:10px 13px;border:1.5px solid #d9d0bc;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;font-family:inherit;" />
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;color:#1a3a2e;margin-bottom:5px;">CVV</label>
            <input id="pm_cvv" type="password" placeholder="•••" maxlength="3" style="width:100%;padding:10px 13px;border:1.5px solid #d9d0bc;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;font-family:inherit;" />
          </div>
        </div>

        <div id="pm_error" style="display:none;background:#fff1f2;border:1px solid #fda4af;border-radius:8px;padding:10px 14px;font-size:0.8rem;color:#9f1239;margin-bottom:14px;"></div>

        <button id="pm_payBtn" onclick="processPayment(${amount},'${totalDisplay}','${frequency}','${campaign}')" style="width:100%;padding:13px;background:#1a3a2e;color:#f5f0e8;font-size:0.92rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-family:inherit;transition:background 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;">
          <span id="pm_btnText">🔒 Pay ${totalDisplay} Securely</span>
        </button>

        <div style="text-align:center;margin-top:14px;font-size:0.72rem;color:#9ca3af;">
          🔒 256-bit SSL encrypted · Test mode — no real charge
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Format card number with spaces
  document.getElementById('pm_card').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim();
  });
  // Format expiry
  document.getElementById('pm_expiry').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1/$2');
  });
}

window.processPayment = async function(amount, totalDisplay, frequency, campaign) {
  const name   = document.getElementById('pm_name').value.trim();
  const email  = document.getElementById('pm_email').value.trim();
  const card   = document.getElementById('pm_card').value.replace(/\s/g,'');
  const expiry = document.getElementById('pm_expiry').value.trim();
  const cvv    = document.getElementById('pm_cvv').value.trim();
  const errEl  = document.getElementById('pm_error');

  // Validation
  errEl.style.display = 'none';
  if (!name)                        return showErr('Please enter your name.');
  if (!email || !email.includes('@')) return showErr('Please enter a valid email.');
  if (card.length < 16)             return showErr('Please enter a valid 16-digit card number.');
  if (!expiry.includes('/'))        return showErr('Please enter expiry as MM/YY.');
  if (cvv.length < 3)               return showErr('Please enter a valid CVV.');

  function showErr(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }

  const btn = document.getElementById('pm_payBtn');
  const btnText = document.getElementById('pm_btnText');
  btn.disabled = true;
  btnText.textContent = '⏳ Processing…';

  const donorToken = localStorage.getItem('donor_token');

  try {
    const url     = donorToken ? API + '/api/donor/donate' : API + '/api/donate';
    const headers = { 'Content-Type': 'application/json' };
    if (donorToken) headers['Authorization'] = 'Bearer ' + donorToken;

    const res  = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, frequency, campaign, currency: 'INR', email })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('paymentModal').remove();
      showToast('Thank you! 💚', `Your ${totalDisplay} donation is changing lives.`);
    } else {
      btn.disabled = false;
      btnText.textContent = `🔒 Pay ${totalDisplay} Securely`;
      showErr(data.error || 'Payment failed. Please try again.');
    }
  } catch {
    btn.disabled = false;
    btnText.textContent = `🔒 Pay ${totalDisplay} Securely`;
    showErr('Could not connect to server. Make sure the backend is running.');
  }
};


/* ═══════════════════════════════════════
   8. VOLUNTEER FORM
═══════════════════════════════════════ */
(function initVolForm() {
  const form      = document.getElementById('volForm');
  const successEl = document.getElementById('formSuccess');

  if (!form) return;

  const validators = {
    firstName: val => val.trim().length >= 2 ? '' : 'Please enter your first name (min 2 chars).',
    lastName:  val => val.trim().length >= 2 ? '' : 'Please enter your last name (min 2 chars).',
    email:     val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) ? '' : 'Please enter a valid email.',
    role:      val => val !== '' ? '' : 'Please select a role.',
    consent:   (val, el) => el.checked ? '' : 'Please accept the privacy policy.',
  };

  const getError = (name, el) => {
    const validator = validators[name];
    if (!validator) return '';
    return validator(el.value, el);
  };

  const setFieldState = (field, errorMsg) => {
    const errorEl = field.closest('.form-group, .form-check')?.querySelector('.form-error');
    if (errorMsg) {
      field.classList.add('error');
      if (errorEl) errorEl.textContent = errorMsg;
    } else {
      field.classList.remove('error');
      if (errorEl) errorEl.textContent = '';
    }
    return !errorMsg;
  };

  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => {
      const err = getError(field.name, field);
      if (field.name) setFieldState(field, err);
    });
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) {
        const err = getError(field.name, field);
        setFieldState(field, err);
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    Object.keys(validators).forEach(name => {
      const field = form.elements[name];
      if (!field) return;
      const err = getError(name, field);
      if (!setFieldState(field, err)) valid = false;
    });

    if (!valid) {
      const firstError = form.querySelector('.error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitBtn  = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting…</span>';

    const formData = {
      firstName:    form.elements['firstName'].value,
      lastName:     form.elements['lastName'].value,
      email:        form.elements['email'].value,
      phone:        form.elements['phone']?.value,
      skills:       form.elements['role']?.value,
      availability: form.elements['availability']?.value,
      message:      form.elements['message']?.value,
    };

    fetch(API + '/api/volunteer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        submitBtn.style.display = 'none';
        successEl.classList.add('visible');
        form.reset();
        showToast('Application Received!', 'We\'ll be in touch within 48 hours.');
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
        showToast('Error', data.error || 'Something went wrong.');
      }
    })
    .catch(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
      showToast('Error', 'Could not connect to server.');
    });
  });
})();


/* ═══════════════════════════════════════
   9. STORIES CAROUSEL
═══════════════════════════════════════ */
(function initCarousel() {
  const carousel = document.getElementById('storiesCarousel');
  const prevBtn  = document.getElementById('storyPrev');
  const nextBtn  = document.getElementById('storyNext');
  const dotsWrap = document.getElementById('carouselDots');

  if (!carousel) return;

  const cards = carousel.querySelectorAll('.story-card');
  let current = 0;
  let autoInterval;

  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Go to story ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  const getVisible = () => {
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 600) return 2;
    return 1;
  };

  const goTo = (index) => {
    const visible  = getVisible();
    const max      = Math.max(0, cards.length - visible);
    current        = Math.max(0, Math.min(index, max));
    const cardWidth= cards[0].offsetWidth;
    const gap      = 24;
    carousel.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    carousel.style.transform  = `translateX(-${current * (cardWidth + gap)}px)`;
    dotsWrap.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });
  };

  prevBtn?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  nextBtn?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { goTo(current - 1); resetAuto(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); resetAuto(); }
  });

  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goTo(current + 1) : goTo(current - 1);
      resetAuto();
    }
  });

  const startAuto = () => {
    autoInterval = setInterval(() => {
      const visible = getVisible();
      const max = Math.max(0, cards.length - visible);
      goTo(current >= max ? 0 : current + 1);
    }, 5000);
  };

  const resetAuto = () => { clearInterval(autoInterval); startAuto(); };

  startAuto();

  carousel.closest('.stories-carousel-wrap')?.addEventListener('mouseenter', () => clearInterval(autoInterval));
  carousel.closest('.stories-carousel-wrap')?.addEventListener('mouseleave', startAuto);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => goTo(0), 200);
  });
})();


/* ═══════════════════════════════════════
   10. NEWSLETTER FORM
═══════════════════════════════════════ */
(function initNewsletter() {
  const form   = document.getElementById('nlForm');
  const status = document.getElementById('nlStatus');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('nlEmail').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (status) { status.textContent = 'Please enter a valid email.'; status.style.color = '#e74c3c'; }
      return;
    }

    const btn = form.querySelector('button');
    btn.disabled = true;

    fetch(API + '/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (status) { status.textContent = '✓ Subscribed! Welcome to the movement.'; status.style.color = '#52b788'; }
        form.reset();
      } else {
        if (status) { status.textContent = data.error || 'Something went wrong.'; status.style.color = '#e74c3c'; }
      }
      btn.disabled = false;
      setTimeout(() => { if (status) status.textContent = ''; }, 5000);
    })
    .catch(() => {
      if (status) { status.textContent = 'Could not connect to server.'; status.style.color = '#e74c3c'; }
      btn.disabled = false;
    });
  });
})();


/* ═══════════════════════════════════════
   11. TOAST NOTIFICATION
═══════════════════════════════════════ */
let toastTimer;

window.showToast = function(title, message) {
  const toast   = document.getElementById('donateToast');
  const titleEl = document.getElementById('toastTitle');
  const msgEl   = document.getElementById('toastMsg');

  if (!toast) return;
  titleEl.textContent = title;
  msgEl.textContent   = message;

  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
};

window.closeToast = function() {
  const toast = document.getElementById('donateToast');
  toast?.classList.remove('visible');
  clearTimeout(toastTimer);
};


/* ═══════════════════════════════════════
   12. PARALLAX EFFECTS
═══════════════════════════════════════ */
(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hero       = document.querySelector('.hero');
  const orbs       = document.querySelectorAll('.hero-gradient-orb');
  const floatCards = document.querySelectorAll('.float-card');

  window.addEventListener('scroll', () => {
    if (!hero) return;
    const scrollY    = window.scrollY;
    const heroHeight = hero.offsetHeight;
    if (scrollY > heroHeight) return;

    orbs.forEach((orb, i) => {
      const speed = 0.15 + i * 0.08;
      orb.style.transform = `translateY(${scrollY * speed}px)`;
    });

    floatCards.forEach((card, i) => {
      const speed = 0.08 + i * 0.04;
      card.style.transform += `translateY(${-scrollY * speed}px)`;
    });
  }, { passive: true });

  hero?.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.width  / 2) / rect.width;
    const y = (e.clientY - rect.height / 2) / rect.height;
    orbs.forEach((orb, i) => {
      const strength = (i + 1) * 12;
      orb.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
  });

  hero?.addEventListener('mouseleave', () => {
    orbs.forEach(orb => {
      orb.style.transition = 'transform 1s ease';
      orb.style.transform  = '';
      setTimeout(() => { orb.style.transition = ''; }, 1000);
    });
  });
})();


/* ═══════════════════════════════════════
   13. SMOOTH SCROLL FOR ANCHOR LINKS
═══════════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ═══════════════════════════════════════
   14. CAMPAIGN CARD KEYBOARD SUPPORT
═══════════════════════════════════════ */
(function initCardKeyboard() {
  document.querySelectorAll('.campaign-card').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.querySelector('.btn-card')?.click();
      }
    });
  });
})();


/* ═══════════════════════════════════════
   15. SCROLL PROGRESS INDICATOR
═══════════════════════════════════════ */
(function initScrollProgress() {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    background: linear-gradient(90deg, #52b788, #d4a853);
    z-index: 9999;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(indicator);

  window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    indicator.style.width = `${scrolled}%`;
  }, { passive: true });
})();


/* ═══════════════════════════════════════
   16. CUSTOM CURSOR (DESKTOP ONLY)
═══════════════════════════════════════ */
(function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cursor    = document.createElement('div');
  const cursorDot = document.createElement('div');

  cursor.style.cssText = `
    position: fixed;
    width: 24px; height: 24px;
    border: 1.5px solid rgba(26,58,46,0.4);
    border-radius: 50%;
    pointer-events: none;
    z-index: 99999;
    transform: translate(-50%,-50%);
    transition: width 0.2s ease, height 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    mix-blend-mode: multiply;
  `;
  cursorDot.style.cssText = `
    position: fixed;
    width: 5px; height: 5px;
    background: #1a3a2e;
    border-radius: 50%;
    pointer-events: none;
    z-index: 99999;
    transform: translate(-50%,-50%);
    transition: transform 0.1s ease;
  `;

  document.body.appendChild(cursor);
  document.body.appendChild(cursorDot);

  let mouseX = 0, mouseY = 0;
  let curX   = 0, curY   = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });

  const animateCursor = () => {
    curX += (mouseX - curX) * 0.15;
    curY += (mouseY - curY) * 0.15;
    cursor.style.left = curX + 'px';
    cursor.style.top  = curY + 'px';
    requestAnimationFrame(animateCursor);
  };
  requestAnimationFrame(animateCursor);

  const interactives = 'a, button, .campaign-card, .filter-btn, .amount-btn';
  document.addEventListener('mouseover', (e) => {
    if (e.target.matches(interactives) || e.target.closest(interactives)) {
      cursor.style.width  = '40px'; cursor.style.height = '40px';
      cursor.style.borderColor = 'rgba(26,58,46,0.25)';
      cursor.style.background  = 'rgba(26,58,46,0.06)';
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.matches(interactives) || e.target.closest(interactives)) {
      cursor.style.width  = '24px'; cursor.style.height = '24px';
      cursor.style.borderColor = 'rgba(26,58,46,0.4)';
      cursor.style.background  = 'transparent';
    }
  });
})();


/* ═══════════════════════════════════════
   17. TILT EFFECT ON COUNTER CARDS
═══════════════════════════════════════ */
(function initTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.counter-card, .campaign-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `translateY(-6px) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s ease';
      setTimeout(() => { card.style.transition = ''; }, 400);
    });
  });
})();


/* ═══════════════════════════════════════
   18. HERO TITLE LETTER STAGGER
═══════════════════════════════════════ */
(function initHeroTypography() {
  const titleLines = document.querySelectorAll('.title-line');
  titleLines.forEach((line, i) => {
    line.style.setProperty('--delay', `${0.1 + i * 0.12}s`);
  });
})();


/* ═══════════════════════════════════════
   INIT LOG
═══════════════════════════════════════ */
console.log(
  '%c🌿 Terra Nova%c — Frontend loaded. Empowering change.',
  'color: #52b788; font-weight: bold; font-size: 14px;',
  'color: #5a7365; font-size: 12px;'
);
