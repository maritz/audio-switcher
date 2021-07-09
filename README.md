# Audio Switcher for Pulseaudio+Pulseeffects

In my setup with Pulseaudio+Pulseeffects I have 2 output devices that I switch between. These are only changed for the
Pulseeffects output. Since I like to use a shortcut for switching, I wrote this little script that hooks keyboard
shortcuts globally.

In addition there is some problem in my setup where the default Pulseeffect sink inputs are not set to the
correct sinks after boot. So to fix that upon startup and after a certain delay first the sink input for my outputs are
corrected and then the ones for my microphone. The problem is that these only become available once something tries
to access them, so we try again and again in a loop until they both succeeded.

## Caveats

Obviously this is currently only set up for my own needs. If you want to use it in your setup you'll have to make some
small adaptations. For basic use cases changing the constants in index.ts should be enough.
(don't forget to rebuild with `npm run build` afterwards!)

At the time of writing the iohook library (used to hook into keyboard shortcuts) is not working with any newer node
version than node v12.  
And there it is also not really working, since the published node package seems to have been compiled for electron.  
The only way to fix it currently seems to manually build iohook and then copy the resulting contents from
`iohook/prebuilds/iohook-v0.9.1-node-v72-linux-x64.tar.gz` to `audio-switcher/node_modules/iohook/builds/`.

## Install

Copy the audio-switcher.service.sample file to $HOME/.config/systemd/user/audio-switcher.service.

Make adjustments in it based on your configuration (nvm location or system node, version, replace $HOME with actual home dir).

And then run

    systemctl --user enable audio-switcher.service

and then start with

    systemctl --user start audio-switcher.service
