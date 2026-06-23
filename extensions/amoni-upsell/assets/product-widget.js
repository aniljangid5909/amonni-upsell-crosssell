(function () {
  var el = document.getElementById('amoni-product-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var productId = el.dataset.productId;
  var APP_URL = el.dataset.appUrl || 'https://amoni-upsell-cross-sell.vercel.app';
  var triggerImage = el.dataset.triggerImage || '';
  var triggerPrice = parseFloat(el.dataset.triggerPrice || '0');
  var triggerVariantId = el.dataset.triggerVariantId || '';

  // ── Open the cart drawer using the theme's own mechanism ──
  function openCartDrawer() {
    // Priority: call cart-drawer.open() directly — Horizon's open() just shows the
    // drawer without re-fetching/re-rendering, so our pre-set innerHTML stays intact.
    var cartDrawerEl = document.querySelector('cart-drawer');
    if (cartDrawerEl && typeof cartDrawerEl.open === 'function') {
      cartDrawerEl.open();
      return;
    }

    // Fallback: click the cart icon/button
    var cartBtn =
      document.querySelector('[href="/cart"][class*="icon"]') ||
      document.querySelector('[aria-label*="cart" i]:not([class*="close"]):not([class*="item"])') ||
      document.querySelector('[data-cart-toggle]') ||
      document.querySelector('button[class*="cart"]:not([class*="close"]):not([class*="remove"])') ||
      document.querySelector('a[href="/cart"][class*="cart"]');

    if (cartBtn) { cartBtn.click(); return; }

    // Try: dispatch events that themes listen to for opening the drawer
    ['cart:open', 'theme:cart:open', 'cartDrawer:open', 'open-cart'].forEach(function (n) {
      document.dispatchEvent(new CustomEvent(n, { bubbles: true }));
      window.dispatchEvent(new CustomEvent(n, { bubbles: true }));
    });

    // Try: open a dialog/aside if it exists
    var dialog =
      document.querySelector('dialog[id*="cart"]') ||
      document.querySelector('aside[id*="cart"]') ||
      document.querySelector('.dialog-drawer[class*="cart"]') ||
      document.querySelector('[class*="cart-drawer"]:not([class*="header"]):not([class*="heading"])');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else if (dialog) dialog.removeAttribute('hidden');
  }

  // ── Update cart badge count only (no DOM manipulation that could break product page) ──
  function refreshBadge() {
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      document.querySelectorAll('cart-count,[data-cart-count],.cart-count,#cart-count,.CartCount,.cart-item-count')
        .forEach(function (b) { b.textContent = cart.item_count; });
    }).catch(function () {});
  }

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=product&productIds=' + productId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var funnels = data.funnels || [];
      if (!funnels.length) return;
      var funnel = funnels[0];
      var type = funnel.offerType || 'bundle';

      var offerPrice = parseFloat(funnel.offerPrice) || 0;
      var discountedPrice =
        funnel.discountType === 'percent'
          ? offerPrice * (1 - (parseFloat(funnel.discountValue) || 0) / 100)
          : funnel.discountType === 'fixed'
          ? offerPrice - (parseFloat(funnel.discountValue) || 0)
          : offerPrice;

      var isCombined = type === 'bundle';
      var displayPrice = isCombined
        ? (triggerPrice + discountedPrice).toFixed(2)
        : discountedPrice.toFixed(2);

      var heading =
        type === 'cross-sell' ? 'You might also like' :
        type === 'upsell'     ? 'Upgrade your order'  :
                                'Frequently bought together';

      var subtext =
        funnel.discountType === 'percent' && funnel.discountValue > 0
          ? 'Save ' + funnel.discountValue + '% on this offer'
          : funnel.discountType === 'fixed' && funnel.discountValue > 0
          ? 'Save $' + funnel.discountValue + ' on this offer'
          : '';

      var priceLabel = isCombined ? 'Bundle total' : 'Offer price';
      var btnText =
        type === 'cross-sell' ? 'Add to cart' :
        type === 'upsell'     ? 'Upgrade now'  :
                                'Add both to cart';

      var variantsToAdd = [funnel.offerVariantId];
      if (isCombined && triggerVariantId) variantsToAdd.push(triggerVariantId);
      var discountCode = funnel.discountCode || '';

      var headingEl = document.getElementById('amoni-product-offer-heading');
      if (headingEl) headingEl.textContent = heading;

      var showTrigger = isCombined && triggerImage;
      var content = document.getElementById('amoni-product-offer-content');
      content.innerHTML =
        (subtext ? '<div style="font-size:12.5px;color:#888;margin-bottom:16px;">' + subtext + '</div>' : '') +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:18px;">' +
          (showTrigger ? '<img src="' + triggerImage + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />' : '') +
          (showTrigger ? '<span style="color:#bbb;font-size:18px;">+</span>' : '') +
          (funnel.offerImageUrl
            ? '<img src="' + funnel.offerImageUrl + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />'
            : '<div style="width:72px;height:72px;border-radius:12px;background:#f0f0f0;border:1px solid rgba(0,0,0,0.08);"></div>') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
          '<div>' +
            '<div style="font-size:11.5px;color:#888;">' + priceLabel + '</div>' +
            '<div style="font-size:22px;font-weight:700;color:#1a1a1a;">$' + displayPrice + '</div>' +
          '</div>' +
          '<button id="amoni-add-btn" style="padding:12px 22px;border-radius:10px;border:none;background:#c8745a;color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;">' +
            btnText +
          '</button>' +
        '</div>';

      var btn = document.getElementById('amoni-add-btn');
      if (btn) {
        btn.addEventListener('click', function () {
          var items = variantsToAdd.filter(Boolean).map(function (id) {
            return { id: parseInt(id, 10), quantity: 1 };
          });
          if (!items.length) return;

          btn.textContent = 'Adding...';
          btn.disabled = true;

          // Find the Shopify section handle for the cart drawer
          var cartSectionEl = null;
          document.querySelectorAll('[id^="shopify-section"]').forEach(function (s) {
            if (!cartSectionEl && (s.querySelector('cart-drawer') || s.querySelector('[class*="cart-drawer__inner"]'))) {
              cartSectionEl = s;
            }
          });
          var cartSectionHandle = cartSectionEl
            ? cartSectionEl.id.replace('shopify-section-', '')
            : 'cart-drawer';

          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items, sections: cartSectionHandle }),
          })
            .then(function (r) {
              if (!r.ok) throw new Error('cart error');
              return r.json();
            })
            .then(function (addData) {
              if (discountCode) {
                return fetch('/cart/update.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ discount: discountCode }),
                }).then(function () { return addData; });
              }
              return addData;
            })
            .then(function (addData) {
              btn.textContent = '✓ Added!';
              btn.style.background = '#0c8a4f';

              fetch(APP_URL + '/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'accept' }),
              });

              refreshBadge();
              window._amoniProductUpdating = true;

              function removeEmptyClass() {
                document.querySelectorAll('[class*="cart-drawer--empty"], [class*="cart--empty"], [class*="is-empty"]')
                  .forEach(function (el) {
                    el.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty');
                  });
              }

              function openAfter() {
                removeEmptyClass();
                openCartDrawer();
                setTimeout(removeEmptyClass, 150);
                setTimeout(removeEmptyClass, 600);
                // Re-clone custom elements AFTER the drawer is painted/visible so
                // their connectedCallback can measure layout and apply correct classes
                // (accordion header alignment, discount pill, two-column totals, etc.)
                setTimeout(function () {
                  removeEmptyClass();
                  document.querySelectorAll(
                    'cart-drawer accordion-custom, cart-drawer text-component, ' +
                    'cart-drawer cart-discount-component, cart-drawer cart-note'
                  ).forEach(function (el) {
                    var clone = el.cloneNode(true);
                    el.replaceWith(clone);
                  });
                }, 200);
                setTimeout(function () { window._amoniProductUpdating = false; }, 2000);
              }

              // Lock out cart-drawer--empty class and watch for it being re-added
              function lockEmptyClass(drawerEl) {
                drawerEl.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty');
                var obs = new MutationObserver(function () {
                  drawerEl.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty');
                });
                obs.observe(drawerEl, { attributes: true, attributeFilter: ['class'] });
                setTimeout(function () { obs.disconnect(); }, 5000);
              }

              var sectionHtml = addData && addData.sections && addData.sections[cartSectionHandle];
              console.log('[AMONI] sectionHandle=' + cartSectionHandle + ' sectionHtml=' + (sectionHtml ? sectionHtml.length + ' chars' : 'null'));
              if (sectionHtml) {
                // ── Best path: Shopify returned fresh cart-section HTML in the add response ──
                // Replace only the inner content of cart-drawer (not the element itself,
                // so the custom element's own connectedCallback doesn't re-fire and
                // override what we set). All child custom elements are new nodes and will
                // run their connectedCallback fresh with no init-guard issues.
                try {
                  var tmp = document.createElement('div');
                  tmp.innerHTML = sectionHtml;
                  var newDrawer = tmp.querySelector('cart-drawer');
                  var curDrawer = document.querySelector('cart-drawer');
                  if (newDrawer && curDrawer) {
                    curDrawer.innerHTML = newDrawer.innerHTML;
                    lockEmptyClass(curDrawer);
                    openAfter();
                    return;
                  }
                } catch (e) {}
              }

              // ── Fallback: fetch the full page and extract cart items ──
              var cartComp = document.querySelector('cart-items-component');
              fetch(window.location.href)
                .then(function (r) { return r.text(); })
                .then(function (html) {
                  try {
                    var doc = new DOMParser().parseFromString(html, 'text/html');
                    var newScroll = doc.querySelector('cart-items-component scroll-hint');
                    var curScroll = document.querySelector('cart-items-component scroll-hint');
                    if (newScroll && curScroll) {
                      curScroll.innerHTML = newScroll.innerHTML;
                    } else {
                      var newComp = doc.querySelector('cart-items-component');
                      if (newComp && cartComp) cartComp.replaceWith(newComp);
                    }
                  } catch (e) {}
                  var drawerEl = document.querySelector('cart-drawer') ||
                    document.querySelector('[id*="cart-drawer"]');
                  if (drawerEl) lockEmptyClass(drawerEl);
                  openAfter();
                })
                .catch(openAfter);
            })
            .catch(function () {
              btn.textContent = 'Error — try again';
              btn.disabled = false;
            });
        });
      }

      el.style.display = 'block';

      fetch(APP_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'impression' }),
      });
    })
    .catch(function () {});
})();
