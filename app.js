var net = require('net');
var controllers = angular.module('controllers', [])
var statsd = angular.module('statsd', [
  'controllers',
])

controllers.controller('main', function($scope){
  var updateInterval;
  var hash = {
    "": {
      id: "",
      title: "Root",
      nodes: [],
      expand: true
    }
  };

  function splitAddress(str){
    var arr = str.split(":", 2);
    return {
      address: arr[0],
      port: arr[1] || 8126
    }
  }

  function saveDefaultAddress(address){
    localStorage.setItem('defaultAddress', address);
  }

  function loadDefaultAddress(){
    return localStorage.getItem('defaultAddress') || "127.0.0.1:8126";
  }

  function statsdQuery(str, callback){
    var client = new net.Socket();
    var config = splitAddress($scope.address);
    var buffer = new Buffer(0);

    client.connect(config.port, config.address, function() {
      client.write(str);
      client.end();
    });

    client.on('connect', function() {
      saveDefaultAddress($scope.address);
      $scope.connectionError = null;
      $scope.$apply();
    });

    client.on('data', function(data) {
      buffer = Buffer.concat([buffer, data])
    });

    client.on('error', function(err) {
      console.log('err', err);
      setTimeout(function(){
        clearInterval(updateInterval);
        $scope.connectionError = err.message || "Unknown connection error";
        $scope.$apply();
      }, 100);
    });

    client.on('close', function(err) {
      if(!err){
        callback(buffer.toString());
        $scope.$apply();
        client.destroy();
      }
    });
  }

  function parent(key){
    var arr = key.split(".");
    arr.pop();
    return arr.join(".");
  }

  function formatDuration(n){
    var str = "";
    var dur = moment.duration(n, "seconds");
    ["second", "minute", "hour", "day", "month", "year"].forEach(function(x, i){
      var v = dur[x + "s"]();
      if(v || !i){
        str = v + " " + x + (v != 1 ? "s" : "") + ", " + str;
      }
    })
    return str.replace(/, $/, '');
  }

  function updateStats(){
    statsdQuery("stats", function(data){
      $scope.loaded = $scope.loaded | 8;
      var durations = ["uptime", "graphite.last_flush", "graphite.last_exception", "graphite.flush_time", "messages.bad_lines_seen", "messages.last_msg_seen"];
      $scope.stats = _.object(data.replace(/END$/m, '').split(/\n/).map(function(x){
        var arr = x.split(": ", 2);
        var key = arr[0];
        var value = Number(arr[1]);
        if(durations.indexOf(key) >= 0){
          value = formatDuration(value);
        }
        return [key, value];
      }));
      delete $scope.stats[""];
    });
  }

  function updateCounters(){
    ["counters", "gauges", "timers"].forEach(function(name, i){
      statsdQuery(name, function(data){
        $scope.loaded = $scope.loaded | (1 << i);
        data = data.replace(/END$/m, '')
        eval("data = " + data); // TODO: write a parser
        // turning {"x":{}} to {"counters.x":{}}
        data = _.object(_.pairs(data).map(function(x){ return [(name + "." + x[0]).replace(/\.$/,''), x[1]] }));
        _.keys(data).forEach(function(key){
          var arr = key.split(".");
          var title = _.last(arr);
          var value = data[key];
          data[key] = {
            "id": key,
            "title": title,
            "nodes": [],
            "level": arr.length,
            "value": value,
            "name": name
          };
        });
        _.keys(data).forEach(function(key){
          var arr = key.split(".");
          for(var i = 0; i < arr.length; i++){
            var newArr = arr.slice(0, i)
            var newKey = newArr.join(".");
            var title = _.last(newArr);
            if(!data[newKey]){
              data[newKey] = {
                "id": newKey,
                "title": title,
                "nodes": [],
                "level": newArr.length
              };
            }
          }
        });
        _.extend(hash, data)
        // assigning children nodes
        _.keys(data).sort().forEach(function(key){
          var parentKey = parent(key);
          if(hash[parentKey]){
            hash[parentKey].nodes.push(hash[key])
            hash[key].parent = hash[parentKey];
          }
        });
        $scope.tree = _.compact([hash["counters"], hash["gauges"], hash["timers"]]);
      });
    });
  }

  document.body.style.opacity = 1;

  $scope.tab = "metrics";
  $scope.stats = {};
  $scope.address = loadDefaultAddress();
  $scope.firstTry = true;
  $scope.connectionError = null;
  $scope.show = {
    "": true,
  };

  $scope.isVisible = function(key){
    return $scope.show[parent(key)];
  }

  $scope.expand = function(key){
    $scope.show[key] = true;
  }

  $scope.collapse = function(key){
    $scope.show[key] = false;
  }

  $scope.refresh = function(){
    $scope.connectionError = null;
    $scope.loaded = 0;
    $scope.firstTry = false;
    updateStats();
    clearInterval(updateInterval);
    updateInterval = setInterval(updateStats, 2000);
    updateCounters();
  }

  $scope.delete = function(node){
    node.deleted = true;
    var array = node.id.split(".");
    if(array.length < 1){
      return;
    }
    if(!confirm("Are you sure you want to delete [" + node.id + "]?")){
      return;
    }
    var type = array.shift();
    var command = "del" + type + " " + array.join(".");
    statsdQuery(command, function(result){
      console.log(result);
    });
    var command = "del" + type + " " + array.join(".") + ".*";
    statsdQuery(command, function(result){
      console.log(result);
    });
  }
});
