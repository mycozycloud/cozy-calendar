// Generated by CoffeeScript 1.8.0
var Event, User, ical;

ical = require('cozy-ical');

Event = require('../models/event');

User = require('../models/user');

module.exports["export"] = function(req, res) {
  var calendar, calendarId;
  calendarId = req.params.calendarid;
  calendar = new ical.VCalendar({
    organization: 'Cozy',
    title: 'Cozy Calendar',
    name: calendarId
  });
  return Event.byCalendar(calendarId, function(err, events) {
    var event, _i, _len;
    if (err) {
      return res.send({
        error: true,
        msg: 'Server error occurred while retrieving data'
      });
    } else {
      if (events.length > 0) {
        for (_i = 0, _len = events.length; _i < _len; _i++) {
          event = events[_i];
          calendar.add(event.toIcal());
        }
      }
      res.header({
        'Content-Type': 'text/calendar'
      });
      return res.send(calendar.toString());
    }
  });
};

module.exports["import"] = function(req, res) {
  var file, parser;
  file = req.files['file'];
  if (file != null) {
    parser = new ical.ICalParser();
    return parser.parseFile(file.path, function(err, result) {
      var calendarName, _ref;
      if (err) {
        console.log(err);
        console.log(err.message);
        return res.send(500, {
          error: 'error occured while saving file'
        });
      } else {
        calendarName = (result != null ? (_ref = result.model) != null ? _ref.name : void 0 : void 0) || 'my calendar';
        console.log("calendarName " + calendarName);
        return res.send(200, {
          events: Event.extractEvents(result, calendarName),
          calendar: {
            name: calendarName
          }
        });
      }
    });
  } else {
    return res.send({
      error: 'no file sent'
    }, 500);
  }
};
