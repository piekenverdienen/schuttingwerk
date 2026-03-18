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

    /* Available gate widths (cm) */
    var POORT_BREEDTES = [90, 100, 110, 120, 130, 140, 150];

    /* Situation helpers */
    var SIT_SIDES  = { '1': 1, '2': 2, '3': 3, 't': 3, '4': 4, '5': 5, '6': 6, '7': 7, '4g': 4, '2p': 2 };
    var SIT_LABELS = {
        '1': ['A'],
        '2': ['A', 'B'],
        '3': ['A', 'B', 'C'],
        't': ['A', 'B', 'C'],
        '4': ['A', 'B', 'C', 'D'],
        '5': ['A', 'B', 'C', 'D', 'E'],
        '6': ['A', 'B', 'C', 'D', 'E', 'F'],
        '7': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        '4g': ['A', 'B', 'C', 'D'],
        '2p': ['A', 'B']
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
        plaatsing: 'geen',
        extras:   {},
        poorten:  [],
        hoogteverschil: 'nee'
    };

    // Initialize extras state (without poort — poort is now separate)
    Object.keys(EXTRAS).forEach(function (k) {
        if (k === 'poort') return;
        S.extras[k] = false;
    });

    // Uploaded files (not persisted to localStorage)
    var uploadedFiles = [];

    /* ──────────────────────────────────────────
       HELPERS
       ────────────────────────────────────────── */
    function fmt(n) {
        return '\u20AC' + n.toFixed(2).replace('.', ',');
    }

    function getTotalLen() {
        return S.sides.reduce(function (a, b) { return a + b; }, 0);
    }

    function debounce(fn, delay) {
        var timer;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }

    function isValidPostcode(pc) {
        return /^\d{4}\s?[A-Za-z]{2}$/.test(pc.trim());
    }

    function isValidTelefoon(tel) {
        var cleaned = tel.replace(/[\s\-\(\)]/g, '');
        return /^(06\d{8}|0[1-9]\d{7,8}|\+31\d{9})$/.test(cleaned);
    }

    /* ──────────────────────────────────────────
       LOCALSTORAGE PERSISTENCE
       ────────────────────────────────────────── */
    var STORAGE_KEY = 'swk_configurator_state';

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function loadState() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return false;
            var parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object' && parsed.type) {
                Object.keys(parsed).forEach(function (k) {
                    S[k] = parsed[k];
                });
                // Ensure poorten is an array
                if (!Array.isArray(S.poorten)) S.poorten = [];
                return true;
            }
        } catch (e) { /* corrupt data */ }
        return false;
    }

    function clearState() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
    }

    function calcTotal() {
        var len = getTotalLen();
        var mat = MATERIALS[S.type];
        var t   = (mat ? mat.price : 0) * len;

        t += (PAAL_EX[S.paal] || 0) * len;

        Object.keys(S.extras).forEach(function (k) {
            if (!S.extras[k]) return;
            var ex = EXTRAS[k];
            if (!ex) return;
            if (ex.unit === 'per_meter') {
                t += ex.price * len;
            } else {
                t += ex.price;
            }
        });

        // Add poorten prices
        var gates = POORTEN[S.type] || POORTEN.grenen || [];
        S.poorten.forEach(function (p) {
            var widthIdx = POORT_BREEDTES.indexOf(p.breedte);
            if (widthIdx >= 0 && gates[widthIdx]) {
                t += gates[widthIdx].price;
            }
        });

        // Plaatsing: snelbeton mortel = €14,50 per segment
        if (S.plaatsing === 'mortel') {
            var seg = Math.max(0, Math.round(len / 1.80));
            t += seg * 14.50;
        }

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
        void el.offsetWidth;
        el.classList.add('swk-toast-show');
        setTimeout(function () {
            el.classList.remove('swk-toast-show');
        }, 3500);
    }

    /* ──────────────────────────────────────────
       PRICE UPDATE (vanaf prijzen)
       ────────────────────────────────────────── */
    function updatePrice() {
        var len = getTotalLen();
        var mat = MATERIALS[S.type];
        if (!mat) return;

        // Material type label + base "vanaf" price
        var baseEl = $('#swk-pl-type');
        if (baseEl) baseEl.textContent = mat.label;
        var pvBase = $('#swk-pv-base');
        if (pvBase) pvBase.textContent = 'vanaf ' + fmt(mat.price) + ' /m';

        // Onderplaat
        var onderplaat = S.extras.onderplaat && EXTRAS.onderplaat;
        var plOnder = $('#swk-pl-onderplaat');
        if (plOnder) plOnder.style.display = onderplaat ? 'flex' : 'none';

        // Plaatsing (snelbeton mortel)
        var plPlaatsing = $('#swk-pl-plaatsing');
        if (plPlaatsing) plPlaatsing.style.display = S.plaatsing === 'mortel' ? 'flex' : 'none';

        // Update mortel price display in placement option
        var mortelPriceEl = $('#swk-mortel-price');
        if (mortelPriceEl) {
            var mortelSeg = Math.max(0, Math.round(len / 1.80));
            if (len > 0) {
                mortelPriceEl.textContent = 'vanaf ' + fmt(mortelSeg * 14.50) + ' (' + mortelSeg + ' seg.)';
            } else {
                mortelPriceEl.textContent = 'vanaf \u20AC14,50 /segment';
            }
        }

        // Poort
        var hasPoorten = S.poorten.length > 0;
        var plPoort = $('#swk-pl-poort');
        if (plPoort) plPoort.style.display = hasPoorten ? 'flex' : 'none';
        if (hasPoorten) {
            var plPoortLabel = $('#swk-pl-poort-label');
            if (plPoortLabel) plPoortLabel.textContent = S.poorten.length + 'x Looppoort';
            var pvPoort = $('#swk-pv-poort');
            if (pvPoort) pvPoort.textContent = 'vanaf \u20AC329,95 /st.';
        }

        // Montage
        var plMontage = $('#swk-pl-montage');
        if (plMontage) plMontage.style.display = S.extras.montage ? 'flex' : 'none';

        // Total (vanaf)
        var tot = calcTotal();
        var pvTotal = $('#swk-pv-total');
        if (pvTotal) pvTotal.textContent = fmt(tot);

        // Per meter (vanaf)
        var pvPm = $('#swk-pv-pm');
        if (pvPm) pvPm.textContent = len > 0 ? 'vanaf ' + fmt(tot / len) + ' /m' : '\u20AC0,00 /m';

        // Meta stats
        var seg = Math.max(0, Math.round(len / 1.80));
        var palen;
        if (S.situatie === '4g') {
            palen = seg;
        } else if (S.situatie === '2p') {
            palen = seg > 0 ? seg + 2 : 0;
        } else {
            palen = seg > 0 ? seg + 1 : 0;
        }
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
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Ori\u00ebntatie</span><span class="swk-fs-v">' + S.orient.charAt(0).toUpperCase() + S.orient.slice(1) + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Planken</span><span class="swk-fs-v">' + S.planken + ' per segment</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Situatie</span><span class="swk-fs-v">' + sides + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Totale lengte</span><span class="swk-fs-v">' + len.toFixed(1) + ' meter</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Betonpalen</span><span class="swk-fs-v">' + S.paal.charAt(0).toUpperCase() + S.paal.slice(1) + '</span></div>';
        html += '<div class="swk-fs-row"><span class="swk-fs-l">Plaatsing</span><span class="swk-fs-v">' + (S.plaatsing === 'mortel' ? 'Snelbeton mortel' : 'Lever niets mee') + '</span></div>';

        // Poorten
        if (S.poorten.length > 0) {
            S.poorten.forEach(function (p, i) {
                html += '<div class="swk-fs-row"><span class="swk-fs-l">Poort ' + (i + 1) + '</span><span class="swk-fs-v">Zijde ' + p.zijde + ' &mdash; ' + p.breedte + ' cm</span></div>';
            });
        }

        Object.keys(S.extras).forEach(function (k) {
            if (!S.extras[k]) return;
            if (EXTRAS[k]) {
                html += '<div class="swk-fs-row"><span class="swk-fs-l">' + EXTRAS[k].label + '</span><span class="swk-fs-v">Ja</span></div>';
            }
        });

        html += '<div class="swk-fs-row"><span class="swk-fs-l">Hoogteverschil &gt;25cm</span><span class="swk-fs-v">' + (S.hoogteverschil === 'ja' ? 'Ja' : 'Nee') + '</span></div>';

        html += '<hr class="swk-fs-divider">';
        html += '<div class="swk-fs-row"><span class="swk-fs-l"><strong>Indicatie vanaf prijs</strong></span><span class="swk-fs-v"><strong>vanaf ' + fmt(tot) + '</strong></span></div>';

        el.innerHTML = html;
    }

    /* ──────────────────────────────────────────
       REFRESH
       ────────────────────────────────────────── */
    function refresh() {
        updatePrice();
        updatePhoto();
        if ($('#swk-form-summary')) buildSummary();
        saveState();
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

                var debouncedRefresh = debounce(function () { refresh(); }, 150);
                container.querySelectorAll('input').forEach(function (inp) {
                    inp.addEventListener('input', function () {
                        S.sides[parseInt(inp.getAttribute('data-swk-idx'), 10)] = parseFloat(inp.value) || 0;
                        updateTotalLen();
                        debouncedRefresh();
                    });
                });

                // Update poort side options when situation changes
                renderPoortConfig();

                updateTotalLen();
                refresh();
            });
        });

        // Bind initial side inputs
        var debouncedRefreshInit = debounce(function () { refresh(); }, 150);
        $$('#swk-sides-container input').forEach(function (inp) {
            inp.addEventListener('input', function () {
                S.sides[parseInt(inp.getAttribute('data-swk-idx'), 10)] = parseFloat(inp.value) || 0;
                updateTotalLen();
                debouncedRefreshInit();
            });
        });
    }

    function initSitToggle() {
        var toggle = $('#swk-sit-toggle');
        var extra = $('#swk-sit-extra');
        if (!toggle || !extra) return;
        toggle.addEventListener('click', function () {
            var open = extra.style.display !== 'none';
            extra.style.display = open ? 'none' : '';
            toggle.innerHTML = open ? 'Meer opties &#9662;' : 'Minder opties &#9652;';

            if (open) {
                var selected = extra.querySelector('.swk-sit-item.swk-selected');
                if (selected) {
                    var first = document.querySelector('.swk-sit-grid:not(.swk-sit-extra) .swk-sit-item');
                    if (first) first.click();
                }
            }
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

    // Step 6: Plaatsing selection
    function initPlacement() {
        $$('.swk-placement-option').forEach(function (el) {
            el.addEventListener('click', function () {
                $$('.swk-placement-option').forEach(function (e) { e.classList.remove('swk-selected'); });
                el.classList.add('swk-selected');
                S.plaatsing = el.getAttribute('data-swk-placement');
                refresh();
            });
        });
    }

    /* ──────────────────────────────────────────
       POORT COUNTER + INLINE CONFIG
       ────────────────────────────────────────── */
    function getAvailableSides() {
        return SIT_LABELS[S.situatie] || ['A'];
    }

    function renderPoortConfig() {
        var container = $('#swk-poort-config-list');
        if (!container) return;

        var sides = getAvailableSides();
        container.innerHTML = '';

        S.poorten.forEach(function (p, i) {
            var row = document.createElement('div');
            row.className = 'swk-poort-config-row';

            var sideOptions = sides.map(function (s) {
                return '<option value="' + s + '"' + (p.zijde === s ? ' selected' : '') + '>Zijde ' + s + '</option>';
            }).join('');

            var breedteOptions = POORT_BREEDTES.map(function (b) {
                return '<option value="' + b + '"' + (p.breedte === b ? ' selected' : '') + '>' + b + ' cm</option>';
            }).join('');

            row.innerHTML =
                '<div class="swk-poort-config-label">Poort ' + (i + 1) + '</div>' +
                '<div class="swk-poort-config-fields">' +
                '<select class="swk-poort-select" data-poort-idx="' + i + '" data-poort-field="zijde">' + sideOptions + '</select>' +
                '<select class="swk-poort-select" data-poort-idx="' + i + '" data-poort-field="breedte">' + breedteOptions + '</select>' +
                '</div>';
            container.appendChild(row);
        });

        // Bind change events
        container.querySelectorAll('.swk-poort-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                var idx = parseInt(sel.getAttribute('data-poort-idx'), 10);
                var field = sel.getAttribute('data-poort-field');
                if (field === 'zijde') {
                    S.poorten[idx].zijde = sel.value;
                } else if (field === 'breedte') {
                    S.poorten[idx].breedte = parseInt(sel.value, 10);
                }
                refresh();
            });
        });

        // Update counter display
        var countInput = $('#swk-poort-count');
        if (countInput) countInput.value = S.poorten.length;

        // Update check visibility
        var check = $('#swk-poort-check');
        if (check) check.style.opacity = S.poorten.length > 0 ? '1' : '0.3';
    }

    function initPoortCounter() {
        var minusBtn = $('#swk-poort-minus');
        var plusBtn = $('#swk-poort-plus');

        if (minusBtn) {
            minusBtn.addEventListener('click', function () {
                if (S.poorten.length > 0) {
                    S.poorten.pop();
                    renderPoortConfig();
                    refresh();
                }
            });
        }

        if (plusBtn) {
            plusBtn.addEventListener('click', function () {
                if (S.poorten.length < 10) {
                    var sides = getAvailableSides();
                    S.poorten.push({
                        zijde: sides[0],
                        breedte: 100
                    });
                    renderPoortConfig();
                    refresh();
                }
            });
        }

        renderPoortConfig();
    }

    // Step 8: Extras toggles (onderplaat, montage)
    function initExtras() {
        $$('.swk-extra').forEach(function (el) {
            el.addEventListener('click', function () {
                var key = el.getAttribute('data-swk-extra');

                S.extras[key] = !S.extras[key];
                el.classList.toggle('swk-on', S.extras[key]);
                var toggle = el.querySelector('.swk-toggle');
                if (toggle) {
                    toggle.classList.toggle('swk-on', S.extras[key]);
                    toggle.setAttribute('aria-checked', S.extras[key] ? 'true' : 'false');
                }
                refresh();
            });
        });
    }

    // Progress bar navigation
    function initProgressBar() {
        $$('.swk-step-tab').forEach(function (el) {
            el.addEventListener('click', function () {
                var n = parseInt(el.getAttribute('data-swk-goto'), 10);
                if (n === 9) {
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
        if (!target) {
            // swk-s7b is step 8
            if (n === 8) target = document.getElementById('swk-s7b');
        }
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Open form (step 9)
    function openForm() {
        var s9 = $('#swk-s9');
        if (!s9) return;
        buildSummary();
        s9.style.display = '';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                s9.style.opacity = '1';
                s9.style.transform = 'translateY(0)';
            });
        });
        setTimeout(function () {
            s9.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        goToStep(9);
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
       HOOGTEVERSCHIL TOGGLE
       ────────────────────────────────────────── */
    function initHoogteverschil() {
        var container = $('#swk-hoogteverschil');
        if (!container) return;

        container.querySelectorAll('.swk-toggle-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                container.querySelectorAll('.swk-toggle-btn').forEach(function (b) {
                    b.classList.remove('swk-toggle-btn-active');
                });
                btn.classList.add('swk-toggle-btn-active');
                S.hoogteverschil = btn.getAttribute('data-value');
                saveState();
            });
        });
    }

    /* ──────────────────────────────────────────
       FILE UPLOAD
       ────────────────────────────────────────── */
    function initFileUpload() {
        var area = $('#swk-upload-area');
        var input = $('#swk-f-fotos');
        var preview = $('#swk-upload-preview');
        if (!area || !input || !preview) return;

        area.addEventListener('click', function () {
            input.click();
        });

        area.addEventListener('dragover', function (e) {
            e.preventDefault();
            area.classList.add('swk-upload-dragover');
        });

        area.addEventListener('dragleave', function () {
            area.classList.remove('swk-upload-dragover');
        });

        area.addEventListener('drop', function (e) {
            e.preventDefault();
            area.classList.remove('swk-upload-dragover');
            handleFiles(e.dataTransfer.files);
        });

        input.addEventListener('change', function () {
            handleFiles(input.files);
            input.value = '';
        });

        function handleFiles(files) {
            for (var i = 0; i < files.length; i++) {
                if (uploadedFiles.length >= 3) {
                    showToast('Maximaal 3 bestanden toegestaan.', true);
                    break;
                }
                var file = files[i];
                if (!file.type.match(/^image\//) && file.type !== 'application/pdf') {
                    showToast('Alleen afbeeldingen en PDFs zijn toegestaan.', true);
                    continue;
                }
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Bestand is te groot (max 10MB).', true);
                    continue;
                }
                uploadedFiles.push(file);
            }
            renderUploadPreview();
        }

        function renderUploadPreview() {
            preview.innerHTML = '';
            uploadedFiles.forEach(function (file, idx) {
                var item = document.createElement('div');
                item.className = 'swk-upload-item';

                var name = document.createElement('span');
                name.className = 'swk-upload-filename';
                name.textContent = file.name;

                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'swk-upload-remove';
                removeBtn.textContent = '\u00D7';
                removeBtn.addEventListener('click', function () {
                    uploadedFiles.splice(idx, 1);
                    renderUploadPreview();
                });

                item.appendChild(name);
                item.appendChild(removeBtn);
                preview.appendChild(item);
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
            if (hp && hp.value) return;

            var fields = {
                voornaam:    ($('#swk-f-voornaam')    || {}).value || '',
                achternaam:  ($('#swk-f-achternaam')  || {}).value || '',
                straat:      ($('#swk-f-straat')      || {}).value || '',
                postcode:    ($('#swk-f-postcode')    || {}).value || '',
                plaats:      ($('#swk-f-plaats')       || {}).value || '',
                email:       ($('#swk-f-email')       || {}).value || '',
                telefoon:    ($('#swk-f-telefoon')    || {}).value || '',
                opmerkingen: ($('#swk-f-opmerkingen') || {}).value || '',
                locatie_adres: ($('#swk-f-locatie-adres') || {}).value || '',
                situatie_omschrijving: ($('#swk-f-situatie') || {}).value || '',
                hoogteverschil: S.hoogteverschil
            };

            Object.keys(fields).forEach(function (k) {
                if (typeof fields[k] === 'string') fields[k] = fields[k].trim();
            });

            if (!fields.voornaam || !fields.achternaam || !fields.straat || !fields.postcode || !fields.plaats || !fields.email || !fields.telefoon) {
                showToast('Vul alle verplichte velden in.', true);
                return;
            }

            if (!isValidEmail(fields.email)) {
                showToast('Vul een geldig e-mailadres in.', true);
                return;
            }

            if (!isValidPostcode(fields.postcode)) {
                showToast('Vul een geldige postcode in (bijv. 1234 AB).', true);
                return;
            }

            if (!isValidTelefoon(fields.telefoon)) {
                showToast('Vul een geldig telefoonnummer in (bijv. 06 12345678).', true);
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
                    plaatsing:   S.plaatsing,
                    extras:      S.extras,
                    poorten:     S.poorten,
                    hoogteverschil: S.hoogteverschil,
                    vanafprijs:  calcTotal()
                }
            };

            btn.textContent = 'Verzenden...';
            btn.disabled = true;

            // Use FormData if files are uploaded
            if (uploadedFiles.length > 0) {
                var formData = new FormData();
                formData.append('json', JSON.stringify(payload));
                uploadedFiles.forEach(function (file, i) {
                    formData.append('foto_' + i, file);
                });

                fetch(REST_URL, {
                    method: 'POST',
                    headers: { 'X-WP-Nonce': NONCE },
                    body: formData
                })
                .then(handleResponse)
                .then(function () {
                    clearState();
                    showSuccess(fields.voornaam, fields.email);
                })
                .catch(handleError);
            } else {
                fetch(REST_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce':   NONCE
                    },
                    body: JSON.stringify(payload)
                })
                .then(handleResponse)
                .then(function () {
                    clearState();
                    showSuccess(fields.voornaam, fields.email);
                })
                .catch(handleError);
            }

            function handleResponse(r) {
                return r.json().then(function (data) {
                    if (!r.ok) throw new Error(data.message || 'Fout bij verzenden');
                    return data;
                });
            }

            function handleError(err) {
                showToast(err.message || 'Er ging iets mis. Probeer het opnieuw.', true);
                btn.textContent = 'Verstuur offerte aanvraag \u2192';
                btn.disabled = false;
            }
        });
    }

    function showSuccess(naam, email) {
        var section = $('#swk-s9');
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

        // Map section IDs to step numbers
        var sectionStepMap = {};
        $$('.swk-step-card').forEach(function (c, i) {
            sectionStepMap[c.id] = i + 1;
        });

        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var n = sectionStepMap[entry.target.id];
                    if (!n) return;

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
       LAZY LOADING
       ────────────────────────────────────────── */
    function initLazyLoading() {
        if (typeof IntersectionObserver === 'undefined') return;
        var lazyImgs = $$('img[data-swk-lazy]');
        if (!lazyImgs.length) return;

        var imgObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    if (img.dataset.swkLazy) {
                        img.src = img.dataset.swkLazy;
                        img.removeAttribute('data-swk-lazy');
                    }
                    imgObs.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });

        lazyImgs.forEach(function (img) { imgObs.observe(img); });
    }

    /* ──────────────────────────────────────────
       ACCESSIBILITY
       ────────────────────────────────────────── */
    function initAccessibility() {
        $$('.swk-type-card, .swk-orient-item, .swk-choice, .swk-sit-item, .swk-extra, .swk-placement-option').forEach(function (el) {
            if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
            if (!el.getAttribute('role')) el.setAttribute('role', 'button');
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        });

        $$('.swk-toggle').forEach(function (el) {
            el.setAttribute('role', 'switch');
            el.setAttribute('aria-checked', el.classList.contains('swk-on') ? 'true' : 'false');
        });

        $$('.swk-type-info').forEach(function (el) {
            el.setAttribute('aria-label', 'Meer informatie');
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var tip = el.nextElementSibling;
                    if (tip && tip.classList.contains('swk-type-tip')) {
                        tip.classList.toggle('swk-show');
                    }
                }
            });
        });

        var fenceImg = $('#swk-fence-img');
        if (fenceImg) fenceImg.setAttribute('alt', 'Live preview van uw schutting configuratie');
    }

    /* ──────────────────────────────────────────
       STATE RESTORATION
       ────────────────────────────────────────── */
    function restoreUI() {
        // Restore type selection
        var typeCard = document.querySelector('[data-swk-type="' + S.type + '"]');
        if (typeCard) {
            $$('.swk-type-card').forEach(function (e) { e.classList.remove('swk-selected'); });
            typeCard.classList.add('swk-selected');
        }

        // Restore orientation
        var orientCard = document.querySelector('[data-swk-orient="' + S.orient + '"]');
        if (orientCard) {
            $$('.swk-orient-item').forEach(function (e) { e.classList.remove('swk-selected'); });
            orientCard.classList.add('swk-selected');
        }

        // Restore planken
        var plankenCard = document.querySelector('[data-swk-planken="' + S.planken + '"]');
        if (plankenCard) {
            $$('[data-swk-planken]').forEach(function (e) { e.classList.remove('swk-selected'); });
            plankenCard.classList.add('swk-selected');
        }

        // Restore paal
        var paalCard = document.querySelector('[data-swk-paal="' + S.paal + '"]');
        if (paalCard) {
            $$('[data-swk-paal]').forEach(function (e) { e.classList.remove('swk-selected'); });
            paalCard.classList.add('swk-selected');
        }

        // Restore placement
        var placementCard = document.querySelector('[data-swk-placement="' + S.plaatsing + '"]');
        if (placementCard) {
            $$('.swk-placement-option').forEach(function (e) { e.classList.remove('swk-selected'); });
            placementCard.classList.add('swk-selected');
        }

        // Restore extras toggles
        Object.keys(S.extras).forEach(function (k) {
            if (!S.extras[k]) return;
            var el = document.querySelector('[data-swk-extra="' + k + '"]');
            if (el) {
                el.classList.add('swk-on');
                var toggle = el.querySelector('.swk-toggle');
                if (toggle) toggle.classList.add('swk-on');
            }
        });

        // Restore situatie and side inputs
        var sitCard = document.querySelector('[data-swk-sit="' + S.situatie + '"]');
        if (sitCard) {
            sitCard.click();
            setTimeout(function () {
                var inputs = $$('#swk-sides-container input');
                inputs.forEach(function (inp, i) {
                    if (S.sides[i]) inp.value = S.sides[i];
                });
                updateTotalLen();
            }, 50);
        }

        // Restore poorten
        renderPoortConfig();

        // Restore hoogteverschil
        var hvContainer = $('#swk-hoogteverschil');
        if (hvContainer) {
            hvContainer.querySelectorAll('.swk-toggle-btn').forEach(function (btn) {
                btn.classList.toggle('swk-toggle-btn-active', btn.getAttribute('data-value') === S.hoogteverschil);
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var hadSavedState = loadState();

        initSwatches();
        initTypeSelection();
        initOrientSelection();
        initPlankenSelection();
        initSituatieSelection();
        initSitToggle();
        initPaalSelection();
        initPlacement();
        initPoortCounter();
        initExtras();
        initProgressBar();
        initCTA();
        initLocationToggle();
        initHoogteverschil();
        initFileUpload();
        initFormSubmit();
        initObserver();
        initLazyLoading();
        initAccessibility();

        if (hadSavedState) {
            restoreUI();
        }

        refresh();
    });
})();
