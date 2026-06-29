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
    var cartDrawerEl = document.querySelector('cart-drawer');
    if (cartDrawerEl && typeof cartDrawerEl.open === 'function') {
      cartDrawerEl.open();
      return;
    }

    var cartBtn =
      document.querySelector('[href="/cart"][class*="icon"]') ||
      document.querySelector('[aria-label*="cart" i]:not([class*="close"]):not([class*="item"])') ||
      document.querySelector('[data-cart-toggle]') ||
      document.querySelector('button[class*="cart"]:not([class*="close"]):not([class*="remove"])') ||
      document.querySelector('a[href="/cart"][class*="cart"]');

    if (cartBtn) { cartBtn.click(); return; }

    ['cart:open', 'theme:cart:open', 'cartDrawer:open', 'open-cart'].forEach(function (n) {
      document.dispatchEvent(new CustomEvent(n, { bubbles: true }));
      window.dispatchEvent(new CustomEvent(n, { bubbles: true }));
    });

    var dialog =
      document.querySelector('dialog[id*="cart"]') ||
      document.querySelector('aside[id*="cart"]') ||
      document.querySelector('.dialog-drawer[class*="cart"]') ||
      document.querySelector('[class*="cart-drawer"]:not([class*="header"]):not([class*="heading"])');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else if (dialog) dialog.removeAttribute('hidden');
  }

  function refreshBadge() {
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      document.querySelectorAll('cart-count,[data-cart-count],.cart-count,#cart-count,.CartCount,.cart-item-count')
        .forEach(function (b) { b.textContent = cart.item_count; });
    }).catch(function () {});
  }

  function calcDiscountedPrice(funnel) {
    var offerPrice = parseFloat(funnel.offerPrice) || 0;
    if (funnel.discountType === 'percent') {
      return offerPrice * (1 - (parseFloat(funnel.discountValue) || 0) / 100);
    } else if (funnel.discountType === 'fixed') {
      return Math.max(0, offerPrice - (parseFloat(funnel.discountValue) || 0));
    }
    return offerPrice;
  }

  function addToCart(variantIds, discountCode, onSuccess, onError) {
    var items = variantIds.filter(Boolean).map(function (id) {
      return { id: parseInt(id, 10), quantity: 1 };
    });
    if (!items.length) return;

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
        refreshBadge();
        window._amoniProductUpdating = true;

        function removeEmptyClass() {
          document.querySelectorAll('[class*="cart-drawer--empty"], [class*="cart--empty"], [class*="is-empty"]')
            .forEach(function (e) { e.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty'); });
        }

        function lockEmptyClass() {
          var d = document.querySelector('cart-drawer');
          if (!d) return;
          d.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty');
          var obs = new MutationObserver(function () {
            d.classList.remove('cart-drawer--empty', 'cart--empty', 'is-empty');
          });
          obs.observe(d, { attributes: true, attributeFilter: ['class'] });
          setTimeout(function () { obs.disconnect(); }, 6000);
        }

        function finalizeAndOpen() {
          removeEmptyClass();
          lockEmptyClass();
          openCartDrawer();

          var names = ['accordion-custom', 'text-component', 'cart-discount-component'];
          Promise.race([
            Promise.all(names.map(function (n) { return customElements.whenDefined(n); })),
            new Promise(function (r) { setTimeout(r, 3000); })
          ]).then(function () {
            removeEmptyClass();
            document.querySelectorAll(
              'cart-drawer accordion-custom, cart-drawer text-component, ' +
              'cart-drawer cart-discount-component, cart-drawer cart-note'
            ).forEach(function (el) { el.replaceWith(el.cloneNode(true)); });
            removeEmptyClass();
            setTimeout(function () { window._amoniProductUpdating = false; }, 500);
          });
        }

        var sectionHtml = addData && addData.sections && addData.sections[cartSectionHandle];
        if (sectionHtml) {
          var sectionDomEl = cartSectionEl ||
            document.getElementById('shopify-section-' + cartSectionHandle);
          if (sectionDomEl) {
            sectionDomEl.outerHTML = sectionHtml;
          }
          finalizeAndOpen();
        } else {
          var cartComp = document.querySelector('cart-items-component');
          fetch(window.location.href)
            .then(function (r) { return r.text(); })
            .then(function (html) {
              try {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var ns = doc.querySelector('cart-items-component scroll-hint');
                var cs = document.querySelector('cart-items-component scroll-hint');
                if (ns && cs) { cs.innerHTML = ns.innerHTML; }
                else {
                  var nc = doc.querySelector('cart-items-component');
                  if (nc && cartComp) cartComp.replaceWith(nc);
                }
              } catch (e) {}
              finalizeAndOpen();
            })
            .catch(finalizeAndOpen);
        }

        if (onSuccess) onSuccess(addData);
      })
      .catch(function () {
        if (onError) onError();
      });
  }

  fetch(APP_URL + '/api/funnels?shop=' + encodeURIComponent(shop) + '&placement=product&productIds=' + productId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var funnels = data.funnels || [];
      if (!funnels.length) return;

      var firstFunnel = funnels[0];
      var type = firstFunnel.offerType || 'bundle';
      var displayStyle = firstFunnel.displayStyle || 'carousel';

      // ── Widget outer container ──
      var container = document.createElement('div');
      container.style.cssText = 'background:#fff;border:1px solid #e8e8e8;border-radius:14px;padding:20px;margin-top:20px;font-family:inherit;';

      // ── Heading ──
      var heading =
        firstFunnel.widgetTitle ||
        (type === 'cross-sell' ? 'You might also like' :
         type === 'upsell'     ? 'Upgrade your order'  :
                                 'Frequently bought together');

      var headingEl = document.createElement('div');
      headingEl.style.cssText = 'font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:6px;';
      headingEl.textContent = heading;
      container.appendChild(headingEl);

      // ── Discount subtext badge (from first funnel) ──
      if (firstFunnel.discountType === 'percent' && firstFunnel.discountValue > 0) {
        var badge = document.createElement('div');
        badge.style.cssText = 'display:inline-block;background:#fff3cd;color:#856404;font-size:12px;font-weight:600;border-radius:6px;padding:3px 10px;margin-bottom:12px;';
        badge.textContent = 'Grab products at ' + firstFunnel.discountValue + '% Off!';
        container.appendChild(badge);
      } else if (firstFunnel.discountType === 'fixed' && firstFunnel.discountValue > 0) {
        var badge = document.createElement('div');
        badge.style.cssText = 'display:inline-block;background:#fff3cd;color:#856404;font-size:12px;font-weight:600;border-radius:6px;padding:3px 10px;margin-bottom:12px;';
        badge.textContent = 'Save $' + firstFunnel.discountValue + ' on this offer!';
        container.appendChild(badge);
      }

      // ── BUNDLE layout ──
      if (type === 'bundle') {
        var bundleFunnel = firstFunnel;
        var offerPrice = parseFloat(bundleFunnel.offerPrice) || 0;
        var discountedOffer = calcDiscountedPrice(bundleFunnel);
        var bundleTotal = triggerPrice + discountedOffer;
        var offerChecked = true;

        var bundleWrap = document.createElement('div');

        // Trigger product row
        var triggerRow = document.createElement('div');
        triggerRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';
        triggerRow.innerHTML =
          (triggerImage ? '<img src="' + triggerImage + '" style="width:72px;height:72px;border-radius:10px;object-fit:cover;border:1px solid #e8e8e8;" />' : '<div style="width:72px;height:72px;border-radius:10px;background:#f0f0f0;border:1px solid #e8e8e8;"></div>') +
          '<div><div style="font-size:11px;color:#888;margin-bottom:2px;">This item</div>' +
          '<div style="font-size:14px;font-weight:600;color:#1a1a1a;">$' + triggerPrice.toFixed(2) + '</div></div>';
        bundleWrap.appendChild(triggerRow);

        // Plus separator
        var plusSep = document.createElement('div');
        plusSep.style.cssText = 'font-size:20px;color:#bbb;text-align:center;margin-bottom:10px;';
        plusSep.textContent = '+';
        bundleWrap.appendChild(plusSep);

        // Offer product row with checkbox
        var offerRow = document.createElement('div');
        offerRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.style.cssText = 'width:18px;height:18px;cursor:pointer;flex-shrink:0;';
        offerRow.appendChild(cb);
        var offerImgHtml = bundleFunnel.offerImageUrl
          ? '<img src="' + bundleFunnel.offerImageUrl + '" style="width:72px;height:72px;border-radius:10px;object-fit:cover;border:1px solid #e8e8e8;flex-shrink:0;" />'
          : '<div style="width:72px;height:72px;border-radius:10px;background:#f0f0f0;border:1px solid #e8e8e8;flex-shrink:0;"></div>';
        var offerInfo = document.createElement('div');
        offerInfo.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;';
        offerInfo.innerHTML = offerImgHtml +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:#1a1a1a;">' + (bundleFunnel.offerTitle || '') + '</div>' +
            '<div style="font-size:14px;font-weight:700;color:#1a1a1a;">$' + discountedOffer.toFixed(2) +
              (bundleFunnel.discountValue > 0 ? ' <span style="font-size:12px;color:#aaa;text-decoration:line-through;">$' + offerPrice.toFixed(2) + '</span>' : '') +
            '</div>' +
          '</div>';
        offerRow.appendChild(offerInfo);
        bundleWrap.appendChild(offerRow);

        // Total row
        var totalRow = document.createElement('div');
        totalRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-top:1px solid #e8e8e8;padding-top:12px;';
        var totalLabel = document.createElement('div');
        totalLabel.style.cssText = 'font-size:14px;color:#555;';
        totalLabel.textContent = 'Total:';
        var totalPrice = document.createElement('div');
        totalPrice.style.cssText = 'font-size:18px;font-weight:700;color:#1a1a1a;';
        totalPrice.textContent = '$' + bundleTotal.toFixed(2);
        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalPrice);
        bundleWrap.appendChild(totalRow);

        // Recalc total when checkbox toggled
        cb.addEventListener('change', function () {
          offerChecked = cb.checked;
          var newTotal = triggerPrice + (offerChecked ? discountedOffer : 0);
          totalPrice.textContent = '$' + newTotal.toFixed(2);
        });

        // Add bundle button
        var bundleBtn = document.createElement('button');
        bundleBtn.setAttribute('data-amoni-bundle', '1');
        bundleBtn.setAttribute('data-offer-variant', bundleFunnel.offerVariantId || '');
        bundleBtn.style.cssText = 'width:100%;padding:12px 0;border-radius:10px;border:none;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;cursor:not-allowed;font-family:inherit;opacity:0.5;';
        bundleBtn.disabled = true; // enabled by syncWidgetVisibility when trigger in cart
        bundleBtn.textContent = 'Add bundle to cart';
        bundleBtn.addEventListener('click', function () {
          var variantsToAdd = [];
          if (triggerVariantId) variantsToAdd.push(triggerVariantId);
          if (offerChecked && bundleFunnel.offerVariantId) variantsToAdd.push(bundleFunnel.offerVariantId);
          if (!variantsToAdd.length) return;

          bundleBtn.textContent = 'Adding...';
          bundleBtn.disabled = true;

          addToCart(variantsToAdd, bundleFunnel.discountCode, function () {
            bundleBtn._amoniAdded = true;
            bundleBtn.textContent = '✓ Added!';
            bundleBtn.style.background = '#0c8a4f';
            bundleBtn.style.opacity = '1';
            bundleBtn.style.cursor = 'default';
            setTimeout(function () { el.style.display = 'none'; }, 800);
            fetch(APP_URL + '/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ funnelId: bundleFunnel.id, shop: shop, eventType: 'accept' }),
            });
          }, function () {
            bundleBtn.textContent = 'Error — try again';
            bundleBtn.disabled = false;
          });
        });
        bundleWrap.appendChild(bundleBtn);
        container.appendChild(bundleWrap);

      } else {
        // ── CROSS-SELL / UPSELL: carousel or grid ──

        function buildProductCard(funnel) {
          var offerPrice = parseFloat(funnel.offerPrice) || 0;
          var discounted = calcDiscountedPrice(funnel);
          var hasDiscount = funnel.discountValue > 0;
          var discountPct = funnel.discountType === 'percent' ? Math.round(funnel.discountValue) : null;

          var card = document.createElement('div');
          card.style.cssText = 'border:1px solid #e8e8e8;border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;';
          if (displayStyle === 'carousel') {
            card.style.minWidth = '160px';
            card.style.maxWidth = '180px';
            card.style.flexShrink = '0';
          }

          var imgEl = document.createElement('div');
          if (funnel.offerImageUrl) {
            imgEl.innerHTML = '<img src="' + funnel.offerImageUrl + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;border:1px solid #f0f0f0;" />';
          } else {
            imgEl.innerHTML = '<div style="width:80px;height:80px;border-radius:8px;background:#f0f0f0;"></div>';
          }
          card.appendChild(imgEl);

          var titleEl = document.createElement('div');
          titleEl.style.cssText = 'font-size:12px;font-weight:600;color:#1a1a1a;text-align:center;line-height:1.3;max-width:140px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
          titleEl.textContent = funnel.offerTitle || '';
          card.appendChild(titleEl);

          var priceWrap = document.createElement('div');
          priceWrap.style.cssText = 'text-align:center;';
          if (hasDiscount && discounted < offerPrice) {
            priceWrap.innerHTML =
              '<span style="font-size:14px;font-weight:700;color:#1a1a1a;">$' + discounted.toFixed(2) + '</span> ' +
              '<span style="font-size:12px;color:#aaa;text-decoration:line-through;">$' + offerPrice.toFixed(2) + '</span>' +
              (discountPct ? ' <span style="font-size:11px;background:#ffe5e5;color:#c0392b;border-radius:4px;padding:1px 5px;font-weight:600;">-' + discountPct + '%</span>' : '');
          } else {
            priceWrap.innerHTML = '<span style="font-size:14px;font-weight:700;color:#1a1a1a;">$' + discounted.toFixed(2) + '</span>';
          }
          card.appendChild(priceWrap);

          var addBtn = document.createElement('button');
          addBtn.setAttribute('data-amoni-add', '1');
          addBtn.setAttribute('data-offer-variant', funnel.offerVariantId || '');
          addBtn.style.cssText = 'padding:7px 16px;border-radius:20px;border:none;background:#1a1a1a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;opacity:0.4;';
          addBtn.disabled = true; // disabled until syncWidgetVisibility confirms trigger in cart
          addBtn.textContent = 'Add';
          addBtn.addEventListener('click', function () {
            if (!funnel.offerVariantId) return;
            addBtn.textContent = 'Adding...';
            addBtn.disabled = true;

            addToCart([funnel.offerVariantId], funnel.discountCode, function () {
              addBtn._amoniAdded = true;
              addBtn.textContent = '✓ Added';
              addBtn.style.background = '#0c8a4f';
              addBtn.style.opacity = '1';
              addBtn.style.cursor = 'default';
              fetch(APP_URL + '/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funnelId: funnel.id, shop: shop, eventType: 'accept' }),
              });
            }, function () {
              addBtn.textContent = 'Error';
              addBtn.disabled = false;
            });
          });
          card.appendChild(addBtn);

          return card;
        }

        if (displayStyle === 'carousel') {
          // Carousel wrapper
          var carouselOuter = document.createElement('div');
          carouselOuter.style.cssText = 'position:relative;overflow:hidden;';

          var track = document.createElement('div');
          track.style.cssText = 'display:flex;gap:12px;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:4px;';

          funnels.forEach(function (f) {
            track.appendChild(buildProductCard(f));
          });
          carouselOuter.appendChild(track);

          // Nav arrows
          var btnStyle = 'position:absolute;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:1px solid #e8e8e8;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.12);z-index:1;padding:0;';
          var leftBtn = document.createElement('button');
          leftBtn.style.cssText = btnStyle + 'left:0;';
          leftBtn.innerHTML = '&#9664;';
          leftBtn.addEventListener('click', function () {
            track.scrollBy({ left: -180, behavior: 'smooth' });
          });

          var rightBtn = document.createElement('button');
          rightBtn.style.cssText = btnStyle + 'right:0;';
          rightBtn.innerHTML = '&#9654;';
          rightBtn.addEventListener('click', function () {
            track.scrollBy({ left: 180, behavior: 'smooth' });
          });

          if (funnels.length > 1) {
            carouselOuter.appendChild(leftBtn);
            carouselOuter.appendChild(rightBtn);
          }

          container.appendChild(carouselOuter);
        } else {
          // Grid layout
          var grid = document.createElement('div');
          grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;';
          funnels.forEach(function (f) {
            grid.appendChild(buildProductCard(f));
          });
          container.appendChild(grid);
        }
      }

      // Powered by Amoni branding
      var showPoweredBy = el.dataset.showPoweredBy !== 'false';
      if (showPoweredBy) {
        var brandingEl = document.createElement('div');
        brandingEl.style.cssText = 'text-align:center;margin-top:12px;padding-top:10px;border-top:1px solid #f0f0f0;';
        brandingEl.innerHTML = '<span style="font-size:10px;color:#ccc;letter-spacing:0.03em;vertical-align:middle;margin-right:5px;">Powered by</span><a href="https://amoni.io" target="_blank" rel="noopener" style="display:inline-block;vertical-align:middle;"><img src="' + APP_URL + '/amoni-logo.svg" alt="Amoni" style="height:16px;width:auto;opacity:0.5;vertical-align:middle;" /></a>';
        container.appendChild(brandingEl);
      }

      // Replace content of the host element
      el.innerHTML = '';
      el.appendChild(container);
      el.style.display = 'block';

      // ── Sync visibility & button state based on cart contents ──
      function syncWidgetVisibility() {
        fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
          var items = cart.items || [];
          var variantIds = items.map(function (i) { return String(i.variant_id); });
          var cartProductIds = items.map(function (i) { return String(i.product_id); });

          // Is the TRIGGER product in the cart?
          var triggerInCart = triggerVariantId
            ? variantIds.indexOf(String(triggerVariantId)) !== -1
            : cartProductIds.indexOf(String(productId)) !== -1;

          // Enable/disable all Add buttons based on trigger being in cart
          el.querySelectorAll('button[data-amoni-add]').forEach(function (btn) {
            var offerVariantId = btn.getAttribute('data-offer-variant');
            var offerInCart = offerVariantId && variantIds.indexOf(String(offerVariantId)) !== -1;

            // Reset "✓ Added" state if offer was removed from cart
            if (btn._amoniAdded && !offerInCart) {
              btn._amoniAdded = false;
              btn.textContent = 'Add';
              btn.style.background = '#1a1a1a';
            }

            if (btn._amoniAdded) return; // keep green state

            if (triggerInCart) {
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              btn.title = '';
            } else {
              btn.disabled = true;
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.title = 'Add the main product to cart first';
            }
          });

          // For bundle: also toggle bundle button
          var bundleBtn = el.querySelector('button[data-amoni-bundle]');
          if (bundleBtn) {
            var bundleOfferVariant = bundleBtn.getAttribute('data-offer-variant');
            var bundleOfferInCart = bundleOfferVariant && variantIds.indexOf(String(bundleOfferVariant)) !== -1;

            // Reset if removed from cart
            if (bundleBtn._amoniAdded && !bundleOfferInCart) {
              bundleBtn._amoniAdded = false;
              bundleBtn.textContent = 'Add bundle to cart';
              bundleBtn.style.background = '#1a1a1a';
            }

            if (!bundleBtn._amoniAdded) {
              if (triggerInCart) {
                bundleBtn.disabled = false;
                bundleBtn.style.opacity = '1';
                bundleBtn.style.cursor = 'pointer';
                bundleBtn.title = '';
              } else {
                bundleBtn.disabled = true;
                bundleBtn.style.opacity = '0.5';
                bundleBtn.style.cursor = 'not-allowed';
                bundleBtn.title = 'Add the main product to cart first';
              }
            }
          }

          // Hide widget entirely if the offer variant is already in cart (single-card only)
          if (funnels.length === 1 && variantIds.indexOf(String(firstFunnel.offerVariantId)) !== -1) {
            el.style.display = 'none';
          } else {
            el.style.display = 'block';
          }
        }).catch(function () {});
      }

      syncWidgetVisibility();

      // Re-show widget when offer is removed from cart
      (function () {
        var _origFetch = window.fetch;
        window.fetch = function (input, init) {
          var url = typeof input === 'string' ? input : (input && input.url) || '';
          var promise = _origFetch.apply(this, arguments);
          if (/\/cart\//.test(url) && !/\/cart\.js/.test(url) && !/api\//.test(url)) {
            promise.then(function () {
              if (!window._amoniProductUpdating) {
                setTimeout(syncWidgetVisibility, 400);
              }
            }).catch(function () {});
          }
          return promise;
        };
      })();

      setInterval(function () {
        if (!window._amoniProductUpdating) {
          syncWidgetVisibility();
        }
      }, 3000);

      // Send impression event
      fetch(APP_URL + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelId: firstFunnel.id, shop: shop, eventType: 'impression' }),
      });
    })
    .catch(function () {});
})();
