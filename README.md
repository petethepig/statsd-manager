# Statsd GUI

![](http://f.cl.ly/items/2N2g2O1P2C2U3n263k3K/Image%202015-07-01%20at%205.01.58%20PM.png)

### Install
```shell
npm install electron-prebuilt -g
bower install
```

### Run
```shell
electron .
```

### Connect through an ssh tunnel
```shell
ssh <user>@<remote-address> -L 8126:127.0.0.1:8126 -N
```

