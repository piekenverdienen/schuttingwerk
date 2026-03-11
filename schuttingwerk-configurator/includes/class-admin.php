<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin settings page for the configurator.
 */
class SWK_Admin {

    private static $instance = null;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'admin_menu', array( $this, 'add_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    /**
     * Add settings page under Settings menu.
     */
    public function add_menu() {
        add_options_page(
            'Schuttingwerk Configurator',
            'Schuttingwerk',
            'manage_options',
            'swk-settings',
            array( $this, 'render_page' )
        );
    }

    /**
     * Register settings.
     */
    public function register_settings() {
        register_setting( 'swk_settings_group', 'swk_settings', array(
            'sanitize_callback' => array( $this, 'sanitize_settings' ),
        ) );
    }

    /**
     * Sanitize all settings on save.
     */
    public function sanitize_settings( $input ) {
        $clean = array();

        $clean['email_to']     = sanitize_email( $input['email_to'] ?? 'info@schuttingwerk.nl' );
        $clean['email_subject'] = sanitize_text_field( $input['email_subject'] ?? 'Offerte aanvraag via Configurator' );
        $clean['webhook_url']  = esc_url_raw( $input['webhook_url'] ?? '' );
        $clean['rate_limit']   = absint( $input['rate_limit'] ?? 5 );

        // Materials.
        $clean['materials'] = array();
        if ( isset( $input['materials'] ) && is_array( $input['materials'] ) ) {
            foreach ( $input['materials'] as $key => $mat ) {
                $clean['materials'][ sanitize_key( $key ) ] = array(
                    'label'     => sanitize_text_field( $mat['label'] ?? '' ),
                    'price'     => floatval( $mat['price'] ?? 0 ),
                    'photo_key' => sanitize_key( $mat['photo_key'] ?? $key ),
                );
            }
        }

        // Paal extra.
        $clean['paal_extra'] = array();
        if ( isset( $input['paal_extra'] ) && is_array( $input['paal_extra'] ) ) {
            foreach ( $input['paal_extra'] as $key => $val ) {
                $clean['paal_extra'][ sanitize_key( $key ) ] = floatval( $val );
            }
        }

        // Extras.
        $clean['extras'] = array();
        if ( isset( $input['extras'] ) && is_array( $input['extras'] ) ) {
            foreach ( $input['extras'] as $key => $ex ) {
                $clean['extras'][ sanitize_key( $key ) ] = array(
                    'label' => sanitize_text_field( $ex['label'] ?? '' ),
                    'desc'  => sanitize_text_field( $ex['desc'] ?? '' ),
                    'price' => floatval( $ex['price'] ?? 0 ),
                    'icon'  => sanitize_text_field( $ex['icon'] ?? '' ),
                    'unit'  => in_array( $ex['unit'] ?? '', array( 'fixed', 'per_meter' ), true ) ? $ex['unit'] : 'fixed',
                );
            }
        }

        // Material info (preserve from existing settings if not in input).
        $existing = get_option( 'swk_settings', array() );
        $clean['material_info'] = isset( $existing['material_info'] ) ? $existing['material_info'] : array();

        return $clean;
    }

    /**
     * Render the settings page.
     */
    public function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $settings = get_option( 'swk_settings', array() );
        ?>
        <div class="wrap">
            <h1>Schuttingwerk Configurator Instellingen</h1>
            <p>Beheer de instellingen van de schuttingconfigurator. Gebruik de shortcode <code>[schutting_configurator]</code> om de configurator op een pagina te plaatsen.</p>

            <form method="post" action="options.php">
                <?php settings_fields( 'swk_settings_group' ); ?>

                <h2 class="title">Algemeen</h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="swk-email-to">E-mailadres voor offertes</label></th>
                        <td><input type="email" id="swk-email-to" name="swk_settings[email_to]" value="<?php echo esc_attr( $settings['email_to'] ?? 'info@schuttingwerk.nl' ); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="swk-email-subject">E-mail onderwerp</label></th>
                        <td><input type="text" id="swk-email-subject" name="swk_settings[email_subject]" value="<?php echo esc_attr( $settings['email_subject'] ?? 'Offerte aanvraag via Configurator' ); ?>" class="regular-text"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="swk-webhook-url">Webhook URL (optioneel)</label></th>
                        <td>
                            <input type="url" id="swk-webhook-url" name="swk_settings[webhook_url]" value="<?php echo esc_attr( $settings['webhook_url'] ?? '' ); ?>" class="regular-text">
                            <p class="description">Optioneel: URL voor Make.com, n8n, of Zapier webhook.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="swk-rate-limit">Rate limit (per uur per IP)</label></th>
                        <td><input type="number" id="swk-rate-limit" name="swk_settings[rate_limit]" value="<?php echo esc_attr( $settings['rate_limit'] ?? 5 ); ?>" min="1" max="100" class="small-text"></td>
                    </tr>
                </table>

                <h2 class="title">Materialen &amp; Prijzen</h2>
                <table class="widefat striped" style="max-width:800px">
                    <thead>
                        <tr>
                            <th>Sleutel</th>
                            <th>Naam</th>
                            <th>Prijs per meter (&euro;)</th>
                            <th>Foto sleutel</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $mats = isset( $settings['materials'] ) ? $settings['materials'] : array();
                        foreach ( $mats as $key => $mat ) :
                        ?>
                        <tr>
                            <td><code><?php echo esc_html( $key ); ?></code></td>
                            <td><input type="text" name="swk_settings[materials][<?php echo esc_attr( $key ); ?>][label]" value="<?php echo esc_attr( $mat['label'] ); ?>" class="regular-text"></td>
                            <td><input type="number" step="0.01" name="swk_settings[materials][<?php echo esc_attr( $key ); ?>][price]" value="<?php echo esc_attr( $mat['price'] ); ?>" class="small-text"></td>
                            <td><input type="text" name="swk_settings[materials][<?php echo esc_attr( $key ); ?>][photo_key]" value="<?php echo esc_attr( $mat['photo_key'] ?? $key ); ?>" class="regular-text"></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <h2 class="title" style="margin-top:20px">Betonpalen Toeslagen</h2>
                <table class="widefat striped" style="max-width:500px">
                    <thead>
                        <tr>
                            <th>Kleur</th>
                            <th>Toeslag per meter (&euro;)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $pe = isset( $settings['paal_extra'] ) ? $settings['paal_extra'] : array();
                        foreach ( $pe as $pk => $pv ) :
                        ?>
                        <tr>
                            <td><?php echo esc_html( ucfirst( $pk ) ); ?></td>
                            <td><input type="number" step="0.01" name="swk_settings[paal_extra][<?php echo esc_attr( $pk ); ?>]" value="<?php echo esc_attr( $pv ); ?>" class="small-text"></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <h2 class="title" style="margin-top:20px">Extra Opties</h2>
                <table class="widefat striped" style="max-width:800px">
                    <thead>
                        <tr>
                            <th>Sleutel</th>
                            <th>Naam</th>
                            <th>Beschrijving</th>
                            <th>Prijs (&euro;)</th>
                            <th>Eenheid</th>
                            <th>Icoon</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $exs = isset( $settings['extras'] ) ? $settings['extras'] : array();
                        foreach ( $exs as $ek => $ex ) :
                        ?>
                        <tr>
                            <td><code><?php echo esc_html( $ek ); ?></code></td>
                            <td><input type="text" name="swk_settings[extras][<?php echo esc_attr( $ek ); ?>][label]" value="<?php echo esc_attr( $ex['label'] ); ?>" class="regular-text"></td>
                            <td><input type="text" name="swk_settings[extras][<?php echo esc_attr( $ek ); ?>][desc]" value="<?php echo esc_attr( $ex['desc'] ); ?>" class="regular-text"></td>
                            <td><input type="number" step="0.01" name="swk_settings[extras][<?php echo esc_attr( $ek ); ?>][price]" value="<?php echo esc_attr( $ex['price'] ); ?>" class="small-text"></td>
                            <td>
                                <select name="swk_settings[extras][<?php echo esc_attr( $ek ); ?>][unit]">
                                    <option value="fixed" <?php selected( $ex['unit'] ?? 'fixed', 'fixed' ); ?>>Vast bedrag</option>
                                    <option value="per_meter" <?php selected( $ex['unit'] ?? 'fixed', 'per_meter' ); ?>>Per meter</option>
                                </select>
                            </td>
                            <td><input type="text" name="swk_settings[extras][<?php echo esc_attr( $ek ); ?>][icon]" value="<?php echo esc_attr( $ex['icon'] ); ?>" class="small-text"></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <?php submit_button( 'Instellingen opslaan' ); ?>
            </form>
        </div>
        <?php
    }
}
