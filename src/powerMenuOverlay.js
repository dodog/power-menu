import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Background from 'resource:///org/gnome/shell/ui/background.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// Reuses gnome-shell's own translations instead of shipping .po files.
// Tries a few known msgid/context candidates per string, since exact
// msgids drift across shell versions.
function sysLabel(candidates) {
    for (const [msgid, context] of candidates) {
        const translated = context
            ? GLib.dpgettext2('gnome-shell', context, msgid)
            : GLib.dgettext('gnome-shell', msgid);
        if (translated !== msgid)
            return translated;
    }
    return candidates[0][0];
}

// Lock/Suspend use SystemActions directly (no confirmation dialog).
// Power Off/Restart/Log Out bypass SystemActions' own session-end
// confirmation dialog, since this overlay already is the confirmation:
// Power Off/Restart go straight to logind, Log Out goes through
// gnome-session with NoConfirmation mode.
function callDBusAsync(bus, name, objectPath, iface, method, params) {
    bus.call(
        name, objectPath, iface, method, params, null,
        Gio.DBusCallFlags.NONE, -1, null,
        (connection, result) => {
            // D-Bus calls can genuinely fail (auth declined, service
            // unreachable) -- report instead of crashing.
            try {
                connection.call_finish(result);
            } catch (e) {
                console.error(e, `Power Menu: ${method} failed`);
                Main.notifyError(_('Power Menu'), e.message);
            }
        });
}

function login1(method) {
    // "true" = allow Polkit to show an auth prompt if needed.
    callDBusAsync(Gio.DBus.system, 'org.freedesktop.login1',
        '/org/freedesktop/login1', 'org.freedesktop.login1.Manager',
        method, new GLib.Variant('(b)', [true]));
}

function sessionLogout(mode) {
    callDBusAsync(Gio.DBus.session, 'org.gnome.SessionManager',
        '/org/gnome/SessionManager', 'org.gnome.SessionManager',
        'Logout', new GLib.Variant('(u)', [mode]));
}

const ACTIONS = [
    {
        icon: 'system-shutdown-symbolic',
        label: () => sysLabel([['Power Off', 'search-result'], ['Power Off', null]]),
        activate: () => login1('PowerOff'),
    },
    {
        icon: 'system-reboot-symbolic',
        label: () => sysLabel([['Restart', 'search-result'], ['Restart', null]]),
        activate: () => login1('Reboot'),
    },
    {
        icon: 'weather-clear-night-symbolic',
        label: () => sysLabel([['Suspend', null]]),
        activate: () => SystemActions.getDefault().activateSuspend(),
    },
    {
        icon: 'system-lock-screen-symbolic',
        // Prefer short "Lock" over "Lock Screen" -- the latter runs too
        // long in some languages (e.g. Slovak). Label also wraps as a
        // fallback for any language where even "Lock" is too long.
        label: () => sysLabel([['Lock', null], ['Lock Screen', 'search-result']]),
        activate: () => SystemActions.getDefault().activateLockScreen(),
    },
    {
        icon: 'system-log-out-symbolic',
        label: () => sysLabel([
            ['Log Out', 'search-result'],
            ['Log out', 'search-result'],
            ['Log Out', null],
            ['Log Out…', null],
        ]),
        activate: () => sessionLogout(1), // 1 = NoConfirmation
    },
];

export const PowerMenuOverlay = GObject.registerClass({
    GTypeName: 'PowerMenuExtension_PowerMenuOverlay',
}, class PowerMenuOverlay extends St.Widget {
    constructor() {
        const [width, height] = global.stage.get_size();

        super({
            layout_manager: new Clutter.BinLayout(),
            reactive: true,
            can_focus: true,
            accessible_role: Atk.Role.DIALOG,
            x: 0,
            y: 0,
            width,
            height,
            opacity: 0,
        });

        this._backgroundManagers = [];
        this._buttons = [];

        this._buildBackground(width, height);
        this._buildButtons();

        this.connect('key-press-event', (_actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Right) {
                this._moveFocus(symbol === Clutter.KEY_Right ? 1 : -1);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    // Moves focus left/right with wraparound. get_key_focus() can be
    // null on Wayland; indexOf() already treats that as "-1 = none".
    _moveFocus(direction) {
        const count = this._buttons.length;
        if (count === 0)
            return;

        const current = this._buttons.indexOf(global.stage.get_key_focus());
        const next = current === -1
            ? (direction > 0 ? 0 : count - 1)
            : (current + direction + count) % count;

        this._buttons[next].grab_key_focus();
    }

    _buildBackground(width, height) {
        // Opaque backstop under the blurred background (safety net).
        const base = new St.Widget({ reactive: false, style_class: 'power-menu-base', width, height });
        this.add_child(base);

        const blurContainer = new St.Widget({ reactive: false, width, height });

        // Fresh background actors, like the real lock screen uses --
        // NOT a clone of the live desktop scene (which could bleed
        // window content into the blur).
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const bgManager = new Background.BackgroundManager({
                container: blurContainer,
                layoutManager: Main.layoutManager,
                monitorIndex: i,
                vignette: false,
            });
            this._backgroundManagers.push(bgManager);
        }

        blurContainer.add_effect(new Shell.BlurEffect({
            radius: 60,
            // Tuned by eye to match the real lock screen's dimness.
            brightness: 0.7,
            mode: Shell.BlurMode.ACTOR,
        }));

        this.add_child(blurContainer);

        const dim = new St.Widget({
            reactive: true,
            style_class: 'power-menu-dim',
            width,
            height,
        });
        // Sibling of the button row, not an ancestor -- so it can never
        // swallow a button's own click.
        dim.connect('button-press-event', () => {
            this.close();
            return Clutter.EVENT_STOP;
        });
        this.add_child(dim);
    }

    _buildButtons() {
        const box = new St.BoxLayout({
            style_class: 'power-menu-box',
            reactive: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(box);

        for (const action of ACTIONS) {
            const button = this._createButton(action);
            this._buttons.push(button);
            box.add_child(button);
        }
    }

    _createButton({ icon, label, activate }) {
        // Label lives inside the button, so it shares the same
        // click/hover target as the icon.
        const iconStack = new St.Widget({ layout_manager: new Clutter.BinLayout(), reactive: false });

        // Two identical glow layers stacked on top of each other
        const glowLayers = [];
        for (let i = 0; i < 2; i++) {
            const glowLayer = new St.Widget({
                layout_manager: new Clutter.BinLayout(),
                opacity: 0,
                reactive: false,
                width: 130,
                height: 130,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            glowLayer.add_child(new St.Icon({
                icon_name: icon,
                style_class: 'power-menu-icon-glow',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            }));
            glowLayer.add_effect(new Shell.BlurEffect({
                radius: 18,
                brightness: 5,
                mode: Shell.BlurMode.ACTOR,
            }));
            iconStack.add_child(glowLayer);
            glowLayers.push(glowLayer);
        }

        const mainIcon = new St.Icon({
            icon_name: icon,
            style_class: 'power-menu-icon',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        iconStack.add_child(mainIcon);

        const content = new St.BoxLayout({
            style_class: 'power-menu-content',
            orientation: Clutter.Orientation.VERTICAL,
            x_align: Clutter.ActorAlign.CENTER,
        });
        content.add_child(iconStack);

        const labelActor = new St.Label({
            text: label(),
            style_class: 'power-menu-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        // Word-wrap fallback for languages where even the short label
        // is too long. St.Label defaults to single-line + ellipsize, so
        // both must be explicitly turned off for wrapping to work.
        labelActor.clutter_text.set({
            line_wrap: true,
            line_wrap_mode: Pango.WrapMode.WORD_CHAR,
            text_align: Pango.Alignment.CENTER,
            single_line_mode: false,
            ellipsize: Pango.EllipsizeMode.NONE,
        });
        content.add_child(labelActor);

        const button = new St.Button({
            style_class: 'power-menu-button',
            can_focus: true,
            track_hover: true,
            child: content,
        });

        // Glow is hover-only; keyboard focus gets its own look (CSS
        // :focus) so the two input methods don't visually collide.
        const setGlow = active => {
            for (const glowLayer of glowLayers)
                glowLayer.ease({ opacity: active ? 220 : 0, duration: 150 });
        };
        button.connect('notify::hover', () => setGlow(button.hover));

        button.connect('clicked', () => {
            // activate() can throw (D-Bus/SystemActions) -- report
            // instead of crashing or leaving the overlay stuck open.
            try {
                activate();
            } catch (e) {
                console.error(e, 'Power Menu: action failed');
                Main.notifyError(_('Power Menu'), e.message);
            }
            this.close();
        });

        return button;
    }

    open() {
        const [width, height] = global.stage.get_size();
        this.set_size(width, height);

        // No Main.pushModal(): a full-screen reactive widget already
        // blocks every click; the modal grab risked breaking click
        // delivery down into the buttons.
        Main.layoutManager.uiGroup.add_child(this);

        this.grab_key_focus();
        this.ease({ opacity: 255, duration: 150, mode: Clutter.AnimationMode.EASE_OUT_QUAD });
    }

    close() {
        if (this._closing)
            return;
        this._closing = true;

        if (this.get_parent())
            this.get_parent().remove_child(this);

        this.ease({
            opacity: 0,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.destroy(),
        });
    }

    destroy() {
        // BackgroundManager holds a ref-counted resource that must be
        // destroy()'d explicitly -- actor teardown alone won't release it.
        this._backgroundManagers.forEach(mgr => mgr.destroy());
        this._backgroundManagers = [];

        super.destroy();
    }
});
