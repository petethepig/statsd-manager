var net = require('net');
var config = require('./config.json');

function statsdQuery(str, callback){
  var client = new net.Socket();
  client.connect(config.port, config.address, function() {
    client.write(str);
    client.end();
  });

  var buffer = new Buffer(0);

  client.on('data', function(data) {
    buffer = Buffer.concat([buffer, data])
  });
  client.on('error', function(err) {
    console.log('err', err);
    alert(err.message);
  });
  client.on('close', function(err) {
    if(!err){
      callback(buffer.toString());
      client.destroy();
    }
  });
}

var statsd = angular.module('statsd', [
  'controllers',
])

var controllers = angular.module('controllers', [])

controllers.controller('main', function($scope){
  $scope.stats = {};

  var hash = {
    "": {
      id: "",
      title: "Root",
      nodes: [],
      expand: true
    }
  };

  $scope.show = {
    "": true,
  };

  function parent(key){
    var arr = key.split(".");
    arr.pop();
    return arr.join(".");
  }

  $scope.isVisible = function(key){
    return $scope.show[parent(key)];
  }

  $scope.expand = function(key){
    $scope.show[key] = true;
  }

  $scope.collapse = function(key){
    $scope.show[key] = false;
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

  function updateStats(){
    statsdQuery("stats", function(data){
      $scope.stats = _.object(data.replace(/END$/m, '').split(/\n/).map(function(x){ return x.split(": ", 2)}))
      delete $scope.stats[""];
      $scope.$apply();
    });
  }

  setInterval(updateStats, 2000);
  updateStats();

  ["counters", "gauges", "timers"].forEach(function(name){
    statsdQuery(name, function(data){
      data = data.replace(/END$/m, '')
      eval("data = " + data); // TODO: write a parser
      // turning {"x":{}} to {"counters.x":{}}
      data = _.object(_.pairs(data).map(function(x){ return [(name + "." + x[0]).replace(/\.$/,''), x[1]] }));
      _.keys(data).forEach(function(key){
        var arr = key.split(".");
        var title = _.last(arr);
        data[key] = {
          "id": key,
          "title": title,
          "nodes": [],
          "level": arr.length
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
      $scope.$apply();
    });
  });
});
