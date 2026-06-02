(function () {
  var el = document.getElementById('amoni-product-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var productId = el.dataset.productId;
  var APP_URL = el.dataset.appUrl || '';

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=product&productIds=' + productId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var funnels = data.funnels || [];
      if (!funnels.length) return;
      var funnel = funnels[0];

      var discountedPrice =
        funnel.discountType === 'percent'
          ? funnel.offerPrice * (1 - funnel.discountValue / 100)
          : funnel.offerPrice;

      var content = document.getElementById('amoni-product-offer-content');
      content.innerHTML =
        '<div style="font-size:12.5px;color:#888;margin-bottom:16px;">Save ' + funnel.discountValue + '% when added as a bundle</div>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:18px;">' +
          (funnel.triggerImageUrl
            ? '<img src="' + funnel.triggerImageUrl + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />'
            : '') +
          '<span style="color:#bbb;font-size:18px;">+</span>' +
          '<div style="position:relative;">' +
            '<img src="' + funnel.offerImageUrl + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
          '<div>' +
            '<div style="font-size:11.5px;color:#888;">Bundle total</div>' +
            '<div style="font-size:22px;font-weight:700;color:#1a1a1a;">$' + ((funnel.triggerPrice || 0) + discountedPrice).toFixed(2) + '</div>' +
          '</div>' +
          '<button onclick="amoniAddBundle(\'' + funnel.offerVariantId + '\', this, \'' + funnel.id + '\', \'' + shop + '\', \'' + APP_URL + '\')"' +
            ' style="padding:12px 22px;border-radius:10px;border:none;background:#c8745a;color:#fff;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;">' +
            'Add both to cart' +
          '</button>' +
        '</div>';

      el.style.display = 'block';

      fetch(APP_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'impression' }),
      });
    })
    .catch(function () {});

  window.amoniAddBundle = function (variantId, btn, funnelId, shop, appUrl) {
    btn.textContent = 'Adding...';
    btn.disabled = true;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
    })
      .then(function () {
        btn.textContent = '✓ Added!';
        btn.style.background = '#0c8a4f';
        fetch(appUrl + '/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funnelId: funnelId, shop: shop, eventType: 'accept' }),
        });
      })
      .catch(function () {});
  };
})();
