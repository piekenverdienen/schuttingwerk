<?php
defined( 'ABSPATH' ) || exit;

/**
 * Main configurator class — handles shortcode rendering and asset loading.
 */
class SWK_Configurator {

    private static $instance = null;
    private $has_shortcode    = false;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_shortcode( 'schutting_configurator', array( $this, 'render' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue' ) );
    }

    /**
     * Only enqueue assets on pages that contain the shortcode.
     */
    public function maybe_enqueue() {
        global $post;

        if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'schutting_configurator' ) ) {
            $this->enqueue_assets();
        }
    }

    /**
     * Enqueue CSS and JS, pass configuration to frontend.
     */
    private function enqueue_assets() {
        wp_enqueue_style(
            'swk-configurator',
            SWK_PLUGIN_URL . 'assets/css/configurator.css',
            array(),
            SWK_VERSION
        );

        wp_enqueue_script(
            'swk-configurator',
            SWK_PLUGIN_URL . 'assets/js/configurator.js',
            array(),
            SWK_VERSION,
            true
        );

        $settings = get_option( 'swk_settings', array() );

        // Build photo URLs map.
        $photo_base = SWK_PLUGIN_URL . 'assets/images/previews/';
        $photos     = array();
        $materials  = isset( $settings['materials'] ) ? $settings['materials'] : array();

        foreach ( $materials as $key => $mat ) {
            $pk = isset( $mat['photo_key'] ) ? $mat['photo_key'] : $key;
            foreach ( array( 'verticaal', 'horizontaal' ) as $orient ) {
                foreach ( array( 'zonder', 'met' ) as $plate ) {
                    $photos[ $pk . '_' . $orient . '_' . $plate ] = $photo_base . $pk . '-' . $orient . '-' . $plate . '.jpg';
                }
            }
        }

        wp_localize_script( 'swk-configurator', 'swkData', array(
            'restUrl'    => esc_url_raw( rest_url( 'schuttingwerk/v1/offerte' ) ),
            'nonce'      => wp_create_nonce( 'wp_rest' ),
            'materials'  => $materials,
            'paalExtra'  => isset( $settings['paal_extra'] ) ? $settings['paal_extra'] : array(),
            'extras'     => isset( $settings['extras'] ) ? $settings['extras'] : array(),
            'photos'     => $photos,
            'pluginUrl'  => SWK_PLUGIN_URL,
        ) );
    }

    /**
     * Render the configurator shortcode.
     */
    public function render( $atts ) {
        // Force enqueue if not already done (e.g. page builders).
        if ( ! wp_style_is( 'swk-configurator', 'enqueued' ) ) {
            $this->enqueue_assets();
        }

        $settings = get_option( 'swk_settings', array() );

        ob_start();
        include SWK_PLUGIN_DIR . 'templates/configurator.php';
        return ob_get_clean();
    }

    /**
     * Helper: get material config.
     */
    public static function get_materials() {
        $settings = get_option( 'swk_settings', array() );
        return isset( $settings['materials'] ) ? $settings['materials'] : array();
    }

    /**
     * Helper: get material info tooltips.
     */
    public static function get_material_info() {
        $settings = get_option( 'swk_settings', array() );
        return isset( $settings['material_info'] ) ? $settings['material_info'] : array();
    }

    /**
     * Helper: get extras config.
     */
    public static function get_extras() {
        $settings = get_option( 'swk_settings', array() );
        return isset( $settings['extras'] ) ? $settings['extras'] : array();
    }

    /**
     * Helper: get paal extra costs.
     */
    public static function get_paal_extra() {
        $settings = get_option( 'swk_settings', array() );
        return isset( $settings['paal_extra'] ) ? $settings['paal_extra'] : array();
    }
}
