# Statsd Manager ![Statsd Manager Icon](https://raw.githubusercontent.com/petethepig/statsd-manager/master/icon.iconset/icon_32x32.png)

![Statsd Manager Screenshot](http://f.cl.ly/items/2N2g2O1P2C2U3n263k3K/Image%202015-07-01%20at%205.01.58%20PM.png)

### About

Statsd Manager is a GUI for [statsd admin interface](https://github.com/etsy/statsd/blob/master/docs/admin_interface.md).

It's built on top of [electron](https://github.com/atom/electron).

It works on Mac OS X, Linux and Windows.

### Downloads

Prebuild binaries for OS X can be found on the [releases](https://github.com/petethepig/statsd-manager/releases) page.

Source code:

```shell
# install dependencies
npm install electron-prebuilt -g
bower install
# run the app
electron .
```

### Connect to a remote server through an ssh tunnel

```shell
ssh <user>@<remote-address> -L 8126:127.0.0.1:8126 -N
```

