// Generated by CoffeeScript 1.9.1
var Event, MailHandler, VCalendar, fs, localization, log, moment, path;

fs = require('fs');

path = require('path');

moment = require('moment-timezone');

log = require('printit')({
  prefix: 'events'
});

Event = require('../models/event');

VCalendar = require('cozy-ical').VCalendar;

MailHandler = require('../mails/mail_handler');

localization = require('../libs/localization_manager');

module.exports.fetch = function(req, res, next, id) {
  return Event.find(id, function(err, event) {
    if (err || !event) {
      return res.send({
        error: "Event not found"
      }, 404);
    } else {
      req.event = event;
      return next();
    }
  });
};

module.exports.all = function(req, res) {
  return Event.all(function(err, events) {
    if (err) {
      return res.send({
        error: 'Server error occurred while retrieving data'
      });
    } else {
      return res.send(events);
    }
  });
};

module.exports.read = function(req, res) {
  return res.send(req.event);
};

module.exports.create = function(req, res) {
  var data;
  data = req.body;
  data.created = moment().tz('UTC').toISOString();
  data.lastModification = moment().tz('UTC').toISOString();
  return Event.createOrGetIfImport(data, function(err, event) {
    if (err) {
      return res.error("Server error while creating event.");
    }
    if (data["import"] || req.query.sendMails !== 'true') {
      return res.send(event, 201);
    } else {
      return MailHandler.sendInvitations(event, false, function(err, updatedEvent) {
        return res.send(updatedEvent || event, 201);
      });
    }
  });
};

module.exports.update = function(req, res) {
  var data, start;
  start = req.event.start;
  data = req.body;
  data.lastModification = moment().tz('UTC').toISOString();
  return req.event.updateAttributes(data, function(err, event) {
    var dateChanged;
    if (err != null) {
      return res.send({
        error: "Server error while saving event"
      }, 500);
    } else if (req.query.sendMails === 'true') {
      dateChanged = data.start !== start;
      return MailHandler.sendInvitations(event, dateChanged, function(err, updatedEvent) {
        return res.send(updatedEvent || event, 200);
      });
    } else {
      return res.send(event, 200);
    }
  });
};

module.exports["delete"] = function(req, res) {
  return req.event.destroy(function(err) {
    if (err != null) {
      return res.send({
        error: "Server error while deleting the event"
      }, 500);
    } else if (req.query.sendMails === 'true') {
      return MailHandler.sendDeleteNotification(req.event, function() {
        return res.send({
          success: true
        }, 200);
      });
    } else {
      return res.send({
        success: true
      }, 200);
    }
  });
};

module.exports["public"] = function(req, res) {
  var id, key;
  id = req.params.publiceventid;
  key = req.query.key;
  return Event.find(id, function(err, event) {
    var date, dateFormat, dateFormatKey, day, desc, fileName, filePath, filePathBuild, locale, ref, visitor;
    if (err || !event || !(visitor = event.getGuest(key))) {
      locale = localization.getLocale();
      fileName = "404_" + locale + ".jade";
      filePath = path.resolve(__dirname, '../../client/', fileName);
      filePathBuild = path.resolve(__dirname, '../../../client/', fileName);
      if (!(fs.existsSync(filePath) || fs.existsSync(filePathBuild))) {
        fileName = '404_en.jade';
      }
      res.status(404);
      return res.render(fileName);
    } else if ((ref = req.query.status) === 'ACCEPTED' || ref === 'DECLINED') {
      return visitor.setStatus(req.query.status, function(err) {
        if (err) {
          return res.send({
            error: "server error occured"
          }, 500);
        }
        res.header({
          'Location': "./" + event.id + "?key=" + key
        });
        return res.send(303);
      });
    } else {
      if (event.isAllDayEvent()) {
        dateFormatKey = 'email date format allday';
      } else {
        dateFormatKey = 'email date format';
      }
      dateFormat = localization.t(dateFormatKey);
      date = event.formatStart(dateFormat);
      locale = localization.getLocale();
      fileName = "event_public_" + locale + ".jade";
      filePath = path.resolve(__dirname, '../../client/', fileName);
      filePathBuild = path.resolve(__dirname, '../../../client/', fileName);
      if (!(fs.existsSync(filePath) || fs.existsSync(filePathBuild))) {
        fileName = 'event_public_en.jade';
      }
      desc = event.description.replace(' ', '-');
      day = moment(event.start).format("YYYY-MM-DD");
      return res.render(fileName, {
        event: event,
        file: day + "-" + desc,
        date: date,
        key: key,
        visitor: visitor
      });
    }
  });
};

module.exports.ical = function(req, res) {
  var calendar, key;
  key = req.query.key;
  calendar = new VCalendar({
    organization: 'Cozy Cloud',
    title: 'Cozy Calendar'
  });
  calendar.add(req.event.toIcal());
  res.header({
    'Content-Type': 'text/calendar'
  });
  return res.send(calendar.toString());
};

module.exports.publicIcal = function(req, res) {
  var calendar, key, visitor;
  key = req.query.key;
  if (!(visitor = req.event.getGuest(key))) {
    return res.send({
      error: 'invalid key'
    }, 401);
  }
  calendar = new VCalendar({
    organization: 'Cozy',
    title: 'Cozy Calendar'
  });
  calendar.add(req.event.toIcal());
  res.header({
    'Content-Type': 'text/calendar'
  });
  return res.send(calendar.toString());
};

module.exports.bulkCalendarRename = function(req, res) {
  var newName, oldName, ref;
  ref = req.body, oldName = ref.oldName, newName = ref.newName;
  if (oldName == null) {
    return res.send(400, {
      error: '`oldName` is mandatory'
    });
  } else if (newName == null) {
    return res.send(400, {
      error: '`newName` is mandatory'
    });
  } else {
    return Event.bulkCalendarRename(oldName, newName, function(err, events) {
      if (err != null) {
        return res.send(500, {
          error: err
        });
      } else {
        return res.send(200, events);
      }
    });
  }
};

module.exports.bulkDelete = function(req, res) {
  var calendarName;
  calendarName = req.body.calendarName;
  if (calendarName == null) {
    return res.send(400, {
      error: '`calendarName` is mandatory'
    });
  } else {
    return Event.bulkDelete(calendarName, function(err, events) {
      if (err != null) {
        return res.send(500, {
          error: err
        });
      } else {
        return res.send(200, events);
      }
    });
  }
};
