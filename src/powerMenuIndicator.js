import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export const PowerMenuIndicator = GObject.registerClass({
    GTypeName: 'PowerMenuExtension_PowerMenuIndicator',
}, class PowerMenuIndicator extends PanelMenu.Button {
    constructor(extension) {
        // dontCreateMenu = true: this is a plain button, not a dropdown menu.
        super(0.0, _('Power Menu'), true);
        this._extension = extension;

        this.add_child(new St.Icon({
            icon_name: 'system-shutdown-symbolic',
            style_class: 'system-status-icon',
        }));

        this.connect('button-press-event', () => {
            this._extension.toggleOverlay();
            return Clutter.EVENT_STOP;
        });
    }
});
