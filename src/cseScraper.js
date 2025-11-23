(function () {
    'use strict'

    // --- GLOBAL STATE ---
    const coursesMap = new Map();
    const schedule = { M: [], T: [], W: [], R: [], F: [], S: [], U: [] };
    let scheduleTimeout = null; // Used for debouncing the scheduler observer
    let lastPath = ""; // New global state to track the last processed path

    // ==================
    // --- UTILITIES ---
    // ==================

    /*
    Name: Time To Minutes
    Description: Converts a time string (ex. "9:30 AM") to minutes past midnight.
    */
    function timeToMinutes(t) {
        const [time, period] = t.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    /*
    Name: Minutes To Time
    Description: Converts minutes past midnight to a readable time string.
    */
    function minutesToTime(minutes) {
        let hours = Math.floor(minutes / 60);
        let mins = minutes % 60;
        const period = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${hours}:${mins.toString().padStart(2, '0')}.${period}`;
    }

    /*
    Name: expandDayTimes
    Description: Converts a string of day letters (ex. "MTW") into an object mapping each day to {startTime, endTime}.
    */
    function expandDayTimes(daysStr, startTime, endTime) {
        const validDays = ["M", "T", "W", "R", "F", "S", "U"];
        const result = {};
        for (const char of daysStr) {
            if (validDays.includes(char)) {
                result[char] = { startTime, endTime };
            }
        }
        return result;
    }

    /*
    Name: createCourse
    Description: Creates a new course object with converted time values (minutes).
    */
    function createCourse(code, title, dayTimes) {
        const times = {};
        for (const day in dayTimes) {
            const { startTime, endTime } = dayTimes[day];
            times[day] = {
                startMinutes: timeToMinutes(startTime),
                endMinutes: timeToMinutes(endTime)
            };
        }
        return { code, title, times };
    }

    /*
    Name: Add Course
    Description: Adds/updates a course in coursesMap and updates the weekly schedule.
    */
    function addCourse(code, title, dayTimes) {
        const times = {};
        for (const day in dayTimes) {
            const { startTime, endTime } = dayTimes[day];
            times[day] = {
                startMinutes: timeToMinutes(startTime),
                endMinutes: timeToMinutes(endTime)
            };
        }
        const course = { code, title, times };

        // Clear existing course from schedule (crucial for updates)
        for (const day in schedule) {
            schedule[day] = schedule[day].filter(c => c.code !== code);
        }

        coursesMap.set(code, course);
        for (const day in times) {
            schedule[day].push(course);
        }
    }


    // ================================
    // --- SCHEDULER LOGIC (REVISED) ---
    // ================================

    /*
    Name: processScheduledCourses
    Description: Core logic to iterate through all course list items and extract data.
                 Processes ALL items unconditionally.
    */
    function processScheduledCourses() {
        // Clear the entire schedule before processing to ensure accuracy on a full redraw
        for (const day in schedule) {
            schedule[day] = [];
        }
        coursesMap.clear();

        console.log("DEBUG SCHEDULER: --- STARTING SCHEDULE RE-PROCESSING (Unconditional) ---");

        const courseItems = document.querySelectorAll('cse-course-list-item');
        console.log(`DEBUG SCHEDULER: Found ${courseItems.length} course item containers.`);

        if (courseItems.length === 0) return;

        let coursesProcessedCount = 0;

        for (let i = 0; i < courseItems.length; i++) {
            const courseItem = courseItems[i];
            const courseIndex = i + 1;

            console.log(`DEBUG SCHEDULER ${courseIndex}: Processing course unconditionally.`);

            // --- Data Extraction ---
            const courseCodeDiv = courseItem.querySelector('div.left.grow.catalog');
            const courseTitleDiv = courseItem.querySelector('div.row.title div#course-title');
            const courseDaysSpan = courseItem.querySelectorAll('span.days');
            const courseTimesSpan = courseItem.querySelectorAll('span.times');

            const courseCode = courseCodeDiv ? courseCodeDiv.innerText.trim() : "";
            const courseTitle = courseTitleDiv ? courseTitleDiv.innerText.trim() : "";
            const dayTimes = {};

            if (courseDaysSpan.length > 0 && courseDaysSpan.length === courseTimesSpan.length) {
                for (let j = 0; j < courseDaysSpan.length; ++j) {
                    const daysStr = courseDaysSpan[j].innerText.trim();
                    const timesStr = courseTimesSpan[j].innerText.trim();

                    // Split using regex for en dash (–) or standard hyphen (-)
                    const timeParts = timesStr.split(/–|-/).map(t => t.trim());

                    if (timeParts.length === 2) {
                        const [startTime, endTime] = timeParts;
                        const expanded = expandDayTimes(daysStr, startTime, endTime);
                        Object.assign(dayTimes, expanded);
                    }
                }
            }

            // --- Final Add ---
            if (courseCode && Object.keys(dayTimes).length > 0) {
                addCourse(courseCode, courseTitle, dayTimes);
                console.log(`DEBUG SCHEDULER SUCCESS ${courseIndex}: Added/Updated course: ${courseCode}`);
                coursesProcessedCount++;
            } else {
                // This is fine for courses that are 'arranged' or do not have fixed times.
                // console.error(`DEBUG SCHEDULER FAIL ${courseIndex}: Course ${courseCode} skipped due to missing time data.`);
            }
        }

        console.log(`DEBUG SCHEDULER: --- FINISHED. Total courses added/updated: ${coursesProcessedCount} ---`);

    }


    /*
    Name: handleScheduler
    Description: Sets up a MutationObserver to watch for changes in the scheduler list.
    */
    function handleScheduler() {
        console.log("HANDLE SCHEDULER: Setting up MutationObserver for course list.");

        // Check if observer is already running for the scheduler page
        // For simplicity, we just rely on the path monitor to re-trigger the setup
        // which includes a clean initial run.

        const schedulerObserver = new MutationObserver((mutationsList, observer) => {
            if (scheduleTimeout) {
                clearTimeout(scheduleTimeout);
            }
            // Debounce future changes to ensure stability 
            scheduleTimeout = setTimeout(processScheduledCourses, 500);
        });

        const itemSelector = 'cse-course-list-item';

        // Stop any previous polling/observers from prior calls if necessary
        // (In this case, the interval handles the initial start, and the MutationObserver handles updates)

        const waitForContainer = setInterval(() => {
            console.log("HANDLE SCHEDULER: Polling for course list item...");

            const targetItem = document.querySelector(itemSelector);
            if (targetItem) {
                clearInterval(waitForContainer);

                const targetNode = targetItem.parentNode;

                console.log("HANDLE SCHEDULER: Found list item, observing parent node for changes.");
                schedulerObserver.observe(targetNode, {
                    childList: true,
                    subtree: true,
                    attributes: true
                });

                // IMMEDIATE PROCESSING
                console.log("HANDLE SCHEDULER: Starting immediate, unconditional initial course processing.");
                processScheduledCourses();
            }
        }, 500); // Check every 500ms for the item
    }

    // ===================================
    // --- SEARCH/CONFLICT LOGIC (NEW OBSERVER) ---
    // ===================================

    /*
    Name: checkForConflicts
    Description: Checks if a new course section conflicts with the current schedule.
    */
    function checkForConflicts(newCourse) {
        for (const day in newCourse.times) {
            const newTime = newCourse.times[day];

            // Check against all existing courses in the GLOBAL schedule 
            for (const existingCourse of schedule[day]) {
                const existingTime = existingCourse.times[day];

                // Check if times overlap
                if (newTime.startMinutes < existingTime.endMinutes &&
                    existingTime.startMinutes < newTime.endMinutes) {

                    console.log(`CONFLICT DETECTED: ${newCourse.code} (${minutesToTime(newTime.startMinutes)} - ${minutesToTime(newTime.endMinutes)}) conflicts with ${existingCourse.code} (${minutesToTime(existingTime.startMinutes)} - ${minutesToTime(existingTime.endMinutes)}) on ${day}.`);
                    return true;
                }
            }
        }
        return false;
    }

    /*
    Name: conflictingSectionsRed
    Description: Changes the text color of conflicting sections to red.
    */
    function conflictingSectionsRed(conflictingSections) {
        conflictingSections.forEach(section => {
            const textElements = section.querySelectorAll('*');
            textElements.forEach(element => {
                element.style.color = '#cc0000';
                element.style.fontWeight = 'bold';
            });
        });
    }

    /*
    Name: processSection
    Description: Processes a single section element, checks for conflicts, and updates the list.
    */
    function processSection(section, sectionCourses, seenSections) {
        const sectionCodeElement = section.querySelector('.cell.catalog-ref');
        let sectionCode = sectionCodeElement ? sectionCodeElement.innerText.trim() : 'Unknown Section';

        if (sectionCode.includes('Section is saved')) {
            const lines = sectionCode.split('\n');
            sectionCode = lines[lines.length - 1].trim();
        }

        if (!sectionCode.startsWith('LEC') && !sectionCode.startsWith('DIS') && !sectionCode.startsWith('LAB') && !sectionCode.startsWith('SEM')) {
            return false;
        }

        const sectionUniqueId = sectionCode;
        if (seenSections.has(sectionUniqueId)) {
            return false;
        }
        seenSections.add(sectionUniqueId);

        const allTimeElements = section.querySelectorAll(".days-times");
        const seenMeetingTimes = new Set();
        const dayTimes = {};

        for (let j = 0; j < allTimeElements.length; ++j) {
            const timeElement = allTimeElements[j];
            const fullText = timeElement.innerText.trim();
            const firstSpaceIndex = fullText.indexOf(" ");
            if (firstSpaceIndex === -1) continue;

            const daysStr = fullText.substring(0, firstSpaceIndex);
            const timesStr = fullText.substring(firstSpaceIndex + 1);
            const cleanTimesStr = timesStr.split('\n\n')[0];

            // Splits on hyphen or en-dash, allowing for zero or more spaces around it.
            const timeParts = cleanTimesStr.split(/(\s*[-–]\s*)/).filter(p => p.trim() && p.match(/[0-9]/));

            if (timeParts.length !== 2) {
                // console.error(`ERROR PARSING: Could not cleanly split time string "${cleanTimesStr}" into start and end parts. Found ${timeParts.length} parts.`);
                continue; // Skip this time element if parsing failed
            }

            const [startTime, endTime] = timeParts;
            const meetingTimeId = `${daysStr}-${startTime}-${endTime}`;

            if (seenMeetingTimes.has(meetingTimeId)) continue;
            seenMeetingTimes.add(meetingTimeId);

            const expanded = expandDayTimes(daysStr, startTime, endTime);
            Object.assign(dayTimes, expanded);
        }

        if (Object.keys(dayTimes).length > 0) {
            console.log(`DEBUG CONFLICT DATA: ${sectionCode} Extracted DayTimes:`, dayTimes);
            const sectionTitle = `${sectionCode}`;
            const sectionCourse = createCourse(sectionCode, sectionTitle, dayTimes);
            sectionCourses.push(sectionCourse);

            const hasConflict = checkForConflicts(sectionCourse);
            return hasConflict;
        }
        // console.log(`DEBUG CONFLICT DATA: ${sectionCode} Failed to extract valid times (DayTimes object is empty).`);
        return false;
    }

    /*
    Name: handleScheduleConflicts
    Description: Analyzes course sections for scheduling conflicts and highlights them.
    */
    function handleScheduleConflicts(sections) {
        console.log(`DEBUG CONFLICT: Starting conflict check on ${sections.length} section groups.`);
        const sectionCourses = [];
        const seenSections = new Set();
        const conflictingSections = new Set();

        console.log(`CONFLICT CHECK: Schedule has ${Object.values(schedule).flat().length} existing course meetings to check against.`);

        for (const section of sections) {
            const allSectionHeaders = section.querySelectorAll('cse-pack-header');

            for (const header of allSectionHeaders) {
                const hasConflict = processSection(header, sectionCourses, seenSections);
                if (hasConflict) {
                    conflictingSections.add(header);
                }
            }
        }
        conflictingSectionsRed(conflictingSections);
        console.log(`DEBUG CONFLICT: Finished check. Found ${conflictingSections.size} conflicting sections.`);
        return sectionCourses;
    }

    /*
    Name: displayProfessorRating
    Description: Injects the RMP rating data into the course section UI.
    */
    function displayProfessorRating(professorData, sectionElement) {
        const existingRating = sectionElement.querySelector('.rmp-rating');
        if (existingRating) {
            existingRating.remove();
        }

        if (professorData.rating && professorData.rating !== "N/A" && !professorData.error) {
            const ratingElement = document.createElement('div');
            ratingElement.className = 'rmp-rating';

            const rating = parseFloat(professorData.rating);
            let ratingColor = '#cc0000';
            if (rating >= 4.0) ratingColor = '#00a000';
            else if (rating >= 3.0) ratingColor = '#ff9900';

            const difficulty = parseFloat(professorData.difficulty);
            let difficultyColor = '#00a000';
            if (difficulty >= 4.0) difficultyColor = '#cc0000';
            else if (difficulty >= 3.0) difficultyColor = '#ff9900';

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
                // Insert the rating element right after the instructor element
                instructorElement.parentNode.insertBefore(ratingElement, instructorElement.nextSibling);
            }
        } else if (professorData.error) {
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
        }
    }


    /*
    Name: handleSearchObserver
    Description: Sets up a MutationObserver to constantly check the DOM for the appearance
                of the course sections panel, and triggers conflict/RMP checks when it opens.
    */
    function handleSearchObserver() {
        console.log("HANDLE SEARCH: Setting up continuous MutationObserver to detect section panel opening.");

        // Target the main search view element for observation
        const searchContainer = document.querySelector('cse-search-view');
        if (!searchContainer) {
            console.error("HANDLE SEARCH: cse-search-view container not found. Aborting observer setup.");
            return;
        }

        let isProcessing = false;
        let searchObserver = null;

        // Function to start or re-start the observer
        const startObserver = () => {
            // Disconnect any existing observer instance first
            if (searchObserver) {
                searchObserver.disconnect();
            }

            searchObserver = new MutationObserver((mutationsList, observer) => {
                if (isProcessing) return;

                // Check for the visible section panel (mat-sidenav with position="end" and the 'opened' class)
                const panel = document.querySelector('mat-sidenav[position="end"].mat-drawer-opened');

                if (panel) {
                    // Panel is open/visible. Now check for the necessary content elements.
                    const sections = panel.querySelectorAll('cse-package-group');
                    const isContentReady = sections.length > 0 && panel.querySelector('cse-pack-header');

                    if (isContentReady) {
                        isProcessing = true;
                        console.log('DEBUG AUTOMATIC CHECK: Sections panel opened and content detected. Processing...');

                        // 🚨 Temporarily disconnect observer to prevent re-triggering during script execution
                        observer.disconnect();

                        // --- Step 1: Find course conflicts and turn them red ---
                        handleScheduleConflicts(sections);

                        // --- Step 2: Process all professors for RMP data ---
                        for (const sectionGroup of sections) {
                            let teacherElement = sectionGroup.querySelector('.one-instructor');
                            if (teacherElement) {
                                const teacherName = teacherElement.innerText.trim();

                                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                                    // We're in a content script context - use chrome.runtime.sendMessage
                                    chrome.runtime.sendMessage(
                                        { action: "findRMP", professorName: teacherName },
                                        (professorData) => {
                                            if (professorData && professorData.status === "success") {
                                                displayProfessorRating(professorData.data, sectionGroup);
                                            } else {
                                                console.error(`Failed to fetch RMP data for ${teacherName}:`, professorData?.error);
                                                displayProfessorRating({ error: `Failed to fetch for ${teacherName}` }, sectionGroup);
                                            }
                                        }
                                    );
                                } else {
                                    // We're in page context - use window.postMessage to communicate with content script
                                    console.log("RMP: Using window.postMessage for professor:", teacherName);
                                    window.postMessage({
                                        type: 'FETCH_RMP_DATA',
                                        professorName: teacherName,
                                        sectionGroupId: generateUniqueId() // Need a way to identify the section
                                    }, '*');
                                }
                            }
                        }

                        // Reconnect observer after a short delay to allow for RMP injections and DOM stability.
                        setTimeout(() => {
                            isProcessing = false;
                            startObserver(); // Use the dedicated function to reconnect
                            console.log('DEBUG AUTOMATIC CHECK: Processing finished. Observer reconnected.');
                        }, 1000); // 1s delay for stability
                    }
                }
            });

            // Start observing the main search container for all DOM changes.
            searchObserver.observe(searchContainer, { childList: true, subtree: true, attributes: true });
        };

        startObserver(); // Initial start
    }

    /// helper function
    function generateUniqueId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // =============================
    // --- PATH MONITOR (NEW) ---
    // =============================

    /*
    Name: startPathMonitor
    Description: Checks the URL periodically and triggers the appropriate handler if the path changes.
    */
    function startPathMonitor() {
        const base = "https://enroll.wisc.edu/";
        console.log("URL MONITOR: Starting path monitoring interval.");

        setInterval(() => {
            const currentUrl = window.location.href;
            if (!currentUrl.startsWith(base)) {
                return; // Ignore if we are no longer on the target domain
            }

            // Get path without query string or hash for clean comparison
            const currentPathSegment = window.location.pathname.replace(/\/$/, '');

            if (currentPathSegment !== lastPath) {
                console.log(`URL MONITOR: Path changed from ${lastPath} to ${currentPathSegment}. Re-initializing.`);
                lastPath = currentPathSegment; // Update the path tracker

                // We only care about /scheduler and /search
                if (currentPathSegment.endsWith("/scheduler")) {
                    handleScheduler();
                } else if (currentPathSegment.endsWith("/search")) {
                    handleSearchObserver();
                }
            }
        }, 500); // Check every half second
    }

    // --- MAIN EXECUTION ---

    function mainEntry() {
        const url = window.location.href;
        const base = "https://enroll.wisc.edu/";

        if (!url.startsWith(base)) {
            return;
        }

        // Start the path monitor immediately. It will handle the initial load
        // and all subsequent SPA navigations.
        startPathMonitor();
    }

    // Call the main function immediately inside the IIFE.
    mainEntry();

})();