(function () {
  var el = document.getElementById('amoni-product-offer');
  if (!el) return;

  var shop = el.dataset.shop;
  var productId = el.dataset.productId;
  var APP_URL = el.dataset.appUrl || 'https://amoni-upsell-cross-sell.vercel.app';
  var triggerImage = el.dataset.triggerImage || '';
  var triggerPrice = parseFloat(el.dataset.triggerPrice || '0');
  var triggerVariantId = el.dataset.triggerVariantId || '';

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=product&productIds=' + productId)
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

      var bundleTotal = (triggerPrice + discountedPrice).toFixed(2);

      var discountNote = funnel.discountType === 'percent' && funnel.discountValue > 0
        ? '<div style="font-size:12.5px;color:#888;margin-bottom:16px;">Save ' + funnel.discountValue + '% when added as a bundle</div>'
        : funnel.discountType === 'fixed' && funnel.discountValue > 0
        ? '<div style="font-size:12.5px;color:#888;margin-bottom:16px;">Save $' + funnel.discountValue + ' when added as a bundle</div>'
        : '';

      var headingEl = document.getElementById('amoni-product-offer-heading');
      if (headingEl) {
        headingEl.textContent =
          funnel.offerType === 'cross-sell' ? 'You might also like' :
          funnel.offerType === 'upsell'     ? 'Upgrade your order' :
                                              'Frequently bought together';
      }

      var content = document.getElementById('amoni-product-offer-content');
      content.innerHTML =
        discountNote +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:18px;">' +
          (triggerImage
            ? '<img src="' + triggerImage + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />'
            : '') +
          '<span style="color:#bbb;font-size:18px;">+</span>' +
          (funnel.offerImageUrl
            ? '<img src="' + funnel.offerImageUrl + '" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(0,0,0,0.08);" />'
            : '<div style="width:72px;height:72px;border-radius:12px;background:#f0f0f0;border:1px solid rgba(0,0,0,0.08);"></div>') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
          '<div>' +
            '<div style="font-size:11.5px;color:#888;">Bundle total</div>' +
            '<div style="font-size:22px;font-weight:700;color:#1a1a1a;">$' + bundleTotal + '</div>' +
          '</div>' +
          '<button onclick="amoniAddBundle(\'' + funnel.offerVariantId + '\', \'' + triggerVariantId + '\', this, \'' + funnel.id + '\', \'' + shop + '\', \'' + APP_URL + '\')"' +
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

  window.amoniAddBundle = function (offerVariantId, triggerVariantId, btn, funnelId, shop, appUrl) {
    btn.textContent = 'Adding...';
    btn.disabled = true;

    var items = [{ id: offerVariantId, quantity: 1 }];
    if (triggerVariantId) items.push({ id: triggerVariantId, quantity: 1 });

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items }),
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
      .catch(function () { btn.textContent = 'Error — try again'; btn.disabled = false; });
  };
})();
