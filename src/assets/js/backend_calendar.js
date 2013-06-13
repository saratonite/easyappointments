/**
 * This namespace contains functions that are used by the backend calendar page.
 * 
 * @namespace BackendCalendar
 */
var BackendCalendar = {
    FILTER_TYPE_PROVIDER   : 'provider',
    FILTER_TYPE_SERVICE    : 'service',
    
    lastFocusedEvent       : undefined, // Contain event data for later use.
    
    /**
     * This function makes the necessary initialization for the default backend
     * calendar page. If this namespace is used in another page then this function
     * might not be needed.
     * 
     * @param {bool} defaultEventHandlers (OPTIONAL = TRUE) Determines whether the
     * default event handlers will be set for the current page.
     */
    initialize: function(defaultEventHandlers) {
        if (defaultEventHandlers === undefined) defaultEventHandlers = true;
        
        // :: INITIALIZE THE DOM ELEMENTS OF THE PAGE
        $('#calendar').fullCalendar({
            defaultView     : 'agendaWeek',
            height          : BackendCalendar.getCalendarHeight(),
            editable        : true,
            columnFormat    : {
                month   : 'ddd',
                week    : 'ddd d/M',
                day     : 'dddd d/M'
            },
            titleFormat     : {
                month   : 'MMMM yyyy',
                week    : "MMMM d[ yyyy]{ '&#8212;'[ MMM] d, yyyy}",
                day     : 'dddd, MMM d, yyyy'
            },
            header          : {
                left    : 'prev,next today',
                center  : 'title',
                right   : 'agendaDay,agendaWeek,month'
            },
            windowResize    : function(view) {
                $('#calendar').fullCalendar('option', 'height', 
                        BackendCalendar.getCalendarHeight());
            },
            dayClick        : function(date, allDay, jsEvent, view) {
                if (allDay) {
                    // Switch to day view
                    $('#calendar').fullCalendar('gotoDate', date);
                    $('#calendar').fullCalendar('changeView', 'agendaDay');
                }
            },
            eventClick          : function(event, jsEvent, view) {
                // Display a popover with the event details.
                var html = 
                        '<style type="text/css">' 
                            + '.popover-content strong {min-width: 80px; display:inline-block;}' 
                            + '.popover-content button {margin-right: 10px;}'
                            + '</style>' +
                        '<strong>Start</strong> ' 
                            + event.start.toString('dd-MM-yyyy HH:mm') 
                            + '<br>' + 
                        '<strong>End</strong> ' 
                            + event.end.toString('dd-MM-yyyy HH:mm') 
                            + '<br>' + 
                        '<strong>Service</strong> ' 
                            + event.title 
                            + '<br>' +  
                        '<strong>Provider</strong> ' 
                            + event.data['provider']['first_name'] + ' ' 
                            + event.data['provider']['last_name'] 
                            + '<br>' +
                        '<strong>Customer</strong> ' 
                            + event.data['customer']['first_name'] + ' ' 
                            + event.data['customer']['last_name'] 
                            + '<hr>' +
                        '<center>' + 
                        '<button class="edit-popover btn btn-primary">Edit</button>' +
                        '<button class="close-popover btn" data-po=' + jsEvent.target + '>Close</button>' +
                        '</center>';
                
                $(jsEvent.target).popover({
                    placement       : 'top',
                    title           : event.title,
                    content         : html,
                    html            : true,
                    container       : 'body',
                    trigger         : 'manual'
                });
                
                $(jsEvent.target).popover('show');
                
                BackendCalendar.lastFocusedEvent = event;
            },
            eventResize     : function(event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view) {
                // @task Display confirmation modal.
                
            },
            eventDrop       : function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view) {
                // @task Display confirmation modal.
                
            },
            viewDisplay     : function(view) {
                // Place the footer into correct position because the calendar
                // height might change.
                BackendCalendar.refreshCalendarAppointments(
                        $('#calendar'),
                        $('#select-filter-item').val(),
                        $('#select-filter-item option:selected').attr('type'), 
                        $('#calendar').fullCalendar('getView').visStart,
                        $('#calendar').fullCalendar('getView').visEnd);
                $(window).trigger('resize'); 
                
                $('.fv-events').each(function(index, eventHandle) {
                    $(eventHandle).popover();
                });
            }
        });
        
        // :: FILL THE SELECT ELEMENTS OF THE PAGE
        var optgroupHtml = '<optgroup label="Providers">';
        $.each(GlobalVariables.availableProviders, function(index, provider) {
            optgroupHtml += '<option value="' + provider['id'] + '" ' + 
                    'type="' + BackendCalendar.FILTER_TYPE_PROVIDER + '">' + 
                    provider['first_name'] + ' ' + provider['last_name'] + '</option>';
        });
        optgroupHtml += '</optgroup>';
        $('#select-filter-item').append(optgroupHtml)
        
        optgroupHtml = '<optgroup label="Services">';
        $.each(GlobalVariables.availableServices, function(index, service) {
            optgroupHtml += '<option value="' + service['id'] + '" ' + 
                    'type="' + BackendCalendar.FILTER_TYPE_SERVICE + '">' 
                    + service['name'] + '</option>';
        });
        optgroupHtml += '</optgroup>';
        $('#select-filter-item').append(optgroupHtml)
        
        // :: BIND THE DEFAULT EVENT HANDLERS
        if (defaultEventHandlers === true) {
            BackendCalendar.bindEventHandlers();
            $('#select-filter-item').trigger('change');
        }
    },
    
    /**
     * This method binds the default event handlers for the backend calendar
     * page. If you do not need the default handlers then initialize the page
     * by setting the "defaultEventHandlers" argument to "false".
     */
    bindEventHandlers: function() {
        /**
         * Event: Calendar filter item "Changed"
         * 
         * Load the appointments that correspond to the select filter item and
         * display them on the calendar.
         */
        $('#select-filter-item').change(function() { 
            BackendCalendar.refreshCalendarAppointments(
                    $('#calendar'),
                    $('#select-filter-item').val(),
                    $('#select-filter-item option:selected').attr('type'), 
                    $('#calendar').fullCalendar('getView').visStart,
                    $('#calendar').fullCalendar('getView').visEnd);
                    
            // @task If current value is service, then the sync buttons must be disabled.
        });
        
        /**
         * Event: Popover close button "Clicked"
         * 
         * Hides the open popover element.
         */
        $(document).on('click', '.close-popover', function() {
            $(this).parents().eq(2).remove(); 
        });
        
        /**
         * Event: Popover edit button "Clicked"
         * 
         * Enables the edit dialog of the selected calendar event.
         */
        $(document).on('click', '.edit-popover', function() {
            $(this).parents().eq(2).remove(); // Hide the popover
            
            var appointmentData = BackendCalendar.lastFocusedEvent.data;
            var modalHandle = $('#manage-appointment');
            
            // :: APPLY APPOINTMENT DATA AND SHOW TO MODAL DIALOG
            modalHandle.find('input, textarea').val('');
            
            // Fill the services listbox and select the appointment service.
            $.each(GlobalVariables.availableServices, function(index, service) {
                var option = new Option(service['name'], service['id']);
                modalHandle.find('#select-service').append(option);
            });
            
            $('#manage-appointment #select-service').val(
                    appointmentData['id_services']);
            
            // Fill the providers listbox with providers that can serve the appointment's 
            // service and then select the user's provider.
            $.each(GlobalVariables.availableProviders, function(index, provider) {
                var canProvideService = false; 
                
                $.each(provider['services'], function(index, service) {
                    if (service === appointmentData['id_services']) {
                        canProvideService = true;
                        return;
                    }
                });
                
                if (canProvideService) {
                    var option = new Option(provider['first_name'] + ' ' 
                            + provider['last_name'], provider['id']);
                    modalHandle.find('#select-provider').append(option);
                }
            });
            
            modalHandle.find('#select-provider').val(appointmentData['id_users_provider']);
            
            var customerData = appointmentData['customer'];
            modalHandle.find('#first-name').val(customerData['first_name']);
            modalHandle.find('#last-name').val(customerData['last_name']);
            modalHandle.find('#email').val(customerData['email']);
            modalHandle.find('#phone-number').val(customerData['phone_number']);
            modalHandle.find('#address').val(customerData['address']);
            modalHandle.find('#city').val(customerData['city']);
            modalHandle.find('#zip-code').val(customerData['zip_code']);
            modalHandle.find('#notes').val(customerData['notes']);
            
            
        
            // :: DISPLAY THE MANAGE APPOINTMENTS MODAL DIALOG
            $('#manage-appointment').modal('show');
        });
        
        /**
         * Event: Manage Appointments Dialog Cancel Button "Clicked"
         * 
         * Closes the dialog without making any actions.
         */
        $('#manage-appointment #cancel-button').click(function() {
            $('#manage-appointment').modal('hide');
        });
        
        /**
         * Event: Manage Appointments Dialog Save Button "Clicked"
         * 
         * Stores the appointment changes.
         */
        $('#manage-appointment #save-button').click(function() {
            // :: PREPARE APPOINTMENT DATA FOR AJAX CALL
            var appointmentData = {};
            
            // :: CALL THE UPDATE APPOINTMENT METHOD
            BackendCalendar.updateAppointment(appointmentData);
        });         
    },
            
    /**
     * This method calculates the proper calendar height, in order to be displayed
     * correctly, even when the browser window is resizing.
     * 
     * @return {int} Returns the calendar element height in pixels.
     */
    getCalendarHeight: function () {
        var result = window.innerHeight - $('#footer').height() - $('#header').height() 
                - $('#calendar-toolbar').height() - 80; // 80 for fine tuning
        return (result > 500) ? result : 500; // Minimum height is 500px
    },
           
    /**
     * This method reloads the registered appointments for the selected date period 
     * and filter type.
     * 
     * @param {object} calendarHandle The calendar jQuery object.
     * @param {int} recordId The selected record id.
     * @param {string} filterType The filter type, could be either FILTER_TYPE_PROVIDER
     * or FILTER_TYPE_SERVICE
     * @param {date} startDate Visible start date of the calendar.
     * @param {type} endDate Visible end date of the calendar.
     */
    refreshCalendarAppointments: function(calendarHandle, recordId, filterType, 
            startDate, endDate) {
        var ajaxUrl = GlobalVariables.baseUrl + 'backend/ajax_get_calendar_appointments';
            
        var postData = {
            record_id   : recordId,
            start_date  : startDate.toString('yyyy-MM-dd'),
            end_date    : endDate.toString('yyyy-MM-dd'),
            filter_type : filterType
        };

        $.post(ajaxUrl, postData, function(response) {
            ////////////////////////////////////////////////////////////////////
            //console.log('Refresh Calendar Appointments Response :', response);
            ////////////////////////////////////////////////////////////////////
            
            // Add the appointments to the calendar.
            var calendarEvents = new Array();
            
            $.each(response, function(index, appointment){
                var event = {
                    id          : appointment['id'],
                    title       : appointment['service']['name'],
                    start       : appointment['start_datetime'],
                    end         : appointment['end_datetime'],
                    allDay      : false,
                    data        : appointment // For later use
                };
                
                calendarEvents.push(event);
            });
            
            calendarHandle.fullCalendar('removeEvents');
            calendarHandle.fullCalendar('addEventSource', calendarEvents);
            
        }, 'json');
    },
    
    /**
     * This method stores the changes of an already registered appointment 
     * into the database, via an ajax call.
     * 
     * @param {object} appointmentData Contain the new appointment data. The 
     * id of the appointment MUST be already included. The rest values must 
     * follow the database structure.
     */
    updateAppointment: function(appointmentData) {
        // @task Save the appointment changes (ajax call).
    }
};