<?php
defined( 'ABSPATH' ) || exit;

/**
 * REST API handler for quote submissions.
 */
class SWK_Rest_API {

    private static $instance = null;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    /**
     * Register REST routes.
     */
    public function register_routes() {
        register_rest_route( 'schuttingwerk/v1', '/offerte', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle_quote' ),
            'permission_callback' => '__return_true', // Public endpoint, validated via nonce
        ) );
    }

    /**
     * Handle incoming quote request.
     */
    public function handle_quote( WP_REST_Request $request ) {
        // Verify nonce.
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new WP_Error( 'invalid_nonce', 'Ongeldige beveiligingstoken. Ververs de pagina en probeer opnieuw.', array( 'status' => 403 ) );
        }

        // Rate limiting.
        if ( $this->is_rate_limited() ) {
            return new WP_Error( 'rate_limited', 'Te veel aanvragen. Probeer het over een uur opnieuw.', array( 'status' => 429 ) );
        }

        $body = $request->get_json_params();

        // Validate structure.
        if ( empty( $body['klant'] ) || empty( $body['configuratie'] ) ) {
            return new WP_Error( 'invalid_data', 'Onvolledige gegevens.', array( 'status' => 400 ) );
        }

        $klant  = $body['klant'];
        $config = $body['configuratie'];

        // Sanitize customer fields.
        $clean_klant = array(
            'voornaam'      => sanitize_text_field( $klant['voornaam'] ?? '' ),
            'achternaam'    => sanitize_text_field( $klant['achternaam'] ?? '' ),
            'straat'        => sanitize_text_field( $klant['straat'] ?? '' ),
            'postcode'      => sanitize_text_field( $klant['postcode'] ?? '' ),
            'plaats'        => sanitize_text_field( $klant['plaats'] ?? '' ),
            'email'         => sanitize_email( $klant['email'] ?? '' ),
            'telefoon'      => sanitize_text_field( $klant['telefoon'] ?? '' ),
            'opmerkingen'   => sanitize_textarea_field( $klant['opmerkingen'] ?? '' ),
            'locatie_adres' => sanitize_text_field( $klant['locatie_adres'] ?? '' ),
        );

        // Validate required fields.
        $required = array( 'voornaam', 'achternaam', 'straat', 'postcode', 'plaats', 'email', 'telefoon' );
        foreach ( $required as $field ) {
            if ( empty( $clean_klant[ $field ] ) ) {
                return new WP_Error( 'missing_field', sprintf( 'Het veld "%s" is verplicht.', $field ), array( 'status' => 400 ) );
            }
        }

        if ( ! is_email( $clean_klant['email'] ) ) {
            return new WP_Error( 'invalid_email', 'Ongeldig e-mailadres.', array( 'status' => 400 ) );
        }

        // Sanitize configuration.
        $clean_config = $this->sanitize_config( $config );

        // Server-side price recalculation.
        $server_price = $this->calculate_price( $clean_config );

        // Send emails.
        $settings = get_option( 'swk_settings', array() );
        $this->send_admin_email( $clean_klant, $clean_config, $server_price, $settings );
        $this->send_customer_email( $clean_klant, $clean_config, $server_price );

        // Optionally forward to webhook.
        $webhook_url = isset( $settings['webhook_url'] ) ? $settings['webhook_url'] : '';
        if ( ! empty( $webhook_url ) ) {
            $this->forward_to_webhook( $webhook_url, $clean_klant, $clean_config, $server_price );
        }

        // Record rate limit.
        $this->record_request();

        return rest_ensure_response( array(
            'success' => true,
            'message' => 'Offerte aanvraag succesvol ontvangen.',
        ) );
    }

    /**
     * Sanitize configuration data.
     */
    private function sanitize_config( $config ) {
        $settings  = get_option( 'swk_settings', array() );
        $materials = isset( $settings['materials'] ) ? array_keys( $settings['materials'] ) : array();

        $type = sanitize_text_field( $config['type'] ?? 'grenen' );
        if ( ! in_array( $type, $materials, true ) ) {
            $type = $materials[0] ?? 'grenen';
        }

        $orient = sanitize_text_field( $config['orientatie'] ?? 'verticaal' );
        if ( ! in_array( $orient, array( 'verticaal', 'horizontaal' ), true ) ) {
            $orient = 'verticaal';
        }

        $planken = absint( $config['planken'] ?? 21 );
        if ( ! in_array( $planken, array( 19, 21, 23 ), true ) ) {
            $planken = 21;
        }

        $situatie = sanitize_text_field( $config['situatie'] ?? '1' );
        $valid_sit = array( '1', '2', '3', 't', '4', '5', '6', '7', '4g', '2p' );
        if ( ! in_array( $situatie, $valid_sit, true ) ) {
            $situatie = '1';
        }

        $zijden = array();
        if ( isset( $config['zijden'] ) && is_array( $config['zijden'] ) ) {
            foreach ( $config['zijden'] as $z ) {
                $zijden[] = max( 0, min( 30, floatval( $z ) ) );
            }
        }

        $paal_options = array( 'grijs', 'antraciet', 'wit' );
        $paal = sanitize_text_field( $config['betonpaal'] ?? 'grijs' );
        if ( ! in_array( $paal, $paal_options, true ) ) {
            $paal = 'grijs';
        }

        $extras = array();
        $valid_extras = isset( $settings['extras'] ) ? array_keys( $settings['extras'] ) : array();
        if ( isset( $config['extras'] ) && is_array( $config['extras'] ) ) {
            foreach ( $config['extras'] as $ek => $ev ) {
                if ( in_array( $ek, $valid_extras, true ) ) {
                    $extras[ $ek ] = (bool) $ev;
                }
            }
        }

        return array(
            'type'       => $type,
            'orientatie' => $orient,
            'planken'    => $planken,
            'situatie'   => $situatie,
            'zijden'     => $zijden,
            'betonpaal'  => $paal,
            'extras'     => $extras,
        );
    }

    /**
     * Server-side price calculation.
     */
    private function calculate_price( $config ) {
        $settings  = get_option( 'swk_settings', array() );
        $materials = isset( $settings['materials'] ) ? $settings['materials'] : array();
        $paal_ex   = isset( $settings['paal_extra'] ) ? $settings['paal_extra'] : array();
        $extras    = isset( $settings['extras'] ) ? $settings['extras'] : array();

        $len = array_sum( $config['zijden'] );
        $mat = isset( $materials[ $config['type'] ] ) ? $materials[ $config['type'] ] : null;

        $total = $mat ? $mat['price'] * $len : 0;
        $total += ( $paal_ex[ $config['betonpaal'] ] ?? 0 ) * $len;

        foreach ( $config['extras'] as $ek => $active ) {
            if ( $active && isset( $extras[ $ek ] ) ) {
                $ex = $extras[ $ek ];
                if ( 'per_meter' === $ex['unit'] ) {
                    $total += $ex['price'] * $len;
                } else {
                    $total += $ex['price'];
                }
            }
        }

        return round( $total, 2 );
    }

    /**
     * Send email to admin.
     */
    private function send_admin_email( $klant, $config, $price, $settings ) {
        $to      = isset( $settings['email_to'] ) ? $settings['email_to'] : 'info@schuttingwerk.nl';
        $subject = isset( $settings['email_subject'] ) ? $settings['email_subject'] : 'Offerte aanvraag';
        $subject .= ' - ' . $klant['voornaam'] . ' ' . $klant['achternaam'];

        $materials = isset( $settings['materials'] ) ? $settings['materials'] : array();
        $mat_label = isset( $materials[ $config['type'] ]['label'] ) ? $materials[ $config['type'] ]['label'] : $config['type'];

        $sit_labels = array(
            '1' => array( 'A' ), '2' => array( 'A', 'B' ), '3' => array( 'A', 'B', 'C' ),
            't' => array( 'A', 'B', 'C' ), '4' => array( 'A', 'B', 'C', 'D' ), '5' => array( 'A', 'B', 'C', 'D', 'E' ),
            '6' => array( 'A', 'B', 'C', 'D', 'E', 'F' ), '7' => array( 'A', 'B', 'C', 'D', 'E', 'F', 'G' ),
            '4g' => array( 'A', 'B', 'C', 'D' ), '2p' => array( 'A', 'B' ),
        );
        $labels = isset( $sit_labels[ $config['situatie'] ] ) ? $sit_labels[ $config['situatie'] ] : array( 'A' );
        $sides_str = '';
        foreach ( $config['zijden'] as $i => $val ) {
            $lbl = isset( $labels[ $i ] ) ? $labels[ $i ] : ( $i + 1 );
            $sides_str .= $lbl . ': ' . $val . 'm, ';
        }
        $sides_str = rtrim( $sides_str, ', ' );

        $extras_str = '';
        $extras_cfg = isset( $settings['extras'] ) ? $settings['extras'] : array();
        foreach ( $config['extras'] as $ek => $active ) {
            if ( $active && isset( $extras_cfg[ $ek ] ) ) {
                $extras_str .= $extras_cfg[ $ek ]['label'] . ', ';
            }
        }
        $extras_str = rtrim( $extras_str, ', ' );
        if ( empty( $extras_str ) ) {
            $extras_str = 'Geen';
        }

        $len = array_sum( $config['zijden'] );

        $body = "Nieuwe offerte aanvraag via de configurator:\n\n";
        $body .= "=== KLANTGEGEVENS ===\n";
        $body .= "Naam:      {$klant['voornaam']} {$klant['achternaam']}\n";
        $body .= "Adres:     {$klant['straat']}, {$klant['postcode']} {$klant['plaats']}\n";
        $body .= "Email:     {$klant['email']}\n";
        $body .= "Telefoon:  {$klant['telefoon']}\n";
        if ( ! empty( $klant['locatie_adres'] ) ) {
            $body .= "Plaatsing: {$klant['locatie_adres']}\n";
        }
        if ( ! empty( $klant['opmerkingen'] ) ) {
            $body .= "Opmerkingen: {$klant['opmerkingen']}\n";
        }
        $body .= "\n=== CONFIGURATIE ===\n";
        $body .= "Type:        {$mat_label}\n";
        $body .= "Plaatsing:   {$config['orientatie']}\n";
        $body .= "Planken:     {$config['planken']} per segment\n";
        $body .= "Situatie:    {$sides_str}\n";
        $body .= "Totale lengte: {$len} meter\n";
        $body .= "Betonpalen:  {$config['betonpaal']}\n";
        $body .= "Extra's:     {$extras_str}\n";
        $body .= "\n=== PRIJS ===\n";
        $body .= 'Indicatie totaalprijs: ' . "\xE2\x82\xAC" . number_format( $price, 2, ',', '.' ) . " (incl. BTW)\n";
        if ( $len > 0 ) {
            $body .= 'Prijs per meter: ' . "\xE2\x82\xAC" . number_format( $price / $len, 2, ',', '.' ) . " /m\n";
        }

        wp_mail( $to, $subject, $body );
    }

    /**
     * Send confirmation email to customer.
     */
    private function send_customer_email( $klant, $config, $price ) {
        $to      = $klant['email'];
        $subject = 'Bevestiging offerte aanvraag - Schuttingwerk.nl';

        $settings  = get_option( 'swk_settings', array() );
        $materials = isset( $settings['materials'] ) ? $settings['materials'] : array();
        $mat_label = isset( $materials[ $config['type'] ]['label'] ) ? $materials[ $config['type'] ]['label'] : $config['type'];

        $body  = "Beste {$klant['voornaam']},\n\n";
        $body .= "Bedankt voor je offerte aanvraag via onze configurator!\n\n";
        $body .= "We hebben de volgende configuratie ontvangen:\n";
        $body .= "- Type: {$mat_label}\n";
        $body .= "- Plaatsing: {$config['orientatie']}\n";
        $body .= "- Planken: {$config['planken']} per segment\n";
        $body .= "- Betonpalen: {$config['betonpaal']}\n";
        $body .= '- Indicatie totaalprijs: ' . "\xE2\x82\xAC" . number_format( $price, 2, ',', '.' ) . "\n\n";
        $body .= "We nemen binnen 24 uur contact met je op voor een definitieve offerte.\n\n";
        $body .= "Met vriendelijke groet,\n";
        $body .= "Team Schuttingwerk\n";
        $body .= "https://schuttingwerk.nl\n";

        wp_mail( $to, $subject, $body );
    }

    /**
     * Forward quote to external webhook.
     */
    private function forward_to_webhook( $url, $klant, $config, $price ) {
        wp_remote_post( $url, array(
            'timeout' => 10,
            'body'    => wp_json_encode( array(
                'klant'        => $klant,
                'configuratie' => $config,
                'totaalprijs'  => $price,
                'timestamp'    => current_time( 'c' ),
            ) ),
            'headers' => array( 'Content-Type' => 'application/json' ),
        ) );
    }

    /**
     * Check if current IP is rate limited.
     */
    private function is_rate_limited() {
        $settings   = get_option( 'swk_settings', array() );
        $max        = isset( $settings['rate_limit'] ) ? (int) $settings['rate_limit'] : 5;
        $ip         = $this->get_client_ip();
        $key        = 'swk_rl_' . md5( $ip );
        $count      = (int) get_transient( $key );

        return $count >= $max;
    }

    /**
     * Record a request for rate limiting.
     */
    private function record_request() {
        $ip    = $this->get_client_ip();
        $key   = 'swk_rl_' . md5( $ip );
        $count = (int) get_transient( $key );

        set_transient( $key, $count + 1, HOUR_IN_SECONDS );
    }

    /**
     * Get client IP address.
     */
    private function get_client_ip() {
        if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
            $ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
            return trim( $ips[0] );
        }
        return sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1' ) );
    }
}
