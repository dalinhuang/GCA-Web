require(["main"], function () {
    require(["lib/models", "lib/tools", "knockout", "moment"], function(models, tools, ko, moment) {
        "use strict";

        /**
         * Schedule view model.
         *
         *
         * @param confId
         * @returns {ScheduleViewModel}
         * @constructor
         */
        function ScheduleViewModel(confId) {

            if (!(this instanceof ScheduleViewModel)) {
                return new ScheduleViewModel(confId);
            }

            var self = this;
            self.isLoading = ko.observable("Loading conference schedule.");
            self.error = ko.observable(false);
            self.schedule = null;
            self.days = ko.observableArray([]); // number of days and thereby calendar instances of the conference

            self.init = function () {
                ko.applyBindings(window.schedule);
                self.loadConference(confId);
            };

            self.setError = function(level, text) {
                self.error({message: text, level: 'alert-' + level});
                self.isLoading(false);
            };

            //Data IO
            self.ioFailHandler = function(jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                console.log( "Request Failed: " + err );
                self.setError("danger", "Error while fetching data from server: <br\\>" + error);
            };

            self.loadConference = function(id) {
                if(!self.isLoading()) {
                    self.isLoading("Loading conference schedule.");
                }

                //now load the data from the server
                var confURL ="/api/conferences/" + id;
                $.getJSON(confURL, self.onConferenceData).fail(self.ioFailHandler);
            };

            //conference data
            self.onConferenceData = function (confObj) {
                var conf = models.Conference.fromObject(confObj);
                //now load the schedule data
                $.getJSON(conf.schedule, self.onScheduleData).fail(self.ioFailHandler);
            };

            //schedule data
            self.onScheduleData = function (scheduleObj) {
                self.schedule = models.Schedule.fromObject(scheduleObj);

                var startingDate = self.schedule.getStart();
                var numberOfDays = Math.ceil((self.schedule.getEnd() - startingDate) / (24*60*60*1000));

                for (var i = 0; i < numberOfDays; i++) {
                    self.days.push(new Date(startingDate.getTime() + i*24*60*60*1000));
                }
                /*
                 * Initialising the scheduler must be the last step after loading
                 * all the required data.
                 */
                self.initScheduler();
                self.isLoading(false);
            };

            self.initScheduler = function () {
                // Actually unnecessary, as the tab is not displayed anyways.
                window.dhtmlXScheduler.locale.labels.conference_scheduler_tab = "Conference Scheduler";
                // window.dhtmlXScheduler.xy.nav_height = -1; // hide the navigation bar
                // window.dhtmlXScheduler.xy.scale_height = -1; // hide the day display
                window.dhtmlXScheduler.config.readonly = true; // disable editing events
                // window.dhtmlXScheduler.config.hour_size_px = 200;

                /*
                 * Split up tracks and sessions upon clicking on the corresponding scheduler event.
                 */
                window.dhtmlXScheduler.attachEvent("onClick", function (id, e) {

                    var splitEvents = (window.dhtmlXScheduler.getEvent(id)).getSplitEvents();
                    if (splitEvents.length > 0) {
                        splitEvents.forEach(function (splitEvent) {
                            window.dhtmlXScheduler.addEvent(splitEvent);
                        });
                        window.dhtmlXScheduler.deleteEvent(id);
                    }

                    // TODO: display infos
                    return true;
                });

                // dynamically scale the hour range for different days
                window.dhtmlXScheduler.attachEvent("onViewChange", function (new_mode, new_date) {
                    var dailyEvents = self.schedule.getDailyEvents(new_date);
                    var startingDate = null;
                    var endingDate = null;

                    dailyEvents.forEach(function (c) {
                        if (startingDate === null) {
                            startingDate = c.getStart();
                        } else if (startingDate - c.getStart() > 0) {
                            startingDate = c.getStart();
                        }
                        if (endingDate === null) {
                            endingDate = c.getEnd();
                        } else if (endingDate - c.getEnd() < 0) {
                            endingDate = c.getEnd();
                        }
                    });
                    window.dhtmlXScheduler.config.first_hour = startingDate.getHours();
                    // TODO: maybe restrict this to max 23 hours
                    window.dhtmlXScheduler.config.last_hour = endingDate.getHours() + 1;
                    window.dhtmlXScheduler.updateView();
                });

                /*
                 * All the custom logic should be placed inside this event to ensure
                 * the templates are ready before the scheduler is initialised.
                 */
                window.dhtmlXScheduler.attachEvent("onTemplatesReady",function(){
                    window.dhtmlXScheduler.date.conference_scheduler_start = function (active_date) {
                        return window.dhtmlXScheduler.date.day_start(active_date);
                    };
                    window.dhtmlXScheduler.date.get_conference_scheduler_end = function (start_date) {
                        return window.dhtmlXScheduler.date.add(start_date,0,"day");
                    };
                    window.dhtmlXScheduler.date.add_conference_scheduler = function (date, inc) {
                        return window.dhtmlXScheduler.date.add(date,inc,"day");
                    };
                    window.dhtmlXScheduler.templates.conference_scheduler_date = function(start, end){
                        return window.dhtmlXScheduler.templates.day_date(start)+" &ndash; "+
                            window.dhtmlXScheduler.templates.day_date(window.dhtmlXScheduler.date.add(end,-1,"day"));
                    };
                    // hide the date
                    window.dhtmlXScheduler.templates.conference_scheduler_scale_date = function (date) {
                         return window.dhtmlXScheduler.templates.day_scale_date(date);
                    };
                });

                // Initialise all scheduler views.
                // for (var i = 0; i < self.days().length; i++) {
                //     window.dhtmlXScheduler.init("conference_scheduler_"+i,self.days()[i],"day");
                // }
                window.dhtmlXScheduler.init("conference_scheduler",self.days()[0],"day");
                /*
                 * Add all the events from the conference schedule.
                 * Event IDs correspond to the index of the element in the specified schedule
                 * in the format: "index of layer 1":"index of layer 2":"index of layer 3".
                 * A negative value means the layer is not applicable for this element.
                 *
                 * Example schedule:
                 * [Event0, Track1[Event1-0], Session2[Track2-0[Event2-0-0]]]
                 *
                 * Session2 is the third layer 1 element thereby its ID is 2:-1:-1. Layer 2 and 3 are not applicable.
                 * Track2-0 is the first layer 2 element contained by the layer 1 element Session2 thereby its ID is 2:0:-1.
                 * Event2-0-0 is the first layer 3 element contained by the layer 2 element Track2-0 thereby its ID is 2:0:0.
                 */
                var contentIndex = 0;
                self.schedule.content.forEach(function (event) {
                    var schedulerEvent = models.SchedulerEvent.fromObject(event);
                    schedulerEvent.id = contentIndex++ + ":-1:-1";
                    window.dhtmlXScheduler.addEvent(schedulerEvent);
                });

            };

        };

        $(document).ready(function() {

            var data = tools.hiddenData();

            console.log(data.conferenceUuid);

            window.moment = moment;
            window.schedule = ScheduleViewModel(data.conferenceUuid);
            window.schedule.init();
        });

    });
});