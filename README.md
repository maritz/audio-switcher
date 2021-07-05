# Audio Switcher for Pulseaudio+Pulseeffects

In my setup with Pulseaudio+Pulseeffects I have 2 output devices that I switch between. These are only changed for the
Pulseeffects output. Since I like to use a shortcut for switching, I wrote this little script that hooks keyboard
shortcuts globally.

In addition there is some problem in my setup where the default Pulseeffect output sink after boot is set to a recording
device instead of one of the 2 valid outputs. So to fix that upon startup and after a certain delay the output for that
is set by default to my speakers.

## Caveats

Obviously this is currently only set up for my own needs. If you want to use it in your setup you'll have to make some
small adaptations. For basic use cases changing the constants in index.ts should be enough.
(don't forget to rebuild with `npm run build` afterwards!)

At the time of writing this iohook (library used to hook into keyboard shortcuts) is not working with any newer node
version than node v12.  
And there it is also not really working, since the published node package seems to have been compiled for electron.  
The only way to fix it currently seems to manually build iohook and then copy the resulting contents from
`iohook/prebuilds/iohook-v0.9.1-node-v72-linux-x64.tar.gz` to `audio-switcher/node_modules/iohook/builds/`.

## Install

Copy the audio-switcher.service file to $HOME/.config/systemd/user/ and then run

    systemctl --user enable audio-switcher.service

and then start with

    systemctl --user start audio-switcher.service

