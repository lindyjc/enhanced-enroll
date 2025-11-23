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
    Name: currentTeachers
    Description:
        Global variable of all the teachers, so we can return it
    */
    let currentTeachers = [];


    async function findProfessorRating(professorName) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                const targetUrl = `https://www.ratemyprofessors.com/search/professors/18418?q=${encodeURIComponent(professorName)}`;
                
                const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
                
                if (response.ok) {
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    const cards = doc.querySelectorAll('a.TeacherCard__StyledTeacherCard-syjs0d-0');
                    
                    for (const card of cards) {
                        const nameElement = card.querySelector('.CardName__StyledCardName-sc-1gyrgim-0');
                        if (nameElement) {
                            const foundName = nameElement.textContent.trim().replace(/\s+/g, ' ');
                            const searchName = professorName.trim().replace(/\s+/g, ' ');
                            
                            if (foundName.toLowerCase() === searchName.toLowerCase()) {
                                const dept = card.querySelector('.CardSchool__Department-sc-19lmz2k-0');
                                const rating = card.querySelector('.CardNumRating__CardNumRatingNumber-sc-17t4b9u-2');
                                const feedbackNums = card.querySelectorAll('.CardFeedback__CardFeedbackNumber-lq6nix-2');
                                const difficulty = feedbackNums[1] ? feedbackNums[1].textContent : "N/A";
                                
                                const profilePath = card.getAttribute('href');
                                const profileUrl = profilePath ? `https://www.ratemyprofessors.com${profilePath}` : "N/A";
                                
                                return {
                                    name: foundName,
                                    department: dept ? dept.textContent : "N/A",
                                    rating: rating ? rating.textContent : "N/A",
                                    difficulty: difficulty,
                                    profileUrl: profileUrl
                                };
                            }
                        }
                    }
                    
                    return { error: `Professor '${professorName}' not found at Madison` };
                }
            } catch (error) {
                console.log(`Attempt ${attempt} failed for ${professorName}:`, error.message);
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                }
            }
        }
        
        return { error: 'Failed to fetch professor data after retries' };
    }

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
    } // end of timetominutes

    /*
    Name: Create Course
    Description:
        Creates a new course object with converted time values.
        Does not add the course to coursesMap or schedule - only creates the object.
    Parameters:
        code: string representing the course code (ex. "COMP SCI 577")
        title: string representing the course title (ex. "Building User Interfaces")
        dayTimes: object mapping day letters to start/end times, e.g.,
            {
                "T": { startTime: "9:30 AM", endTime: "10:45 AM" },
                "R": { startTime: "9:30 AM", endTime: "10:45 AM" }
            }
    Returns:
        Course object with code, title, and times in minutes format
    */
    function createCourse(code, title, dayTimes) {
        const times = {};

        // convert all start/end times to minutes for each day in daytimes
        // stored in a new object 'times' keyed by day letter
        for (const day in dayTimes) {
            const {startTime, endTime} = dayTimes[day];
            times[day] = {
                startMinutes: timeToMinutes(startTime),
                endMinutes: timeToMinutes(endTime)
            };
        } // end of for

        const course = {code, title, times};
        return course;
    } // end of createcourse

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

        // convert all start/end times to minutes for each day in daytimes
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

        // add or update course in coursesmap
        coursesMap.set(code, course);

        // add course to schedule per day, using converted times
        // handles multiple days with the same or different times
        for (const day in times) {
            schedule[day].push(course);
        } // end of for
    } // end of addcourse

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
    } // end of expanddaytimes

    /*
    Name: Print Schedule
    Description:
        Prints the user's weekly schedule to the console.
        Shows each day of the week and the courses scheduled, 
        including course code, title, and start/end times.
    */
    function printSchedule() {
        console.log("=== WEEKLY SCHEDULE ===");
        
        // iterate over each day in the schedule
        for (const day in schedule) {
            console.log(`\n${day}:`);

            if (schedule[day].length === 0) {
                console.log("no courses scheduled");
                continue;
            } // end of if

            // iterate over courses on that day
            schedule[day].forEach(course => {
                const times = course.times[day];
                if (times) {
                    console.log(`${course.code} - ${course.title} 
                        | ${minutesToTime(times.startMinutes)} to ${minutesToTime(times.endMinutes)}`);
                } // end of if
            }); // end of foreach
        } // end of for
        
        console.log("\n=== END SCHEDULE ===");
    } // end of printschedule

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
    } // end of minutestotime

    /*
    Name: Handle Scheduler
    Description:
        This function, if on the scheduler page of CS&E, keeps track of
        all courses, their days, start and end times, and adds them to the
        coursesMap and schedule objects.
    */
    function handleScheduler() {
        // wait for courses to be loaded in the dom (500ms)
        const waitForCourses = setInterval(() => {
            const courseItems = document.querySelectorAll('cse-course-list-item');
            
            if (courseItems.length > 0) {
                clearInterval(waitForCourses);
                
                // process each course item
                for (let i = 0; i < courseItems.length; i++) {
                    const courseItem = courseItems[i];

                    // check if courseItem is checked off, don't course if not checked
                    const checkbox = courseItem.querySelector('mat-checkbox');
                    const isChecked = checkbox.querySelector('input[type="checkbox"]').checked;
                    if (!isChecked) {
                        continue;
                    } // end of if
                    

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

                            // expand the days (ex. mwf -> {m, w, f}) and associate with times
                            const expanded = expandDayTimes(daysStr, startTime, endTime);

                            // merge into all days and times
                            Object.assign(dayTimes, expanded);
                        } // end of for
                    } // end of if

                    // extract the course code and course title
                    const courseCode = courseCodeDiv ? courseCodeDiv.innerText.trim() : "";
                    const courseTitle = courseTitleDiv ? courseTitleDiv.innerText.trim() : "";

                    // add the course to the coursesmap and schedule
                    if (courseCode && Object.keys(dayTimes).length > 0) {
                        addCourse(courseCode, courseTitle, dayTimes);
                    }
                } // end of for
            } // end of if
        }, 500);
    } // end of handlescheduler
    
    /*
    Name: Handle Schedule Conflicts
    Description:
        Analyzes course sections for scheduling conflicts and highlights them.
        Creates course objects for all sections and prints them.
    Parameters:
        sections: NodeList of course section elements
    */
    function handleScheduleConflicts(sections) {
        const sectionCourses = [];
        // track sections with conflicts
        const seenSections = new Set();
        const conflictingSections = new Set();
        
        for(let i = 0; i < sections.length; ++i) {
            const section = sections[i];
            
            // process all sections within this main section (both lectures and discussions)
            const allSectionHeaders = section.querySelectorAll('cse-pack-header');
            
            // process each section header
            for(let n = 0; n < allSectionHeaders.length; n++) {
                const hasConflict = processSection(allSectionHeaders[n], sectionCourses, seenSections);
                if (hasConflict) {
                    conflictingSections.add(allSectionHeaders[n]);
                } // end of if
            } // end of for
        } // end of outer for
        
        // change conflicting sections so they're red
        conflictingSectionsRed(conflictingSections);
        
        for(let k = 0; k < sectionCourses.length; ++k) {
            const course = sectionCourses[k];
        } // end of for
        
        return sectionCourses;
    } // end of handlescheduleconflicts

    /*
    Name: Process Section
    Description:
        Processes a single section element (lecture or discussion) and adds it to the courses list
        and checks for scheduling conflicts with existing courses.
    Parameters:
        section: The section element to process
        sectionCourses: Array to add courses to
        seenSections: Set to track unique sections
    Returns:
        Boolean indicating if this section has conflicts
    */
    function processSection(section, sectionCourses, seenSections) {
        // get course info from the section - extract just the section code
        const sectionCodeElement = section.querySelector('.cell.catalog-ref');
        let sectionCode = sectionCodeElement ? sectionCodeElement.innerText.trim() : 'Unknown Section';
        
        // clean up the section code - remove "section is saved" and get just the code
        if (sectionCode.includes('Section is saved')) {
            const lines = sectionCode.split('\n');
            sectionCode = lines[lines.length - 1].trim();
        } // end of if
        
        // skip if we can't determine the section type
        if (!sectionCode.startsWith('LEC') && !sectionCode.startsWith('DIS')) {
            return false;
        } // end of if
        
        // create a unique identifier for this entire section
        const sectionUniqueId = sectionCode;
        
        // only process this section if we haven't seen it before
        if (seenSections.has(sectionUniqueId)) {
            return false;
        }
        seenSections.add(sectionUniqueId);
        
        // get all time elements for this section
        const allTimeElements = section.querySelectorAll(".days-times");
        
        // use a set to track unique meeting times within this section
        const seenMeetingTimes = new Set();
        const dayTimes = {};
        
        // check all the days and times - but only add unique meeting times
        for(let j = 0; j < allTimeElements.length; ++j) {
            const timeElement = allTimeElements[j];
            const fullText = timeElement.innerText.trim();
            
            // split the days from the times (ex: "mwf 9:55 am - 10:45 am")
            const firstSpaceIndex = fullText.indexOf(" ");
            if (firstSpaceIndex === -1) continue;
            
            const daysStr = fullText.substring(0, firstSpaceIndex);
            const timesStr = fullText.substring(firstSpaceIndex + 1);
            
            // clean the times string - remove location info if present
            const cleanTimesStr = timesStr.split('\n\n')[0];
            
            // split start and end times using " - " (with spaces)
            const [startTime, endTime] = cleanTimesStr.split(" - ").map(t => t.trim());
            
            // create a unique identifier for this specific meeting time
            const meetingTimeId = `${daysStr}-${startTime}-${endTime}`;
            
            // only process this meeting time if we haven't seen it before in this section
            if (seenMeetingTimes.has(meetingTimeId)) continue;
            seenMeetingTimes.add(meetingTimeId);
            
            // expand the days and associate with times
            const expanded = expandDayTimes(daysStr, startTime, endTime);
            
            // merge into the section's daytimes
            Object.assign(dayTimes, expanded);
        } // end of inner for
        
        // only create a course object if we found valid times
        if (Object.keys(dayTimes).length > 0) {
            // create a course object for this section with all its unique meeting times
            const sectionTitle = `${sectionCode}`;
            const sectionCourse = createCourse(sectionCode, sectionTitle, dayTimes);
            sectionCourses.push(sectionCourse);
            
            // check for scheduling conflicts with existing courses
            const hasConflict = checkForConflicts(sectionCourse);
            return hasConflict;
        } // end of if
        
        return false;
    } // end of processsection

    /*
    Name: Check For Conflicts
    Description:
        Checks if a new course has scheduling conflicts with any existing courses in the schedule.
        Prints conflict information to the console.
    Parameters:
        newCourse: The new course object to check for conflicts
    Returns:
        Boolean indicating if conflicts were found
    */
    function checkForConflicts(newCourse) {
        let hasConflict = false;
        
        // check against all existing courses in the schedule
        for (const day in newCourse.times) {
            const newTime = newCourse.times[day];
            
            // check all courses already scheduled on this day
            for (const existingCourse of schedule[day]) {
                const existingTime = existingCourse.times[day];
                
                // check if times overlap
                if (newTime.startMinutes <= existingTime.endMinutes && 
                    existingTime.startMinutes <= newTime.endMinutes) {
                    
                    // found a conflict
                    hasConflict = true;
                } // end of if 
            } // end of for
        } // end of for

        return hasConflict;
    } // end of checkforconflicts

    /*
    Name: Conflicting Sections Red
    Description:
        Highlights sections with scheduling conflicts in red in the UI
    Parameters:
        conflictingSections: Set of section elements that have conflicts
    */
    function conflictingSectionsRed(conflictingSections) {
        conflictingSections.forEach(section => {
            // highlight the text in red
            const textElements = section.querySelectorAll('*');
            textElements.forEach(element => {
                element.style.color = '#cc0000';
                element.style.fontWeight = 'bold';
            });
        });
    } // end of conflictingSectionsRed

    /*
    `Name: Handle Sections Button
    Description:
        This function tracks clicks on the "See sections" button and extracts
        instructor information from the sections panel that appears.
        It polls for the panel until found, then collects unique instructor names.
    */
    async function handleSectionsButton() {
        let isProcessing = false;
        
        document.addEventListener('click', async (event) => {
            if (event.target.classList.contains('mdc-button__label') && 
                event.target.innerText.trim() === 'See sections') {
                
                if (isProcessing) return;
                isProcessing = true;
                
                currentTeachers = [];
                
                const checkForPanel = setInterval(async () => {
                    const panel = document.querySelector('mat-sidenav[style*="visibility: visible"]');  
                    
                    if (panel) {
                        const sections = panel.querySelectorAll('cse-package-group');
                        
                        // find course conflicts and turn them red
                        handleScheduleConflicts(sections);

                        // Process all professors
                        for(let k = 0; k < sections.length; ++k) {
                            let teacherElement = sections[k].querySelector('.one-instructor');
                            if (teacherElement) {
                                const teacherName = teacherElement.innerText.trim();
                                currentTeachers.push(teacherName);
                                
                                // Call our new function directly
                                try {
                                    const professorData = await findProfessorRating(teacherName);
                                    console.log(`RMP Data for ${teacherName}:`, professorData); // KEEP THIS LOG
                                    
                                    // Display the rating
                                    displayProfessorRating(professorData, sections[k]);
                                } catch (error) {
                                    console.error(`Failed to fetch RMP data for ${teacherName}:`, error); // KEEP ERROR LOGS TOO
                                }
                            }
                        }

                        clearInterval(checkForPanel);
                        isProcessing = false;
                    }
                }, 50);
            }
        });
    }

    function displayProfessorRating(professorData, sectionElement) {
        // Remove existing rating if present
        const existingRating = sectionElement.querySelector('.rmp-rating');
        if (existingRating) {
            existingRating.remove();
        }
        
        // Only display if we have valid rating data
        if (professorData.rating && professorData.rating !== "N/A" && !professorData.error) {
            const ratingElement = document.createElement('div');
            ratingElement.className = 'rmp-rating';
            
            // Create colored rating based on score
            const rating = parseFloat(professorData.rating);
            let ratingColor = '#cc0000'; // red for low ratings
            if (rating >= 4.0) ratingColor = '#00a000'; // green for high ratings
            else if (rating >= 3.0) ratingColor = '#ff9900'; // orange for medium ratings
            
            const difficulty = parseFloat(professorData.difficulty);
            let difficultyColor = '#00a000'; // green for easy
            if (difficulty >= 4.0) difficultyColor = '#cc0000'; // red for hard
            else if (difficulty >= 3.0) difficultyColor = '#ff9900'; // orange for medium
            
            // Create the rating display
            ratingElement.innerHTML = `
                <div style="margin: 4px 0; font-size: 12px; line-height: 1.3;">
                    <span style="font-weight: bold;">RMP: </span>
                    <span style="color: ${ratingColor}; font-weight: bold;">${professorData.rating}/5</span> | 
                    <span style="font-weight: bold;">Difficulty: </span>
                    <span style="color: ${difficultyColor}; font-weight: bold;">${professorData.difficulty}/5</span>
                </div>
            `;
            
            const instructorElement = sectionElement.querySelector('.one-instructor');
            if (instructorElement) {
                // Insert right after the professor name container
                instructorElement.parentNode.insertBefore(ratingElement, instructorElement.nextSibling);
            }
            
            // Optional: Also log to console when displaying (for debugging)
            console.log(`Displayed RMP rating for ${professorData.name}: ${professorData.rating}/5, Difficulty: ${professorData.difficulty}/5`);
        } else if (professorData.error) {
            // Display "Not Found" message
            const ratingElement = document.createElement('div');
            ratingElement.className = 'rmp-rating';
            ratingElement.innerHTML = `
                <div style="margin: 4px 0; font-size: 11px; color: #666; font-style: italic;">
                    RMP: Not found
                </div>
            `;
            
            const instructorElement = sectionElement.querySelector('.one-instructor');
            if (instructorElement) {
                instructorElement.parentNode.insertBefore(ratingElement, instructorElement.nextSibling);
            }
            
            console.log(`No RMP data found for professor: ${professorData.error}`);
        }
    }

    /*
    Name: Handle Search
    Description:
        This function runs on the Search page of CS&E.
        It tracks clicks on course items and logs the course name
        from the details pane that appears when a course is selected.
    */
    function handleSearch() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('cse-course-list-item button');
            
            if (button) {
                setTimeout(() => {
                    const pane = document.querySelector('cse-pane#details');
                    
                    if (!pane || pane.offsetParent === null) return;

                    const toolbarSpans = pane.querySelectorAll('mat-toolbar span');
                    const courseNameSpan = Array.from(toolbarSpans)
                    .filter(span => span.innerText.trim() && !span.classList.length)
                    .pop();
                    
                    const courseName = courseNameSpan ? courseNameSpan.innerText.trim() : "unknown course";
                    return courseName;
                }, 50);
            } // end of if
        });
    } // end of handlesearch

    /*
    Name: Main
    Description:
        Main entry point for the Course Search and Enroll extension.
        Checks if the current page is the UW-Madison enrollment page and
        routes to the appropriate handler function based on the page path.
        Handles both the scheduler and search pages.
    */
    function main() {
        const url = window.location.href;
        const base = "https://enroll.wisc.edu/";

        // check we're on the uw-madison enrollment page
        if (!url.startsWith(base)) {
            return;
        } // end of if

        // check what page we're on (not including parameters)
        const path = window.location.href.split("?")[0];
        
        switch (true) {
            case path.endsWith("/scheduler"):
                handleScheduler();
            case path.endsWith("/search"):
                handleSearch();
                handleSectionsButton();
                break;
        } // end of switch
    } // end of main
    main();

})(); // end of program