(function() {
  /*!
   * global d3: false
   * global d4: false
   */
  'use strict';

  // This accessor can be overridden
  var orientation = function() {
    return 'vertical';
  };

  // FIXME: It would be nice not to continually have to check the orientation.
  var columnSeriesOverrides = function() {
    return {
      accessors: {
        y: function(d) {
          if (this.orientation() === 'vertical') {
            var yVal = (d.y0 + d.y) - Math.min(0, d.y);
            return this.y(yVal);
          } else {
            return this.y(d[this.yKey]);
          }
        },

        x: function(d) {
          if (this.orientation() === 'vertical') {
            return this.x(d[this.xKey]);
          } else {
            var xVal = (d.y0 + d.y) - Math.max(0, d.y);
            return this.x(xVal);
          }
        },

        width: function(d) {
          if (this.orientation() === 'vertical') {
            return this.x.rangeBand();
          } else {
            return Math.abs(this.x(d.y0) - this.x(d.y0 + d.y));
          }
        },

        height: function(d) {
          if (this.orientation() === 'vertical') {
            return Math.abs(this.y(d.y0) - this.y(d.y0 + d.y));
          } else {
            return this.y.rangeBand();
          }
        },

        classes: function(d, i, n) {
          var klass = (d.y > 0) ? 'positive' : 'negative';
          if (n > 0 && d.y0 === 0) {
            klass = 'subtotal';
          }
          return 'bar fill item' + i + ' ' + klass + ' ' + d[this.yKey];
        }
      }
    };
  };

  var columnLabelOverrides = function() {
    return {
      accessors: {
        y: function(d) {
          if (this.orientation() === 'vertical') {
            var height = Math.abs(this.y(d.y0) - this.y(d.y0 + d.y));
            var yVal = (d.y0 + d.y) - Math.max(0, d.y);
            return this.y(yVal) - 10 - height;
          } else {
            return this.y(d[this.yKey]) + (this.y.rangeBand() / 2);
          }
        },
        x: function(d) {
          if (this.orientation() === 'vertical') {
            return this.x(d[this.xKey]) + (this.x.rangeBand() / 2);
          } else {
            var xVal = (d.y0 + d.y) - Math.max(0, d.y);
            var width = Math.abs(this.x(d.y0) - this.x(d.y0 + d.y));
            return this.x(xVal) + 10 + width;
          }
        },
        text: function(d) {
          return d3.format('').call(this, d[this.valueKey]);
        }
      }
    };
  };

  var waterfallChartBuilder = function() {
    var rangeBoundsFor = function(dimension) {
      var rangeBounds;
      if (dimension === 'x') {
        return [0, this.parent.width - this.parent.margin.left - this.parent.margin.right];
      } else {
        rangeBounds = [0, this.parent.height - this.parent.margin.top - this.parent.margin.bottom];
        return (this.parent.orientation().toLowerCase() === 'vertical') ? rangeBounds.reverse() : rangeBounds;
      }
    };

    var setOrdinal = function(dimension, data) {
      if (!this.parent[dimension]) {
        var keys = data.map(function(d) {
          return d.key;
        }.bind(this));

        this.parent[dimension] = d3.scale.ordinal()
          .domain(keys)
          .rangeRoundBands(rangeBoundsFor.bind(this)(dimension), this.parent.xRoundBands || 0.3);
      }
    };

    var setLinear = function(dimension, data) {
      if (!this.parent[dimension]) {
        var ext = d3.extent(d3.merge(data.map(function(datum) {
          return d3.extent(datum.values, function(d) {

            // This is anti-intuative but the stack only returns y and y0 even
            // when it applies to the x dimension;
            return d.y + d.y0;
          });
        })));
        ext[0] = Math.min(0, ext[0]);
        this.parent[dimension] = d3.scale.linear()
          .domain(ext);
      }
      this.parent[dimension].range(rangeBoundsFor.bind(this)(dimension))
        .clamp(true)
        .nice();
    };

    var configureScales = function(data) {
      if (this.parent.orientation().toLowerCase() === 'vertical') {
        setOrdinal.bind(this)('x', data);
        setLinear.bind(this)('y', data);
      } else {
        setOrdinal.bind(this)('y', data);
        setLinear.bind(this)('x', data);
      }
    };

    var builder = {
      configure: function(data) {
        configureScales.bind(this)(data);
      },

      render: function(data) {
        var parent = this.parent;
        parent.mixins.forEach(function(name) {
          parent.features[name].render.bind(parent)(parent.features[name], data);
        });
      }
    };

    builder.parent = this;
    return builder;
  };

  d4.waterfallChart = function waterfallChart() {
    var chart = d4.baseChart({
      accessors: ['orientation'],
      orientation: orientation
    }, waterfallChartBuilder);
    [{
      'bars': d4.features.stackedColumnSeries,
      'overrides': columnSeriesOverrides
    }, {
      'connectors': d4.features.waterfallConnectors
    }, {
      'columnLabels': d4.features.stackedColumnLabels,
      'overrides': columnLabelOverrides
    }, {
      'xAxis': d4.features.xAxis
    }, {
      'yAxis': d4.features.yAxis
    }].forEach(function(feature) {
      chart.mixin(feature);
    });

    return chart;
  };
}).call(this);
