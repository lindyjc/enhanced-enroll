(function() {
    'use strict'

    /*
    Name: coursesMap
    Description:
        Map to keep track of all the user's courses by course code.
    */
    const coursesMap = new Map();

    /*
    Name: schedule
    Description:
        Object representing the user's weekly schedule.
        Each key is a day letter (M, T, W, R, F, S, U) mapping to an array of course objects.
    */
    const schedule = {
        M: [],
        T: [],
        W: [],
        R: [],
        F: [],
        S: [],
        U: []
    };

    /*
    Name: Time To Minutes
    Description:
        Converts a time string (ex. "9:30 AM") to minutes past midnight (0-1439)
    Parameters:
        t: string representing a time in "H:MM AM/PM" format
    Returns:
        Number of minutes past midnight
    */
    function timeToMinutes(t) {
        const [time, period] = t.split(" ");
        let [hours, minutes] = time.split(":").map(Number);

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        return hours * 60 + minutes;
    } // end of timeToMinutes

    /*
    Name: Add Course
    Description:
        Adds a course to coursesMap and updates the weekly schedule.
        Accepts multiple start/end times per day. Updates course if code already exists
        by removing it from all days first.
    Parameters:
        code: string representing the course code (ex. "COMP SCI 577")
        title: string representing the course title (ex. "Building User Interfaces")
        dayTimes: object mapping day letters to start/end times, e.g.,
            {
                "T": { startTime: "9:30 AM", endTime: "10:45 AM" },
                "R": { startTime: "9:30 AM", endTime: "10:45 AM" }
            }
    */
    function addCourse(code, title, dayTimes) {
        const times = {};

        // convert all start/end times to minutes for each day in dayTimes
        // stored in a new object 'times' keyed by day letter
        for (const day in dayTimes) {
            const {startTime, endTime} = dayTimes[day];
            times[day] = {
                startMinutes: timeToMinutes(startTime),
                endMinutes: timeToMinutes(endTime)
            };
        } // end of for

        const course = {code, title, times};

        // remove this course from all days in the schedule if it exists
        // prevents duplicate entries across days
        for (const day in schedule) {
            schedule[day] = schedule[day].filter(c => c.code !== code);
        } // end of for

        // add or update course in coursesMap
        coursesMap.set(code, course);

        // add course to schedule per day, using converted times
        // handles multiple days with the same or different times
        for (const day in times) {
            schedule[day].push(course);
        } // end of for
    } // end of addCourse

    /*
    Name: expandDayTimes
    Description:
        Converts a string of day letters (ex. "MTW") with a start and end time
        into an object mapping each day to {startTime, endTime}.
    Parameters:
        daysStr: string containing day letters (ex. "MTW")
        startTime: string representing start time (ex. "9:30 AM")
        endTime: string representing end time (ex. "10:45 AM")
    Returns:
        Object mapping each day letter to {startTime, endTime}
        Example:
            {
                M: {startTime: "9:30 AM", endTime: "10:45 AM"},
                T: {startTime: "9:30 AM", endTime: "10:45 AM"},
                W: {startTime: "9:30 AM", endTime: "10:45 AM"}
            }
    */
    function expandDayTimes(daysStr, startTime, endTime) {
        const validDays = ["M", "T", "W", "R", "F", "S", "U"];
        const result = {};

        for (const char of daysStr) {
            if (validDays.includes(char)) {
                result[char] = {startTime, endTime};
            } // end of if
        } // end of for

        return result;
    } // end of expandDayTimes

    /*
    Name: Print Schedule
    Description:
        Prints the user's weekly schedule to the console.
        Shows each day of the week and the courses scheduled, 
        including course code, title, and start/end times.
    */
    function printSchedule() {
        // iterate over each day in the schedule
        for (const day in schedule) {
            console.log(`\n${day}:`);

            if (schedule[day].length === 0) {
                console.log("No courses scheduled");
                continue;
            } // end of if

            // iterate over courses on that day
            schedule[day].forEach(course => {
                const times = course.times[day];
                if (times) {
                    console.log(`${course.code} - ${course.title} | 
                        ${minutesToTime(times.startMinutes)} 
                        to ${minutesToTime(times.endMinutes)} minutes`);
                } // end of if
            }); // end of forEach
        } // end of for
    } // end of printSchedule

    /*
    Name: Minutes To Time
    Description:
        Converts minutes past midnight to a readable time string in "H:MM AM/PM" format
    Parameters:
        minutes: number of minutes past midnight
    Returns:
        string in "H:MM AM/PM" format
    */
    function minutesToTime(minutes) {
        let hours = Math.floor(minutes / 60);
        let mins = minutes % 60;
        const period = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours}:${mins.toString().padStart(2, '0')} ${period}`;
    } // end of minutesToTime

    /*
    Name: Handle Scheduler
    Description:
        This function, if on the scheduler page of CS&E, keeps track of 
        all courses, their days, start and end times, and adds them to the
        coursesMap and schedule objects.
    */
    function handleScheduler() {
        const courseItems = document.querySelectorAll('cse-course-list-item');

        // collecting course codes and times
        for (let i = 0; i < courseItems.length; i++) {
            const courseItem = courseItems[i];

            // per class find the course code, title, day(s), start and end time(s)
            const courseCodeDiv = courseItem.querySelector('div.left.grow.catalog');
            const courseTitleDiv = courseItem.querySelector('div.row.title div#course-title');
            const courseDaysSpan = courseItem.querySelectorAll('span.days');
            const courseTimesSpan = courseItem.querySelectorAll('span.times');

            // stores all the days and class times
            const dayTimes = {};

            // associate each day there is a course with the time it's running
            if (courseDaysSpan.length > 0) {
                for (let j = 0; j < courseDaysSpan.length; ++j) {
                    // extracting start and end times
                    const daysStr = courseDaysSpan[j].innerText.trim();
                    const timesStr = courseTimesSpan[j].innerText.trim();
                    const [startTime, endTime] = timesStr.split("–").map(t => t.trim());

                    // expand the days (ex. MWF -> {M, W, F}) and associate with times
                    const expanded = expandDayTimes(daysStr, startTime, endTime);

                    // merge into all days and times
                    Object.assign(dayTimes, expanded);
                } // end of for
            } // end of if

            // extract the course code and course title
            const courseCode = courseCodeDiv ? courseCodeDiv.innerText.trim() : "";
            const courseTitle = courseTitleDiv ? courseTitleDiv.innerText.trim() : "";

            // add the course to the coursesMap and schedule
            addCourse(courseCode, courseTitle, dayTimes); 
        } // end of for
        printSchedule()
    } // end of handleScheduler

    /*
    Name: Handle Sections Button
    Description:
        This function tracks clicks on the "See sections" button and extracts
        instructor information from the sections panel that appears.
        It polls for the panel until found, then collects unique instructor names.
    */
    function handleSectionsButton() {
        document.addEventListener('click', (event) => {
            // detect "See sections" button click
            if (event.target.classList.contains('mdc-button__label') && 
                event.target.innerText.trim() === 'See sections') {
                
                // start polling for the panel when button is clicked (every 50ms)
                const checkForPanel = setInterval(() => {
                    const panel = document.querySelector('mat-sidenav[style*="visibility: visible"]');  
                    
                    if (panel) {
                        const teachers = new Set();
                        const sections = panel.querySelectorAll('cse-package-group');
                        
                        // grab the teachers names (not including duplicates)
                        for(let k = 0; k < sections.length; ++k) {
                            let teacher = sections[k].querySelector('.one-instructor');
                            if (teacher) {
                                teachers.add(teacher.innerText.trim());
                            } // end of if
                        } // end of for

                        // stop polling when we have the data
                        clearInterval(checkForPanel);
                        
                        // return list of teachers
                        return teachers;
                    } // end of if
                }, 50); // end of setInterval
            } // end of if
        }); // end of addEventListener
    } // end of handleSectionsButton

    /*
    Name: Handle Search
    Description:
        This function runs on the Search page of CS&E.
        It tracks clicks on course items and logs the course name
        from the details pane that appears when a course is selected.
    */
    function handleSearch() {
        // use event delegation on a stable parent element
        document.addEventListener('click', (event) => {
            // check if the clicked element is a course button or inside one
            const button = event.target.closest('cse-course-list-item button');
            
            if (button) {
            // start polling for the pane when button is clicked (every 50ms)
            setTimeout(() => {
                const pane = document.querySelector('cse-pane#details');
                
                if (!pane || pane.offsetParent === null) return;

                // grab the course name
                const toolbarSpans = pane.querySelectorAll('mat-toolbar span');
                const courseNameSpan = Array.from(toolbarSpans)
                .filter(span => span.innerText.trim() && !span.classList.length)
                .pop();
                
                const courseName = courseNameSpan ? courseNameSpan.innerText.trim() : "Unknown course";
                return courseName;
            }, 50);
            }
        });
        handleSectionsButton();
    } // end of handleSearch


    // /*
    // Name: Main
    // Description:
    //     Main entry point for the Course Search and Enroll extension.
    //     Checks if the current page is the UW-Madison enrollment page and
    //     routes to the appropriate handler function based on the page path.
    //     Handles both the scheduler and search pages.
    // */
    // function main() {
    //     const url = window.location.href;
    //     const base = "https://enroll.wisc.edu/";

    //     // check we're on the UW-Madison enrollment page
    //     if (!url.startsWith(base)) {
    //         console.log("Not on the UW-Madison Course Search and Enroll Page");
    //         return;
    //     } // end of if

    //     console.log("On the UW-Madison Course Search and Enroll Page");

    //     // check what page we're on (not including parameters)
    //     const path = window.location.href.split("?")[0];
        
    //     switch (true) {
    //         case path.endsWith("/scheduler"):
    //             handleScheduler();
    //             break;
    //         case path.endsWith("/search"):
    //             handleSearch();
    //             break;
    //         default:
    //             console.log("No actions for this page");
    //             console.log(path)
    //     } // end of swtich
    // } // end of main

    // main();
})();
