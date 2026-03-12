/**
 * Schuttingwerk Configurator
 *
 * Frontend logic for the fence configurator.
 * Config is injected via wp_localize_script as `swkData`.
 */
(function () {
    'use strict';

    /* ──────────────────────────────────────────
       CONFIG (from WordPress via wp_localize_script)
       ────────────────────────────────────────── */
    var CFG       = window.swkData || {};
    var MATERIALS = CFG.materials  || {};
    var PAAL_EX   = CFG.paalExtra  || {};
    var EXTRAS    = CFG.extras     || {};
    var PHOTOS    = CFG.photos     || {};
    var POORTEN   = CFG.poorten    || {};
    var REST_URL  = CFG.restUrl    || '';
    var NONCE     = CFG.nonce      || '';

    /* Situation helpers */
    var SIT_SIDES  = { '1': 1, '2': 2, '3': 3, 't': 3, '4': 4, '5': 5 };
    var SIT_LABELS = {
        '1': ['A'],
        '2': ['A', 'B'],
        '3': ['A', 'B', 'C'],
        't': ['A', 'B', 'C'],
        '4': ['A', 'B', 'C', 'D'],
        '5': ['A', 'B', 'C', 'D', 'E']
    };

    /* ──────────────────────────────────────────
       STATE
       ────────────────────────────────────────── */
    var S = {
        type:     Object.keys(MATERIALS)[0] || 'grenen',
        orient:   'verticaal',
        planken:  21,
        situatie: '1',
        sides:    [0],
        paal:     'grijs',
        extras:   {}
    };

    // Initialize extras state
    Object.keys(EXTRAS).forEach(function (k) {
        S.extras[k] = false;
    });

    /* ──────────────────────────────────────────
       HELPERS
       ────────────────────────────────────────── */
    function fmt(n) {
        return '\u20AC' + n.toFixed(2).replace('.', ',');
    }

    function getTotalLen() {
        return S.sides.reduce(function (a, b) { return a + b; }, 0);
    }

    function calcTotal() {
        var len = getTotalLen();
        var mat = MATERIALS[S.type];
        var t   = (mat ? mat.price : 0) * len;

        t += (PAAL_EX[S.paal] || 0) * len;

        Object.keys(S.extras).forEach(function (k) {
            if (!S.extras[k]) return;
            // Poort is stored as object { index, label, price }
            if (k === 'poort' && typeof S.extras.poort === 'object') {
                t += S.extras.poort.price;
                return;
            }
            var ex = EXTRAS[k];
            if (!ex) return;
            if (ex.unit === 'per_meter') {
                t += ex.price * len;
            } else {
                t += ex.price;
            }
        });

        return t;
    }

    function $(sel) {
        return document.querySelector(sel);
    }

    function $$(sel) {
        return document.querySelectorAll(sel);
    }

    function showToast(msg, isError) {
        var el = $('#swk-toast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'swk-toast' + (isError ? ' swk-toast-error' : '');
        // Force reflow
        void el.offsetWidth;
        el.classList.add('swk-toast-show');
        setTimeout(function () {
            el.classList.remove('swk-toast-show');
        }, 3500);
    }

    /* ──────────────────────────────────────────
       PRICE UPDATE
       ────────────────────────────────────────── */
    function updatePrice() {
        var len = getTotalLen();
        var mat = MATERIALS[S.type];
        if (!mat) return;

        // Material type label + base price
        var baseEl = $('#swk-pl-type');
        if (baseEl) baseEl.textContent = mat.label;
        var pvBase = $('#swk-pv-base');
        if (pvBase) pvBase.textContent = fmt(mat.price * len);

        // Onderplaat
        var onderplaat = S.extras.onderplaat && EXTRAS.onderplaat;
        var plOnder = $('#swk-pl-onderplaat');
        if (plOnder) plOnder.style.display = onderplaat ? 'flex' : 'none';
        if (onderplaat) {
            var pvOnder = $('#swk-pv-onderplaat');
            if (pvOnder) pvOnder.textContent = fmt(EXTRAS.onderplaat.price * len);
        }

        // Paal upgrade
        var paalCost = (PAAL_EX[S.paal] || 0) * len;
        var plPaal = $('#swk-pl-paal');
        if (plPaal) plPaal.style.display = paalCost > 0 ? 'flex' : 'none';
        if (paalCost > 0) {
            var plPaalLabel = $('#swk-pl-paal-label');
            if (plPaalLabel) plPaalLabel.textContent = 'Betonpalen ' + S.paal;
            var pvPaal = $('#swk-pv-paal');
            if (pvPaal) pvPaal.textContent = fmt(paalCost);
        }

        // Poort
        var poortSelected = S.extras.poort && typeof S.extras.poort === 'object';
        var plPoort = $('#swk-pl-poort');
        if (plPoort) plPoort.style.display = poortSelected ? 'flex' : 'none';
        if (poortSelected) {
            var pvPoort = $('#swk-pv-poort');
            if (pvPoort) pvPoort.textContent = fmt(S.extras.poort.price);
            var plPoortLabel = $('#swk-pl-poort-label');
            if (plPoortLabel) plPoortLabel.textContent = S.extras.poort.label;
        }

        // Montage
        var plMontage = $('#swk-pl-montage');
        if (plMontage) plMontage.style.display = S.extras.montage ? 'flex' : 'none';

        // Total
        var tot = calcTotal();
        var pvTotal = $('#swk-pv-total');
        if (pvTotal) pvTotal.textContent = fmt(tot);

        // Per meter
        var pvPm = $('#swk-pv-pm');
        if (pvPm) pvPm.textContent = len > 0 ? fmt(tot / len) + ' /m' : '\u20AC0,00 /m';

        // Meta stats
        var seg = Math.max(0, Math.round(len / 1.80));
        var palen = seg > 0 ? seg + 1 : 0;
        var metaSeg = $('#swk-meta-seg');
        if (metaSeg) metaSeg.textContent = seg;
        var metaPalen = $('#swk-meta-palen');
        if (metaPalen) metaPalen.textContent = palen;
        var metaLen = $('#swk-meta-len');
        if (metaLen) metaLen.textContent = len.toFixed(1).replace('.', ',') + ' m';
    }

    /* ──────────────────────────────────────────
       PHOTO UPDATE
       ────────────────────────────────────────── */
    var lastPhotoKey = '';

    function updatePhoto() {
        var mat = MATERIALS[S.type];
        if (!mat) return;
        var pk       = mat.photo_key || S.type;
        var hasPlate = S.extras.onderplaat;
        var key      = pk + '_' + S.orient + '_' + (hasPlate ? 'met' : 'zonder');
        var img      = $('#swk-fence-img');
        var lbl      = $('#swk-scene-label');

        if (lbl) lbl.textContent = mat.label + ' \u2014 ' + S.orient.charAt(0).toUpperCase() + S.orient.slice(1);

        if (key !== lastPhotoKey && img) {
            img.classList.add('swk-fade');
            setTimeout(function () {
                img.src = PHOTOS[key] || '';
                img.onload = function () {
                    img.classList.remove('swk-fade');
                };
            }, 200);
            lastPhotoKey = key;
        }
    }

    /* ──────────────────────────────────────────
       FORM SUMMARY
       ────────────────────────────────────────── */
    function buildSummary() {
        var el = $('#swk-form-summary');
        if (!el) return;

        var len   = getTotalLen();
        var tot   = calcTotal();
        var mat   = MATERIALS[S.type];
        var sides = S.sides.map(function (v, i) {
            return (SIT_LABELS[S.situatie] || [])[i] + ': ' + v + 'm';
        }).join(', ');

        var html = '<div class="swk-fs-title">Uw configuratie</div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Type</span><span class="swk-fs-v">' + (mat ? mat.label : '') + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Plaatsing</span><span class="swk-fs-v">' + S.orient.charAt(0).toUpperCase() + S.orient.slice(1) + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Planken</span><span class="swk-fs-v">' + S.planken + ' per segment</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Situatie</span><span class="swk-fs-v">' + sides + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Totale lengte</span><span class="swk-fs-v">' + len.toFixed(1) + ' meter</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Betonpalen</span><span class="swk-fs-v">' + S.paal.charAt(0).toUpperCase() + S.paal.slice(1) + '</span></div>';

        Object.keys(S.extras).forEach(function (k) {
            if (!S.extras[k]) return;
            if (k === 'poort' && typeof S.extras.poort === 'object') {
                html += '<div class="swk-fs-row"><span class="swk-fs-l">Looppoort</span><span class="swk-fs-v">' + S.extras.poort.label + ' (' + fmt(S.extras.poort.price) + ')</span></div>';
                return;
            }
            if (EXTRAS[k]) {
                html += '<div class="swk-fs-row"><span class="swk-fs-l">' + EXTRAS[k].label + '</span><span class="swk-fs-v">Ja</span></div>';
            }
        });

        html += '<hr class="swk-fs-divider">';
        html += '<div class="swk-fs-row"><span class="swk-fs-l"><strong>Indicatie totaalprijs</strong></span><span class="swk-fs-v"><strong>' + fmt(tot) + '</strong></span></div>';

        el.innerHTML = html;
    }

    /* ──────────────────────────────────────────
       REFRESH
       ────────────────────────────────────────── */
    function refresh() {
        updatePrice();
        updatePhoto();
        if ($('#swk-form-summary')) buildSummary();
    }

    /* ──────────────────────────────────────────
       EVENT HANDLERS
       ────────────────────────────────────────── */

    // Step 1: Type selection
    function initTypeSelection() {
        $$('.swk-type-card').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('.swk-type-card').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.type = el.getAttribute('data-swk-type');

                // Reset poort selection when switching material type
                if (S.extras.poort) {
                    S.extras.poort = false;
                    var poortEl = document.querySelector('[data-swk-extra="poort"]');
                    if (poortEl) {
                        poortEl.classList.remove('swk-on');
                        var toggle = poortEl.querySelector('.swk-toggle');
                        if (toggle) toggle.classList.remove('swk-on');
                    }
                    updatePoortExtraDesc();
                }

                refresh();
            });
        });
    }

    // Step 2: Orientation selection
    function initOrientSelection() {
        $$('.swk-orient-item').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('.swk-orient-item').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.orient = el.getAttribute('data-swk-orient');
                refresh();
            });
        });
    }

    // Step 3: Planken selection
    function initPlankenSelection() {
        $$('[data-swk-planken]').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('[data-swk-planken]').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.planken = parseInt(el.getAttribute('data-swk-planken'), 10);
                refresh();
            });
        });
    }

    // Step 4: Situatie selection
    function initSituatieSelection() {
        $$('.swk-sit-item').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('.swk-sit-item').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.situatie = el.getAttribute('data-swk-sit');

                var n      = SIT_SIDES[S.situatie] || 1;
                var labels = SIT_LABELS[S.situatie] || ['A'];
                S.sides    = new Array(n).fill(0);

                var container = $('#swk-sides-container');
                if (!container) return;
                container.innerHTML = '';

                for (var i = 0; i < n; i++) {
                    var row = document.createElement('div');
                    row.className = 'swk-side-row';
                    row.innerHTML =
                        '<div class="swk-side-label">' + labels[i] + '</div>' +
                        '<div class="swk-side-input">' +
                        '<input type="number" min="1" max="30" step="0.5" placeholder="0" data-swk-idx="' + i + '">' +
                        '<span>meter</span></div>';
                    container.appendChild(row);
                }

                // Bind new inputs
                container.querySelectorAll('input').forEach(function (inp) {
                    inp.addEventListener('input', function () {
                        S.sides[parseInt(inp.getAttribute('data-swk-idx'), 10)] = parseFloat(inp.value) || 0;
                        updateTotalLen();
                        refresh();
                    });
                });

                updateTotalLen();
                refresh();
            });
        });

        // Bind initial side inputs
        $$('#swk-sides-container input').forEach(function (inp) {
            inp.addEventListener('input', function () {
                S.sides[parseInt(inp.getAttribute('data-swk-idx'), 10)] = parseFloat(inp.value) || 0;
                updateTotalLen();
                refresh();
            });
        });
    }

    function updateTotalLen() {
        var el = $('#swk-total-len-val');
        if (el) el.textContent = getTotalLen().toFixed(2).replace('.', ',') + ' meter';
    }

    // Step 5: Betonpalen selection
    function initPaalSelection() {
        $$('[data-swk-paal]').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('[data-swk-paal]').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.paal = el.getAttribute('data-swk-paal');
                refresh();
            });
        });
    }

    // Step 6: Extras toggles
    function initExtras() {
        $$('.swk-extra').forEach(function (el) {
            el.addEventListener('click', function () {
                var key = el.getAttribute('data-swk-extra');

                if (key === 'poort') {
                    if (S.extras.poort) {
                        // Deselect poort
                        S.extras.poort = false;
                        el.classList.remove('swk-on');
                        var toggle = el.querySelector('.swk-toggle');
                        if (toggle) toggle.classList.remove('swk-on');
                        updatePoortExtraDesc();
                        refresh();
                    } else {
                        // Open poort modal
                        openPoortModal();
                    }
                    return;
                }

                S.extras[key] = !S.extras[key];
                el.classList.toggle('swk-on', S.extras[key]);
                var toggle = el.querySelector('.swk-toggle');
                if (toggle) toggle.classList.toggle('swk-on', S.extras[key]);
                refresh();
            });
        });
    }

    // Update poort extra description to show selected gate
    function updatePoortExtraDesc() {
        var el = document.querySelector('[data-swk-extra="poort"]');
        if (!el) return;
        var descEl = el.querySelector('.swk-extra-desc');
        var priceEl = el.querySelector('.swk-extra-price');
        if (S.extras.poort && typeof S.extras.poort === 'object') {
            if (descEl) descEl.textContent = S.extras.poort.label;
            if (priceEl) priceEl.textContent = '+ ' + fmt(S.extras.poort.price);
        } else {
            if (descEl) descEl.textContent = 'Kies een poortmaat';
            if (priceEl) priceEl.textContent = 'vanaf \u20AC329,95';
        }
    }

    // Poort modal
    function openPoortModal() {
        var modal = $('#swk-poort-modal');
        var grid  = $('#swk-poort-grid');
        if (!modal || !grid) return;

        var gates = POORTEN[S.type] || POORTEN.grenen || [];
        var html = '';

        gates.forEach(function (gate, i) {
            var selected = S.extras.poort && typeof S.extras.poort === 'object' && S.extras.poort.index === i;
            html += '<div class="swk-poort-card' + (selected ? ' swk-selected' : '') + '" data-swk-poort-idx="' + i + '">';
            html += '<img class="swk-poort-card-img" src="' + gate.image + '" alt="' + gate.label + '" onerror="this.style.background=\'#e8e8e4\';this.alt=\'Afbeelding niet beschikbaar\'">';
            html += '<div class="swk-poort-card-body">';
            html += '<div class="swk-poort-card-label">' + gate.label + '</div>';
            html += '<div class="swk-poort-card-price">' + fmt(gate.price) + '</div>';
            html += '</div></div>';
        });

        grid.innerHTML = html;

        // Bind click events on gate cards
        grid.querySelectorAll('.swk-poort-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var idx = parseInt(card.getAttribute('data-swk-poort-idx'), 10);
                var gate = gates[idx];
                if (!gate) return;

                S.extras.poort = { index: idx, label: gate.label, price: gate.price };

                // Update the toggle visual
                var poortEl = document.querySelector('[data-swk-extra="poort"]');
                if (poortEl) {
                    poortEl.classList.add('swk-on');
                    var toggle = poortEl.querySelector('.swk-toggle');
                    if (toggle) toggle.classList.add('swk-on');
                }

                updatePoortExtraDesc();
                closePoortModal();
                refresh();
            });
        });

        modal.classList.add('swk-modal-open');
        document.body.style.overflow = 'hidden';
    }

    function closePoortModal() {
        var modal = $('#swk-poort-modal');
        if (modal) modal.classList.remove('swk-modal-open');
        document.body.style.overflow = '';
    }

    function initPoortModal() {
        var closeBtn = $('#swk-poort-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closePoortModal);

        var overlay = $('#swk-poort-modal');
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closePoortModal();
            });
        }

        // Set initial poort description
        updatePoortExtraDesc();
    }

    // Progress bar navigation
    function initProgressBar() {
        $$('.swk-step-tab').forEach(function (el) {
            el.addEventListener('click', function () {
                var n = parseInt(el.getAttribute('data-swk-goto'), 10);
                if (n === 7) {
                    openForm();
                    return;
                }
                goToStep(n);
            });
        });
    }

    function goToStep(n) {
        $$('.swk-step-tab').forEach(function (s, i) {
            s.classList.remove('swk-active', 'swk-completed');
            if (i + 1 < n) s.classList.add('swk-completed');
            if (i + 1 === n) s.classList.add('swk-active');
        });
        $$('.swk-step-card').forEach(function (c, i) {
            c.classList.toggle('swk-active-card', i + 1 === n);
        });
        var target = document.getElementById('swk-s' + n);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Open form (step 7)
    function openForm() {
        var s7 = $('#swk-s7');
        if (!s7) return;
        buildSummary();
        s7.style.display = '';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                s7.style.opacity = '1';
                s7.style.transform = 'translateY(0)';
            });
        });
        setTimeout(function () {
            s7.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        goToStep(7);
    }

    // CTA buttons
    function initCTA() {
        var ctaOfferte = $('#swk-cta-offerte');
        if (ctaOfferte) ctaOfferte.addEventListener('click', openForm);
    }

    // Location checkbox toggle
    function initLocationToggle() {
        var cb   = $('#swk-f-locatie');
        var wrap = $('#swk-f-locatie-wrap');
        if (cb && wrap) {
            cb.addEventListener('change', function () {
                wrap.style.display = cb.checked ? '' : 'none';
            });
        }
    }

    /* ──────────────────────────────────────────
       FORM SUBMISSION (via WP REST API)
       ────────────────────────────────────────── */
    function initFormSubmit() {
        var btn = $('#swk-submit-btn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            // Honeypot check
            var hp = $('#swk-f-website');
            if (hp && hp.value) return; // Bot detected

            var fields = {
                voornaam:    ($('#swk-f-voornaam')    || {}).value || '',
                achternaam:  ($('#swk-f-achternaam')  || {}).value || '',
                straat:      ($('#swk-f-straat')      || {}).value || '',
                postcode:    ($('#swk-f-postcode')    || {}).value || '',
                plaats:      ($('#swk-f-plaats')       || {}).value || '',
                email:       ($('#swk-f-email')       || {}).value || '',
                telefoon:    ($('#swk-f-telefoon')    || {}).value || '',
                opmerkingen: ($('#swk-f-opmerkingen') || {}).value || '',
                locatie_adres: ($('#swk-f-locatie-adres') || {}).value || ''
            };

            // Trim
            Object.keys(fields).forEach(function (k) {
                fields[k] = fields[k].trim();
            });

            // Validate required fields
            if (!fields.voornaam || !fields.achternaam || !fields.straat || !fields.postcode || !fields.plaats || !fields.email || !fields.telefoon) {
                showToast('Vul alle verplichte velden in.', true);
                return;
            }

            if (fields.email.indexOf('@') === -1 || fields.email.indexOf('.') === -1) {
                showToast('Vul een geldig e-mailadres in.', true);
                return;
            }

            var payload = {
                klant:        fields,
                configuratie: {
                    type:        S.type,
                    orientatie:  S.orient,
                    planken:     S.planken,
                    situatie:    S.situatie,
                    zijden:      S.sides,
                    betonpaal:   S.paal,
                    extras:      S.extras,
                    totaalprijs: calcTotal()
                }
            };

            btn.textContent = 'Verzenden...';
            btn.disabled = true;

            fetch(REST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce':   NONCE
                },
                body: JSON.stringify(payload)
            })
            .then(function (r) {
                return r.json().then(function (data) {
                    if (!r.ok) throw new Error(data.message || 'Fout bij verzenden');
                    return data;
                });
            })
            .then(function () {
                showSuccess(fields.voornaam, fields.email);
            })
            .catch(function (err) {
                showToast(err.message || 'Er ging iets mis. Probeer het opnieuw.', true);
                btn.textContent = 'Verstuur offerte aanvraag \u2192';
                btn.disabled = false;
            });
        });
    }

    function showSuccess(naam, email) {
        var section = $('#swk-s7');
        if (!section) return;
        var body = section.querySelector('.swk-card-body');
        if (!body) return;

        body.innerHTML =
            '<div class="swk-form-success">' +
            '<div class="swk-fs-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 14l5 5 9-9" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
            '<h3>Offerte aanvraag verstuurd!</h3>' +
            '<p>Bedankt ' + naam + '! We nemen binnen 24 uur contact met je op via ' + email + '.</p>' +
            '</div>';

        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ──────────────────────────────────────────
       INTERSECTION OBSERVER (auto-highlight active step)
       ────────────────────────────────────────── */
    function initObserver() {
        if (typeof IntersectionObserver === 'undefined') return;

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var id = entry.target.id;
                    var n  = parseInt(id.replace('swk-s', ''), 10);
                    if (isNaN(n)) return;

                    $$('.swk-step-tab').forEach(function (s, i) {
                        s.classList.remove('swk-active', 'swk-completed');
                        if (i + 1 < n) s.classList.add('swk-completed');
                        if (i + 1 === n) s.classList.add('swk-active');
                    });

                    $$('.swk-step-card').forEach(function (c, i) {
                        c.classList.toggle('swk-active-card', i + 1 === n);
                    });
                }
            });
        }, {
            threshold: 0.45,
            rootMargin: '-80px 0px -180px 0px'
        });

        $$('.swk-step-card').forEach(function (c) {
            obs.observe(c);
        });
    }

    /* ──────────────────────────────────────────
       SWATCH INITIALIZATION
       ────────────────────────────────────────── */
    function initSwatches() {
        Object.keys(MATERIALS).forEach(function (key) {
            var el  = document.getElementById('swk-sw-' + key);
            var mat = MATERIALS[key];
            if (!el || !mat) return;
            var pk  = mat.photo_key || key;
            var url = PHOTOS[pk + '_verticaal_zonder'];
            if (url) el.style.backgroundImage = 'url(' + url + ')';
        });
    }

    /* ──────────────────────────────────────────
       INIT
       ────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        initSwatches();
        initTypeSelection();
        initOrientSelection();
        initPlankenSelection();
        initSituatieSelection();
        initPaalSelection();
        initExtras();
        initPoortModal();
        initProgressBar();
        initCTA();
        initLocationToggle();
        initFormSubmit();
        initObserver();
        refresh();
    });
})();
