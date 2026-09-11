[![My GNOME Extensions](https://img.shields.io/badge/My_other_GNOME_Extensions-grey?style=for-the-badge&logo=gnome&logoColor=white)](#)
[![Extension 1](https://img.shields.io/badge/-Gotify_notifications-blue?style=for-the-badge&logo=gnome&logoColor=white&labelColor=555555)](https://github.com/dodog/gotify-notifications)
[![Extension 2](https://img.shields.io/badge/-Power_menu-orange?style=for-the-badge&logo=gnome&logoColor=white&labelColor=555555)](https://github.com/dodog/power-menu)
[![Extension 3](https://img.shields.io/badge/-Vertigrid-green?style=for-the-badge&logo=gnome&logoColor=white&labelColor=555555)](https://github.com/dodog/vertigrid)


# Power Menu

A GNOME Shell extension that adds a power button to the top panel. Clicking
it opens a full-screen menu — with a blurred background —
for quickly powering off, restarting, suspending, locking, or logging out.


## 🖥️ Screenshot
### Full screen power menu
![Full screen power menu](assets/screenshot.png)



## Features

- **One click, no sub-menu.** A single power icon in the top panel opens a
  full-screen overlay directly — no nested menu to dig through.
- **Five actions:** Power Off, Restart, Suspend, Lock, and Log Out.
- **Skips the extra confirmation dialog** - still respecting real inhibitors (e.g. unsaved documents).
- **Keyboard-friendly:** arrow keys move focus between actions, Enter/Space
  activates the focused one, Escape closes the menu.
- **Click anywhere outside the buttons** to dismiss.
- **Uses GNOME Shell's own translations** so it follows your system language.

## Requirements

- GNOME Shell 48, 49, 50, tested on 51.beta

## 🚀 Installation
---------------

### Method 1: 📦 Available on extensions.gnome.org:
Install Power Menu via [extensions.gnome.org](https://extensions.gnome.org/extension/10732/power-menu/)

 <a href="https://extensions.gnome.org/extension/10732/power-menu/" target="_blank"><img alt="Get it on GNOME Extensions" width="228" src="https://github.com/dodog/gotify-notifications/raw/main/assets/get-it-on-ego.svg?sanitize=true"></img></a>

    
### Method 2: Manual installation
 ```bash

# Download or clone this repository.
git clone https://github.com/dodog/power-menu.git

# Copy to extensions directory
cp \-r power-menu/src ~/.local/share/gnome-shell/extensions/power-menu@dodog.github.io

# Log out and log in, then enable the extension:
gnome-extensions enable power-menu@dodog.github.io
   ```


## Usage

Click the power icon in the top panel to open the menu. From there:

- Click an action, or use the **arrow keys** to move between actions and
  **Enter**/**Space** to activate the highlighted one.
- Press **Escape** or click anywhere outside the buttons to close the menu
  without doing anything.

## File structure

| File                     | Purpose                                             |
| ------------------------ | ---------------------------------------------------- |
| `metadata.json`           | Extension metadata (UUID, name, supported versions). |
| `extension.js`             | Entry point — enables/disables the panel indicator.  |
| `powerMenuIndicator.js`    | The panel button.                                    |
| `powerMenuOverlay.js`      | The full-screen menu: background, buttons, actions.  |
| `stylesheet.css`           | Styling for the overlay and buttons.                 |

## Contributing

Issues and pull requests are welcome. Please test any changes on a
GNOME Shell before submitting.

## ❤️ Support

Like this extension? Give it a ⭐ on GitHub. And if you really like it, you can buy me a coffee:

- ☕ [Buy Me a Coffee](https://www.buymeacoffee.com/dodog)

## License

GPL-3.0 see [`LICENSE`](LICENSE) for details.
