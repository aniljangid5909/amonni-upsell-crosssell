(function () {
  var el = document.getElementById('amoni-cart-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var cartItems = (el.dataset.cartItems || '').split(',').filter(Boolean);
  if (!cartItems.length) return;

  var APP_URL = el.dataset.appUrl || 'https://amoni-upsell-cross-sell.vercel.app';

  // ── Built-in toast notification ──
  function showToast(title, imageUrl) {
    var existing = document.getElementById('amoni-cart-toast');
    if (existing) existing.remove();

    if (!document.getElementById('amoni-toast-style')) {
      var style = document.createElement('style');
      style.id = 'amoni-toast-style';
      style.textContent =
        '@keyframes amoniSlideIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}' +
        '@keyframes amoniSlideOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-16px)}}';
      document.head.appendChild(style);
    }

    var toast = document.createElement('div');
    toast.id = 'amoni-cart-toast';
    toast.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'z-index:999999',
      'background:#fff', 'border-radius:14px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
      'padding:16px 20px', 'display:flex', 'align-items:center',
      'gap:14px', 'max-width:340px', 'width:calc(100vw - 40px)',
      'font-family:inherit', 'animation:amoniSlideIn 0.3s ease',
    ].join(';');

    var imgHtml = imageUrl
      ? '<img src="' + imageUrl + '" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex-shrink:0;" />'
      : '<div style="width:52px;height:52px;border-radius:8px;background:#f0f0f0;flex-shrink:0;"></div>';

    toast.innerHTML =
      imgHtml +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;color:#888;margin-bottom:2px;">Added to cart</div>' +
        '<div style="font-size:14px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (title || 'Item') + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<a href="/cart" style="flex:1;text-align:center;padding:7px 0;background:#1a1a1a;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">View cart</a>' +
          '<button id="amoni-toast-close" style="flex:1;padding:7px 0;background:#f3f3f3;color:#333;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Continue</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(toast);
    document.getElementById('amoni-toast-close').addEventListener('click', function () { dismissToast(toast); });
    setTimeout(function () { dismissToast(toast); }, 5000);
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = 'amoniSlideOut 0.3s ease forwards';
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
  }

  function refreshCartBadge() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        document.querySelectorAll(
          'cart-count, [data-cart-count], .cart-count, #cart-count, .CartCount, .cart-item-count'
        ).forEach(function (b) { b.textContent = cart.item_count; });
      }).catch(function () {});

    ['cart:refresh', 'cart:updated', 'cart:change'].forEach(function (name) {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
      window.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    });
  }

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=cart&productIds=' + cartItems.join(','))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var funnels = data.funnels || [];
      if (!funnels.length) return;
      var funnel = funnels[0];

      var offerPrice = parseFloat(funnel.offerPrice) || 0;
      var discountedPrice =
        funnel.discountType === 'percent'
          ? offerPrice * (1 - (parseFloat(funnel.discountValue) || 0) / 100)
          : funnel.discountType === 'fixed'
          ? offerPrice - (parseFloat(funnel.discountValue) || 0)
          : offerPrice;

      var heading =
        funnel.offerType === 'cross-sell' ? 'You might also like' :
        funnel.offerType === 'upsell'     ? 'Upgrade your order'  :
                                            'Frequently bought together';

      var subtext =
        funnel.discountType === 'percent' && funnel.discountValue > 0
          ? 'Save ' + funnel.discountValue + '% on this offer'
          : funnel.discountType === 'fixed' && funnel.discountValue > 0
          ? 'Save $' + funnel.discountValue + ' on this offer'
          : '';

      var headingEl = el.querySelector('div:first-child');
      if (headingEl) headingEl.textContent = heading;

      var brandingHtml = '<div style="text-align:center;margin-top:12px;padding-top:8px;border-top:1px solid rgba(200,116,90,0.15);">' +
        '<span style="font-size:10px;color:#ccc;letter-spacing:0.03em;vertical-align:middle;margin-right:4px;">Powered by</span>' +
        '<a href="https://amoni.io" target="_blank" rel="noopener" style="display:inline-block;vertical-align:middle;">' +
          '<img src="' + APP_URL + '/Amoni.png" alt="Amoni" style="height:14px;width:auto;opacity:0.5;vertical-align:middle;" />' +
        '</a></div>';

      var content = document.getElementById('amoni-cart-offer-content');
      content.innerHTML =
        (subtext ? '<div style="font-size:12px;color:#b05e42;margin-bottom:10px;">' + subtext + '</div>' : '') +
        '<div style="display:flex;gap:10px;align-items:center;">' +
          (funnel.offerImageUrl
            ? '<img src="' + funnel.offerImageUrl + '" style="width:56px;height:56px;border-radius:9px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);flex-shrink:0;" />'
            : '<div style="width:56px;height:56px;border-radius:9px;background:#f0f0f0;flex-shrink:0;"></div>') +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;">' + (funnel.offerTitle || '') + '</div>' +
            '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">' +
              '$' + discountedPrice.toFixed(2) +
              (funnel.discountValue > 0
                ? '<span style="font-size:12px;color:#aaa;text-decoration:line-through;margin-left:5px;">$' + offerPrice.toFixed(2) + '</span>'
                : '') +
            '</div>' +
          '</div>' +
          '<button id="amoni-cart-add-btn" style="padding:9px 14px;border-radius:8px;border:none;background:#c8745a;color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;font-family:inherit;">Add</button>' +
        '</div>' +
        brandingHtml;

      var btn = document.getElementById('amoni-cart-add-btn');
      if (btn) {
        btn.addEventListener('click', function () {
          if (!funnel.offerVariantId) return;
          btn.textContent = 'Adding...';
          btn.disabled = true;

          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(funnel.offerVariantId, 10), quantity: 1 }),
          })
            .then(function (r) {
              if (!r.ok) throw new Error('cart error');
              if (funnel.discountCode) {
                return fetch('/cart/update.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ discount: funnel.discountCode }),
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

              showToast(funnel.offerTitle || 'Item', funnel.offerImageUrl || '');
              refreshCartBadge();
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
