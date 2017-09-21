#!/usr/bin/env node
// var gc = require("js-gc");
var jsdom = require('jsdom').jsdom;
var vm = require('vm2');
var opentype = require('opentype.js');
var defaultFontsDir = __dirname + '/node_modules/anychart-nodejs/fonts';
var defaultBounds = {left: 0, top: 0, width: 1024, height: 768};

var rootDoc = jsdom('<body><div id="container"></div></body>');
var window = rootDoc.defaultView;
var anychart = require('../ACDVF/out/anychart-bundle.min.js')(window);
// var anychart_nodejs = require('../AnyChart-NodeJS')(anychart);

window.anychart = anychart;
window.isNodeJS = true;
window.defaultBounds = defaultBounds;

// window.setTimeout = function(code,delay,arguments) {
//   console.log('setTimeout', code, delay, arguments);
// };
//
// window.setInterval = function(code,delay,arguments) {
//   console.log('setInterval', code, delay, arguments);
// };

var fs = require('fs');
var fonts = {};
function anychartify(doc) {
  doc.createElementNS = function(ns, tagName) {
    var elem = doc.createElement(tagName);
    elem.getBBox = function() {
      var text = elem.textContent;
      var fontSize = parseFloat(elem.getAttribute('font-size'));
      var fontFamily = elem.getAttribute('font-family');
      if (fontFamily) fontFamily = fontFamily.toLowerCase();
      var fontWeight = elem.getAttribute('font-weight');
      if (fontWeight) fontWeight = fontWeight.toLowerCase();
      var fontStyle = elem.getAttribute('font-style');
      if (fontStyle) fontStyle = fontStyle.toLowerCase();

      var fontsArr = fontFamily.split(', ');

      var font;
      for (var i = 0, len = fontsArr.length; i < len; i++) {
        var name = fontsArr[i] + (fontWeight == 'normal' || !isNaN(+fontWeight) ? '' : ' ' + fontWeight) + (fontStyle == 'normal' ? '' : ' ' + fontStyle);
        if (font = fonts[name])
          break;
      }

      if (!font)
        font = fonts['verdana'];

      var scale = 1 / font.unitsPerEm * fontSize;

      var top = -font.ascender * scale;
      var height = Math.abs(top) + Math.abs(font.descender * scale);

      var width = 0;

      font.forEachGlyph(text, 0, 0, fontSize, undefined, function(glyph, x, y, fontSize, options) {
        var metrics = glyph.getMetrics();
        metrics.xMin *= scale;
        metrics.xMax *= scale;
        metrics.leftSideBearing *= scale;
        metrics.rightSideBearing *= scale;

        width += Math.abs(metrics.xMax - metrics.xMin) + metrics.leftSideBearing + metrics.rightSideBearing
      });

      return {x: 0, y: 0, width: width, height: height};
    };
    return elem;
  };
}
function loadDefaultFontsSync() {
  var fontFilesList = fs.readdirSync(defaultFontsDir);

  for (var i = 0, len = fontFilesList.length; i < len; i++) {
    var fileName = fontFilesList[i];
    var font = opentype.loadSync(defaultFontsDir + '/' + fileName);
    fonts[font.names.fullName.en.toLowerCase()] = font;
  }

  return fonts;
}

var data = '{"chart":{"enabled":true,"credits":{"text":"AnyChart","url":"https://www.anychart.com/?utm_source=registered","alt":"AnyChart - JavaScript Charts designed to be embedded and integrated","imgAlt":"AnyChart - JavaScript Charts","logoSrc":"https://static.anychart.com/logo.png","enabled":true},"xScale":0,"yScale":1,"series":[{"enabled":true,"seriesType":"line","data":[1,2,3],"xScale":0,"yScale":1}],"type":"cartesian"}}';

loadDefaultFontsSync();
anychartify(rootDoc);
anychart.global(window);

var params = {
  type: 'png',
  dataType: 'json',
  containerId: 'container',
  document: rootDoc
};

var chartCount = 1000;
var cur = 0;


// var inertval = setInterval(function() {
  // var target = anychart.fromJson(data);
  // target.container('container').draw();
  // target.dispose();

//   anychart_nodejs.exportTo(data, params, function(err, data) {
//     if (cur > chartCount) {
//       clearInterval(inertval);
//       console.log('interval cleared');
//     } else {
//       cur++;
//       console.log(cur);
//     }
//   });
// }, 1);

var inertval = setInterval(function() {
  var target = "anychart.onDocumentReady(function () {var chart = anychart.cartesian(); chart.line([1,2,3]); chart.container('container').draw();});";
  var script = new vm.VM({
    timeout: 10000,
    sandbox: {
      anychart: window.anychart
    }
  });
  script.run(target);

  var xmlNs = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';

  var svgElements = rootDoc.getElementsByTagName('svg');
  var svgElement = svgElements[0];
  var svg = xmlNs + (svgElement ? svgElement.outerHTML : '');

  for (var i = 0, len = svgElements.length; i < len; i++) {
    svgElement = svgElements[i];
    var id = svgElement.getAttribute('ac-id');
    var stage = anychart.graphics.getStage(id);
    if (stage) {
      var charts = stage.getCharts();
      for (var chart in charts) {
        charts[chart].dispose();
      }
      stage.dispose();
    }
  }

  script.options.sandbox.anychart = null;
  script._context = null;
  script._internal = null;

  if (cur > chartCount) {
    clearInterval(inertval);
    console.log('interval cleared');
  } else {
    cur++;
    console.log(cur);
    // gc()
  }
}, 1);



setInterval(function() {
  gc()
}, 3000);


// for (var i = 0, len = 5000; i < len; i++) {
//   var target = anychart.fromJson(data);
//   target.container('container').draw();
//   target.dispose();
//
//   console.log(i);
// }