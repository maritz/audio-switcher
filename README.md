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
