import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { PowerMenuOverlay } from './powerMenuOverlay.js';
import { PowerMenuIndicator } from './powerMenuIndicator.js';

export default class PowerMenuExtension extends Extension {
    enable() {
        this._overlay = null;
        this._indicator = new PowerMenuIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._overlay) {
            this._overlay.destroy();
            this._overlay = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    toggleOverlay() {
        if (this._overlay) {
            this._overlay.close();
            return;
        }

        this._overlay = new PowerMenuOverlay();
        this._overlay.connect('destroy', () => {
            this._overlay = null;
        });
        this._overlay.open();
    }
}
