import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { Events } from '/imports/api/event/EventCollection';
import { Interests } from '/imports/api/interest/InterestCollection';

Template.Filter_Page.onCreated(function onCreated() {
  this.subscribe(Interests.getPublicationName());
  this.subscribe(Events.getPublicationName());
  this.messageFlags = new ReactiveDict();
});

// Define a function that checks whether a moment has already passed.
const isPast = (date) => {
  const today = moment().format();
  return moment(today).isAfter(moment(date));
};

Template.Calendar.onCreated(() => {
  Template.instance().subscribe('EventData');
});

Template.Calendar.onRendered(() => {
  // Initialize the calendar.
  $('#event-calendar').fullCalendar({
    // Define the navigation buttons.
    header: {
      left: 'title',
      center: '',
      right: 'today prev,next',
    },
    // Add events to the calendar.
    events(start, end, timezone, callback) {
      const data = Events.find().fetch().map((session) => {
        // Don't allow already past study events to be editable.
        session.editable = !isPast(session.start);
        return session;
      });

      if (data) {
        callback(data);
      }
    },

    // Configure the information displayed for an "event."
    eventRender(session, element) {
      element.find('.fc-content').html(
          `<h4 class="title">${session.name}</h4>
          <p class="time">${session.time}</p>
          `,
      );
    },

    // Triggered when a day is clicked on.
    dayClick(date) {
      // Store the date so it can be used when adding an event to the EventData collection.
      Session.set('eventModal', { type: 'add', date: date.format() });
      // If the date has not already passed, show the create event modal.
      if (date.isAfter(moment())) {
        $('#create-event-modal').modal({ blurring: true }).modal('show');
      }
    },

    // Delete an event if it is clicked on.
    eventClick(event) {
      Events.remove({ _id: event._id });
    },

    // Allow events to be dragged and dropped.
    eventDrop(session, delta, revert) {
      const date = session.start.format();

      if (!isPast(date)) {
        const update = {
          _id: session._id,
          start: date,
          end: date,
        };

        // Update the date of the event.
        Meteor.call('editEvent', update);
      } else {
        revert();
      }
    },
  });

  // Updates the calendar if there are changes.
  Tracker.autorun(() => {
    Events.find().fetch();
    $('#event-calendar').fullCalendar('refetchEvents');
  });
});
