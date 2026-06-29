(function () {
  var el = document.getElementById('amoni-cart-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var cartItems = (el.dataset.cartItems || '').split(',').filter(Boolean);
  if (!cartItems.length) return;

  var APP_URL = el.dataset.appUrl || '';

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=cart&productIds=' + cartItems.join(','))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var funnels = data.funnels || [];
      if (!funnels.length) return;
      var funnel = funnels[0];

      var discountedPrice =
        funnel.discountType === 'percent'
          ? funnel.offerPrice * (1 - funnel.discountValue / 100)
          : funnel.discountType === 'fixed'
          ? funnel.offerPrice - funnel.discountValue
          : funnel.offerPrice;

      var content = document.getElementById('amoni-cart-offer-content');
      content.innerHTML =
        '<div style="display:flex; gap:10px; align-items:center;">' +
          '<img src="' + funnel.offerImageUrl + '" alt="' + funnel.offerName + '" ' +
               'style="width:48px;height:48px;border-radius:9px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />' +
          '<div style="flex:1; min-width:0;">' +
            '<div style="font-size:13px; font-weight:600; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
              funnel.offerName +
            '</div>' +
            '<div style="font-size:13px; font-weight:700; color:#1a1a1a;">' +
              '$' + discountedPrice.toFixed(2) +
              (funnel.discountValue > 0
                ? '<span style="font-size:11.5px;color:#aaa;text-decoration:line-through;margin-left:4px;">$' + (funnel.offerPrice || 0).toFixed(2) + '</span>'
                : '') +
            '</div>' +
          '</div>' +
          '<button onclick="amoniAddToCart(\'' + funnel.offerVariantId + '\', this, \'' + funnel.id + '\', \'' + shop + '\', \'' + APP_URL + '\')"' +
            ' style="padding:8px 12px; border-radius:8px; border:none; background:#c8745a; color:#fff; font-weight:700; font-size:12.5px; cursor:pointer; white-space:nowrap; font-family:inherit;">' +
            'Add' +
          '</button>' +
        '</div>';

      // Powered by Amoni branding
      var showPoweredBy = el.dataset.showPoweredBy !== 'false';
      if (showPoweredBy) {
        var brandingEl = document.createElement('div');
        brandingEl.style.cssText = 'text-align:center;margin-top:10px;font-size:11px;color:#bbb;letter-spacing:0.02em;';
        brandingEl.innerHTML = 'Powered by <a href="https://amoni.io" target="_blank" rel="noopener" style="color:#bbb;text-decoration:none;font-weight:600;">Amoni</a>';
        el.appendChild(brandingEl);
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

  window.amoniAddToCart = function (variantId, btn, funnelId, shop, appUrl) {
    btn.textContent = '✓';
    btn.style.background = '#0c8a4f';
    btn.disabled = true;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 }),
    })
      .then(function () {
        fetch(appUrl + '/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funnelId: funnelId, shop: shop, eventType: 'accept' }),
        });
      })
      .catch(function () {});
  };
})();
