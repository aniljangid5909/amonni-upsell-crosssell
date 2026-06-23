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
    // Try: click the cart icon/button (most reliable — theme handles the rest)
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

          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items }),
          })
            .then(function (r) {
              if (!r.ok) throw new Error('cart error');
              return r.json();
            })
            .then(function () {
              if (discountCode) {
                return fetch('/cart/update.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ discount: discountCode }),
                });
              }
            })
            .then(function () {
              btn.textContent = '✓ Added!';
              btn.style.background = '#0c8a4f';

              fetch(APP_URL + '/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'accept' }),
              });

              refreshBadge();

              var cartComp = document.querySelector('cart-items-component');

              function openAfter() { openCartDrawer(); }

              // Strategy 1: Horizon/Dawn exposes getSectionsToRender + renderContents
              // on the element. Use them — this is the exact internal flow the theme
              // uses, so CSS and layout will be identical to a page refresh.
              if (cartComp &&
                  typeof cartComp.getSectionsToRender === 'function' &&
                  typeof cartComp.renderContents === 'function') {
                try {
                  var sections = cartComp.getSectionsToRender();
                  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
                  var param = sections.map(function (s) { return s.section; }).join(',');
                  fetch(root + 'cart?sections=' + encodeURIComponent(param))
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                      cartComp.renderContents(data);
                      openAfter();
                    })
                    .catch(openAfter);
                } catch (e) {
                  openAfter();
                }
              } else {
                // Strategy 2: Fetch current page, extract cart-items-component,
                // swap it in so Horizon re-initialises the element from scratch.
                fetch(window.location.href)
                  .then(function (r) { return r.text(); })
                  .then(function (html) {
                    try {
                      var doc = new DOMParser().parseFromString(html, 'text/html');
                      var newComp = doc.querySelector('cart-items-component');
                      if (newComp && cartComp) cartComp.replaceWith(newComp);
                    } catch (e) {}
                    openAfter();
                  })
                  .catch(openAfter);
              }
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
