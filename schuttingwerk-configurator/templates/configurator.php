<?php
/**
 * Configurator front-end template.
 *
 * Available variables:
 *   $settings — Plugin settings array from get_option('swk_settings').
 *
 * @package SchuttingwerkConfigurator
 */

defined( 'ABSPATH' ) || exit;

$materials     = isset( $settings['materials'] )     ? $settings['materials']     : array();
$material_info = isset( $settings['material_info'] ) ? $settings['material_info'] : array();
$extras        = isset( $settings['extras'] )        ? $settings['extras']        : array();
$paal_extra    = isset( $settings['paal_extra'] )    ? $settings['paal_extra']    : array();
$first_mat     = array_key_first( $materials );
?>

<div class="swk-wrap">

<!-- Header -->
<header class="swk-header">
    <div class="swk-topbar">
        <span><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Advies op maat</span>
        <span><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Stel zelf je pakket samen</span>
        <span><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Levering binnen 10 werkdagen</span>
        <span><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Trustpilot 4.5/5</span>
    </div>
    <nav class="swk-navbar">
        <a class="swk-logo" href="<?php echo esc_url( home_url() ); ?>">
            <span class="swk-logo-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="4" width="2.5" height="12" rx=".5" fill="white"/><rect x="5.5" y="2" width="2.5" height="14" rx=".5" fill="white" opacity=".7"/><rect x="10" y="4" width="2.5" height="12" rx=".5" fill="white"/><rect x="14.5" y="2" width="2.5" height="14" rx=".5" fill="white" opacity=".7"/></svg></span>
            Schuttingwerk
        </a>
        <div style="display:flex;align-items:center;gap:16px">
            <span class="swk-badge">Configurator</span>
            <a href="#" class="swk-help-link">Hulp nodig?</a>
        </div>
    </nav>
</header>

<!-- Page Title -->
<div class="swk-page-title">
    <h1>Stel je schutting samen in 6 stappen</h1>
    <p>Configureer, bekijk live hoe jouw schutting eruitziet en vraag direct een offerte aan.</p>
</div>

<!-- Progress Bar -->
<div class="swk-progress">
    <div class="swk-progress-inner">
        <?php
        $steps = array(
            1 => 'Type',
            2 => 'Plaatsing',
            3 => 'Planken',
            4 => 'Situatie',
            5 => 'Betonpalen',
            6 => "Extra's",
            7 => 'Offerte',
        );
        foreach ( $steps as $num => $label ) :
            $active_class = ( 1 === $num ) ? ' swk-active' : '';
        ?>
        <div class="swk-step-tab<?php echo esc_attr( $active_class ); ?>" data-swk-goto="<?php echo (int) $num; ?>">
            <span class="swk-step-num"><?php echo (int) $num; ?></span>
            <span class="swk-step-label"><?php echo esc_html( $label ); ?></span>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- Main Layout -->
<div class="swk-layout">

    <!-- Left Column: Steps -->
    <div class="swk-steps">

        <!-- STEP 1: Type schutting -->
        <section class="swk-step-card swk-active-card" id="swk-s1">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="2" height="13" rx=".5" fill="currentColor"/><rect x="5" y="1" width="2" height="15" rx=".5" fill="currentColor" opacity=".6"/><rect x="9" y="3" width="2" height="13" rx=".5" fill="currentColor"/><rect x="13" y="1" width="2" height="15" rx=".5" fill="currentColor" opacity=".6"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Type schutting</div>
                    <div class="swk-card-desc">Kies het materiaal en de stijl</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-type-grid">
                    <?php foreach ( $materials as $key => $mat ) :
                        $selected = ( $key === $first_mat ) ? ' swk-selected' : '';
                        $info     = isset( $material_info[ $key ] ) ? $material_info[ $key ] : array();
                        $pk       = isset( $mat['photo_key'] ) ? $mat['photo_key'] : $key;
                    ?>
                    <div class="swk-type-card<?php echo esc_attr( $selected ); ?>" data-swk-type="<?php echo esc_attr( $key ); ?>">
                        <div class="swk-type-info">i</div>
                        <div class="swk-type-tip">
                            <?php foreach ( $info as $tip ) : ?>
                            <span><?php echo esc_html( $tip ); ?></span>
                            <?php endforeach; ?>
                        </div>
                        <div class="swk-type-swatch" id="swk-sw-<?php echo esc_attr( $key ); ?>"></div>
                        <div class="swk-type-name"><?php echo esc_html( $mat['label'] ); ?></div>
                        <div class="swk-type-from">Vanaf &euro;<?php echo esc_html( $mat['price'] ); ?> /m</div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <!-- STEP 2: Plaatsing planken -->
        <section class="swk-step-card" id="swk-s2">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 1v16M8 1v16M12 1v16M16 1v16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Plaatsing planken</div>
                    <div class="swk-card-desc">Verticaal of horizontaal</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-orient-grid">
                    <div class="swk-orient-item swk-selected" data-swk-orient="verticaal">
                        <svg width="50" height="36" viewBox="0 0 50 36"><rect x="3" y="1" width="5" height="34" rx=".8" fill="#A08050"/><rect x="11" y="1" width="5" height="34" rx=".8" fill="#B59060"/><rect x="19" y="1" width="5" height="34" rx=".8" fill="#A08050"/><rect x="27" y="1" width="5" height="34" rx=".8" fill="#B59060"/><rect x="35" y="1" width="5" height="34" rx=".8" fill="#A08050"/><rect x="43" y="1" width="5" height="34" rx=".8" fill="#B59060"/></svg>
                        <div class="swk-orient-label">Verticaal</div>
                    </div>
                    <div class="swk-orient-item" data-swk-orient="horizontaal">
                        <svg width="50" height="36" viewBox="0 0 50 36"><rect x="1" y="2" width="48" height="5" rx=".8" fill="#A08050"/><rect x="1" y="9" width="48" height="5" rx=".8" fill="#B59060"/><rect x="1" y="16" width="48" height="5" rx=".8" fill="#A08050"/><rect x="1" y="23" width="48" height="5" rx=".8" fill="#B59060"/><rect x="1" y="30" width="48" height="5" rx=".8" fill="#A08050"/></svg>
                        <div class="swk-orient-label">Horizontaal</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- STEP 3: Aantal planken -->
        <section class="swk-step-card" id="swk-s3">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="2" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M1 6h16M1 10h16M1 14h16" stroke="currentColor" stroke-width="1" opacity=".3"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Aantal planken</div>
                    <div class="swk-card-desc">Per segment van 180 cm breed</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-choice-grid">
                    <div class="swk-choice" data-swk-planken="19">
                        <div class="swk-choice-num">19</div>
                        <div class="swk-choice-sub">planken</div>
                    </div>
                    <div class="swk-choice swk-selected" data-swk-planken="21">
                        <div class="swk-choice-num">21</div>
                        <div class="swk-choice-sub">planken (standaard)</div>
                    </div>
                    <div class="swk-choice" data-swk-planken="23">
                        <div class="swk-choice-num">23</div>
                        <div class="swk-choice-sub">planken</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- STEP 4: Situatie & afmetingen -->
        <section class="swk-step-card" id="swk-s4">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9h16M1 6v6M17 6v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Situatie &amp; afmetingen</div>
                    <div class="swk-card-desc">Kies het aantal zijdes en vul per zijde de meters in</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-sit-grid">
                    <div class="swk-sit-item swk-selected" data-swk-sit="1">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="8" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="16" y1="42" x2="44" y2="42" stroke="#B08040" stroke-width="3"/><rect x="44" y="38" width="8" height="8" rx="1.5" fill="#555"/><text x="30" y="36" text-anchor="middle" font-size="9" font-weight="600" fill="#4A7C59">A</text></svg>
                        <div class="swk-sit-label">1 zijde<br>geen hoek</div>
                    </div>
                    <div class="swk-sit-item" data-swk-sit="2">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="8" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="12" y1="38" x2="12" y2="16" stroke="#B08040" stroke-width="3"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="16" y1="12" x2="44" y2="12" stroke="#B08040" stroke-width="3"/><rect x="44" y="8" width="8" height="8" rx="1.5" fill="#555"/><text x="12" y="32" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">A</text><text x="30" y="9" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">B</text></svg>
                        <div class="swk-sit-label">2 zijdes<br>1 hoek</div>
                    </div>
                    <div class="swk-sit-item" data-swk-sit="3">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="44" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="48" y1="38" x2="48" y2="16" stroke="#B08040" stroke-width="3"/><rect x="44" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="44" y1="12" x2="16" y2="12" stroke="#B08040" stroke-width="3"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="12" y1="16" x2="12" y2="38" stroke="#B08040" stroke-width="3"/><rect x="8" y="38" width="8" height="8" rx="1.5" fill="#555"/><text x="6" y="30" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">A</text><text x="30" y="9" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">B</text><text x="54" y="30" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">C</text></svg>
                        <div class="swk-sit-label">3 zijdes<br>2 hoeken</div>
                    </div>
                    <div class="swk-sit-item" data-swk-sit="t">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="16" y1="12" x2="44" y2="12" stroke="#B08040" stroke-width="3"/><rect x="44" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="30" y1="16" x2="30" y2="38" stroke="#B08040" stroke-width="3"/><rect x="26" y="38" width="8" height="8" rx="1.5" fill="#555"/><text x="12" y="8" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">A</text><text x="48" y="8" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">B</text><text x="36" y="35" font-size="8" font-weight="600" fill="#4A7C59">C</text></svg>
                        <div class="swk-sit-label">T-splitsing</div>
                    </div>
                    <div class="swk-sit-item" data-swk-sit="4">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="8" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="12" y1="38" x2="12" y2="16" stroke="#B08040" stroke-width="3"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="16" y1="12" x2="44" y2="12" stroke="#B08040" stroke-width="3"/><rect x="44" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="48" y1="16" x2="48" y2="38" stroke="#B08040" stroke-width="3"/><rect x="44" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="44" y1="42" x2="16" y2="42" stroke="#B08040" stroke-width="3"/><text x="6" y="30" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">A</text><text x="30" y="9" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">B</text><text x="54" y="30" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">C</text><text x="30" y="49" text-anchor="middle" font-size="8" font-weight="600" fill="#4A7C59">D</text></svg>
                        <div class="swk-sit-label">4 zijdes<br>3 hoeken</div>
                    </div>
                    <div class="swk-sit-item" data-swk-sit="5">
                        <svg width="60" height="50" viewBox="0 0 60 50"><rect x="8" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="12" y1="38" x2="12" y2="16" stroke="#B08040" stroke-width="3"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="16" y1="12" x2="44" y2="12" stroke="#B08040" stroke-width="3"/><rect x="44" y="8" width="8" height="8" rx="1.5" fill="#555"/><line x1="48" y1="16" x2="48" y2="38" stroke="#B08040" stroke-width="3"/><rect x="44" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="44" y1="42" x2="30" y2="42" stroke="#B08040" stroke-width="3"/><rect x="26" y="38" width="8" height="8" rx="1.5" fill="#555"/><line x1="30" y1="38" x2="30" y2="25" stroke="#B08040" stroke-width="3"/><rect x="26" y="20" width="8" height="8" rx="1.5" fill="#555"/><text x="6" y="30" text-anchor="middle" font-size="7" font-weight="600" fill="#4A7C59">A</text><text x="30" y="9" text-anchor="middle" font-size="7" font-weight="600" fill="#4A7C59">B</text><text x="54" y="30" text-anchor="middle" font-size="7" font-weight="600" fill="#4A7C59">C</text><text x="42" y="49" text-anchor="middle" font-size="7" font-weight="600" fill="#4A7C59">D</text><text x="24" y="30" text-anchor="middle" font-size="7" font-weight="600" fill="#4A7C59">E</text></svg>
                        <div class="swk-sit-label">5 zijdes<br>4 hoeken</div>
                    </div>
                </div>
                <div id="swk-sides-container" class="swk-sides">
                    <div class="swk-side-row">
                        <div class="swk-side-label">A</div>
                        <div class="swk-side-input">
                            <input type="number" min="1" max="30" step="0.5" placeholder="0" data-swk-idx="0">
                            <span>meter</span>
                        </div>
                    </div>
                </div>
                <div class="swk-total-len">
                    <span>Totale lengte:</span>
                    <strong id="swk-total-len-val">0,00 meter</strong>
                </div>
            </div>
        </section>

        <!-- STEP 5: Betonpalen -->
        <section class="swk-step-card" id="swk-s5">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="6" y="1" width="6" height="16" rx="1" fill="currentColor" opacity=".4"/><rect x="7" y="2" width="4" height="14" rx=".5" fill="currentColor"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Betonpalen</div>
                    <div class="swk-card-desc">Kies de kleur van de betonpalen</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-choice-grid">
                    <?php
                    $paal_options = array(
                        'grijs'     => array( 'label' => 'Grijs',     'sub' => 'standaard', 'color' => '#999', 'border' => '#888' ),
                        'antraciet' => array( 'label' => 'Antraciet', 'sub' => '+ &euro;4,50 /m', 'color' => '#333', 'border' => '#222' ),
                        'wit'       => array( 'label' => 'Wit',       'sub' => '+ &euro;4,50 /m', 'color' => '#f5f5f0', 'border' => '#ddd' ),
                    );
                    foreach ( $paal_options as $pk => $po ) :
                        $sel = ( 'grijs' === $pk ) ? ' swk-selected' : '';
                    ?>
                    <div class="swk-choice<?php echo esc_attr( $sel ); ?>" data-swk-paal="<?php echo esc_attr( $pk ); ?>">
                        <div class="swk-choice-dot" style="background:<?php echo esc_attr( $po['color'] ); ?>;border-color:<?php echo esc_attr( $po['border'] ); ?>"></div>
                        <div class="swk-choice-num"><?php echo esc_html( $po['label'] ); ?></div>
                        <div class="swk-choice-sub"><?php echo $po['sub']; /* Contains HTML entity */ ?></div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <!-- STEP 6: Extra opties -->
        <section class="swk-step-card" id="swk-s6">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M9 5v8M5 9h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Extra opties</div>
                    <div class="swk-card-desc">Optionele toevoegingen</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-extras-list">
                    <?php foreach ( $extras as $ek => $ex ) :
                        $price_display = ( 'per_meter' === $ex['unit'] )
                            ? '+ &euro;' . number_format( $ex['price'], 2, ',', '' ) . ' /m'
                            : '+ &euro;' . number_format( $ex['price'], 0, ',', '' );
                    ?>
                    <div class="swk-extra" data-swk-extra="<?php echo esc_attr( $ek ); ?>">
                        <div class="swk-extra-left">
                            <div class="swk-extra-icon"><?php echo esc_html( $ex['icon'] ); ?></div>
                            <div>
                                <div class="swk-extra-name"><?php echo esc_html( $ex['label'] ); ?></div>
                                <div class="swk-extra-desc"><?php echo esc_html( $ex['desc'] ); ?></div>
                            </div>
                        </div>
                        <div class="swk-extra-right">
                            <div class="swk-extra-price"><?php echo $price_display; ?></div>
                            <div class="swk-toggle"></div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <!-- STEP 7: Offerte aanvragen (hidden by default) -->
        <section class="swk-step-card" id="swk-s7" style="display:none;opacity:0;transform:translateY(20px);transition:opacity .4s ease,transform .4s ease">
            <div class="swk-card-header">
                <div class="swk-card-icon">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h12v12H3z" stroke="currentColor" stroke-width="1.4" fill="none" rx="1.5"/><path d="M6 7h6M6 10h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                </div>
                <div>
                    <div class="swk-card-title">Offerte aanvragen</div>
                    <div class="swk-card-desc">Vul uw gegevens in voor een vrijblijvende offerte</div>
                </div>
            </div>
            <div class="swk-card-body">
                <div class="swk-form-summary" id="swk-form-summary"></div>
                <div class="swk-form-group">
                    <div class="swk-form-row">
                        <div class="swk-form-field">
                            <label class="swk-form-label" for="swk-f-voornaam">Voornaam *</label>
                            <input class="swk-form-input" id="swk-f-voornaam" type="text" placeholder="Jan">
                        </div>
                        <div class="swk-form-field">
                            <label class="swk-form-label" for="swk-f-achternaam">Achternaam *</label>
                            <input class="swk-form-input" id="swk-f-achternaam" type="text" placeholder="Jansen">
                        </div>
                    </div>
                    <div class="swk-form-field">
                        <label class="swk-form-label" for="swk-f-straat">Straatnaam + huisnummer *</label>
                        <input class="swk-form-input" id="swk-f-straat" type="text" placeholder="Dorpsstraat 12">
                    </div>
                    <div class="swk-form-row">
                        <div class="swk-form-field">
                            <label class="swk-form-label" for="swk-f-postcode">Postcode *</label>
                            <input class="swk-form-input" id="swk-f-postcode" type="text" placeholder="1234 AB">
                        </div>
                        <div class="swk-form-field">
                            <label class="swk-form-label" for="swk-f-plaats">Plaatsnaam *</label>
                            <input class="swk-form-input" id="swk-f-plaats" type="text" placeholder="Amsterdam">
                        </div>
                    </div>
                    <div class="swk-form-field">
                        <label class="swk-form-label" for="swk-f-email">E-mailadres *</label>
                        <input class="swk-form-input" id="swk-f-email" type="email" placeholder="jan@voorbeeld.nl">
                    </div>
                    <div class="swk-form-field">
                        <label class="swk-form-label" for="swk-f-telefoon">Telefoonnummer *</label>
                        <input class="swk-form-input" id="swk-f-telefoon" type="tel" placeholder="06 12345678">
                    </div>
                    <!-- Honeypot anti-spam -->
                    <div class="swk-hp" aria-hidden="true">
                        <label for="swk-f-website">Website</label>
                        <input id="swk-f-website" type="text" tabindex="-1" autocomplete="off">
                    </div>
                    <div class="swk-form-check">
                        <input type="checkbox" id="swk-f-locatie">
                        <label for="swk-f-locatie">Schutting moet op een andere locatie worden geplaatst</label>
                    </div>
                    <div class="swk-form-field" id="swk-f-locatie-wrap" style="display:none">
                        <label class="swk-form-label" for="swk-f-locatie-adres">Adres plaatsing</label>
                        <input class="swk-form-input" id="swk-f-locatie-adres" type="text" placeholder="Straat, huisnummer, postcode, plaats">
                    </div>
                    <div class="swk-form-field">
                        <label class="swk-form-label" for="swk-f-opmerkingen">Opmerkingen</label>
                        <textarea class="swk-form-input swk-form-textarea" id="swk-f-opmerkingen" rows="3" placeholder="Eventuele opmerkingen of vragen..."></textarea>
                    </div>
                    <button class="swk-cta swk-cta-big" id="swk-submit-btn">Verstuur offerte aanvraag &rarr;</button>
                </div>
            </div>
        </section>

    </div><!-- /.swk-steps -->

    <!-- Right Column: Preview + Price -->
    <aside class="swk-sidebar">
        <div class="swk-preview-card">
            <div class="swk-preview-top">
                <span class="swk-preview-name">Live preview</span>
                <span class="swk-preview-live">Realtime</span>
            </div>
            <div class="swk-scene" id="swk-scene">
                <img id="swk-fence-img" alt="Schutting preview">
                <div class="swk-scene-label" id="swk-scene-label"><?php echo esc_html( $materials[ $first_mat ]['label'] ?? 'Grenen' ); ?> &mdash; Verticaal</div>
            </div>
            <div class="swk-preview-meta">
                <span>Segmenten: <strong id="swk-meta-seg">0</strong></span>
                <span>Palen: <strong id="swk-meta-palen">0</strong></span>
                <span>Lengte: <strong id="swk-meta-len">0,0 m</strong></span>
                <span>Hoogte: <strong>180 cm</strong></span>
            </div>
        </div>

        <div class="swk-price-card">
            <div class="swk-price-header">Uw prijsoverzicht</div>
            <div class="swk-price-body">
                <div class="swk-price-lines">
                    <div class="swk-price-line">
                        <span class="swk-price-line-label" id="swk-pl-type"><?php echo esc_html( $materials[ $first_mat ]['label'] ?? 'Grenen' ); ?></span>
                        <span class="swk-price-line-value" id="swk-pv-base">&euro;0,00</span>
                    </div>
                    <div class="swk-price-line" id="swk-pl-onderplaat" style="display:none">
                        <span class="swk-price-line-label">Betonnen onderplaat</span>
                        <span class="swk-price-line-value" id="swk-pv-onderplaat">&euro;0,00</span>
                    </div>
                    <div class="swk-price-line" id="swk-pl-paal" style="display:none">
                        <span class="swk-price-line-label" id="swk-pl-paal-label">Betonpalen upgrade</span>
                        <span class="swk-price-line-value" id="swk-pv-paal">&euro;0,00</span>
                    </div>
                    <div class="swk-price-line" id="swk-pl-poort" style="display:none">
                        <span class="swk-price-line-label">Looppoort</span>
                        <span class="swk-price-line-value">&euro;289,00</span>
                    </div>
                    <div class="swk-price-line" id="swk-pl-montage" style="display:none">
                        <span class="swk-price-line-label">Montage</span>
                        <span class="swk-price-line-value">&euro;750,00</span>
                    </div>
                </div>
                <hr class="swk-price-sep">
                <div class="swk-price-total-row">
                    <span class="swk-price-total-label">Totaalprijs</span>
                    <span class="swk-price-total-amount" id="swk-pv-total">&euro;0,00</span>
                </div>
                <div class="swk-price-vat">Inclusief 21% BTW</div>
                <div class="swk-price-per-meter">
                    <span>Prijs per meter</span>
                    <strong id="swk-pv-pm">&euro;0,00 /m</strong>
                </div>
                <button class="swk-cta" id="swk-cta-offerte">Vraag gratis offerte aan &rarr;</button>
                <div class="swk-cta-sub">Binnen 24 uur reactie &bull; Vrijblijvend</div>
                <div class="swk-trust-row">
                    <div class="swk-trust-item"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Gratis advies</div>
                    <div class="swk-trust-item"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Geen verplichtingen</div>
                    <div class="swk-trust-item"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Scherpe prijzen</div>
                </div>
            </div>
        </div>
    </aside>

</div><!-- /.swk-layout -->

<!-- Toast notification container -->
<div class="swk-toast" id="swk-toast"></div>

</div><!-- /.swk-wrap -->
