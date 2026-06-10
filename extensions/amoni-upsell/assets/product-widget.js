(function () {
  var el = document.getElementById('amoni-product-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var productId = el.dataset.productId;
  var APP_URL = el.dataset.appUrl || 'https://amoni-upsell-cross-sell.vercel.app';
  var triggerImage = el.dataset.triggerImage || '';
  var triggerPrice = parseFloat(el.dataset.triggerPrice || '0');
  var triggerVariantId = el.dataset.triggerVariantId || '';

  // ── Built-in cart notification — works on every theme, no drawer dependency ──
  function showCartNotification(itemTitle, itemImage) {
    // Remove any existing notification
    var existing = document.getElementById('amoni-cart-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'amoni-cart-toast';
    toast.style.cssText = [
      'position:fixed',
      'top:20px',
      'right:20px',
      'z-index:999999',
      'background:#fff',
      'border-radius:14px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
      'padding:16px 20px',
      'display:flex',
      'align-items:center',
      'gap:14px',
      'max-width:340px',
      'width:calc(100vw - 40px)',
      'font-family:inherit',
      'animation:amoniSlideIn 0.3s ease',
    ].join(';');

    // Inject keyframe animation once
    if (!document.getElementById('amoni-toast-style')) {
      var style = document.createElement('style');
      style.id = 'amoni-toast-style';
      style.textContent = [
        '@keyframes amoniSlideIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes amoniSlideOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-16px)}}',
      ].join('');
      document.head.appendChild(style);
    }

    var imgHtml = itemImage
      ? '<img src="' + itemImage + '" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;" />'
      : '<div style="width:52px;height:52px;border-radius:8px;background:#f0f0f0;flex-shrink:0;"></div>';

    toast.innerHTML =
      imgHtml +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;color:#888;margin-bottom:2px;">Added to cart</div>' +
        '<div style="font-size:14px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (itemTitle || 'Item') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<a href="/cart" style="flex:1;text-align:center;padding:7px 0;background:#1a1a1a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">View cart</a>' +
          '<button id="amoni-toast-close" style="flex:1;padding:7px 0;background:#f3f3f3;color:#333;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Continue</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(toast);

    document.getElementById('amoni-toast-close').addEventListener('click', function () {
      dismissToast(toast);
    });

    // Auto-dismiss after 5 seconds
    setTimeout(function () { dismissToast(toast); }, 5000);
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = 'amoniSlideOut 0.3s ease forwards';
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
  }

  // ── Update cart badge + fire refresh events (no drawer open attempt) ──
  function refreshCartState() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll(
          'cart-count, [data-cart-count], .cart-count, #cart-count, .CartCount, .cart-item-count'
        ).forEach(function (b) { b.textContent = cart.item_count; });
      }).catch(function () {});

    // Let the theme know the cart changed — it will update its own state
    ['cart:refresh', 'cart:updated', 'cart:change'].forEach(function (name) {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
      window.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    });
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

              fetch(APP_URL + '/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'accept' }),
              });

              // Show built-in notification (always works on any theme)
              showCartNotification(funnel.offerTitle || 'Item', funnel.offerImageUrl || '');

              // Update badge + dispatch cart events (no drawer open — avoids double-toggle)
              refreshCartState();
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
