(function () {
  var el = document.getElementById('amoni-product-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var productId = el.dataset.productId;
  var APP_URL = el.dataset.appUrl || 'https://amoni-upsell-cross-sell.vercel.app';
  var triggerImage = el.dataset.triggerImage || '';
  var triggerPrice = parseFloat(el.dataset.triggerPrice || '0');
  var triggerVariantId = el.dataset.triggerVariantId || '';

  // ── Cart drawer helper — works across Dawn, Horizon, and most Shopify themes ──
  function openCartDrawer() {
    // Step 1: Update cart count badge
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll(
          'cart-count, [data-cart-count], .cart-count, #cart-count, .CartCount'
        ).forEach(function (el) { el.textContent = cart.item_count; });
      })
      .catch(function () {});

    // Step 2: Dispatch events themes listen to
    ['cart:refresh', 'cart:updated', 'cart:change'].forEach(function (name) {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    });

    // Step 3: Open the cart drawer
    // Delay slightly so the theme's own fetch gets fresh data
    setTimeout(function () {
      var drawer = document.querySelector('cart-drawer');
      if (drawer) {
        // Dawn / Horizon: open() re-fetches content internally
        if (typeof drawer.open === 'function') {
          drawer.open();
          return;
        }
        // Other themes: reveal the element
        drawer.removeAttribute('hidden');
        drawer.setAttribute('open', '');
        drawer.classList.add('active', 'is-open', 'open');
        return;
      }

      // Fallback: re-render via Sections API then open
      fetch('/?sections=cart-drawer,cart-icon-bubble')
        .then(function (r) { return r.json(); })
        .then(function (sections) {
          Object.keys(sections).forEach(function (key) {
            var wrapper = document.getElementById('shopify-section-' + key);
            if (!wrapper) return;
            var tmp = document.createElement('div');
            tmp.innerHTML = sections[key];
            var updated = tmp.firstElementChild;
            if (updated) wrapper.replaceWith(updated);
          });
          // Open after re-render
          var d = document.querySelector('cart-drawer');
          if (d && typeof d.open === 'function') d.open();
        })
        .catch(function () {
          // Last resort: click cart icon
          var cartBtn = document.querySelector(
            'cart-icon-bubble, [data-cart-drawer-toggle], [aria-label*="art"], .header__icon--cart'
          );
          if (cartBtn) cartBtn.click();
        });
    }, 300);
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
              // Apply discount code if present
              var next = discountCode
                ? fetch('/cart/update.js', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ discount: discountCode }),
                  })
                : Promise.resolve();
              return next;
            })
            .then(function () {
              btn.textContent = '✓ Added!';
              btn.style.background = '#0c8a4f';

              // Track acceptance
              fetch(APP_URL + '/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'accept' }),
              });

              // Open cart drawer immediately — no page reload needed
              openCartDrawer();
            })
            .catch(function () {
              btn.textContent = 'Error — try again';
              btn.disabled = false;
            });
        });
      }

      el.style.display = 'block';

      // Track impression
      fetch(APP_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'impression' }),
      });
    })
    .catch(function () {});
})();
