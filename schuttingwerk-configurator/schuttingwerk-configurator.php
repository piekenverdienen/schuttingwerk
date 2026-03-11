<?php
/**
 * Plugin Name: Schuttingwerk Configurator
 * Plugin URI:  https://schuttingwerk.nl
 * Description: Interactieve schuttingconfigurator waarmee klanten hun schutting samenstellen en een offerte aanvragen.
 * Version:     1.0.0
 * Author:      Schuttingwerk
 * Author URI:  https://schuttingwerk.nl
 * License:     GPL-2.0-or-later
 * Text Domain: schuttingwerk
 */

defined( 'ABSPATH' ) || exit;

define( 'SWK_VERSION', '1.0.0' );
define( 'SWK_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SWK_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once SWK_PLUGIN_DIR . 'includes/class-configurator.php';
require_once SWK_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once SWK_PLUGIN_DIR . 'includes/class-admin.php';

/**
 * Initialize the plugin.
 */
function swk_init() {
    SWK_Configurator::instance();
    SWK_Rest_API::instance();

    if ( is_admin() ) {
        SWK_Admin::instance();
    }
}
add_action( 'plugins_loaded', 'swk_init' );

/**
 * Activation hook — set default options.
 */
function swk_activate() {
    $defaults = array(
        'email_to'      => 'info@schuttingwerk.nl',
        'email_subject'  => 'Offerte aanvraag via Configurator',
        'webhook_url'    => '',
        'rate_limit'     => 5,
        'materials'      => array(
            'grenen'      => array( 'label' => 'Grenen',       'price' => 43, 'photo_key' => 'grenen' ),
            'douglas'     => array( 'label' => 'Douglas',      'price' => 58, 'photo_key' => 'douglas' ),
            'zwartgrenen' => array( 'label' => 'Zwart grenen', 'price' => 52, 'photo_key' => 'antraciet' ),
            'hardhout'    => array( 'label' => 'Hardhout',     'price' => 68, 'photo_key' => 'hout' ),
            'redwood'     => array( 'label' => 'Red Wood',     'price' => 55, 'photo_key' => 'redwood' ),
            'nobifix'     => array( 'label' => 'Nobifix',      'price' => 72, 'photo_key' => 'nobifix' ),
        ),
        'paal_extra'     => array(
            'grijs'     => 0,
            'antraciet' => 4.5,
            'wit'       => 4.5,
        ),
        'extras'         => array(
            'poort'      => array( 'label' => 'Looppoort toevoegen',  'desc' => '100 cm breed, incl. hang- en sluitwerk', 'price' => 289, 'icon' => '🚪', 'unit' => 'fixed' ),
            'onderplaat' => array( 'label' => 'Betonnen onderplaat',   'desc' => '26 cm hoog, beschermt hout tegen vocht',  'price' => 8.5, 'icon' => '🧱', 'unit' => 'per_meter' ),
            'montage'    => array( 'label' => 'Montage door vakman',   'desc' => 'Laat je schutting professioneel plaatsen', 'price' => 750, 'icon' => '🔧', 'unit' => 'fixed' ),
        ),
        'material_info'  => array(
            'grenen'      => array( 'Levensduur 10 – 15 jaar', 'Minder gevoelig voor schimmel en rot', 'Goedkoopste optie' ),
            'douglas'     => array( 'Levensduur 10 – 15 jaar', 'Betaalbaar', 'Vergrijst mooi op natuurlijke wijze' ),
            'zwartgrenen' => array( 'Levensduur 10 – 15 jaar', 'Stijlvol en strak', 'Extra bescherming tegen weersinvloeden' ),
            'hardhout'    => array( 'Levensduur 20 – 25 jaar', 'Weerbestendig', 'Extreem slijtvast' ),
            'redwood'     => array( 'Levensduur 15 – 20 jaar', 'Oogt luxe', 'Milieuvriendelijk' ),
            'nobifix'     => array( 'Levensduur 20 – 25 jaar', 'Milieuvriendelijk', 'Bestand tegen insecten' ),
        ),
    );

    if ( false === get_option( 'swk_settings' ) ) {
        add_option( 'swk_settings', $defaults );
    }
}
register_activation_hook( __FILE__, 'swk_activate' );
