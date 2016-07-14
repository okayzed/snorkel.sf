"use strict";

var helpers = require("app/client/views/helpers");
var TimeView = require("app/client/views/time_view");

var weco = require("app/client/views/weco_helper");

var WecoView = TimeView.extend({
  prepare: function(data) {
    var self = this;
    this.time_bucket = data.parsed.time_bucket;
    var ret = TimeView.prototype.prepare(data);

    var options = {
      time_bucket: data.parsed.time_bucket,
      start: data.parsed.start_ms,
      end: data.parsed.end_ms
    };

    var normalized_data = weco.normalize_series(ret, options);
    var violations = weco.find_violations(normalized_data, options);


    self.violations = violations;

    return ret;
  },
  getChartOptions: function() {
    var self = this;
    var plot_lines = [];
    _.each([-30, -20, 0, 20, 30], function(p) {
      plot_lines.push({
        value : p,
        label: {
          text: p / 10
        },
        width: 1,
        color: "#aaa",
        dashStyle: 'dash'
      });
    });

    var options = TimeView.prototype.getChartOptions();
    var my_options = {};
    my_options.yAxis = {
      min: -50,
      max: 50,
      labels: {
        enabled: false
      },
      plotLines: plot_lines
    };

    my_options.xAxis = {
      plotLines: _.map(this.violations, function(v) {
        var color = "#f00";
        if (v.training === true) {
          color = "#0f0";
        }

        if (v.end === true) {
          color = "#00f";
        }

        return {
          value: v.value,
          width: 1,
          color: color,
          label: {
            text: v.type
          }
        };
      })
    };

    $.extend(true, options, my_options);
    return options;
  }

});


SF.trigger("view:add", "weco",  {
  include: helpers.STD_INPUTS
    .concat(helpers.inputs.TIME_BUCKET)
    .concat(helpers.inputs.TIME_FIELD),
  icon: "noun/line.svg"
}, WecoView);

module.exports = WecoView;